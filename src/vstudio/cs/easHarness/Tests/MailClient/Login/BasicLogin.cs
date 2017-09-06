using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Login
{
    [TestFixture]
    public class BasicLogin : Tests.AuthenticatedTestFixture
    {

        [Test, Description("Simulate the initial configuration of an EAS device"),
        Property("TestSteps", "1. iPhone->Settings->Mail->Exchange, 2. Add email, password, server, 3. Click through to add the account, 4. Verify success ")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void BasicLogin01()
        {

            /*
             * Simulate the initial configuration of an EAS device
             * 1. iPhone->Settings->Mail->Exchange
             * 2. Add email, password, server
             * 3. Click through to add the account
             * 4. Verify success OPTIONS and PROVISION requests
             */

            #region Send OPTIONS

            ZResponse r = TestClient.sendRequest(new ZOptionsRequest(TestAccount));
            ZAssert.IsNotNull(r, "Verify the response is received");
            ZAssert.AreEqual(System.Net.HttpStatusCode.OK, r.StatusCode, "Verify the 200 OK response");

            ZOptionsResponse optionsResponse = r as ZOptionsResponse;
            ZAssert.IsNotNull(optionsResponse, "Verify the Options response is received");
            ZAssert.Contains("12.1", optionsResponse.Versions.Split(",".ToCharArray()), "Verify ActiveSync version 12.1 is supported");

            #endregion

            // Send Provision
            TestClient.sendProvisionTransaction();

        }


    }
}
