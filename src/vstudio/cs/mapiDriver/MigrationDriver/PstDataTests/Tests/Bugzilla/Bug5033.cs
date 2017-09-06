using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5033 : BaseTestFixture
    {
        public Bug5033()
        {
            this.PstFilename = "/Bugzilla/5033.pst";
        }

        [Test, Description("Verify that inbox mails from pst are imported in inbox of zimbra user only.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that the pst gets imported correctly and has all the mails in inbox.")]
        public void Bug5033_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5033_01");

            #region Testcase variables
            string from = "user17@testdomain.com";
            string subject = "Microsoft Office Outlook Test Message";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> from:(" + from + ") in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);
      
        }

    }
}