using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Login
{


    [TestFixture]
    public class FeatureOff : Tests.NoAccountTestFixture
    {

        [Test, Description("Provision an account with zimbraFeatureMobileSyncEnabled = FALSE"),
        Property("TestSteps", "1. iPhone->Settings->Mail->Exchange, 2. Add email, password, server, 3. Click through to add the account, 4. Verify failure since zimbraFeatureMobileSyncEnabled is FALSE")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void Login01()
        {

            /*
             * 1. Simulate the initial configuration of an EAS device when zimbraFeatureMobileSyncEnabled = FALSE
             * 2. Verify 403 Forbidden for OPTIONS
             */

            // Provision an account with zimbraFeatureMobileSyncEnabled = FALSE
            this.TestAccount = new ZimbraAccount();
            if (this.TestAccount.AccountAttributes.ContainsKey("zimbraFeatureMobileSyncEnabled"))
            {
                this.TestAccount.AccountAttributes.Remove("zimbraFeatureMobileSyncEnabled");
            }
            this.TestAccount.AccountAttributes.Add("zimbraFeatureMobileSyncEnabled", new List<String>("FALSE".Split()));
            this.TestAccount.provision();
            this.TestAccount.authenticate();
            this.TestClient = new ZClientMobile(this.TestAccount);


            // Send OPTIONS
            ZResponse response = TestClient.sendRequest(new ZOptionsRequest(TestAccount));

            ZAssert.AreEqual(System.Net.HttpStatusCode.Forbidden, response.StatusCode, "Verify the 403 Forbidden response");

        }

    }
}
