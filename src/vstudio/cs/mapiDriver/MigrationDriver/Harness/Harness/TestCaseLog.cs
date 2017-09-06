using System;
using System.Collections.Generic;
using System.Text;
using log4net.Appender;
using System.Reflection;
using NUnit.Framework;
using System.IO;
using log4net.Core;
using log4net.Layout;
using log4net.Repository.Hierarchy;
using log4net;

namespace Harness
{
    public class TestCaseLog
    {
        private static ILog log = LogManager.GetLogger(typeof(TestCaseLog));

        private const string fifteenHashes = "###############";
        private FileAppender currentFileAppender = null;

        public const string tcLogName = "TestCaseLogger";

        public DirectoryInfo GetLogDirectory()
        {

            if (currentFileAppender == null)
            {
                // If the current TC folder has not yet been set, just return the root or a known folder
                string logRoot = GlobalProperties.getProperty("ZimbraLogRoot", UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\") + @"\";
                return (new DirectoryInfo(logRoot));
            }

            // Return the folder where TC files are being written
            String filename = currentFileAppender.File;
            FileInfo fileInfo = new FileInfo(currentFileAppender.File);
            return (fileInfo.Directory);

        }

        public string LogHeader(MethodBase tcMethod)
        {
            StringBuilder temp = null;
            StringBuilder sb = new StringBuilder();

            sb.AppendLine();
            sb.AppendLine();
            sb.AppendLine(fifteenHashes);   // Seperator ###############

            // Log the test case name
            sb.Append("Test Case ID: ").AppendLine(tcMethod.Name);

            // Log the description
            temp = new StringBuilder();
            foreach (DescriptionAttribute attribute in tcMethod.GetCustomAttributes(typeof(DescriptionAttribute), true))
            {
                temp.Append(attribute.Description + "  ");
            }
            sb.Append("Description: ").AppendLine(temp.ToString());

            // Log the bug ids
            temp = null;
            foreach (BugAttribute attribute in tcMethod.GetCustomAttributes(typeof(BugAttribute), true))
            {
                if (temp == null)
                {
                    temp = new StringBuilder(attribute.BugId);
                }
                else
                {
                    temp.Append(", " + attribute.BugId);
                }
            }
            sb.Append("Bug IDs: ").AppendLine(temp == null ? "None" : temp.ToString());

            // Log the categories
            temp = null;
            foreach (CategoryAttribute attribute in tcMethod.GetCustomAttributes(typeof(CategoryAttribute), true))
            {
                if (temp == null)
                {
                    temp = new StringBuilder(attribute.Name);
                }
                else
                {
                    temp.Append(", " + attribute.Name);
                }
            }
            sb.Append("Categories: ").AppendLine(temp == null ? "None" : temp.ToString());



            sb.AppendLine(fifteenHashes);  // Seperator ###############
            sb.AppendLine();
            sb.AppendLine();


            return (sb.ToString());
        }


        public void AddFileAppender(string testCaseFile)
        {

            string logRoot = UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\";
            if ((new DirectoryInfo(GlobalProperties.getProperty("ZimbraLogRoot"))).Exists)
            {
                logRoot = GlobalProperties.getProperty("ZimbraLogRoot") + @"\";
            }

            // Convert clientTests.Client.Folders.TestFile to a path:
            //  clientTests\Client\Folders\TestFile
            string testCasePath = testCaseFile.Replace('.', '\\');

            // makedir the directory path
            // there is no option in log4net to create the path to the logger
            // FileInfo outputLog = new FileInfo(GlobalProperties.getProperty("ZimbraLogRoot") + @"\" + testCasePath + ".txt");
            FileInfo outputLog = new FileInfo(logRoot + testCasePath + ".txt");
            Directory.CreateDirectory(outputLog.DirectoryName);

            // Make sure to remove any previous appenders
            RemoveCurrentAppender();

            // Create a new file appender and add it to the tcLog
            currentFileAppender = new FileAppender();
            currentFileAppender.File = outputLog.FullName;
            currentFileAppender.AppendToFile = true;
            currentFileAppender.ImmediateFlush = true;
            currentFileAppender.Threshold = Level.Info;

            // Use a simply pattern layout
            PatternLayout layout = new PatternLayout();
            layout.ConversionPattern = "%m%n";
            layout.ActivateOptions();
            currentFileAppender.Layout = layout;

            // Always call ActivateOptions() ... a log4net subtlety
            currentFileAppender.ActivateOptions();

            // Add the new appender to the tcLogger
            Logger logger = (Logger)(LogManager.GetLogger(TestCaseLog.tcLogName)).Logger;
            logger.AddAppender(currentFileAppender);

            log.Debug("Added new tcLog: " + currentFileAppender.File);
        }

        public void RemoveCurrentAppender()
        {

            if (currentFileAppender != null)
            {
                log.Debug("Removing tcLog: " + currentFileAppender.File);

                Logger logger = (Logger)(LogManager.GetLogger(TestCaseLog.tcLogName)).Logger;
                logger.RemoveAppender(currentFileAppender);
                currentFileAppender.Close();
                currentFileAppender = null;
            }

        }


        private static TestCaseLog _instance = new TestCaseLog();

        private TestCaseLog() { }

        public static TestCaseLog Instance
        {
            get
            {
                return _instance;
            }
        }

    }
}
