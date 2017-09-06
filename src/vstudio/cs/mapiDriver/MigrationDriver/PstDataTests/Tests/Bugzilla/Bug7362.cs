using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug7362 : BaseTestFixture
    {
        public Bug7362()
        {
            this.PstFilename = "/Bugzilla/Bug7362/bug7362.pst";
        }

        [Test, Description("Verify that the attachment (bug 7362) is imported correctly")]
        [TestSteps(
            "1. Inject the test PST",
 	        "2. Get the message that has the bug",
 	        "3. Compare the two attachments to the golden files")]
        public void Bug7362_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug7362_01");

            #region Testcase variables
            string msg01Attachment = "time_off_request_form_910.pdf";
            string msg01Attachment2 = "I.T.R-1.pdf";
            string msg01Subject = "Payroll Timing Change 3/17/06 PLEASE READ";
            string id = null;
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + msg01Subject + ")</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out id, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, msg01Subject, null, 1);

            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + id + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", msg01Attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", msg01Attachment2, null, 1);


        }

    }
}