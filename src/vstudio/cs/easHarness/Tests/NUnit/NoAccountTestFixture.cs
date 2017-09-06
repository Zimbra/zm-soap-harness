using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using log4net;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests
{
    /// <summary>
    /// 
    /// This Test Fixture can be used for test classes that don't require the
    /// Default Test Account to be provisioned/authenticated, such as
    /// Login, OPTION, PROVISION type tests, where the account settings
    /// must be modified before provisioning and/or syncing.
    /// 
    /// The Test Account does not exist.
    /// 
    /// </summary>
    [TestFixture]
    public class NoAccountTestFixture
    {
        public static ILog logger = LogManager.GetLogger("TestCaseLogger");

        private ZimbraAccount MyZimbraAccount = null;
        private ZClientMobile MyClientMobile = null;

        #region Property Accessors

        public ZimbraAccount TestAccount
        {
            get { return (MyZimbraAccount); }
            set { 
                MyZimbraAccount = value;
                logger.Info("Test Account: " + MyZimbraAccount.EmailAddress);
            }
        }

        public ZClientMobile TestClient
        {
            get { return (MyClientMobile); }
            set { MyClientMobile = value; }
        }
        

        #endregion


        protected NoAccountTestFixture()
        {
            logger.Debug("new " + typeof(NoAccountTestFixture));
        }

        [SetUp]
        protected virtual void SetUp()
        {
            logger.Debug(typeof(NoAccountTestFixture) + " SetUp()");

            TestLog.LoggerSetup(TestContext.CurrentContext.Test.FullName);

        }

        [TearDown]
        protected virtual void TearDown()
        {
            logger.Debug(typeof(NoAccountTestFixture) + " TearDown()");

            TestLog.LoggerTearDown(TestContext.CurrentContext.Test.FullName);

        }

    }


}

