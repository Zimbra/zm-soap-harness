using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Mail
{
   public class MessageFolder : BaseTestFixture
    {
        public MessageFolder()
        {
            this.PstFilename = "/general/mailbox/message_folder.pst";
        }

        [Test, Description("Verify a message in sub folder is migrated correctly")]
        public void MessagesFolder01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "mail1";
            string subPart = "FW:";
            string folderName = "Folder7";
            string sub="";
            string messageid = null;
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") from:ma2</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            
            //TargetAccount.selectSOAP(m, ("//mail:e[@t='f']"), null, "ma2", null, 0);
            TargetAccount.selectSOAP(m, ("//mail:e[@t='t']"), null, "ma1", null, 0);
            TargetAccount.selectSOAP(m, "//mail:su", null, null, out sub, 1);
            if (sub.ToLower().Contains(subPart.ToLower()))

                ZAssert.That(true, "Subject of the email is migrated successfully");
            else
                ZAssert.That(false, "Subject of the email is NOT migrated successfully");

           TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);

            #endregion

        }

        [Test, Description("Verify a message in nested folder is migrated correctly")]
        public void MessagesFolder02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject3";
            string body = "counter";
            string folderName = "Folder8";
            string folderId = null;
            string content = "";
            string messageid = null;
            #endregion

            #region SOAP Block
            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") </query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

            TargetAccount.selectSOAP(m, ("//mail:e[@t='f']"), null, "ma2", null, 0);
            TargetAccount.selectSOAP(m, ("//mail:e[@t='t']"), null, "ma1", null, 0);
            TargetAccount.selectSOAP(m, "//mail:content", null, null, out content, 1);
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");

            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);

            #endregion

        }

        [Test, Description("Verify a empty folder is migrated correctly")]
        public void MessagesFolder03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = "Folder9";
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>inid:" + folderId + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 0);

            #endregion

        }

        [Test, Description("Verify message in trash folder is migrated correctly")]
        public void MessagesFolder04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject13491264181981";
            string folderName = "Trash";
            string content = "";
            string body = "content13491264181981";
            string messageid = null;
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") is:anywhere</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

            TargetAccount.selectSOAP(m, ("//mail:e[@t='f']"), null, "ma2", null, 0);
            TargetAccount.selectSOAP(m, ("//mail:e[@t='t']"), null, "ma1", null, 0);

            TargetAccount.selectSOAP(m, "//mail:content", null, null, out content, 1);
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");
            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);

            #endregion

        }

        [Test, Description("Verify message in Sent folder is migrated correctly")]
        public void MessagesFolder05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject10000";
            string folderName = "Sent";
            string content = "";
            string body = "Content10000";
            string messageid = null;
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") </query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

            TargetAccount.selectSOAP(m, ("//mail:e[@t='t']"), null, "ma2", null, 0);
            TargetAccount.selectSOAP(m, ("//mail:e[@t='f']"), null, "ma1", null, 0);

            TargetAccount.selectSOAP(m, "//mail:content", null, null, out content, 1);
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");


            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);

            #endregion

        }

        [Test, Description("Verify message in Junk folder is migrated correctly")]
        public void MessagesFolder06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "foo13492883443563";
            string folderName = "Junk";
            string content = "";
            string body = "bold";
            string messageid = null;
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") is:anywhere</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

            TargetAccount.selectSOAP(m, ("//mail:e[@t='f']"), null, "ma2", null, 0);
            TargetAccount.selectSOAP(m, ("//mail:e[@t='t']"), null, "ma1", null, 0);

            TargetAccount.selectSOAP(m, "//mail:content", null, null, out content, 1);
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");

            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);

            #endregion

        }

        [Test, Description("Verify message in a folder with same level inbox is migrated correctly")]
        public void MessagesFolder07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject7";

            string folderName = "Folder14";
            string content = "";
            string body = "Content7";
            string messageid = null;
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);
            //check if folder is on same level as inbox. Ie, l=1
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", "l", "1",null, 1);
            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") </query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

            TargetAccount.selectSOAP(m, ("//mail:e[@t='f']"), null, "ma2", null, 0);
            TargetAccount.selectSOAP(m, ("//mail:e[@t='t']"), null, "ma1", null, 0);

            TargetAccount.selectSOAP(m, "//mail:content", null, null, out content, 1);
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");


            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);


            #endregion

        }

        [Test, Description("Verify a message folder with a backslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void MessagesFolder08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = "mail\\backslash";
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", null, null, null, 1);

            #endregion

        }

        [Test, Description("Verify a message folder with a forwardslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void MessagesFolder09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = "mail_forwardslash";
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", null, null, null, 1);

            #endregion

        }

        [Test, Description("Verify a message folder with a asterisk in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void MessagesFolder10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = "mail*asterisk";
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + folderName + "']", null, null, null, 1);

            #endregion

        }

    }
}
