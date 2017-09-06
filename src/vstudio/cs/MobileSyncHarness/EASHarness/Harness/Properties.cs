/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Text;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Collections;
using System.Collections.Generic;
using log4net;
using EASHarness.NUnit;

namespace EASHarness.Harness
{
    public class Properties
    {
        protected static ILog Log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        #region Public Interfaces

        internal static void clearProperty(string key)
        {
            Properties.Instance._ClearProperty(key);
        }

        public static string getProperty(string key, string defaultValue)
        {
            return (Properties.Instance._GetProperty(key, defaultValue));
        }

        public static string getProperty(string key)
        {
            return (Properties.Instance._GetProperty(key));
        }

        public static string time()
        {
            return (Properties.Instance._GetTime());
        }

        public static string counter()
        {
            return (Properties.Instance._GetCounter());
        }

        /// <summary>
        /// The full path to ZimbraQA
        /// </summary>
        public static string ZimbraQARoot
        {
            get { return (Properties.Instance._ZimbraQARoot); }
        }

        /// <summary>
        /// The full path to ZimbraQA/data/MobileSyncHarness
        /// </summary>
        public static string MobileSyncHarness
        {
            get { return (Properties.Instance._MobileSyncHarness); }
        }

        #endregion

        #region Private Methods

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
            if (BaseTestFixture.isDevBox == true)
            {
                try
                {
                    FileInfo primaryStaf = new FileInfo(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\staf.properties");

                    Log.Info("Reading \"staf.properties\" file available @ " + primaryStaf.DirectoryName + "... ");

                    StreamReader oSR = new StreamReader(primaryStaf.ToString());
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
                            Log.Debug("Found property with - " + "\"key=" + sLineFields[0] + "\" & \"value=" + sLineFields[1] + "\"");
                            _GlobalProperties.Add(sLineFields[0], sLineFields[1]);
                        }
                    }

                    #endregion

                    Log.Info("Finished reading the staf.properties file.");
                }
                catch (FileNotFoundException ex)
                {
                    Log.Error("The system appears to be misconfigured: " + ex.Message);
                    Log.Error("Exiting... ");
                    return;
                }
            }
            else
            {
                Log.Info("");
                Log.Info("Searching for \"staf.properties\"... ");

                string[] paths = { ".", "..", @"..\..\..\..\..\..\.." };
                
                foreach (string path in paths)
                {
                    string stafPropertiesFile = path + @"\conf\MobileSyncHarness\staf.properties";
                    
                    Log.Debug("Checking @ " + Path.GetFullPath(path + @"\conf\MobileSyncHarness... "));
                    
                    if (File.Exists(stafPropertiesFile))
                    {
                        Log.Debug("File found!");
                        Log.Info("Reading \"staf.properties\" file available @ " + Path.GetFullPath(path + @"\conf\MobileSyncHarness... "));
                        
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
                                    Log.Debug("Found property with - " + "\"key=" + sLineFields[0] + "\" & \"value=" + sLineFields[1] + "\"");
                                    _GlobalProperties.Add(sLineFields[0], sLineFields[1]);
                                }
                            }

                            #endregion
                        
                        Log.Info("Finished reading the staf.properties file.");
                        
                        return;
                    }
                    
                    else if (path == @"..\..\..\..\..\..\..")
                    {
                        try
                        {
                            string secondaryStaf = path + @"\conf\MobileSyncHarness\staf.properties";

                            StreamReader oSR = new StreamReader(secondaryStaf.ToString());
                        }
                        catch (FileNotFoundException ex)
                        {
                            Log.Error("The system appears to be misconfigured: " + ex.Message);
                            Log.Error("Exiting... ");
                            return;
                        }
                    }
                    else
                    {
                        Log.Debug("File not found! Let's check another path... ");
                    }
                }
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

                    Log.Debug("Found property with - " + "\"key=" + key + "\" & \"value=" + value + "\"");
                    _GlobalProperties.Add(key, value);
                }
            }

            Log.Info("Finished reading the global.properties file.");
            
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

        private DirectoryInfo dirInfoMobileSyncHarness = null;

        private string _MobileSyncHarness
        {
            get
            {
                if (dirInfoMobileSyncHarness == null)
                {
                    dirInfoMobileSyncHarness = new DirectoryInfo(_ZimbraQARoot + @"\data\MobileSyncHarness/");
                }
                return (dirInfoMobileSyncHarness.FullName);
            }
        }

        #endregion

        #region Singleton

        private static Properties instance;

        private static readonly Object mutex = new Object();

        private Properties()
        {
            _GlobalProperties = new Dictionary<string, string>();
            
            ReadStafProperties();

            if (BaseTestFixture.isDevBox == false)
            {
                try
                {
                    FileInfo secondaryGlobal = new FileInfo(_GlobalProperties["ZimbraQARoot"] + @"\conf\global.properties");
                    StreamReader trycatch = new StreamReader(secondaryGlobal.ToString());

                    Log.Info("Reading \"global.properties\" file available @ " + secondaryGlobal.DirectoryName + "... ");

                    ReadGlobalProperties(_GlobalProperties["ZimbraQARoot"] + @"\conf\global.properties");
                }
                catch (FileNotFoundException ex)
                {
                    Log.Error("The system appears to be misconfigured: " + ex.Message);
                    Log.Error("Exiting... ");
                    return;
                }
            }
            else
            {
                try
                {
                    FileInfo primaryGlobal = new FileInfo(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\global.properties");
                    StreamReader oSR = new StreamReader(primaryGlobal.ToString());

                    Log.Info("Reading \"global.properties\" file available @ " + primaryGlobal.DirectoryName + "... ");

                    ReadGlobalProperties(primaryGlobal.ToString());
                }
                catch (FileNotFoundException ex)
                {
                    Log.Error("The system appears to be misconfigured: " + ex.Message);
                    Log.Error("Exiting... ");
                    return;
                }
            }
        }

        private static Properties Instance
        {
            get
            {
                lock (mutex)
                    return (instance == null ? (instance = new Properties()) : instance);
            }
        }

        #endregion
    }
}
