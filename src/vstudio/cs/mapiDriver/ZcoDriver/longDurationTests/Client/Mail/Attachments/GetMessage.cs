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

namespace longDurationTests.Client.Mail.Attachments
{
    [TestFixture]
    public class GetMessage : BaseTestFixture
    {
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
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments/bugAttachment10797.txt";
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
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

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
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "bugAttachment10797.txt", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='bugAttachment10797.txt']"), "ct", "text/plain", null, 1);

            #endregion
        }

    }
}
