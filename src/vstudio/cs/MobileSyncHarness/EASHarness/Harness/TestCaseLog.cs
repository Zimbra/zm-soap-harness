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
using System.Collections.Generic;
using NUnit.Framework;
using log4net;
using log4net.Core;
using log4net.Layout;
using log4net.Appender;
using log4net.Repository.Hierarchy;
using EASHarness.NUnit;

namespace EASHarness.Harness
{
    public class TestCaseLog
    {
        private static ILog Log = LogManager.GetLogger(typeof(TestCaseLog));

        private const string sixtyHashes = "############################################################";
        private FileAppender currentFileAppender = null;
        public const string tcLogName = "TestCaseLogger";

        private TestCaseLog() {}

        private static TestCaseLog _instance = new TestCaseLog();

        public static TestCaseLog Instance
        {
            get
            {
                return _instance;
            }
        }

        public DirectoryInfo GetLogDirectory()
        {
            if (currentFileAppender == null)
            {
                // If the current TC folder has not yet been set, just return the root or a known folder
                string logRoot = Properties.getProperty("ZimbraLogRoot", UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\MobileSyncHarness\TestLogs\");
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
            sb.AppendLine(sixtyHashes);

            // log the test case name
            sb.Append("Test Case ID: ").AppendLine(tcMethod.Name);

            // log the description
            temp = new StringBuilder();
            foreach (DescriptionAttribute attribute in tcMethod.GetCustomAttributes(typeof(DescriptionAttribute), true))
            {
                temp.Append(attribute.Description + "  ");
            }
            sb.Append("Description: ").AppendLine(temp.ToString());

            // log the bug ids
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

            // log the categories
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

            // Check for SyncDirectionAttribute, if not associated with the testcase then fail the test.
            temp = null;
            foreach (SyncDirectionAttribute attribute in tcMethod.GetCustomAttributes(typeof(SyncDirectionAttribute), true))
            {
                if (temp == null)
                {
                    temp = new StringBuilder(attribute.SyncDirection);
                }
                else
                {
                    temp.Append(", " + attribute.SyncDirection);
                }
            }
            sb.Append("Sync Direction: ").AppendLine(temp == null ? "Not Defined" : temp.ToString());

            sb.AppendLine(sixtyHashes);

            return (sb.ToString());
        }

        public void AddFileAppender(string testCaseFile)
        {
            string logRoot = UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\MobileSyncHarness\TestLogs\";
            if ((new DirectoryInfo(Properties.getProperty("ZimbraLogRoot"))).Exists)
            {
                logRoot = Properties.getProperty("ZimbraLogRoot") + @"\TestLogs\";
            }

            // Convert "easTests.Client.Folders.TestFile" to a path - "easTests\Client\Folders\TestFile"
            string testCasePath = testCaseFile.Replace('.', '\\');

            // MAKEDIR the directory path
            // There is no option in log4net to create a path to the logger
            FileInfo outputLog = new FileInfo(logRoot + testCasePath + ".txt");
            Directory.CreateDirectory(outputLog.DirectoryName);

            // Remove any previous appenders
            RemoveCurrentAppender();

            // Create a new file appender and add it to the log
            currentFileAppender = new FileAppender();
            currentFileAppender.File = outputLog.FullName;
            currentFileAppender.AppendToFile = true;
            currentFileAppender.ImmediateFlush = true;
            currentFileAppender.Threshold = Level.Info;

            // Use a simple pattern layout
            PatternLayout layout = new PatternLayout();
            layout.ConversionPattern = "%date [%-5level] - %message%newline";
            layout.ActivateOptions();
            currentFileAppender.Layout = layout;

            // Always call ActivateOptions() ... a log4net subtlety
            currentFileAppender.ActivateOptions();

            // Add the new appender to the tcLogger
            Logger logger = (Logger)(LogManager.GetLogger(TestCaseLog.tcLogName)).Logger;
            logger.AddAppender(currentFileAppender);

            Log.Debug("Added new tcLog: " + currentFileAppender.File);
        }

        public void RemoveCurrentAppender()
        {
            if (currentFileAppender != null)
            {
                Log.Debug("Removing tcLog: " + currentFileAppender.File);

                Logger logger = (Logger)(LogManager.GetLogger(TestCaseLog.tcLogName)).Logger;
                logger.RemoveAppender(currentFileAppender);
                currentFileAppender.Close();
                currentFileAppender = null;
            }
        }        
    }
}
