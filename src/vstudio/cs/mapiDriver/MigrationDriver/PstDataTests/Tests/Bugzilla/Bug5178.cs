using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5178 : BaseTestFixture
    {
        public Bug5178()
        {
            this.PstFilename = "/Bugzilla/5178.pst";
        }

        [Test, Description("Verify that junk mails are imported from PST.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that junk mails are imported and are in Junk folder.")]
        public void Bug5178_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5178_01");

            #region Testcase variables
            string subject = "Microsoft Office Outlook Test Message";
            string from = "user17@testdomain.com";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> from:(" + from + ") in:" + Harness.GlobalProperties.getProperty("globals.spam") + "</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);
        }

    }
}