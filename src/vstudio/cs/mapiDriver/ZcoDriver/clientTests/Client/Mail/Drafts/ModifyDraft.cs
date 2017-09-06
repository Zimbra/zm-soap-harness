using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using SoapAdmin;
using System.IO;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Xml;

namespace clientTests.Client.Mail.Drafts
{
    [TestFixture]
    public class ModifyDraft : BaseTestFixture
    {
        [Test, Description("Verify that a modified draft message can be synced.")]
        [Category("Mail")]
        [Bug("31672")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "SOAP: Save Draft",
            "Sync",
            "SOAP: Modify Draft - update the content",
            "Sync",
            "ZCO: Verify modifications")]
        public void ModifyDraft_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedContent = "Modified Content" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId;
            #endregion

            #region SOAP Block
            // Create the initial draft
            zAccount.AccountZCO.sendSOAP(new SaveDraftRequest().
                                         AddMessage(new MessageObject().
                                         Subject(subject).
                                         BodyTextPlain(content)));

            zAccount.AccountZCO.selectSOAP("//mail:SaveDraftResponse/mail:m", "id", null, out draftId, 1);

            #endregion

            #region Outlook block to modify the draft
            OutlookCommands.Instance.Sync();
            RDOFolder draftsFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts);
            zAssert.IsNotNull(draftsFolder, "Check that the drafts folder exists");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, draftsFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the initial draft is found");
            #endregion

            #region SOAP: Modify Draft
            zAccount.AccountZCO.sendSOAP(new SaveDraftRequest().
                                         AddMessage(new MessageObject().
                                         SetZimbraID(draftId).
                                         Subject(subject).
                                         BodyTextPlain(modifiedContent)));

            zAccount.AccountZCO.selectSOAP("//mail:SaveDraftResponse/mail:m", "id", null, out draftId, 1);

            #endregion

            #region Outlook Block: verify modification
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject, draftsFolder, true);
            zAssert.IsNotNull(rdoMail, "Verify that the updated draft exists");

            zAssert.IsTrue(rdoMail.Body.Contains(modifiedContent), String.Format("Verify the updated draft body ({0}) contains the expected ({1})", rdoMail.Body, modifiedContent));
            #endregion
        }

        [Test, Description("Send a saved draft.")]
        [Category("SMOKE"), Category("Mail")]
        [Bug("28769")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Create & Save a Draft Message (To: Account1)",
            "2. ZCO: Send the draft message",
            "3. SOAP: Auth as Account1 & verify that the message is received",
            "4. SOAP: Auth as Sync User & Verify that the message is in the SENT folder.")]
        public void ModifyDraft_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, receivedMessageId, sentMessageId, inboxId, sentFolderId, draftsFolderId;
            #endregion

            #region SOAP Block: Create & Save a Draft Message (To: Account1)
            // Create the initial draft
            zAccount.AccountZCO.sendSOAP(new SaveDraftRequest().
                                         AddMessage(new MessageObject().
                                         AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                                         Subject(subject).
                                         BodyTextPlain(content)));

            zAccount.AccountZCO.selectSOAP("//mail:SaveDraftResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            #endregion

            #region Outlook Block: Send the draft message
            OutlookCommands.Instance.Sync();
            RDOFolder draftsFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts);
            zAssert.IsNotNull(draftsFolder, "Check that the drafts folder exists");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, draftsFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the initial draft is found");
            zAssert.IsTrue(rMail.Body.Contains(content), String.Format("Verify the updated draft body ({0}) contains the expected ({1})", rMail.Body, content));

            rMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP: Verification in Account1's & Sync User's mailbox

            #region Verification in Account1's mailbox - Verify that the message is received in the INBOX

            //Get the Id of the inbox
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Search for the Message ID
            System.Threading.Thread.Sleep(2000);
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out receivedMessageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(receivedMessageId));

            // Verifications
            XmlNode mailMessage1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + receivedMessageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(mailMessage1, "//mail:su", null,subject, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, "//mail:content", null, content, null, 1);

            // Verify that the message is found in the SENT folder
            System.Threading.Thread.Sleep(5000);
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.selectSOAP(mailMessage1, ("//mail:m[@id='" + receivedMessageId + "']"), "l", inboxId, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

            #region Verification in Sync User's mailbox - Verify that the message is in the SENT folder

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out sentMessageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(sentMessageId));

            // Verifications
            XmlNode mailMessage2 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + sentMessageId + "']", null, null, null, 1);

            // Verify that the message is found in the SENT folder
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:m[@id='" + sentMessageId + "']"), "l", sentFolderId, null, 1);

            // Verify that the message is not found in the DRAFTS folder
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:m[@id='" + sentMessageId + "']"), "l", draftsFolderId, null, 0);

            // Verify the Subject and Content
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:content", null, content, null, 1);

            // Verify the "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

            #endregion

        }

        [Test, Description("Send a saved draft.")]
        [Category("Mail")]
        [Bug("28769")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. ZCO: Create & Save a Draft Message (To: Account1)",
            "2. ZCO: Send the draft message",
            "3. SOAP: Auth as Account1 & verify that the message is received",
            "4. SOAP: Auth as Sync User & Verify that the message is in the SENT folder.")]
        public void ModifyDraft_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string receivedMessageId, sentMessageId, inboxId, sentFolderId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message (To: Account1), Sync, Send the draft message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;

            //Add recepient
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            try
            {
                // Send draft
                rdoMail.Send();
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                //OLK2010 test fails due to this error. As per http://msdn.microsoft.com/en-us/library/office/cc839989.aspx this can happen if another client is simultaneously committing changes to the object. Handled the exception as below
                if (e.Message.Contains("MAPI_E_OBJECT_CHANGED")) 
                {
                    rdoMail.Save();
                    rdoMail.Send();
                }
            }

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP: Verification in Account1's & Sync User's mailbox

            #region Verification in Account1's mailbox - Verify that the message is received in the INBOX

            //Get the Id of the inbox
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Search for the Message ID
            System.Threading.Thread.Sleep(2000);
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out receivedMessageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(receivedMessageId));

            // Verifications
            XmlNode mailMessage1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + receivedMessageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(mailMessage1, "//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, "//mail:content", null, content, null, 1);

            // Verify that the message is found in the SENT folder
            zAccount.AccountZCO.selectSOAP(mailMessage1, ("//mail:m[@id='" + receivedMessageId + "']"), "l", inboxId, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

            #region Verification in Sync User's mailbox - Verify that the message is in the SENT folder

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            System.Threading.Thread.Sleep(5000);
            OutlookCommands.Instance.Sync();

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out sentMessageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(sentMessageId));

            // Verifications
            XmlNode mailMessage2 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + sentMessageId + "']", null, null, null, 1);

            // Verify that the message is found in the SENT folder
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:m[@id='" + sentMessageId + "']"), "l", sentFolderId, null, 1);

            // Verify that the message is not found in the DRAFTS folder
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:m[@id='" + sentMessageId + "']"), "l", draftsFolderId, null, 0);

            // Verify the Subject and Content
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:content", null, content, null, 1);

            // Verify the "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

            #endregion
        }

        [Test, Description("Send a saved draft.")]
        [Category("Mail")]
        [Bug("28769")]
        [SyncDirection(SyncDirection.TOZCO)]
        //[Ignore("Send Draft Request Under Development")]
        [TestSteps(
            "1. ZCO: Create & Save a Draft Message (To: Account1)",
            "2. SOAP: Send the draft message",
            "3. SOAP: Auth as Account1 & verify that the message is received",
            "4. SOAP: Auth as Sync User & Verify that the message is in the SENT folder.")]
        public void ModifyDraft_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string receivedMessageId, sentMessageId, inboxId, sentFolderId, draftsFolderId, draftMessageId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message (To: Account1), Sync

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;

            //Add recepient
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Send the draft message

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftMessageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftMessageId));

            // Send the saved draft
            zAccount.AccountZCO.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m origid='"+ draftMessageId +@"'>
                        <e t='t' a='"+ zAccount.AccountA.emailAddress +@"'/>
                        <su>"+ subject +@"</su>
                        <mp ct='text/plain'>
                            <content>"+ content +@"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);
            #endregion

            #region SOAP: Verification in Account1's & Sync User's mailbox

            #region Verification in Account1's mailbox - Verify that the message is received in the INBOX

            //Get the Id of the inbox
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Search for the Message ID
            System.Threading.Thread.Sleep(2000);
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out receivedMessageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(receivedMessageId));

            // Verifications
            XmlNode mailMessage1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + receivedMessageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(mailMessage1, "//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, "//mail:content", null, content, null, 1);

            // Verify that the message is found in the SENT folder
            zAccount.AccountZCO.selectSOAP(mailMessage1, ("//mail:m[@id='" + receivedMessageId + "']"), "l", inboxId, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

            #region Verification in Sync User's mailbox - Verify that the message is in the SENT folder

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Search for the Message ID
            System.Threading.Thread.Sleep(5000);
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out sentMessageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(sentMessageId));

            // Verifications
            XmlNode mailMessage2 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + sentMessageId + "']", null, null, null, 1);

            // Verify that the message is found in the SENT folder
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:m[@id='" + sentMessageId + "']"), "l", sentFolderId, null, 1);

            // Verify that the message is not found in the DRAFTS folder
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:m[@id='" + sentMessageId + "']"), "l", draftsFolderId, null, 0);

            // Verify the Subject and Content
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, "//mail:content", null, content, null, 1);

            // Verify the "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage2, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

            #endregion

        }
    }
}