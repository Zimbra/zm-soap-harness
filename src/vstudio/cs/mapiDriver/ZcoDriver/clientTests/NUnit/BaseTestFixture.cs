using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using log4net;
using System.Collections;
using log4net.Appender;
using System.Reflection;
using SyncHarness;
using System.IO;
using log4net.Repository.Hierarchy;
using log4net.Layout;
using log4net.Core;

namespace clientTests
{

    [TestFixture]
    public class BaseTestFixture
    {
        private static ILog log = LogManager.GetLogger(typeof(BaseTestFixture));

        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);
       
        protected string TestCaseName = "Need to call initialize() method at start of test case";

        protected DateTime timestampTestCaseStart;
        protected int timestampTestCaseMaximum = 60; // 60 second maximum duration for clientTests

        private object CpuToken = null;
        protected static int testCaseCounter = 1;
        public BaseTestFixture() 
        {
        }

        [SetUp]
        public void SetUp()
        {
            try
            {
                tcLog.Info("BaseTestFixture: SetUp"); // TODO: The test case function name should be added here

                // Make sure the assert counts are cleared
                zAssert.ResetCounts();
                HarnessException.clearFirstTestCaseException();
                
                // Start logging the CPU stats
                CpuToken = CpuMonitor.start();
                timestampTestCaseStart = DateTime.Now;

                #region Make sure OUTLOOK.EXE is running with the correct profile

                if (OutlookProcess.Instance.IsApplicationRunning())
                {
                    log.Debug("Setup: OUTLOOK.EXE is running, making sure we are in sync ...");

                    // Only restart OLK if there is some inconsistency
                    bool killOutlook = false;

                    if (OutlookProcess.Instance.CurrentProfile == null)
                    {
                        log.Warn("Test Harness does not know which profile is being used.  OutlookProcess.ProfileName is null");
                        killOutlook = true;
                    }
                    else if (!OutlookProcess.Instance.CurrentProfile.account.Equals(zAccount.AccountZCO))
                    {
                        log.Warn("Test Harness: ZCO Profile and SyncUser Profile do not match.  " + OutlookProcess.Instance.CurrentProfile.account.emailAddress + " != " + zAccount.AccountZCO.emailAddress);
                        killOutlook = true;
                    }

                    log.Warn("Test case counter reached 50? : " + testCaseCounter%50);
                    //Reset profile, zco account every 50 test cases once.
                    if (testCaseCounter % 50 == 0)
                    {
                        log.Warn("Test Harness: 50 Test cases are executed. To test with clean environment, restarting OLK with new account and profile ");
                        killOutlook = true;

                    }
                    
                    testCaseCounter++;
                    log.Warn("Test Harness counter:" + testCaseCounter);

                    if (killOutlook)
                    {
                        log.Warn("During setup, Outlook, OutlookUser, OutlookProfile was out of sync OR number of test cases executed is 50.  Resetting ...");
                        OutlookProcess.Instance.ExitApplication("Closing Outlook as current ZCO session exceeded 50 test case count");
                        OutlookProcess.Instance.ResetApplication();
                        log.Warn("During setup, Outlook, OutlookUser, OutlookProfile was out of sync OR number of test cases executed is 50.  Resetting ... done.");
                    }
                    else
                    {
                        log.Debug("Setup: OUTLOOK.EXE is running and in sync.");
                    } 

                }

                if (!OutlookProcess.Instance.IsApplicationRunning())
                {
                    log.Debug("Setup: OUTLOOK.EXE is not running.  Setting up accounts, etc. ...");

                    // To be safe, create a new ZCO Account
                    zAccount.AccountZCO = null;

                    // Create a new profile and log into it
                    OutlookProfile profile = new OutlookProfile(zAccount.AccountZCO);

                    
                    OutlookProcess.Instance.StartApplication(profile);

                    System.Threading.Thread.Sleep(5000);
                }

                // Check for popups
                WindowMonitor.CheckWindows();

                #endregion

            }
            catch (Exception e)
            {
                zAssert.AddException("Uncaught exception in TearDown", e);
                throw;
            }
            finally
            {
                tcLog.Info("BaseTestFixture: SetUp ... done");
            }

        }

        [TearDown]
        public void TearDown()
        {
            TimeSpan tcDuration = new TimeSpan();

            try
            {
                tcLog.Info("BaseTestFixture: TearDown"); // TODO: The test case function name should be added here

                // Make sure execution time is within bounds
                tcDuration = DateTime.Now - timestampTestCaseStart;
                if ((timestampTestCaseMaximum > 0) && (tcDuration.TotalSeconds > timestampTestCaseMaximum))
                {
                    throw new HarnessException("Test Case Duration " + tcDuration.TotalSeconds + " exceeded the maxmimum allowed time " + timestampTestCaseMaximum);
                }

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
                ArrayList conflictItems = new ArrayList();
                try
                {
                    if (NativeWIN32.profileCreated)
                    {
                        conflictItems = OutlookMailbox.Instance.HasConflictItems(); //Check for conflicts only if profile was successfully created. If profile creation fails, HasConflictItems() invokes _OutlookNameSpace.Logon() which opens up "Zimbra Server Configuration Settings" dialog for existing profile like zimbra and stucks the further execution
                    }
                }
                catch (Exception e)
                {
                    log.Error("Exception during teardown looking at conflict items", e);
                }
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
                zAssert.RecordTestCaseResult(TestCaseName);

                CpuMonitor.delta(tcLog, CpuToken);

                tcLog.Info("Test Case Duration: " + tcDuration + " seconds");

                // Remove the tcLog appender
                TestCaseLog.Instance.RemoveCurrentAppender();
            }


        }

        protected void initialize(System.Reflection.MethodBase methodBase)
        {

            #region Set the logger settings (Create the log file, write the header)

            // Remember the test case name
            TestCaseName = String.Format("{0}.{1}", methodBase.DeclaringType.FullName, methodBase.Name);

            TestCaseLog.Instance.RemoveCurrentAppender();
            TestCaseLog.Instance.AddFileAppender(this.GetType().FullName);
            
            tcLog.Info("BaseTestFixture.initialize()");

            tcLog.Info(TestCaseLog.Instance.LogHeader(methodBase));
            //Add these info in console log too as it helps in debugging.
            log.Warn("BaseTestFixture.initialize()");
            log.Warn("Test case name:" + TestCaseName);

            tcLog.Info("ZCO account: " + zAccount.AccountZCO.emailAddress + " and profile: " + OutlookProcess.Instance.CurrentProfile.profileName + " is used for this test case");
            log.Warn("ZCO account: " + zAccount.AccountZCO.emailAddress + " and profile: " + OutlookProcess.Instance.CurrentProfile.profileName + " is used for this test case");
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

        protected DateTime getRoundedDateTime(DateTime Dt)
        {
            //As we are using Now property to get real time datetime value, below code would attempt to roundup seconds and milliseconds value to zero
            //This is also required since RDOAppointmentItem.Start doesn't consider seconds value so our assertion would fail if we don't roundup
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
