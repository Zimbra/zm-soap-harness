using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Junk
{
    public class Junk : BaseTestFixture
    {
        public Junk()
        {
            this.PstFilename = "/general/Junk/junk1/junk_one.pst";
        }

        [Test, Description("Verify that junk message are imported.")]
        [TestSteps("1. Create a new account",
                    "2. Use the PST Import tool to import the PST file.",
                    "3. Verify using SOAP that the junk message is present")]
        public void Junk01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Junk01");

            #region Testcase variables
            string junkSubject = "Microsoft Office Outlook Test Message";
            string from = "user17@testdomain.com";
            string fragment = "This is an e-mail message sent automatically by Microsoft Office Outlook's Account Manager while testing the settings for your POP3 account.";

            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>in:\"Junk\"</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, junkSubject, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='f']", "a", from, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:fr", null, fragment, null, 1);

        }
    }
}
