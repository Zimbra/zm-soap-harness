using System;
using System.Collections.Generic;
using System.Text;
using System.Collections;
using log4net;
using System.IO;
using System.Text.RegularExpressions;


namespace Harness
{
    public class GlobalProperties
    {
        private static ILog log = LogManager.GetLogger(typeof(GlobalProperties));



        #region public interfcase


        internal static void clearProperty(string key)
        {
            GlobalProperties.Instance._ClearProperty(key);
        }

        public static string getProperty(string key, string defaultValue)
        {
            return (GlobalProperties.Instance._GetProperty(key, defaultValue));
        }

        public static string getProperty(string key)
        {
            return (GlobalProperties.Instance._GetProperty(key));
        }

        public static string time()
        {
            return (GlobalProperties.Instance._GetTime());
        }

        public static string counter()
        {
            return (GlobalProperties.Instance._GetCounter());
        }

        /// <summary>
        /// The full path to ZimbraQA
        /// </summary>
        public static string ZimbraQARoot
        {
            get
            {
                return (GlobalProperties.Instance._ZimbraQARoot);
            }
        }

        /// <summary>
        /// The full path to ZimbraQA/data/TestMailRaw
        /// </summary>
        public static string TestMailRaw
        {
            get
            {
                return (GlobalProperties.Instance._TestMailRaw);
            }
        }

        #endregion

        #region private methods

        private Dictionary<string, string> _GlobalProperties = null;
        private int _Counter = 0;

        private string _GetCounter()
        {
            return ("" + ++_Counter);
        }

        private string _GetTime()
        {
            TimeSpan t = (DateTime.UtcNow - new DateTime(1970, 1, 1));
            int timestamp = (int)t.TotalSeconds;
            return ("" + timestamp);
        }

        private void _ClearProperty(string key)
        {
            if (_GlobalProperties.ContainsKey(key))
                _GlobalProperties.Remove(key);
        }

        private string _SetProperty(string key, string value)
        {
            if (_GlobalProperties.ContainsKey(key))
                _GlobalProperties.Remove(key);
            _GlobalProperties.Add(key, value);
            return (value);
        }

        private string _GetProperty(string key, string defaultValue)
        {
            if (!_GlobalProperties.ContainsKey(key))
                return (defaultValue);
            return ((string)_GlobalProperties[key]);
        }

        private string _GetProperty(string key)
        {
            string ret = getProperty(key, null);
            if (ret == null)
                throw new HarnessException("GlobalProperties does not contain key: " + key);
            return (ret);
        }

