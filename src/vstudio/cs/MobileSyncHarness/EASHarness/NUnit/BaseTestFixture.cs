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
using System.Net;
using System.Text;
using System.Data;
using System.Reflection;
using System.Diagnostics;
using System.Collections;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Security.Cryptography.X509Certificates;
using NUnit.Framework;
using log4net;
using log4net.Core;
using log4net.Config;
using log4net.Layout;
using log4net.Appender;
using log4net.Repository.Hierarchy;
using EASHarness.Harness;

namespace EASHarness.NUnit
{
    [TestFixture]
    public class BaseTestFixture
    {
        protected static ILog Log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        protected string TestCaseName = "Need to call initialize() method at start of test case";

        protected DateTime timestampTestCaseStart;
        protected int timestampTestCaseMaximum = 3600; // TBD: Change to "60 second" as the maximum duration for tests.

        private object CpuToken = null;
        protected static int testCaseCounter = 1;

        public static bool isDevBox = true; // Initially assuming the system to be a development box

        private ConsoleAppender consoleAppender = null;
        private PatternLayout consolePatternLayout = null;

        public BaseTestFixture() {}

        [TestFixtureSetUp]
        public void TestFixtureSetup()
        {
            #region Initialize Console Logging

            // Create a new console appender and add it to the tcLog
            consoleAppender = new ConsoleAppender();
            consoleAppender.Name = "Console";
            consoleAppender.Threshold = log4net.Core.Level.Info;
            consoleAppender.Layout = new log4net.Layout.PatternLayout();
            consolePatternLayout = new PatternLayout();
            consolePatternLayout.ConversionPattern = "%date [%-5level] [%logger] - %message%newline";
            consolePatternLayout.ActivateOptions();
            consoleAppender.Layout = consolePatternLayout;
            consoleAppender.ActivateOptions();
            BasicConfigurator.Configure(consoleAppender);
            Log.Info("Starting TestFixtureSetup... ");

            #endregion

            try
            {
                // Reset the log4net system based on the properties
                ConfigureLog4Net();

                Log.Info("TestFixtureSetUp: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name + "... ");

                // Accept self signed certificates without error
                SkipInvalidCertificates();

                Log.Info("TestFixtureSetUp: Done! ");
            }
            catch (Exception ex)
            {
                Log.Error("Uncaught exception in TestFixtureSetUp... ", ex);

                throw new HarnessException("Uncaught exception in TestFixtureSetUp... ", ex);
            }
        }

        [SetUp]
        public void SetUp()
        {
            try
            {
                tcLog.Info("SetUp: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name + "... ");               

                // Make sure the assert counts are cleared
                zAssert.ResetCounts();
                HarnessException.clearFirstTestCaseException();

                // Start logging the CPU stats
                CpuToken = CpuMonitor.start();
                timestampTestCaseStart = DateTime.Now;

                tcLog.Debug("SetUp: Done! ");
            }

            catch (Exception ex)
            {
                zAssert.AddException("Uncaught exception in SetUp... ", ex);
                throw;
            }
        }

        [TearDown]
        public void TearDown()
        {
            TimeSpan tcDuration = new TimeSpan();

            try
            {
                tcLog.Info("TearDown: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name + "... ");

                // Make sure execution time is within bounds
                tcDuration = DateTime.Now - timestampTestCaseStart;

                if ((timestampTestCaseMaximum > 0) && (tcDuration.TotalSeconds > timestampTestCaseMaximum))
                {
                    throw new HarnessException("Test Case Duration " + tcDuration.TotalSeconds + " exceeded the maxmimum allowed time " + timestampTestCaseMaximum);
                }

                // If an exception was thrown, clean up everything
                if (HarnessException.getFirstTestCaseException() != null)
                {
                    tcLog.Warn("Test Case threw an exception. Cleaning up... ");
                    tcLog.Error("Test Case Exception: " + HarnessException.getFirstTestCaseException().Message, HarnessException.getFirstTestCaseException());
                }
            }

            catch (Exception e)
            {
                zAssert.AddException("Uncaught exception in TearDown... ", e);
                throw;
            }

            finally
            {
                // Display the pass/fail stats
                zAssert.DisplayCounts();
                zAssert.RecordTestCaseResult(TestCaseName);
                CpuMonitor.delta(tcLog, CpuToken);
                tcLog.Info("");
                tcLog.Info("Test Case Duration: " + tcDuration + " seconds");
                tcLog.Info("========================================");
                tcLog.Info("");

                tcLog.Debug("TearDown: Done! ");

                // Remove the log appender
                TestCaseLog.Instance.RemoveCurrentAppender();
            }
        }

        [TestFixtureTearDown]
        public void TestFixtureTeardown()
        {
            try
            {
                Log.Info("TestFixtureTearDown: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name + "... ");

                zAssert.DisplayTotalCounts();

                Log.Info("TestFixtureTearDown: Done! ");
            }
            catch (Exception ex)
            {
                Log.Error("Uncaught exception in TestFixtureTearDown... ", ex);
                throw;
            }

            #region Un-Initialize Console Logging

            if (consoleAppender != null)
            {
                consoleAppender.Close();
                consoleAppender = null;
            }

            #endregion
        }

        private void ConfigureLog4Net()
        {
            Log.Info("Resetting log4net configurations... ");

            // log4net configuration priorities
            // First, check /Program Files/ZimbraQA/log4net.config
            // Second, check for "./log4net.xml"
            // Lastly, create a default file appender

            FileInfo primaryLog = new FileInfo(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\log4net.config");

            if (primaryLog.Exists)
            {
                Log.Debug("This appears to be a development machine... ");
                isDevBox = true;

                Log.Debug("Using log4net configuration file @ " + primaryLog.DirectoryName + "... ");

                log4net.Config.XmlConfigurator.Configure(primaryLog);
            }
            else
            {
                Log.Debug("This appears to be an automation machine... ");
                isDevBox = false;

                Log.Debug("We need to determine the location of staf.properties file before starting with test executions... ");

                FileInfo secondaryLog = new FileInfo(Properties.getProperty("ZimbraQARoot", ".") + @"\conf\MobileSyncHarness\log4net.config");

                if (secondaryLog.Exists)
                {
                    Log.Debug("Using log4net configuration file @ " + secondaryLog.DirectoryName + "... ");

                    log4net.Config.XmlConfigurator.Configure(secondaryLog);
                }
                else
                {
                    Log.Debug("Log4net configuration file not found... ");

                    // Initialize default logging
                    FileInfo mylog = new FileInfo("MobileSyncHarness.log");
                    Log.Debug("Using default configuration and logging to: " + mylog.FullName + "... ");

                    FileAppender fileAppender = new FileAppender();
                    fileAppender.File = mylog.FullName;
                    fileAppender.AppendToFile = true;
                    fileAppender.Threshold = log4net.Core.Level.Info;
                    fileAppender.Layout = new log4net.Layout.PatternLayout();
                    PatternLayout patternLayout = new PatternLayout();
                    patternLayout.ConversionPattern = "%date [%-5level] [%logger] - %message%newline";
                    patternLayout.ActivateOptions();
                    fileAppender.Layout = patternLayout;
                    fileAppender.ActivateOptions();
                    log4net.Config.BasicConfigurator.Configure(fileAppender);
                }
            }
        } 

        private void SkipInvalidCertificates()
        {
            Log.Debug("Accepting self-signed certificates without error... ");
            System.Net.ServicePointManager.ServerCertificateValidationCallback +=
                new System.Net.Security.RemoteCertificateValidationCallback(ValidateRemoteCertificate);
        }

        private static bool ValidateRemoteCertificate(object sender, X509Certificate certificate, X509Chain chain, 
            System.Net.Security.SslPolicyErrors policyErrors)
        {
            return (true);
        }

        protected void initialize(System.Reflection.MethodBase methodBase)
        {
            #region Set the logger settings (Create the log file, write the header)

            // Remember the test case name
            TestCaseName = String.Format("{0}.{1}", methodBase.DeclaringType.FullName, methodBase.Name);

            TestCaseLog.Instance.RemoveCurrentAppender();
            TestCaseLog.Instance.AddFileAppender(this.GetType().FullName);

            tcLog.Info(TestCaseLog.Instance.LogHeader(methodBase));

            //Add these info in console log too as it helps in debugging.
            tcLog.Info("Test case name: " + TestCaseName);

            #endregion
        }

        protected DateTime getRoundedDateTime(DateTime Dt)
        {
            //As we are using Now property to get real time datetime value, below code would attempt to roundup seconds and milliseconds value to zero
            double secondZeroOffset = 0;
            double millisecondZeroOffset = 0;

            if (Dt.Second != 0)
            {
                secondZeroOffset = 60 - Dt.Second;
            }

            if (Dt.Millisecond != 0)
            {
                millisecondZeroOffset = -1 * Dt.Millisecond;
            }

            DateTime RoundedDt = Dt.AddSeconds(secondZeroOffset).AddMilliseconds(millisecondZeroOffset);

            return RoundedDt;
        }
    }
}
