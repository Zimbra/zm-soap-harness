using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5355 : BaseTestFixture
    {
        public Bug5355()
        {
            this.PstFilename = "/Bugzilla/5355.pst";
        }

        [Test, Description("Verify that bigger attachments are imported.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
           "3. Verify using SOAP that bigger attachments are imported.")]
        public void Bug5355_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5355_01");

            #region Testcase variables
            string filename = "asystem.nsf";
            string subject = "Attachment with 7mb";
            string id = null;
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>filename:(" + filename + ")</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out id, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);

            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + id + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m/mail:mp", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", filename, null, 1);

        }

    }
}