        private void ReadStafProperties()
        {
            string[] paths = { @"..\..\..\..\..\..\..\..\", ".", ".." };

            foreach (string path in paths)
            {
                string stafPropertiesFile = path + @"\conf\SyncClient\staf.properties";

                log.Debug("checking for staf.profiles at " + stafPropertiesFile);
                if (File.Exists(stafPropertiesFile))
                {

                    StreamReader oSR = new StreamReader(stafPropertiesFile);
                    char chrDelimiter = '=';
                    string line;

                    #region Populate the hashtable with key/value pairs read from the staf.properties
                    while ((line = oSR.ReadLine()) != null)
                    {
                        //Remove all occourances of whitespaces from the line 
                        string sLineTrimmed = line.Trim();

                        // Skip Blank Lines
                        if (sLineTrimmed.Length == 0)
                        {
                            continue;
                        }

                        // Strip Lines with Comments
                        if (line.Contains("#"))
                        {
                            line = line.Remove(line.IndexOf('#'));
                        }

                        string[] sLineFields = line.Split(chrDelimiter);
                        if ((sLineFields.Length == 2) && (!_GlobalProperties.ContainsKey(sLineFields[0])))
                        {
                            _GlobalProperties.Add(sLineFields[0], sLineFields[1]);
                        }
                    }
                    #endregion

                    log.Debug("Finished reading the staf.properties file.");
                    return;
                }
                else
                {
                    log.Warn(stafPropertiesFile + " does not exist");
                }
            }

            throw new HarnessException("staf properties file could not be found");

        }

        /// <summary>
        /// Read migration.properties file. It can be in current folder or ZimbraQARoot folder. 
        /// IF it is present in both, ZimbraQARoot folder overrides.
        /// This file contains Local path where zip file resides. Also name of the file which contains xml,csv file list
        /// </summary>
        private void ReadMigrationProperties()
        {
            string[] paths = {UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\", @"..\..\..\..\..\..\..\..\", ".", "..", };

            foreach (string path in paths)
            {
                string migrationPropertiesFile = path + @"\conf\SyncClient\ZimbraMigration\migration.properties";
                //Pick properties file first from c:\program files\ZimbraQA, ie, if it exists
                if (path.Contains(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\"))
                    migrationPropertiesFile=UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\" + "migration.properties";

                
                log.Debug("checking for staf.profiles at " + migrationPropertiesFile);
                if (File.Exists(migrationPropertiesFile))
                {

                    StreamReader oSR = new StreamReader(migrationPropertiesFile);
                    char chrDelimiter = '=';
                    string line;

                    #region Populate the hashtable with key/value pairs read from the staf.properties
                    while ((line = oSR.ReadLine()) != null)
                    {
                        //Remove all occourances of whitespaces from the line 
                        string sLineTrimmed = line.Trim();

                        // Skip Blank Lines
                        if (sLineTrimmed.Length == 0)
                        {
                            continue;
                        }

                        // Strip Lines with Comments
                        if (line.Contains("#"))
                        {
                            line = line.Remove(line.IndexOf('#'));
                        }

                        string[] sLineFields = line.Split(chrDelimiter);
                        if ((sLineFields.Length == 2) && (!_GlobalProperties.ContainsKey(sLineFields[0])))
                        {
                            _GlobalProperties.Add(sLineFields[0], sLineFields[1]);
                        }
                    }
                    #endregion

                    log.Debug("Finished reading the migration.properties file.");
                    return;
                }
                else
                {
                    log.Warn(migrationPropertiesFile + " does not exist");
                }
            }

            throw new HarnessException("migration properties file could not be found");

        }


        
       

        private DirectoryInfo dirInfoMigrationToolPath = null;
        private string _MigrationToolPath
        {
            get
            {
                if (dirInfoMigrationToolPath == null)
                {
                    dirInfoMigrationToolPath = new DirectoryInfo(_GetProperty("MigrationToolPath"));
                }
                return (dirInfoMigrationToolPath.FullName);
            }
        }


        private void ReadGlobalProperties(String filename)
        {

            StreamReader oSR = new StreamReader(filename);
            char chrDelimiter = '=';
            string line;

            #region Populate the hashtable with key/value pairs read from the global.properties
            while ((line = oSR.ReadLine()) != null)
            {
                //Remove all occourances of whitespaces from the line 
                string sLineTrimmed = line.Trim();

                #region Skip blank lines
                if (sLineTrimmed.Length == 0)
                {
                    continue;
                }
                #endregion

                #region Strip lines with comments
                if (line.Contains("#"))
                {
                    line = line.Remove(line.IndexOf('#'));
                }
                #endregion

                int firstHash = line.IndexOf(chrDelimiter);
                if (firstHash >= 0)
                {
                    string key = line.Substring(0, firstHash);
                    string value = line.Substring(firstHash + 1);

                    #region If key already present then remove it.
                    if (_GlobalProperties.ContainsKey(key))
                    {
                        _GlobalProperties.Remove(key);
                    }
                    #endregion

                    // If value contains zimbra.com or localhost, change it to ZimbraServer
                    Regex regexLocalhost = new Regex("localhost");
                    Regex regexZimbraCom1 = new Regex("@zimbra.com");
                    Regex regexZimbraCom2 = new Regex("^zimbra.com");
                    value = regexLocalhost.Replace(value, _GlobalProperties["ZimbraServer"]);
                    value = regexZimbraCom1.Replace(value, "@" + _GlobalProperties["ZimbraServer"]);
                    value = regexZimbraCom2.Replace(value, _GlobalProperties["ZimbraServer"]);

                    _GlobalProperties.Add(key, value);
                }
            }
            #endregion
        }

        private DirectoryInfo dirInfoZimbraQARoot = null;
        private string _ZimbraQARoot
        {
            get
            {
                if (dirInfoZimbraQARoot == null)
                {
                    dirInfoZimbraQARoot = new DirectoryInfo(_GetProperty("ZimbraQARoot"));
                }
                return (dirInfoZimbraQARoot.FullName);
            }
        }
        

        private DirectoryInfo dirInfoTestMailRaw = null;
        private string _TestMailRaw
        {
            get
            {
                if (dirInfoTestMailRaw == null)
                {
                    dirInfoTestMailRaw = new DirectoryInfo(_ZimbraQARoot + @"/data/TestMailRaw/");
                }
                return (dirInfoTestMailRaw.FullName);
            }
        }

        #endregion

        #region Singleton

        private static GlobalProperties instance;

        private static readonly Object mutex = new Object();

        private GlobalProperties()
        {
            _GlobalProperties = new Dictionary<string, string>();

            ReadStafProperties();
            ReadGlobalProperties(_GlobalProperties["ZimbraQARoot"] + "/conf/global.properties");
            ReadMigrationProperties();


        }

        private static GlobalProperties Instance
        {
            get
            {
                lock (mutex)
                    return (instance == null ? (instance = new GlobalProperties()) : instance);
            }
        }

        #endregion


    }
}
