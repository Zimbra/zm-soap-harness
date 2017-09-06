using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Drafts
{
    public class Drafts : BaseTestFixture
    {
        public Drafts()
        {
            this.PstFilename = "/general/drafts/drafts1/draft_one.pst";
        }

        [Test, Description("Verify that draft message are imported.")]
        [TestSteps("1. Create a new account",
                    "2. Use the PST Import tool to import the PST file.",
                    "3. Verify using SOAP that the draft message is present")]
        public void Drafts01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Drafts01");

            #region Testcase variables
            string draftSubject = "hi this should be saved in the drafts folder";
            string to = "user17@testdomain.com";
            string messageid = null;
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> in:" + GlobalProperties.getProperty("globals.drafts") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, draftSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "a", to, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "f", "d", null, 1);

        }
    }
}
