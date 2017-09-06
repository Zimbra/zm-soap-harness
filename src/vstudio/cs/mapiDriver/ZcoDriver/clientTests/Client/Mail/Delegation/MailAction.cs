using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using SoapWebClient;
using SoapAdmin;
using System.Text.RegularExpressions;
using Redemption;
using System.Xml;

namespace clientTests.Client.Mail.Delegation
{
    [TestFixture]
    public class MailAction : BaseTestFixture
    {
        [Test, Description("Verify ZCO can Reply to mail in shared mail folder")]
        [Category("SMOKE"), Category("Mail")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Account2 send message to:account1", "Account1 shares mail folder to syncuser with admin rights", "Syncuser mounts the shared folder and sync",
            "Syncuser replies to account2 from shared folder", "Verify sync user can reply, verify send by, from, on-behalf")]
        public void MailAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Id, originalMessageId, inboxId, message2Id, sentId;

            #region SOAP Block - Grant SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<GrantRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountA.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </GrantRightRequest>");

            #endregion

            #region SOAP Block - Account A shares Inbox folder with ZCO user

            //Account A shares inbox to ZCO user
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoAdministrator));

            #endregion

            #region SOAP Block: AccountB sends a message to AccountA

            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content)));

            //Account A get the message id
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, mountpointInbox, false);
            zAssert.IsNotNull(rmail, "Verify that the mail appears in the delegate store");

            //Reply to the mail
            // Change to mailReplyOOM as mailReply() methog was not working. replied mail used to get in the draft 
            // folder. mailReplyOOM() is not solving the problem either...however, it now tries to sends replied 
            // mail. However, it fails. Still checking in the code as it is one step closer to solution.
            RDOMail replyMail = OutlookMailbox.Instance.mailReplyOOM(rmail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");
            replyMail.Recipients.ResolveAll(null, null);
            replyMail.Save();
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            System.Threading.Thread.Sleep(3000);
            OutlookCommands.Instance.Sync();

            #endregion

            #region soap

            //login as account2 and verify the reply has on behalf
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(message2Id));

            XmlNode mailMessage = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message2Id + "']", null, null, null, 1);

            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account2
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            //login as account1 and verify if the reply appears in sent folder
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                                        originalMessageId + "']", null, null, null, 1);

            // Check that the original message
            // Status: replied 
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "r", null, 1);

            /* As per https://bugzilla.zimbra.com/show_bug.cgi?id=48018#c13, SOBO messages are also no longer copied
               to the delegator's Sent Items folder. So, commenting below code block.
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").
                                                Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                                        message1Id + "']", null, null, null, 1);

            // Check that the reply is in the sent
            // Folder: sent
            // Status: sent/unread
            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account2
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "s", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "u", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);
             */

            #endregion

        }

        [Test, Description("Verify ZCO can ReplyAll to mail in shared mail folder")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Account2 send message to:account1", "Account1 shares mail folder to syncuser with admin rights", "Syncuser mounts the shared folder and sync",
            "Syncuser replies all from shared folder", "Verify sync user can reply, verify send by, from, on-behalf")]
        public void MailAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Id, originalMessageId, inboxId, message2Id, sentId, message3Id;
            #endregion

            #region SOAP Block - Grant SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<GrantRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountA.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </GrantRightRequest>");

            #endregion

            #region SOAP Block - Account A shares Inbox folder with ZCO user
            
            ////Account A shares inbox to ZCO user
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoAdministrator));

            #endregion

            #region SOAP Block: AccountB sends a message to AccountA
            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountC.emailAddress).
                            BodyTextPlain(content)));

            //Account A get the message id
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, mountpointInbox, false);
            zAssert.IsNotNull(rmail, "Verify that the mail appears in the delegate store");

            //Reply to the mail
            // Change to mailReplyOOM as mailReply() methog was not working. replied mail used to get in the draft 
            // folder. mailReplyOOM() is not solving the problem either...however, it now tries to sends replied 
            // mail. However, it fails. Still checking in the code as it is one step closer to solution.
            RDOMail replyMail = OutlookMailbox.Instance.mailReplyOOM(rmail, OutlookMailbox.mailReplyType.replyAll);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");
            replyMail.Recipients.ResolveAll(null, null);
            replyMail.Save();
            replyMail.Send();
            OutlookCommands.Instance.Sync();

            System.Threading.Thread.Sleep(3000);
            OutlookCommands.Instance.Sync();

            #endregion

            #region soap

            //login as account2 and verify the reply has on behalf
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ") in:inbox"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(message2Id));

            XmlNode mailMessage = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message2Id + "']", null, null, null, 1);

            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account2
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            //login as account3 and verify the reply has on behalf
            zAccount.AccountC.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ") in:inbox"));

            zAccount.AccountC.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message3Id, 1);

            // Get the message
            zAccount.AccountC.sendSOAP(new GetMsgRequest().
                Message(message3Id));

            mailMessage = zAccount.AccountC.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                message3Id + "']", null, null, null, 1);

            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account2
            // Cc: account3
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            //login as account1 and verify if the reply appears in Inbox and sent folder
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                                        
                originalMessageId + "']", null, null, null, 1);

            // Check that the original message
            // Status: replied
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "r", null, 1);

            // Search the message again to find it in Inbox folder
            zAccount.AccountA.sendSOAP(new SearchRequest().
                                      Types("message").
                                      Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                                        message1Id + "']", null, null, null, 1);

            // Check that the reply is in the Inbox
            // Folder: sent
            // Status: sent/unread
            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account2
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "l", inboxId, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "u", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            /* As per https://bugzilla.zimbra.com/show_bug.cgi?id=48018#c13, SOBO messages are also no longer copied
               to the delegator's Sent Items folder. So, commenting below code block.
            zAccount.AccountA.sendSOAP(
                                        new SearchRequest().
                                                Types("message").
                                                Query("in:sent subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                                        message1Id + "']", null, null, null, 1);

            // Check that the reply is in the sent
            // Subject: RE: <original subject>
            // Folder: sent
            // Status: sent/unread
            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account2
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "u", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "s", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);
            */

            #endregion

        }
        [Test, Description("Verify ZCO can Forward mail in shared mail folder")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Account2 send message to:account1", "Account1 shares mail folder to syncuser with admin rights", "Syncuser mounts the shared folder and sync",
            "Syncuser forwards to account3 from shared folder", "Verify the mail is forwarded, verify send by, from, on-behalf")]
        public void MailAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Id, originalMessageId, inboxId, sentId, message3Id;

            #region SOAP Block - Grant SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<GrantRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountA.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </GrantRightRequest>");

            #endregion

            #region SOAP Block - Account A shares Inbox folder with ZCO user
            //Account A shares inbox to ZCO user
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoAdministrator));

            #endregion

            #region SOAP Block: AccountB sends a message to AccountA

            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content)));

            //Account A get the message id
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, mountpointInbox, false);
            zAssert.IsNotNull(rmail, "Verify that the mail appears in the delegate store");

            //Reply to the mail
            RDOMail fwdMail = OutlookMailbox.Instance.mailReplyOOM(rmail, OutlookMailbox.mailReplyType.forward);
            zAssert.IsNotNull(fwdMail, "Verify that the reply mail object is created");

            fwdMail.To = zAccount.AccountC.emailAddress;
            fwdMail.Send();
            OutlookCommands.Instance.Sync();

            System.Threading.Thread.Sleep(3000);
            OutlookCommands.Instance.Sync();

            #endregion

            #region soap

            //login as account3 and verify the reply has on behalf
            zAccount.AccountC.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountC.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message3Id, 1);

            // Get the message
            zAccount.AccountC.sendSOAP(new GetMsgRequest().
                Message(message3Id));

            XmlNode mailMessage = zAccount.AccountC.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                message3Id + "']", null, null, null, 1);

            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account3
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountC.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(mailMessage, "//mail:su", null, fwdMail.Subject, null, 1);

            //login as account1 and verify if the forward appears in sent folder
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                                        originalMessageId + "']", null, null, null, 1);

            // Check that the original message
            // Status: forwarded 
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "w", null, 1);

            /* As per https://bugzilla.zimbra.com/show_bug.cgi?id=48018#c13, SOBO messages are also no longer copied
               to the delegator's Sent Items folder. So, commenting below code block.
            // Search the message again to find it in sent folder
            zAccount.AccountA.sendSOAP(
                                        new SearchRequest().
                                                Types("message").
                                                Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                                        message1Id + "']", null, null, null, 1);

            // Check that the mail forwarded is in the sent
            // Folder: sent
            // Status: sent/unread
            // From: account1
            // Sender: syncuser
            // Reply: syncuser
            // To: account2
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "s", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "u", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='f']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='s']", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e[@t='t']", "a", zAccount.AccountC.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, fwdMail.Subject, null, 1);
            */

            #endregion

            #region SOAP Block - Revoke SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<RevokeRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountA.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </RevokeRightRequest>");

            #endregion

        }

        [Test, Description("Verify ZCO can Delete mail in shared folder (rights=ZCOAdministrator)")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Account1 shares mail folder to syncuser with admin rights", "syncuser mounts the shared folder", "synuser deletes the mail from shared mail folder",
            "Verify that syncuser can delete the mail from shared folder")]
        public void MailAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, messageId;
            #endregion

            #region SOAP Block - Account A shares Inbox folder with ZCO user
            //Account A shares inbox to ZCO user
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoAdministrator));

            #endregion

            #region SOAP Block: AccountB sends a message to AccountA
            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content)));

            //Account A get the message id
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, mountpointInbox, false);
            zAssert.IsNotNull(rmail, "Verify that the mail appears in the delegate store");
            //Move the mail to trash
            RDOFolder trashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            rmail.Delete(redDeleteFlags.dfSoftDelete);
            OutlookCommands.Instance.Sync();
            #endregion

            #region soap
            //login as account1 and verify that mail search returns nothing
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            zAccount.AccountA.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_MSG", null, 1);

            #endregion

        }

        [Test, Description("Verify ZCO can Move mail from one shared folder to another shared folder (rights=ZCOAdministrator)")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Account1 shares two mail folder to syncuser with admin rights", "syncuser mounts the shared folders", "synuser moves the mail from one shared folder to another",
            "Verify that mail is moved to another shared folder")]
        public void MailAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, messageId, folderId;
            #endregion

            #region SOAP Block: Delegate creates folder and shares it
            //Account A shares inbox to ZCO user
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(folderName).SetParent(inboxId)));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    folderId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoAdministrator));

            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content)));

            //Account A get the message id
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region Outlook block 
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder = OutlookMailbox.Instance.findFolder(folderName, mountpointInbox, true);
            zAssert.IsNotNull(folder, "Verify that the folder in the store appears in the ZCO mailbox after adding it");

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, mountpointInbox, false);
            zAssert.IsNotNull(rmail, "Verify that the mail appears in the delegate store");

            rmail.Move(folder);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            //search the mail in other folder store
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@l='" + folderId + "']", null, null, null, 1);

            #endregion
        }
    }
}
