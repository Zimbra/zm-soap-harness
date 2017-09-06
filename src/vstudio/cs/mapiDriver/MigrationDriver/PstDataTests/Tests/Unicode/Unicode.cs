using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Unidoce
{
    public class Unicode : BaseTestFixture
    {
        public Unicode()
        {
            this.PstFilename = "/unicode/unicode.pst";
        }

        [Test, Description("Verify data of Unicode PST is imported")]
        [TestSteps("1. Create a new account.",
                    "2. Use the PST Import tool to import the PST file.",
                    "3. Verify that the data is imported from the unicode pst.")]
        public void Unicode01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Unicode01");

            #region Testcase variables
            string calStart = "1145471400000";
            string calEnd = "1151605800000";
            string subject = "test mail";
            string contactName = "Mody, Saumil";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
				+   "<query> from:(user17@testdomain.com) in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> from:(bugzilla-daemon@liquidsys.com) in:" + Harness.GlobalProperties.getProperty("globals.inbox") +  "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 1);

            TargetAccount.sendSOAP(
                 "<SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                + "<query>in:" + Harness.GlobalProperties.getProperty("globals.contacts") +  "</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn", "fileAsStr", contactName, null, 1);

            TargetAccount.sendSOAP(
                "<GetApptSummariesRequest xmlns='urn:zimbraMail' s='" + calStart + "' e='" + calEnd + "'/>");

            TargetAccount.selectSOAP("//mail:GetApptSummariesResponse", null, null, null, 1);


        }
    }
}
