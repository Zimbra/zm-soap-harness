using System;
using System.Collections.Generic;
using System.Text;
using Harness;
using NUnit.Framework;

namespace PstDataTests
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
            this.Executable = PstDownloader.PstExeFileName;

        }

        //[SetUp]
        [TestFixtureSetUp]
        public void SetUp()
        {
            logger.Info("BaseTestFixture.SetUp()");

            HarnessSetUp();

            tcLog.Info("Test account: " + this.TargetAccount.emailAddress);
            tcLog.Info("PST File: " + this.PstFilename);

            PstMigrationDriver driver = new PstMigrationDriver();
            driver.pstfilename = this.PstFilename;
            driver.account = this.TargetAccount;
            driver.executable = this.Executable;

            driver.migrate();

        }

        //[TearDown]
        [TestFixtureTearDown]
        public void TearDown()
        {
            logger.Info("BaseTestFixture.TearDown()");
            //Wait 3 seconds to allow the pst and outlook processes to terminate gracefully
            System.Threading.Thread.Sleep(3000);
            if (OutlookProcess.Instance.IsApplicationRunning())
            {
                OutlookProcess.Instance.KillApplication();
            }
            if (OutlookProcess.Instance.IsPstApplicationRunning())
            {
                OutlookProcess.Instance.KillPstApplication();
            }
            HarnessTearDown();
        }

    }
}
