using System;
using System.Collections.Generic;
using System.Text;
using System.Collections;
using SoapAdmin;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.IO;
using SoapWebClient;
using System.Text.RegularExpressions;
using Redemption;
using System.Xml;

namespace longDurationTests.Client.Mail.Bugs
{
    [TestFixture]
    public class MailBugs :  clientTests.BaseTestFixture
    {
        [Test, Description("Bug 17431: ZCO Syncs only 2 weeks worth of email")]
        [Category("Mail")]
        [Bug("17431")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Inject the 3 old MIME into SyncUser's account",
            "2. ZCO: Sync & verify the contents of the injected message")]
        public void MailBugs_17431()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            // Original MIMEs
            string originalMIME1 = GlobalProperties.TestMailRaw + "/mime/bugMIME17431_1.txt";
            string originalMIME2 = GlobalProperties.TestMailRaw + "/mime/bugMIME17431_2.txt";

            // Changed MIMEs
            string changedMIME1 = GlobalProperties.TestMailRaw + "/mime/bugMIME17431_1_" + GlobalProperties.time() + GlobalProperties.counter() + ".txt";
            string changedMIME2 = GlobalProperties.TestMailRaw + "/mime/bugMIME17431_2_" + GlobalProperties.time() + GlobalProperties.counter() + ".txt";

            // MIME Subjects
            string subject1 = "UBUNTU6 FRANKLIN Sync test on qa30 qa33-xp-olk7 completed";
            string subject2 = "UBUNTU6 FRANKLIN Sync test on qa60 qa33-pst2003 completed";

            // MIME Contents
            ArrayList mime1Contents = new ArrayList();
            mime1Contents.Add("Tests run: 77, Failures: 2, Not run: 7, Time: 757.266 seconds");
            ArrayList mime2Contents = new ArrayList();
            mime2Contents.Add("Tests run: 218, Failures: 44, Not run: 10, Time: 2644.266 seconds");

            #endregion

            #region Modify the Original MIMEs

            #region 1st MIME

            TextReader readMIME1 = new StreamReader(originalMIME1);
            TextWriter writeMIME1 = new StreamWriter(changedMIME1);

            string readLine = null;
            while ((readLine = readMIME1.ReadLine()) != null)
            {
                if (readLine.Contains("SENDER"))
                {
                    readLine = readLine.Replace("SENDER", zAccount.AccountA.emailAddress);
                }

                if (readLine.Contains("RECIPIENT"))
                {
                    readLine = readLine.Replace("RECIPIENT", zAccount.AccountZCO.emailAddress);
                }

                writeMIME1.WriteLine(readLine);
            }
            readMIME1.Close();
            writeMIME1.Close();

            FileInfo modifiedMIME1 = new FileInfo(changedMIME1);
            zAssert.IsTrue(modifiedMIME1.Exists, "Verify modified MIME exists");

            #endregion

            #region 2nd MIME

            TextReader readMIME2 = new StreamReader(originalMIME2);
            TextWriter writeMIME2 = new StreamWriter(changedMIME2);

            readLine = null;
            while ((readLine = readMIME2.ReadLine()) != null)
            {
                if (readLine.Contains("SENDER"))
                {
                    readLine = readLine.Replace("SENDER", zAccount.AccountA.emailAddress);
                }

                if (readLine.Contains("RECIPIENT"))
                {
                    readLine = readLine.Replace("RECIPIENT", zAccount.AccountZCO.emailAddress);
                }

                writeMIME2.WriteLine(readLine);
            }
            readMIME2.Close();
            writeMIME2.Close();

            FileInfo modifiedMIME2 = new FileInfo(changedMIME2);
            zAssert.IsTrue(modifiedMIME2.Exists, "Verify modified MIME exists");

            #endregion

            #endregion

            #region LMTP Inject: Use LMTP to inject the modified MIMEs into the Sync User's mailbox

            #region 1st MIME

