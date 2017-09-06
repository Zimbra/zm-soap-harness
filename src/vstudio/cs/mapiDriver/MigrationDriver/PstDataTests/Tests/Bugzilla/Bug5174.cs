using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5174 : BaseTestFixture
    {
        public Bug5174()
        {
            this.PstFilename = "/Bugzilla/5174.pst";
        }

        [Test, Description("Verify that migration does not halt for blank contacts..")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that migration does not halt for blank contacts.")]
        public void Bug5174_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5174_01");

            TargetAccount.sendSOAP(
                 "<GetContactsRequest xmlns='urn:zimbraMail' sortBy='nameAsc' sync='1'>"
			+  "</GetContactsRequest>");

            TargetAccount.selectSOAP("//mail:GetContactsResponse/mail:cn", "rev", "5", null, 1);
            TargetAccount.selectSOAP("//mail:GetContactsResponse/mail:cn", "rev", "4", null, 1);
            TargetAccount.selectSOAP("//mail:GetContactsResponse/mail:cn", "rev", "1", null, 0);

        }

    }
}