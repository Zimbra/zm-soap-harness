using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;

namespace NewPSTDataTests
{
    [TestFixture]
    public class BaseTestFixture : HarnessBaseTestFixture
    {
        protected string PstFilename = null;
        protected ZAccount TargetAccount = null;
        protected string Executable = null;
        
        public BaseTestFixture()
        {
            logger.Info("new " + typeof(BaseTestFixture));

            // Default settings
            this.TargetAccount = new ZAccount();
            this.TargetAccount.createAccount();
            this.TargetAccount.login();

            this.PstFilename = null;
            this.Executable = PSTDownloader.PstExeFileName;

        }

        [TestFixtureSetUp]
        public void SetUp()
        {
            logger.Info("BaseTestFixture.SetUp()");

            HarnessSetUp();

            tcLog.Info("Importing PST data to zimbra account");
            tcLog.Info("Test account: " + this.TargetAccount.emailAddress);
            tcLog.Info("PST File: " + this.PstFilename);

            PSTMigrationDriver driver = new PSTMigrationDriver();
            driver.pstfilename = this.PstFilename;
            driver.account = this.TargetAccount;
            driver.executable = this.Executable;

            driver.migrate();

        }

        [TestFixtureTearDown]
        public void TearDown()
        {
            logger.Info("BaseTestFixture.TearDown()");
            System.Threading.Thread.Sleep(3000);
            try
            {
                if (OutlookProcess.Instance.IsApplicationRunning())
                {
                    OutlookProcess.Instance.KillApplication();
                }
                if (OutlookProcess.Instance.IsMigrationApplicationRunning())
                {
                    OutlookProcess.Instance.KillMigrationApplication();
                }
            }
            catch (Exception e)
            {
                ZAssert.AddException("Uncaught exception in TearDown", e);
                throw;
            }
            finally
            {
                // Display the pass/fail stats
                ZAssert.DisplayCounts();
            }
            HarnessTearDown();
        }


    }
}