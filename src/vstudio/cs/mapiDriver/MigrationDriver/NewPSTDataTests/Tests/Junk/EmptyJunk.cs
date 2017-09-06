using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Junk
{
    public class EmptyJunk : BaseTestFixture
    {
        public EmptyJunk()
        {
            this.PstFilename = "/general/Junk/Junk0/no_junk.pst";
        }

        [Test, Description("Verify that PST with no junk messages are imported.")]
        [TestSteps("1. Create a new account",
                    "2. Use the PST Import tool to import the PST file.",
                    "3. Verify using SOAP that the junk folder is empty.")]
        public void EmptyJunk01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case EmptyJunk01");

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>in:\"Junk\"</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 0);

        }
    }
}
