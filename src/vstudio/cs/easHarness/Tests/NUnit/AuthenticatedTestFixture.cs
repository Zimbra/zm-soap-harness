using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests
{

    /// <summary>
    /// 
    /// This test fixture is used for tests that need a
    /// Zimbra Account that has not yet accessed Zimbra Sync.
    /// 
    /// It is useful for tests such as Login, or Initial Sync.
    /// 
    /// The Test Account is provisioned and authenticated against
    /// the Zimbra Server.  The Test Account has not yet
    /// authenticated or synced using Zimbra Sync.
    /// 
    /// </summary>
    [TestFixture]
    public class AuthenticatedTestFixture : NoAccountTestFixture
    {

        protected AuthenticatedTestFixture()
        {
            logger.Debug("new " + typeof(AuthenticatedTestFixture));
        }

        [SetUp]
        protected override void SetUp()
        {

            // Call the base method first
            base.SetUp();

            logger.Debug(typeof(AuthenticatedTestFixture) + " SetUp()");

            // Create the Test Account on the Zimbra Server
            if (TestAccount == null)
            {
                TestAccount = new ZimbraAccount();
                TestAccount.provision();
                TestAccount.authenticate();

                // Create the client for sending Zimbra Mobile Sync
                TestClient = new ZClientMobile(TestAccount);
            }

        }

        [TearDown]
        protected override void TearDown()
        {
            logger.Debug(typeof(AuthenticatedTestFixture) + " TearDown()");

            // Call the base method last
            base.TearDown();

        }

    }
}
