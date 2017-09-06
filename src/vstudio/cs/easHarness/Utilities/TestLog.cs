using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using log4net;
using log4net.Appender;
using log4net.Repository.Hierarchy;
using System.IO;
using log4net.Core;
using log4net.Layout;

namespace Utilities
{
    public class TestLog
    {

        private static ILog logger = LogManager.GetLogger(typeof(TestLog));


        private static FileAppender MyCurrentAppender = null;

        private static readonly String MyTestCaseLogger = "TestCaseLogger";
        private static ILog MyTestLogger = LogManager.GetLogger(MyTestCaseLogger);

        #region Property Accessors

        /// <summary>
        /// The logger that writes per test case
        /// </summary>
        public static ILog TestLogger 
        {
            get { return (MyTestLogger); }
        }

        /// <summary>
        /// The logger ID (i.e. LogManager.GetLogger(TestCaseLogger) )
        /// </summary>
        public static String TestCaseLogger
        {
            get { return (MyTestCaseLogger); }
        }

        #endregion



        public static void ConfigureLog4Net()
        {
            logger.Debug("GlobalSetupFixture.ConfigureLog4Net()");

            FileInfo xml = new System.IO.FileInfo(HarnessProperties.RootFolder + @"/conf/log4net.xml");
            log4net.Config.XmlConfigurator.Configure(xml);

            logger.Debug("GlobalSetupFixture.ConfigureLog4Net(): " + xml.FullName);
            logger.Debug("GlobalSetupFixture.ConfigureLog4Net() ... done");

        }

        public static void LoggerSetup(String testname)
        {
            #region Add a test log for this test case

            Logger l = (Logger)TestLogger.Logger;

            // Remove any existing appenders
            if (MyCurrentAppender != null)
            {
                l.RemoveAppender(MyCurrentAppender);
                MyCurrentAppender.Close();
                MyCurrentAppender = null;
            }

            MyCurrentAppender = getNewFileAppender(testname);
            l.AddAppender(MyCurrentAppender);

            #endregion

            TestLogger.Info(testname + " Starting ...");

        }

        public static void LoggerTearDown(String testname)
        {
            logger.Debug(typeof(TestLog) + " TearDown()");

            TestLogger.Info(testname + " Finished");

            #region Remove all test loggers

            // Remove any existing appenders
            if (MyCurrentAppender != null)
            {
                ((Logger)TestLogger.Logger).RemoveAppender(MyCurrentAppender);
                MyCurrentAppender.Close();
                MyCurrentAppender = null;
            }

            #endregion

        }

        private static FileAppender getNewFileAppender(String name)
        {
            // Change the 
            // string path = name.Replace('.', '\\');

            // Strip illegal characters ... Remove double quotes, which appear in parameterized tests (i.e. [TestCase("foo")])
            FileInfo outputLog = new FileInfo(HarnessProperties.RootFolder + @"/logs/" + name.Replace("\"", "") + ".txt");
            Directory.CreateDirectory(outputLog.DirectoryName);


            // Create a new file appender and add it to the tcLog
            FileAppender appender = new FileAppender();
            appender.File = outputLog.FullName;
            appender.AppendToFile = false;
            appender.ImmediateFlush = true;
            appender.Threshold = Level.Info;

            // Use a simply pattern layout
            PatternLayout layout = new PatternLayout();
            layout.ConversionPattern = "%m%n";
            layout.ActivateOptions();
            appender.Layout = layout;

            // Always call ActivateOptions() ... a log4net subtlety
            appender.ActivateOptions();

            return (appender);

        }


    }
}
