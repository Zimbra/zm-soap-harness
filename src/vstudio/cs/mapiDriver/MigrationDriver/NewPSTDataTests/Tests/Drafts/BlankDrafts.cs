using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Drafts
{
    public class BlankDrafts : BaseTestFixture
    {
        public BlankDrafts()
        {
            this.PstFilename = "/general/drafts/Drafts0/no_drafts.pst";
        }

        [Test, Description("Verify that PST with no draft message are imported.")]
        [TestSteps("1. Create a new account",
                    "2. Use the PST Import tool to import the PST file.",
                    "3. Verify using SOAP that the draft folder is empty.")]
        public void BlankDrafts01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case BlankDrafts01");

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> in:" + GlobalProperties.getProperty("globals.drafts") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 0);

        }
    }
}
