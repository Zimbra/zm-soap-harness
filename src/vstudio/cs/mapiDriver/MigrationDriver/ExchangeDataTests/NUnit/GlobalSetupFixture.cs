using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness.NUnit;
using Harness;

namespace ExchangeDataTests
{

    [SetUpFixture]
    public class GlobalSetupFixture : HarnessGlobalSetupFixture
    {

        public GlobalSetupFixture()
        {
            logger.Info("new " + typeof(GlobalSetupFixture));

        }

        [SetUp]
        public void SetUp()
        {
            HarnessSetup();


             #region Clean up old migration tools

            logger.Info("ExchangeDownloader.CleanOldInstallerFiles()");
            // Right now CleanOldInstallerFiles is not working. It deleted even those zip file downloaded today. So commenting it out for the time being till I fix it.
            //ExchangeDownloader.CleanOldInstallerFiles();

            #endregion



            #region Get the Migration Tool

            ExchangeDownloader downloadExe = new ExchangeDownloader();
            String migrationTool = downloadExe.GetMigrationTool();

            #endregion



            #region Execute the migration tool

            logger.Info("Migrating test account from exchange to zimbra");
            ExchangeMigrationDriver driver = new ExchangeMigrationDriver();
            driver.executable = migrationTool; // ExchangeDownloader.MigrationToolPath + @"\ZimbraMigrationConsole.exe";
            driver.migrate();

            #endregion


        }


        [TearDown]
        public void TearDown()
        {
            HarnessTearDown();
        }

    }
}
