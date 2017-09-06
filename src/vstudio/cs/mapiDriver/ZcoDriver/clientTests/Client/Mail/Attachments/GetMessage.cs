using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using System.IO;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Security.Cryptography;
using SoapAdmin;
using System.Xml;

namespace clientTests.Client.Mail.Attachments
{
    [TestFixture]
    public class GetMessage : BaseTestFixture
    {
        [Test, Description("Verify ZCO can received messages with attachments")]
        [Category("Mail")]
        public void GetMessageWithAttachment_01()
        {
            // Steps:
            // 1. Login a account1 (SOAP)
            // 2. SendMsgRequest to sync user
            // 3. Login as sync user (ZCO)
            // 4. Do Send/Receive to sync the incoming message
            // 5. Verify that the message has a single attachment with the correct file name

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, uploadId;

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            UploadServlet servlet = new UploadServlet(zAccount.AccountA);
            servlet.DoUploadFile(zAccount.AccountA.zimbraMailHost, GlobalProperties.TestMailRaw + "/photos/Picture1.jpg", out uploadId);

            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content).
                            AddAttachment(uploadId)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rMail.Attachments.Count, "Verify that the message contains one attachment");
            zAssert.AreEqual("Picture1.jpg", rMail.Attachments[1].FileName, "Verify that the correct file name is used");

            #endregion
        }

        [Test, Description("Verify mail attachments can be saved in ZCO and the contents are correct")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Login to account1 and send mail with attachment to syncuser from ZCS", 
            "Login as sync user and sync",
            "Open the mail, verify attachment is present", 
            "Save attachment to disk", 
            "Verify the contents of the attachment")]
        public void GetMessageWithAttachment_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, uploadId;

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            UploadServlet servlet = new UploadServlet(zAccount.AccountA);
            servlet.DoUploadFile(zAccount.AccountA.zimbraMailHost, GlobalProperties.TestMailRaw + "/attachments1/filename.txt", out uploadId);

            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content).
                            AddAttachment(uploadId)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rMail.Attachments.Count, "Verify that the message contains one attachment");
            zAssert.AreEqual("filename.txt", rMail.Attachments[1].FileName, "Verify that the correct file name is used");
            
            // We are no longer downloading files to data/downloads folder. they should be downloaded to the folder where the test result of this case is logged.
            string savedAttachment = TestCaseLog.Instance.GetLogDirectory() + @"/" + rMail.Attachments[1].FileName;
            string orgAttachment = GlobalProperties.TestMailRaw + @"/" + "/attachments1/filename.txt";

            rMail.Attachments[1].SaveAsFile(savedAttachment);
            
            MD5 md5 = MD5.Create();
            StringBuilder orgMD5 = new StringBuilder();
            StringBuilder downloadedMD5 = new StringBuilder();
            
            using (FileStream fs = File.Open(orgAttachment, FileMode.Open))
            {
                foreach (byte b in md5.ComputeHash(fs))
                    orgMD5.Append(b.ToString("x2"));
            }

            // File.open() return "cannot access the file. it is used by another process".Hence the code fails. Looks like when redemption saves the file (above code) it does not release the file. Hence the test case fails. 
            // Need to mark the case as ignore as we cannot do anything to fix this issue.
            using (FileStream fs = File.Open(savedAttachment, FileMode.Open))
            {
                foreach (byte b in md5.ComputeHash(fs))
                    downloadedMD5.Append(b.ToString("x2"));
            }

            zAssert.AreEqual(orgMD5.ToString(), downloadedMD5.ToString(), "MD5 sum matched for original attachment and downloaded attachment");

            #endregion
        }

        [Test, Description("Verify ZCO can send a messages with attachments")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: Login as sync user & Send a message with an attachment to Account1",
            "2. SOAP: Auth as Account1 and verify that the message is received",
            "3. SOAP: Verify that the attachment is received")]
        public void GetMessageWithAttachment_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments1/filename.txt";
            #endregion

            #region Outlook Block

            FileInfo fileinfo = new FileInfo(attachmentFileName);

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Attachments.Add(attachmentFileName, OlAttachmentType.olByValue, 1, "textattachment");
            rdoMail.Save();
            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            // Search for the messageID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP("//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the presence of an attachment flag
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "au", null, 1);

            // Verify the attachment and attachment type
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "cd", "attachment", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "/attachments1/filename.txt", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='/attachments1/filename.txt']"), "ct", "text/plain", null, 1);

            #endregion
        }
    }
}