            ArrayList mime1Recipients = new ArrayList();
            mime1Recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), changedMIME1, mime1Recipients, GlobalProperties.getProperty("defaultorigination.email"));
            System.Threading.Thread.Sleep(50000);

            #endregion

            #region 2nd MIME

            ArrayList mime2Recipients = new ArrayList();
            mime2Recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), changedMIME2, mime2Recipients, GlobalProperties.getProperty("defaultorigination.email"));
            System.Threading.Thread.Sleep(50000);

            #endregion

            #endregion

            #region Clean up the temporary MIMEs written to the disk

            #region 1st MIME

            // Search the file to be deleted 
            FileInfo tmpFile1 = new FileInfo(changedMIME1);

            // Delete the file
            tmpFile1.Delete();
            zAssert.IsFalse(tmpFile1.Exists, "Verify that the temporary file has been deleted");

            #endregion

            #region 2nd MIME

            // Search the file to be deleted 
            FileInfo tmpFile2 = new FileInfo(changedMIME2);

            // Delete the file
            tmpFile2.Delete();
            zAssert.IsFalse(tmpFile2.Exists, "Verify that the temporary file has been deleted");

            #endregion

            #endregion

            #region Outlook Block: Verify the contents of all the injected MIMEs

            // Sync Outlook
            OutlookCommands.Instance.Sync();

            #region 1st MIME

            // Search for the injected message
            RDOMail rdoMail1 = OutlookMailbox.Instance.findMessage(subject1);
            zAssert.IsNotNull(rdoMail1, "Verify that the injected mail item exists.");

            // Verify the Subject of the injected message
            zAssert.IsTrue(rdoMail1.Subject.Contains(subject1), "Verify the mail subject matches");

            foreach (string content in mime1Contents)
            {
                zAssert.IsTrue(rdoMail1.Body.Contains(content), "Verify the mail content matches the expected.");
            }

            #endregion

            #region 2nd MIME

            // Search for the injected message
            RDOMail rdoMail2 = OutlookMailbox.Instance.findMessage(subject2);
            zAssert.IsNotNull(rdoMail2, "Verify that the injected mail item exists.");

            // Verify the Subject of the injected message
            zAssert.IsTrue(rdoMail2.Subject.Contains(subject2), "Verify the mail subject matches");

            foreach (string content in mime2Contents)
            {
                zAssert.IsTrue(rdoMail2.Body.Contains(content), "Verify the mail content matches the expected.");
            }

            #endregion

            #endregion

        }

        [Test, Description("Bug 15318: ZCO fails to send msg with 1MB attachments")]
        [Category("Mail")]
        [Bug("15318")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: Login as sync user & Send a message with an 1MB attachment to Account1",
            "2. SOAP: Auth as Account1 and verify that the message is received",
            "3. SOAP: Verify that the attachment is received")]
        public void MailBugs_15318()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments/bugAttachment15318.txt";
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
            System.Threading.Thread.Sleep(10000);
            OutlookCommands.Instance.Sync();
            // the problem with this test case is, some times it takes long time to send the attachment and 
            // once its sent, the server to recieve the mail may also take long time. Hence, when SOAP tries to find the
            // mail it fails. This test case needs lot of sleep time. So need to be in long duration tests.
            System.Threading.Thread.Sleep(30000);
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
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "/attachments/bugAttachment15318.txt", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='/attachments/bugAttachment15318.txt']"), "ct", "text/plain", null, 1);

            #endregion

        }

        [Test, Description("Bug 16824: Deleted Items folder appears when opening other user's mailbox")]
        [Category("Mail")]
        [Bug("16824")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "THIS TEST IS PERFORMED WITHOUT SHARING RIGHTS",
            "1. SOAP: Account2 sends an email each to Account1 & Sync User",
            "2. SOAP Auth as Account1 and delete the message",
            "3. SOAP: Auth as Sync User and delete the message",
            "4. ZCO: Login as Sync User, Sync, Mount Account1's mailbox",
            "5. ZCO: Verify that DELETED Items Folder of Account1 is not shown in the secondary store (mounted mailbox)",
            "6. ZCO: Verify that the mail item deleted by Account1 is not visible to the Sync User",
            "7. ZCO: Verify that the mail item deleted by Sync User is visible")]
        public void MailBugs_16824()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            string account1TrashFolderId, zcoTrashFolderId, deletedMessage1, deletedMessage2, message1Id, message2Id;
            #endregion

            #region SOAP Block: Auth as Account2 & send a message each to Account1 and Sync User

            // Send Message
            zAccount.AccountB.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().
                AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                Subject(subject1).
                BodyTextPlain(content1)));
            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            zAccount.AccountB.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().
                AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                Subject(subject2).
                BodyTextPlain(content2)));
            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook Block: Sync the email received by Sync User

            OutlookCommands.Instance.Sync();

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject2);
            zAssert.IsNotNull(rMail, "Checked that the mail exists in Outlook");

            #endregion

            #region SOAP Block: Account1 & Sync User deletes the received message

            #region Account1 deletes the received message

            // Query for the TRASH Folder
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out account1TrashFolderId, 1);

            // Search for the message in INBOX
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject1 + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Delete the message from INBOX
            zAccount.AccountA.sendSOAP(new SoapWebClient.MsgActionRequest().
                SetAction(message1Id, MsgActionRequest.ActionOperation.trash));
            zAccount.AccountA.selectSOAP("//mail:MsgActionResponse/mail:action", null, null, null, 1);

            // Search for the message in TRASH
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("in:" + GlobalProperties.getProperty("globals.trash") + " subject:(" + subject1 + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out deletedMessage1, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "l", account1TrashFolderId, null, 1);

            #endregion

            #region Sync User deletes the received message

            // Query for the TRASH Folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out zcoTrashFolderId, 1);

            // Search for the message in INBOX
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject2 + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Delete the message from INBOX
            zAccount.AccountZCO.sendSOAP(new SoapWebClient.MsgActionRequest().
                SetAction(message2Id, MsgActionRequest.ActionOperation.trash));
            zAccount.AccountZCO.selectSOAP("//mail:MsgActionResponse/mail:action", null, null, null, 1);

            // Search for the message in TRASH
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("in:" + GlobalProperties.getProperty("globals.trash") + " subject:(" + subject2 + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out deletedMessage2, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "l", zcoTrashFolderId, null, 1);

            #endregion

            #endregion

            #region Outlook Block: Sync, Mount Account1's Mailbox, Sync, Verify

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            OutlookCommands.Instance.Sync();

            #region Verify that trash/deleted items folder & mail is not there
            InvalidDataException u = null;
            u = null;
            try
            {
                RDOFolder trashFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            }
            catch (InvalidDataException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to copy the contact to shared folder");
            #endregion

            #region Verify that the mail item deleted by Sync User is visible
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject2, trash, true);
            zAssert.IsNotNull(rdoMail, "Verify the deleted mail exists");

            #endregion

            #endregion

        }

        [Test, Description("Verify that a modified draft message can be synced.")]
        [Category("Mail")]
        [Bug("17542")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "ZCO: Save Draft",
            "Sync",
            "SOAP: Verify Draft",
            "Sync",
            "ZCO: Modify Draft",
            "Sync",
            "SOAP: Verify Draft modified synced correctly")]
        public void MailBugs_17542()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string email1 = "email1" + UtilFunctions.RandomStringGenerator() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string subject2 = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            string email2 = "email2" + UtilFunctions.RandomStringGenerator() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string draft1Id, draft2Id;
            #endregion

            #region Outlook Block: Create & Save a Draft Message (To: Account1), Sync, Send the draft message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject1;
            rdoMail.Body = content1;

            //Add recepient
            rdoMail.To = email1;
            rdoMail.Recipients.ResolveAll(null, null);

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP:Checking the Draft message on ZCS side

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject1 + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draft1Id, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draft1Id));
            XmlNode mailMessage1 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draft1Id + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(mailMessage1, "//mail:content", null, content1, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage1, "//mail:su", null, subject1, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage1, "//mail:e", "a", email1, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage1, "//mail:e", "t", "t", null, 1);
            #endregion

            #region Modifying Draft on ZCO side.
            RDOFolder drafts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts);
            OutlookCommands.Instance.Sync();
            rdoMail = OutlookMailbox.Instance.findMessage(subject1, drafts, true);
            zAssert.IsNotNull(rdoMail, "Verify the initial draft exists");

            zAssert.IsTrue(rdoMail.Body.Contains(content1), String.Format("Verify the initial draft body ({0}) contains the expected ({1})", rdoMail.Body, content1));

            rdoMail.To = email2;
            rdoMail.Subject = subject2;
            rdoMail.Body = content2;
            rdoMail.Save();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP:Checking the Draft message on ZCS side

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject2 + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draft2Id, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draft1Id));
            XmlNode mailMessage2 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draft2Id + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:content", null, content2, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:su", null, subject2, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:e", "a", email2, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:e", "t", "t", null, 1);
            #endregion

        }

        [Test, Description("Bug 10797: Add test case to verify ZCO sending an attachment larger than server allowed limit")]
        [Category("Mail")]
        [Bug("10797")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Auth as Admin and Set Global Settings -> MTA -> Max message size/Max size of uploaded file to a known amount",
            "2. ZCO: Login as sync user & Send 2 messages with 1MB & 6MB attachment to Account1",
            "3. SOAP: Auth as Account1 and verify that the message with 1MB attachment is received and the message with 6MB attachment is not received",
            "4. SOAP: Verify that the received attachment properties",
            "5. SOAP: Reset zimbraFileUploadMaxSize back to original value")]
        public void MailBugs_10797()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string zimbraFileUploadMaxSizeInitial = "10485760"; //Default Install Value = 10485760 bytes;
            const int zimbraFileUploadMaxSizeModified = 5120;
            string attachmentFileName1 = GlobalProperties.TestMailRaw + "/attachments/bugAttachment15318.txt";
            string attachmentFileName2 = GlobalProperties.TestMailRaw + "/attachments/bugAttachment10797.txt";
            #endregion

            try
            {

                #region SOAP Block: Set Global Settings -> MTA -> Max message size/Max size of uploaded file to a known size

                // Get Config Request (zimbraFileUploadMaxSize)
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new GetConfigRequest().
                    GetAttributeValue(ConfigAttributes.zimbraFileUploadMaxSize));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:GetConfigResponse/admin:a[@n='zimbraFileUploadMaxSize']", null, null, out zimbraFileUploadMaxSizeInitial, 1);

                // Modify Config Request (zimbraFileUploadMaxSize = 5MB)
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                    ModifyAttribute(ConfigAttributes.zimbraFileUploadMaxSize, zimbraFileUploadMaxSizeModified.ToString()));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);

                #endregion

                #region Outlook Block: Login as sync user & Send 2 messages with 1MB & 6MB attachment to Account1

                #region Create and send 1st message with 1MB attachment

                RDOMail rdoMail1 = OutlookMailbox.Instance.CreateMail();

                // Set the values
                rdoMail1.Subject = subject1;
                rdoMail1.Body = content1;
                rdoMail1.To = zAccount.AccountA.emailAddress;
                rdoMail1.Recipients.ResolveAll(null, null);

                // Create the email attachment
                FileInfo fileinfo1 = new FileInfo(attachmentFileName1);
                zAssert.IsTrue(fileinfo1.Exists, "Verify that the attachment file exists before attaching it. " + fileinfo1.FullName);
                rdoMail1.Attachments.Add(fileinfo1.FullName, OlAttachmentType.olByValue, 1, "bugAttachment15318");

                rdoMail1.Save();

                // Remember the EntryID for verification later
                string entryId1 = rdoMail1.EntryID;

                rdoMail1.Send();
                OutlookCommands.Instance.Sync();
                #endregion

                #region Create and send 2nd message with 6MB attachment
                RDOMail rdoMail2 = OutlookMailbox.Instance.CreateMail();

                // Set the values
                rdoMail2.Subject = subject2;
                rdoMail2.Body = content2;
                rdoMail2.To = zAccount.AccountA.emailAddress;
                rdoMail2.Recipients.ResolveAll(null, null);

                // Create the email attachment
                FileInfo fileinfo2 = new FileInfo(attachmentFileName2);
                zAssert.IsTrue(fileinfo2.Exists, "Verify that the attachment file exists before attaching it. " + fileinfo2.FullName);
                rdoMail2.Attachments.Add(fileinfo2.FullName, OlAttachmentType.olByValue, 1, "bugAttachment10797");

                rdoMail2.Save();

                // Remember the EntryID for verification later
                string entryId2 = rdoMail2.EntryID;

                rdoMail2.Send();
                OutlookCommands.Instance.Sync();

                #endregion

                #endregion

                #region SOAP Block: Auth as Account1 and verify that the message with 1MB attachment is received and the message with 6MB attachment is not received

                #region Verify that the message with 1MB attachment is received.

                // Search for the messageID
                zAccount.AccountA.sendSOAP(new SearchRequest().
                    Types("message").Query("subject:(" + subject1 + ")"));
                zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

                // Get the message
                zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

                // Verifications
                XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

                // Verify the presence of an attachment flag
                zAccount.AccountA.selectSOAP("//mail:m", "f", "au", null, 1);

                // Verify the attachment and attachment type
                zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "cd", "attachment", null, 1);
                zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "bugAttachment15318.txt", null, 1);
                zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='bugAttachment15318.txt']"), "ct", "text/plain", null, 1);

                #endregion

                #region Verify that the message with 6MB attachment is not received

                // Search for the message
                zAccount.AccountA.sendSOAP(new SearchRequest().
                    Types("message").Query("subject:(" + subject2 + ")"));
                zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 0);

                #endregion

                #endregion

            }
            finally
            {

                #region SOAP Block: Set Global Settings -> MTA -> Max message size/Max size of uploaded file to original size

                // Modify Config Request (Reset zimbraFileUploadMaxSize to Original Value)
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                    ModifyAttribute(ConfigAttributes.zimbraFileUploadMaxSize, zimbraFileUploadMaxSizeInitial));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);

                #endregion

            }
        }


    }
}