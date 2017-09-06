using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5811 : BaseTestFixture
    {
        public Bug5811()
        {
            this.PstFilename = "/Bugzilla/5811.pst";
        }

        [Test, Description("Verify that folders with : are imported.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that folders having : is imported.")]
        public void Bug5811_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5811_01");

            #region Testcase variables
            string subject = "Microsoft Office Outlook Test Message";
            string foldername = "inbox|1";
            string folderid = null;
            #endregion


            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");

            TargetAccount.selectSOAP("//mail:GetFolderResponse/mail:folder/mail:folder[@name='Inbox']/mail:folder", "name", foldername, null, 1);
            TargetAccount.selectSOAP("//mail:GetFolderResponse/mail:folder/mail:folder[@name='Inbox']/mail:folder[@name='" + foldername + "']", "id", null, out folderid, 1);
            
            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ")</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "l", folderid, null, 1);



        }

    }
}