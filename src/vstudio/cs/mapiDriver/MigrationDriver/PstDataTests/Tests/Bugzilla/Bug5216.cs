using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5216 : BaseTestFixture
    {
        public Bug5216()
        {
            this.PstFilename = "/Bugzilla/5216.pst";
        }

        [Test, Description("Verify that sub folder of junk mails are imported from PST.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that sub folder of junk mails are imported.")]
        public void Bug5216_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5216_01");

            #region Testcase variables
            string subject = "inside junk";
            string from = "test1@testdomain.com";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> from:(" + from + ") in:" + Harness.GlobalProperties.getProperty("globals.spam") + "</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);
        }

    }
}