/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * Developer: Arindam Bhattacharya
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Net;
using System.Text;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using log4net;
using log4net.Core;
using log4net.Config;
using log4net.Layout;
using log4net.Appender;
using log4net.Repository.Hierarchy;
using NUnit.Framework;
using EASHarness.SOAP.Admin;
using EASHarness.NUnit;
using EASHarness.Harness;
using EASHarness.ActiveSync.HTTP;

namespace EASHarness.Debugging
{
    [TestFixture]
    public class ZimbraLogParser
    {
        private ConsoleAppender consoleAppender = null;
        private PatternLayout consolePatternLayout = null;

        [TestFixtureSetUp]
        public void TestFixtureSetup()
        {
            #region Initialize Console Logging
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
            #endregion

            ConfigureLog4Net();
        }

        [TestFixtureTearDown]
        public void TestFixtureTeardown()
        {
            #region Un-Initialize Console Logging
            if (consoleAppender != null)
            {
                consoleAppender.Close();
                consoleAppender = null;
            }
            #endregion
        }

        #region WBXML Parser
        [Test, Description("WBXML Parser")]
        [Category("DEBUG")]
        public void WBXMLParser()
        {
            UtilFunctions LogParser = new UtilFunctions();

            LogParser.WBXMLLogParser();
        }
        #endregion

        protected void initialize(System.Reflection.MethodBase methodBase)
        {
            #region Set the logger settings (Create the log file, write the header)
            TestCaseLog.Instance.RemoveCurrentAppender();
            TestCaseLog.Instance.AddFileAppender(this.GetType().FullName);
            #endregion
        }

        private void ConfigureLog4Net()
        {
            FileInfo log4netConfigLocation = new FileInfo(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\log4net.config");
            log4net.Config.XmlConfigurator.Configure(log4netConfigLocation);
        }
    }
}
