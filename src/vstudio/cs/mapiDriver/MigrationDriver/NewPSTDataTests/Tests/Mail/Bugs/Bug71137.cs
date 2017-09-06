using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Mail.Bugs
{
    public class Bug71137 : BaseTestFixture
    {
        public Bug71137()
        {
            this.PstFilename = "/Bugzilla/Bug71137.pst";
        }

        [Test, Description("Verify that pst file with imap folders are migrated properly")]
        [Bug("71137")]
        public void Bug71137_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug71137");

            #region Test Case variables

            string rootFolder = GlobalProperties.getProperty("globals.root");
            string rootFolderId = null;
            string inboxFolderId = null;
            string rootFolderAId = null;
            string sentFolderId = null;
            string subjectInbox = "test message1";
            string subjectrootFolderA = "from p2 msg3";
            string subjectSent = "test msg2";
            
            #endregion

            #region SOAP Block

            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetFolderResponse", null, null, null, 1);
            
            //Check if all folders are migrated as per correct hierarchy
            TargetAccount.selectSOAP(m, "//mail:folder[@name='USER_ROOT']", "id", null, out rootFolderId, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Inbox']", "l", rootFolderId, null, 1); //verify Inbox is child of root folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='FolderA']", "l", rootFolderId, null, 1); //verify FolderA is child of root folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='FolderB']", "l", rootFolderId, null, 1); //verify FolderB is child of root folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Subfolder1']", "l", inboxFolderId, null, 1); //verify Subfolder1 is child of Inbox folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Sent']", "l", rootFolderId, null, 1); //verify Sent is child of root folder

            //Get the folder ids
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Inbox']", "id", null, out inboxFolderId, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='FolderA']", "id", null, out rootFolderAId, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Sent']", "id", null, out sentFolderId, 1);

            //Verify if messages are present in different folders
            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject: '" + subjectInbox + "' </query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "l", inboxFolderId, null, 1); //Message in Inbox folder

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject: '" + subjectrootFolderA + "' </query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "l", rootFolderAId, null, 1); //Message in FolderA folder

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject: '" + subjectSent + "' </query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "l", sentFolderId, null, 1); //Message in Sent folder

            #endregion
        }
    }
}