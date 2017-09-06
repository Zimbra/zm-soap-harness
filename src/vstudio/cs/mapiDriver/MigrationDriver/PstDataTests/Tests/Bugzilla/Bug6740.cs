using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug6740 : BaseTestFixture
    {
        public Bug6740()
        {
            this.PstFilename = "/Bugzilla/6740.pst";
        }

        [Test, Description("Verify that PST file with 2000 or more data is imported.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
           "3. Verify using SOAP that PST file with 2000 or more data is imported.")]
        public void Bug6740_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug6740_01");

            #region Testcase variables
            string from = "user17@testdomain.com";
            string from2 = "matt@liquidsys.com";
            string subject = "Microsoft Office Outlook Test Message";
            string subject2 = "Release 2.0 Requirements Matrix";
            string id = null;
            #endregion


            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
               + "<query> from:(" + from + ") in:inbox</query>"
               + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);

            TargetAccount.sendSOAP(
               "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
              + "<query> from:(" + from2 + ") in:inbox</query>"
              + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject2, null, 1);

        }

    }
}