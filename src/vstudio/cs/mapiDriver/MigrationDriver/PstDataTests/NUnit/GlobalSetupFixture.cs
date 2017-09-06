using System;
using System.Collections.Generic;
using System.Text;
using Harness.NUnit;
using log4net;
using NUnit.Framework;

namespace PstDataTests
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
            logger.Info("PstDownloader.CleanOldInstallerFiles()");
            PstDownloader.CleanOldInstallerFiles();
            PstDownloader downloadExe = new PstDownloader();
            downloadExe.GetExeFile(PstDownloader.ReleaseId.vLatest);
           

        }

        [TearDown]
        public void TearDown()
        {
            HarnessTearDown();
        }
    }
}
