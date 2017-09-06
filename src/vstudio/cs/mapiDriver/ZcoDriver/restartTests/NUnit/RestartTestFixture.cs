using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using NUnit.Framework;
using System.Collections;
using log4net.Appender;
using System.Reflection;
using SyncHarness;
using System.IO;
using log4net.Core;
using log4net.Layout;
using log4net.Repository.Hierarchy;
using clientTests;

namespace restartTests
{

    
    [TestFixture]
    public class RestartTestFixture
    {
        private static ILog log = LogManager.GetLogger(typeof(RestartTestFixture));

        private static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private DateTime timestampTestCaseStart;
        private object CpuToken = null;

        public RestartTestFixture() 
        {
            HarnessException.clearFirstTestCaseException();
        }

        [SetUp]
        public void SetUp()
        {
            tcLog.Info("RestartTestFixture: SetUp"); // TODO: The test case function name should be added here

            // Make sure the assert counts are cleared
            zAssert.ResetCounts();

            CpuToken = CpuMonitor.start();
            timestampTestCaseStart = DateTime.Now;


            #region Make sure OUTLOOK.EXE is running with the correct profile

            if (OutlookProcess.Instance.IsApplicationRunning())
            {
                log.Warn("During setup, Outlook was running.  Resetting ...");
                OutlookProcess.Instance.StopApplication("For RestartSetupFixture, Outlook should not be running.");
                OutlookProcess.Instance.ResetApplication();

            }

            // To be safe, create a new ZCO Account
            zAccount.AccountZCO = null;

            #endregion

            // Check for popups
            WindowMonitor.CheckWindows();



        }

        [TearDown]
        public void TearDown()
        {
            try
            {
                tcLog.Info("RestartTestFixture: TearDown"); // TODO: The test case function name should be added here


                // Check for core files
                System.Collections.ArrayList coreFiles = CheckCoreFolder();
                if (coreFiles.Count > 0)
                {
                    StringBuilder sb = new StringBuilder("ZCO dropped core file: ");
                    foreach (string fileName in coreFiles)
                    {
                        sb.Append(fileName + " ");
                    }

                    tcLog.Info(sb.ToString());
                    throw new HarnessException(sb.ToString());
                }

                // Check for conflicts and local/server errors
                System.Collections.ArrayList conflictItems = OutlookMailbox.Instance.HasConflictItems();
                if (conflictItems.Count > 0)
                {
                    StringBuilder sb = new StringBuilder("ZCO dropped conflict message: ");
                    foreach (string fileName in conflictItems)
                    {
                        sb.Append(fileName + " ");
                    }

                    tcLog.Info(sb.ToString());
                    throw new HarnessException(sb.ToString());
                }


                // Make sure no popup windows were closed
                WindowMonitor.CheckWindows();

                // If an exception was thrown, clean up everything
                if (HarnessException.getFirstTestCaseException() != null)
                {

                    tcLog.Warn("Test Case threw an exception.  Cleaning up ...");
                    OutlookProcess.Instance.StopApplication("Test Case threw an exception.  Resetting.");
                    OutlookProcess.Instance.ResetApplication();

                    tcLog.Error("Test Case Exception: " + HarnessException.getFirstTestCaseException().Message, HarnessException.getFirstTestCaseException());

                }

                // For the restart test fixure, always shut down outlook after the test
                if (!OutlookProcess.Instance.StopApplication("RestartTestxture: shutting down Outlook after the individual test case has completed"))
                {
                    OutlookProcess.Instance.KillApplication();
                }

            }
            catch (Exception e)
            {
                zAssert.AddException("Uncaught exception in TearDown", e);
                throw;
            }
            finally
            {
                // Display the pass/fail stats
                zAssert.DisplayCounts();

                CpuMonitor.delta(tcLog, CpuToken);

                tcLog.Info("Test Case Duration: " + ((TimeSpan)(DateTime.Now - timestampTestCaseStart)).TotalSeconds + " seconds");

                // Remove the tcLog appender
                TestCaseLog.Instance.RemoveCurrentAppender();
            }


        }

        protected void initialize(System.Reflection.MethodBase methodBase)
        {

            #region Set the logger settings (Create the log file, write the header)

            TestCaseLog.Instance.RemoveCurrentAppender();
            TestCaseLog.Instance.AddFileAppender(this.GetType().FullName);
            tcLog.Info("RestartTestFixture.initialize()");

            tcLog.Info(TestCaseLog.Instance.LogHeader(methodBase));

            #endregion

        }

        protected ArrayList CheckCoreFolder()
        {
            log.Info("CheckCoreFolder");

            ArrayList fileNameList = new ArrayList();

            //try
            //{

            //    string tempFolder = System.Environment.GetEnvironmentVariable("TEMP");
            //    string coreFolder = tempFolder + @"\zco-cores";
            //    DirectoryInfo directoryInfo = new DirectoryInfo(coreFolder);
            //    if (!directoryInfo.Exists)
            //    {
            //        log.Debug("CheckCoreFOlder: folder " + coreFolder + " does not exist");
            //        return (fileNameList);
            //    }

            //    FileInfo[] fileInfoArray = directoryInfo.GetFiles("zimbra*.dmp", SearchOption.TopDirectoryOnly);
            //    if (fileInfoArray.Length <= 0)
            //    {
            //        log.Debug("CheckCoreFolder: no files");
            //        return (fileNameList);
            //    }

            //    foreach (FileInfo f in fileInfoArray)
            //    {
            //        log.Debug("CheckCoreFolder: " + f.Name + " - " + f.CreationTime);

            //        if (outputDirectoryInfo == null)
            //        {
            //            // Rename the file so that all tests don't pass on the single core
            //            File.Move(f.FullName, f.Directory.FullName + @"\qa" + f.Name);
            //        }
            //        else
            //        {
            //            // Move the core to the output file
            //            File.Move(f.FullName, String.Format(@"{0}\{1}", outputDirectoryInfo.FullName, f.Name));
            //        }

            //        fileNameList.Add(f.Name);

            //    }
            //}
            //catch (Exception e)
            //{
            //    log.Error("CheckCoreFolder: threw exception", e);
            //}

            return (fileNameList);
        }

    }
}
