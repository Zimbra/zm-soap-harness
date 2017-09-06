using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5061 : BaseTestFixture
    {
        public Bug5061()
        {
            this.PstFilename = "/Bugzilla/5061.pst";
        }

        [Test, Description("Verify that only default folders are imported from PST.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that basic folders are present and does not contain random number.")]
        public void Bug5061_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5061_01");

            #region Testcase variables
            string subject = "hi this should be saved in the drafts folder";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + Harness.GlobalProperties.getProperty("globals.drafts") + "</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);

            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetFolderResponse", null, null, null, 1);


        }

    }
}