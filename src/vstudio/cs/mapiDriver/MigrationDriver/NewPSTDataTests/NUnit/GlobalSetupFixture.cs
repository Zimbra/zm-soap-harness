using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness.NUnit;
using Harness;

namespace NewPSTDataTests
{

    [SetUpFixture]
    public class GlobalSetupFixture : HarnessGlobalSetupFixture
    {
        public static string migrationTool;

        public GlobalSetupFixture()
        {
            logger.Info("new " + typeof(GlobalSetupFixture));

        }

        [SetUp]
        public void SetUp()
        {
            HarnessSetup();


            #region Clean up old migration tools
            logger.Info("PstDownloader.CleanOldInstallerFiles()");
            //PstDownloader.CleanOldInstallerFiles(); --Check this later

            #endregion

            #region Get the Migration Tool

            PSTDownloader downloadExe = new PSTDownloader();
            downloadExe.GetMigrationTool();

            #endregion

        }

        [TearDown]
        public void TearDown()
        {
            HarnessTearDown();
        }

    }
}
