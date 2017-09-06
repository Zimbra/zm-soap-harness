using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests
{


    /// <summary>
    /// 
    /// This test fixture is the 'standard' test fixture used
    /// for functional tests.
    /// 
    /// The Test Account is provisioned and authenticated against
    /// the Zimbra Server.  The Test Account is authenticated
    /// and synced to steady state using Zimbra Sync.
    /// 
    /// </summary>
    [TestFixture]
    public class BaseTestFixture : AuthenticatedTestFixture
    {



        protected BaseTestFixture()
        {
            logger.Info("new " + typeof(BaseTestFixture));
        }

        [SetUp]
        protected override void SetUp()
        {

            // Call the base method first
            base.SetUp();

            logger.Info(typeof(BaseTestFixture) + " SetUp()");

            if (TestClient.Provisioned == false)
            {
                // Sync the test account
                TestClient.sendRequest(new ZOptionsRequest(TestAccount));

                // Send the Provision transaction
                TestClient.sendProvisionTransaction();
                TestClient.Provisioned = true;

                // Sync up all folders
                TestClient.sendRequest(new ZFolderSyncRequest(TestAccount));

                // Get the settings
                TestClient.sendRequest(new ZSettingsRequest(TestAccount));

                // Send the initial Sync
                TestClient.sendSyncTransaction();


                //EASTransaction ping = new EASPingTransaction(this.TestAccount);
                //ping.execute();
            }

        }

        [TearDown]
        protected override void TearDown()
        {
            logger.Info(typeof(BaseTestFixture) + " TearDown()");

            // Call the base method last
            base.TearDown();

        }


    }
}
