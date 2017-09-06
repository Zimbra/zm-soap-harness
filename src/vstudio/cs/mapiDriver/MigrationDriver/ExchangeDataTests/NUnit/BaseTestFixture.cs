using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;

namespace ExchangeDataTests
{
    [TestFixture]
    public class BaseTestFixture : HarnessBaseTestFixture
    {

        protected string Executable = null;
        protected ZAccount TargetAccount = null;

        public BaseTestFixture()
        {
            logger.Info("new " + typeof(BaseTestFixture));
            
           //Do we need this??? commenting it out.
            //this.Executable = ExchangeDownloader.MigrationToolPath + "/ZimbraMigrationConsole.exe";

        }

        [SetUp]
        public void SetUp()
        {
            logger.Info("BaseTestFixture.SetUp()");

            HarnessSetUp();

            //tcLog.Info("Migrating test account from exchange to zimbra");
            //ExchangeMigrationDriver driver = new ExchangeMigrationDriver();
            //driver.executable = this.Executable + "/ZimbraMigrationConsole.exe";
            //driver.migrate();
            
        }

        [TearDown]
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
                if (OutlookProcess.Instance.IsExchangeApplicationRunning())
                {
                    OutlookProcess.Instance.KillExchangeApplication();
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
