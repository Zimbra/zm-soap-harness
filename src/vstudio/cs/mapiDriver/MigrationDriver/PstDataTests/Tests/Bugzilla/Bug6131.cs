using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug6131 : BaseTestFixture
    {
        public Bug6131()
        {
            this.PstFilename = "/Bugzilla/6131.pst";
        }

        [Test, Description("Verify that migration skip blank contacts fields.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
           "3. Verify using SOAP that that migration skip blank contacts fields.")]
        public void Bug6131_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug6131_01");

            TargetAccount.sendSOAP(
                 "<GetContactsRequest xmlns='urn:zimbraMail' sortBy='nameAsc' sync='1'>"
            + "</GetContactsRequest>");

            TargetAccount.selectSOAP("//mail:GetContactsResponse/mail:cn", null, null, null, 0);
           
        }

    }
}