using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Login
{
    [TestFixture]
    public class NonExistantAccount : Tests.NoAccountTestFixture
    {

        [Test, Description("Simulate the initial configuration of an EAS device when zimbraFeatureMobileSyncEnabled = FALSE"),
        Property("TestSteps", "1. iPhone->Settings->Mail->Exchange, 2. Add email, password, server, 3. Click through to add the account, 4. Verify failure since zimbraFeatureMobileSyncEnabled is FALSE")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void Login01()
        {
            /*
             * 1. Simulate the initial configuration of an EAS device when zimbraFeatureMobileSyncEnabled = FALSE
             * 2. Verify 401 Unauthorized for the OPTIONS
             */

            // Create an account, but don't provision it
            this.TestAccount = new ZimbraAccount();
            this.TestClient = new ZClientMobile(this.TestAccount);


            // Send OPTIONS
            ZResponse response = TestClient.sendRequest(new ZOptionsRequest(TestAccount));
            ZAssert.IsNotNull(response, "Verify the response is returned");


            ZAssert.AreEqual(System.Net.HttpStatusCode.Unauthorized, response.StatusCode, "Verify the 401 Unauthorized response");

        }
    }
}
