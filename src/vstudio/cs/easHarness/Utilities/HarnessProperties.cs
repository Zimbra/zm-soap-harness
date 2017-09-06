using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using System.IO;

namespace Utilities
{
    public class HarnessProperties
    {
        private static ILog logger = LogManager.GetLogger(typeof(HarnessProperties));


        protected Dictionary<String, String> dictionary = new Dictionary<String, String>();

        private static DateTime Epoch = new DateTime(1970, 1, 1);
        private static int getTimestamp()
        {
            TimeSpan t = (DateTime.UtcNow - Epoch);
            return ((int)t.TotalSeconds);
        }

        private static int counter = 1;
        public static String getUniqueString()
        {
            return ("" + getTimestamp() + counter++);
        }

        public static String getGUID()
        {
            return (System.Guid.NewGuid().ToString());
        }

        /// <summary>
        /// The "ROOT" folder, where the conf folder is located.
        /// </summary>
        public static String RootFolder
        {
            get
            {
                if (MyRootFolder == null)
                {
                    MyRootFolder = findRootFolder(new DirectoryInfo(Directory.GetCurrentDirectory()));
                }
                return (MyRootFolder.FullName);
            }
        }
        private static DirectoryInfo MyRootFolder = null;

        /// <summary>
        /// Recursively search for the "conf" folder, to determine the "ROOT" folder.
        /// If no conf folder is found, throw a HarnessException
        /// </summary>
        /// <param name="f"></param>
        /// <returns></returns>
        private static DirectoryInfo findRootFolder(DirectoryInfo d)
        {
            logger.Debug("findRootFolder: " + d.FullName);
            foreach (DirectoryInfo directoryInfo in d.GetDirectories())
            {
                if (directoryInfo.Name.Equals("conf"))
                {
                    // Found the root folder
                    return (d);
                }
            }
            
            // Didn't find it here

            if (d.Parent == null)
            {
                // We are at the root, nothing more to check
                throw new HarnessException("Unable to locate the 'conf' folder!");
            }

            // Keep searching one level up
            return (findRootFolder(d.Parent));
        }

            
        public static String getString(String key)
        {

            // Make sure the dictionary has been loaded
            Instance.initialize();


            String Value = getString(key, null);
            if (Value == null)
            {
                throw new HarnessException("No value found for key " + key);
            }
            return (Value);

        }

        public static String getString(String key, String defaultValue)
        {

            // Make sure the dictionary has been loaded
            Instance.initialize();


            if (Instance.dictionary.ContainsKey(key))
            {
                return (Instance.dictionary[key]);
            }
            return (defaultValue);
        }


        
        protected Boolean Initialized = false;

        ///<summary>
        ///Read the properties file for the first time
        ///</summary> 
        protected void initialize()
        {
            logger.Debug("initialize()");

            if (!Initialized)
            {
                load(RootFolder + @"/conf/global.properties");
                Initialized = true;
            }
        }

        protected void load(String filename)
        {
            logger.Info("Reading properties from " + filename);

            foreach (String line in System.IO.File.ReadAllLines(filename))
            {
                logger.Debug("reading: " + line);

                if (String.IsNullOrEmpty(line)) continue;
                if (line.StartsWith(";")) continue;
                if (line.StartsWith("#")) continue;
                if (line.StartsWith("'")) continue;
                if (!line.Contains("=")) continue;

                logger.Debug("parsing: " + line);

                int index = line.IndexOf('=');
                String key = line.Substring(0, index).Trim();
                String value = line.Substring(index + 1).Trim();

                if (dictionary.ContainsKey(key))
                {
                    logger.Warn("Dictionary already contains (key, value) = (" + key + ", " + value + ")");
                    continue;
                }

                logger.InfoFormat("Add Property: {0}={1}", key, value);
                dictionary.Add(key, value);

            }

        }

        public static HarnessProperties Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = new HarnessProperties();
                }
                return (instance);
            }
        }

        #region Singleton

        private static HarnessProperties instance;
        private HarnessProperties()
        {
        }

         #endregion

    }
}
