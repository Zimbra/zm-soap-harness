using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.AccountSetting
{
    public class AccountSetting : BaseTestFixture
    {
        public AccountSetting()
        {
            this.PstFilename = "/general/mailbox/mail1/mail_one.pst";
            TargetAccount.modifyAccountAttribute("zimbraMailQuota", "1572864000");

        }

        [Test, Description("Verify that PST is imported in account having large quota.")]
        [TestSteps(
            "1. Create a new account, with quota set to 1500 MB.",
 	        "2. Use the PST Import tool to import the PST file.",
	        "3. Verify that PST imported correctly.")]
        public void AccountSetting_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case AccountSetting_01");

            TargetAccount.sendSOAP(
                 "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                 + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 1);
        }

    }
}