using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug6211 : BaseTestFixture
    {
        public Bug6211()
        {
            this.PstFilename = "/Bugzilla/6211.pst";
        }

        [Test, Description("Verify that mailbox contains more than 63 distinct keywords.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
          "3. Verify using SOAP that that mailbox contains more than 63 distinct keywords.")]
        public void Bug6211_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug6211_01");

            TargetAccount.sendSOAP(
                 "<GetTagRequest xmlns='urn:zimbraMail'>"
            + "</GetTagRequest>");

            TargetAccount.selectSOAP("//mail:GetTagResponse/mail:tag", "id", "81", null, 1);
            TargetAccount.selectSOAP("//mail:GetTagResponse/mail:tag", "id", "82", null, 1);
            TargetAccount.selectSOAP("//mail:GetTagResponse/mail:tag", "id", "83", null, 1);
        }

    }
}