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

namespace clientTests.Client.Mail
{
    [TestFixture]
    public class MailAction : BaseTestFixture
    {
        [Test, Description("Verify Copy Message is synced to server")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Send a mail from ZCO", "Sync", "Auth as ZCOuser in ZCS and verify the mail is received correctly", "Copy the Message to two other folders in ZCO and sync",
            "Auth as ZCOuser in ZCS and verify the mail is copied and there are 3 copies on the server")]
        public void MailAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folder1 = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string folder2 = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string folder1id, folder2id, messageId, inboxId;
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountZCO.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            # region Soap
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Create the subfolders
            zAccount.AccountZCO.sendSOAP(
                new CreateFolderRequest().
                AddFolder(new FolderObject().                                                                        
                SetParent(inboxId).
                SetName(folder1)));
            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folder1id, 1);

            zAccount.AccountZCO.sendSOAP(
                new CreateFolderRequest().
                AddFolder(new FolderObject().
                SetParent(inboxId).
                SetName(folder2)));
            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folder2id, 1);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:m", "id", null, out messageId, 1);

            #endregion            

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");

            RDOFolder rdofolder1 = OutlookMailbox.Instance.findFolder(folder1, inboxFolder, true);
            zAssert.IsNotNull(rdofolder1, "Check that the folder created exists");

            RDOFolder rdofolder2 = OutlookMailbox.Instance.findFolder(folder2, inboxFolder, true);
            zAssert.IsNotNull(rdofolder2, "Check that the folder created exists");

            rMail.CopyTo(rdofolder1);
            rMail.CopyTo(rdofolder2);

            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap

            // Search for the message
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").
                Query("subject:(" + subject + ")"));

            // Check that message is present in all the folders and there are 3 instance of the messages
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m[@l='" + inboxId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m[@l='" + folder1id + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m[@l='" + folder2id + "']", null, null, null, 1);

            #endregion
        }

        [Test, Description("Verify Move Message is synced to server")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Send a mail from ZCO", "Sync", "Auth as syncuser in ZCS and verify the mail is received correctly", "Move the Message to new folder in ZCO and sync",
            "Auth as ZCOuser in ZCS and verify the mail is moved to this new folder on the server")]
        public void MailAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folder = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string folderId, messageId, inboxId;
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountZCO.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            # region Soap
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Create the subfolders
            zAccount.AccountZCO.sendSOAP(
                new CreateFolderRequest().
                AddFolder(new FolderObject().
                SetParent(inboxId).
                SetName(folder)));
            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:m", "id", null, out messageId, 1);

            #endregion            

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            //[03/25/2011] find message specifically in inbox folder. This test case may be failing because findMessage may not be finding the correct email. 
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox), false);
            //RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");

            RDOFolder rdofolder = OutlookMailbox.Instance.findFolder(folder, inboxFolder, true);
            zAssert.IsNotNull(rdofolder, "Check that the folder created exists");

            zAssert.IsNotNull(rMail.Move(rdofolder), "Verify that the mail was moved");
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap

            // Search for the message
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").
                Query("subject:(" + subject + ")"));

            // Check that message is present only in the folder it was moved
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m[@l='" + folderId + "']", null, null, null, 1);

            #endregion
        }

        [Test, Description("Verify ZCO can Flag a message")]
        [Category("SMOKE"), Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to ZCO User",
            "2. SOAP: Auth as ZCO User & verify that the message is received correctly and is unflagged",
            "3. ZCO: Sync, Flag the Message (Any FLAG except for Outlook's COMPLETED FLAG), Sync",
            "4. SOAP: Auth as ZCO User & verify that the message is flagged")]
        public void MailAction_03_1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is UNFLAGED
            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "f", null, 0);

            #endregion

            #region Outlook Block: Sync, Flag the Message (Any FLAG except for Outlook's COMPLETED FLAG), Sync

            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox), false);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olNoFlag, rMail.FlagStatus, "Check that the message has no flags");

            // Flag the Message (Any FLAG except for Outlook's COMPLETED FLAG)
            rMail.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            rMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Auth as ZCO User & verify that the message is flagged
            // [03/22/2011] looks like code is fine. However, during automation run it fails. If I run it from VS it passes. So my suspicion is that by the time ZCO syncs and SOAP reads the mail, the sync may not have completely happend and it may read the mail with old flag value.
            // lets see if putting to sleep helps.
            // [03/25a/2011] it did not help.
            System.Threading.Thread.Sleep(3000);
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is UNFLAGED
            XmlNode m1 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(m1, "//mail:m", "f", "f", null, 1);

            #endregion
        }

        [Test, Description("Verify ZCO can Flag a message")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to ZCO User",
            "2. SOAP: Auth as ZCO User & verify that the message is received correctly and is unflagged",
            "3. ZCO: Sync, Flag the Message (Any FLAG except for Outlook's COMPLETED FLAG), Sync",
            "4. SOAP: Auth as ZCO User & verify that the message is flagged",
            "5. ZCO: Sync, Flag the Message (Outlook's COMPLETED FLAG), Sync",
            "6. SOAP: Auth as ZCO User & verify that the message is unflagged")]
        public void MailAction_03_2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is UNFLAGED
            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "f", null, 0);

            #endregion

            #region Outlook Block: Sync, Flag the Message (Any FLAG except for Outlook's COMPLETED FLAG), Sync

            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olNoFlag, rMail.FlagStatus, "Check that the message has no flags");

            // Flag the Message (Any FLAG except for Outlook's COMPLETED FLAG)
            rMail.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            rMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Auth as ZCO User & verify that the message is flagged

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is UNFLAGED
            XmlNode m1 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(m1, "//mail:m", "f", "f", null, 1);

            #endregion

            #region Outlook Block: Sync, Flag the Message (Outlook's COMPLETED FLAG), Sync
            OutlookCommands.Instance.Sync();

            // Find the message verify that its flagged.
            RDOMail rMailFlagged = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMailFlagged, "Check that message the received message exists in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olFlagMarked, rMailFlagged.FlagStatus, "Check that the message has no flags");

            // Flag the Message (Outlook's COMPLETED FLAG)
            rMail.FlagStatus = (int)OlFlagStatus.olFlagComplete;
            rMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Auth as ZCO User & verify that the message is unflagged
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is UNFLAGED
            XmlNode m2 = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(m2, "//mail:m", "f", "f", null, 0);

            #endregion

        }

        [Test, Description("Verify that a Flagged message syncs to ZCO")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to ZCO User",
            "2. SOAP: Auth as ZCO User & verify that the message is received correctly and is unflagged",
            "3. SOAP: Flag the Message",
            "4. ZCO: Sync, Verify that the message is flagged")]
        public void MailAction_03_3()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User, Verify message is received & unflagged, Now flag the message

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is UNFLAGED
            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "f", null, 0);

            // Flag the message
            zAccount.AccountZCO.sendSOAP(new MsgActionRequest().SetAction(messageId, MsgActionRequest.ActionOperation.flag));
            #endregion

            #region Outlook Block: Sync, Verify that the message is Flagged
            OutlookCommands.Instance.Sync();

            // Find the message verify that its flagged.
            RDOMail rMailFlagged = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMailFlagged, "Check that message the received message exists in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olFlagMarked, rMailFlagged.FlagStatus, "Check that the message has no flags");
            #endregion
        }

        [Test, Description("Verify Tag Message is synced to server")]
        [Category("SMOKE"), Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Send a mail from ZCO", "Sync", "Auth as ZCOuser in ZCS and verify the mail is received correctly", "Tag the Message in ZCO and sync",
            "Auth as ZCOuser in ZCS and verify the mail is tagged")]
        public void MailAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tag = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, tagId;
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountZCO.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("in:inbox subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:m", "id", null, out messageId, 1);
            #endregion            

            #region Outlook Block: Sync, Verify that the message is Flagged
            OutlookCommands.Instance.Sync();

            // Find the message 
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");

            //Tag the message
            rMail.Categories = tag;
            rMail.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("in:inbox subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            //Get the tag Id
            zAccount.AccountZCO.sendSOAP(new GetTagRequest());
            zAccount.AccountZCO.selectSOAP("//mail:GetTagResponse/mail:tag[@name='" + tag + "']", "id", null, out tagId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is tagged
            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP("//mail:m", "t", tagId, null, 1);
            #endregion
        }

        [Test, Description("Verify Delete Message (move to Trash) is synced to server")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Send a mail from ZCO", "Sync", "Auth as ZCOuser in ZCS and verify the mail is received correctly", "Delete (move to trash) the Message in ZCO and sync",
            "Auth as ZCOuser in ZCS and verify the mail is moved to trash")]
        public void MailAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            
            string messageId, trashFolderId;
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountZCO.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            # region Soap

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ") in:inbox"));
            zAccount.AccountZCO.selectSOAP("//mail:m", "id", null, out messageId, 1);
            #endregion 
           
            #region Outlook Block to move the message to Trash folder
            OutlookCommands.Instance.Sync();

            // Find the message 
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox), false);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");

            //Move message to trash
            rMail.Delete(redDeleteFlags.dfMoveToDeletedItems);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            System.Threading.Thread.Sleep(5000);
            // For debugging purpose, lets see how the message looks like and what folder it is in.
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out trashFolderId, 1);

            //Search for the message in trash
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").
                Query("in:" + GlobalProperties.getProperty("globals.trash") + " subject:(" + subject + ")"));

            // Check that message is deleted (moved to trash)
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "l", trashFolderId, null, 1); 

            #endregion
        }

        [Test, Description("Verify Delete Message (hard delete) is synced to server")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Send a mail from ZCO", "Sync", "Auth as ZCOuser in ZCS and verify the mail is received correctly", "Delete (hard delete) the Message in ZCO and sync",
            "Auth as ZCOuser in ZCS and verify the mail is deleted")]
        public void MailAction_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folder = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountZCO.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            # region Soap

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ") in:inbox"));
            zAccount.AccountZCO.selectSOAP("//mail:m", "id", null, out messageId, 1);
            #endregion

            #region Outlook Block to hard delete the message
            OutlookCommands.Instance.Sync();

            // Find the message and delete it
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox), false);
            //RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            rMail.Delete(redDeleteFlags.dfSoftDelete);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            System.Threading.Thread.Sleep(5000);
            
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            zAccount.AccountZCO.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_MSG", null, 1);
            #endregion
        }

        [Test, Description("Verify that ZCO User can Forward a message (from the Primary Email Address)")]
        [Category("Mail")]
        [Bug("30907")]
        [SyncDirection(SyncDirection.TOZCS)]
        /*PrashantA [3-Jan-11]: With mailReply(), mail was forwarded to recipients, but Sent folder was not synced from ZCO to ZWC.
         * So, used mailReplyOOM() which forwards the saved draft and the sent mail is synced from ZCO to ZCS. However, the sent item loses the mime format when synced to ZCS, hence the sent item shows from/to/cc/bcc fields as unknown. So, have commented the soap validation of Sent mail of ZCO user account. The email received by the recipients has correct mime and shows from/to/cc/bcc fields correctly, so added the soap validation of recipient's account
         */
        [TestSteps(
            "1. SOAP: Account1 sends a message to ZCO User (To: Primary Email Address)",
            "2. ZCO: ZCO Users forwards the message to Account2, Account3, Account4 (To:Account2, CC:Account3, BCC:Account3)",
            "3. SOAP: Verify that the sent message appears in SENT folder and the FORWARDED status is set",
            "4. SOAP: Verify the message status in inbox of Account2, Account3 & Account4")]
        public void MailAction_07_1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string toEmailAddress = zAccount.AccountB.emailAddress;
            string ccEmailAddress = zAccount.AccountC.emailAddress;
            string bccEmailAddress = zAccount.AccountD.emailAddress;
            string originalMessageId, inboxId, sentId, forwardMessageId;
            timestampTestCaseMaximum = 90;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User (To: Primary Email Address)
            
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            
            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User forwards the message
            
            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");

            //Create reply mail object
            //Changed to mailReplyOOM() as the forwarded item was not getting synced to ZCS
            //RDOMail forwardMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.forward);
            RDOMail forwardMail = OutlookMailbox.Instance.mailReplyOOM(rmail, OutlookMailbox.mailReplyType.forward);
           
            zAssert.IsNotNull(forwardMail, "Verify that the reply mail object is created");
            
            //Add the recepients
            forwardMail.To = toEmailAddress;
            forwardMail.CC = ccEmailAddress;
            forwardMail.BCC = bccEmailAddress;

            forwardMail.Send();
            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: ZCO User - Verify that the sent message appears in SENT folder and the FORWARDED status is set

            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();

            // Search for the message using the Original Message ID retrieved before forwarding
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + originalMessageId + "']", null, null, null, 1);

            // Check that the original message has the status as FORWARDED 
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "wu", null, 1);

            // Search the message again to find it in SENT folder
            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ") in:sent"));
         
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(forwardMessageId));

            m = zAccount.AccountZCO.selectSOAP( "//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);

            // Check that the mail forwarded is in the sent
            // Folder: Sent
            // Status: Forwarded /Unread
            // From: ZCO User
            // Sender: ZCO User
            // Reply: ZCO User
            // To: account2
            // Cc: account3
            // BCc: account4
            zAccount.AccountZCO.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "s", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "u", null, 1);

            //Have commented the soap validation of ZCO user's sent item as the sent item mime gets malformed.

            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);

            #endregion

            #region SOAP Block: accountB, accountC, accountD users - Verify that the sent message appears in inbox folder and the FORWARDED status is set


            //AccountB
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(forwardMessageId));
            m = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);

            //AccountC
            zAccount.AccountC.sendSOAP(new SearchRequest().
             Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountC.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);
            zAccount.AccountC.sendSOAP(new GetMsgRequest().Message(forwardMessageId));
            m = zAccount.AccountC.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);
            zAccount.AccountC.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountC.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);

            //AccountD
            zAccount.AccountD.sendSOAP(new SearchRequest().
             Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountD.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);
            zAccount.AccountD.sendSOAP(new GetMsgRequest().Message(forwardMessageId));
            m = zAccount.AccountD.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);
            zAccount.AccountD.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountD.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);

            #endregion
        }

        [Test, Description("Verify that ZCO User can Forward a message (from the Alias Email Address)")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to ZCO User (To: Alias Email Address)",
            "2. ZCO: ZCO Users forwards the message to Account2, Account3, Account4 (To:Account2, CC:Account3, BCC:Account3)",
            "3. SOAP: Verify that the sent message appears in SENT folder and the FORWARDED status is set",
            "4. SOAP: Verify the message status in inbox of Account2, Account3 & Account4")]
        /*PrashantA [3-Jan-11]: Used mailReplyOOM() for same reason as of MailAction_07_1 issue
         */
        public void MailAction_07_2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string aliasDisplayName = "ZCOUser_Alias" + GlobalProperties.time() + GlobalProperties.counter();
            string aliasAddress = aliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string toEmailAddress = zAccount.AccountB.emailAddress;
            string ccEmailAddress = zAccount.AccountC.emailAddress;
            string bccEmailAddress = zAccount.AccountD.emailAddress;
            string originalMessageId, inboxId, sentId, forwardMessageId, message2Id, message3Id, message4Id;
            #endregion

            #region Create email alias for the ZCO user
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, aliasAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User (To: Alias Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, aliasAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);


            //Get the folder ID of sent and inbox of ZCO user
           
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            System.Threading.Thread.Sleep(2000);
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User forwards the message
            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject);

            //Create reply mail object

            //Changed to mailReplyOOM() as the forwarded item was not getting synced to ZCS
            //RDOMail forwardMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.forward);
            RDOMail forwardMail = OutlookMailbox.Instance.mailReplyOOM(rmail, OutlookMailbox.mailReplyType.forward);
            zAssert.IsNotNull(forwardMail, "Verify that the reply mail object is created");

            //Add the recepients
            forwardMail.To = toEmailAddress;
            forwardMail.CC = ccEmailAddress;
            forwardMail.BCC = bccEmailAddress;

            forwardMail.Send();
            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: ZCO User - Verify that the sent message appears in SENT folder and the FORWARDED status is set

            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();

            // Search for the message using the Original Message ID retrieved before forwarding
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + originalMessageId + "']", null, null, null, 1);

            // Check that the original message has the status as FORWARDED 
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "wu", null, 1);

            // Search the message again to find it in SENT folder
            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ") in:sent"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(forwardMessageId));

            m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);

            // Check that the mail forwarded is in the sent
            // Folder: Sent
            // Status: Forwarded /Unread
            // From: ZCO User
            // Sender: ZCO User
            // Reply: ZCO User
            // To: account2
            // Cc: account3
            // BCc: account4
            zAccount.AccountZCO.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "s", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "u", null, 1);

            //Have commented the soap validation of ZCO user's sent item as the sent item mime gets malformed.

            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);

            #endregion

            #region SOAP Block: Verify the message status in inbox of Account2, Account3 & Account4

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(message2Id));

            // Verifications
            XmlNode m2 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message2Id + "']", null, null, null, 1);

            // Check that the message has FORWARDED status set 
            zAccount.AccountB.selectSOAP(m2, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(m2, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO"/"CC"/"BCC" field
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            // Verify the absence of Account4 in the "TO & CC" field
            zAccount.AccountB.selectSOAP(m2, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);

            #endregion

            #region Account3 Verification

            // Search for the message ID
            zAccount.AccountC.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountC.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message3Id, 1);

            // Get the message
            zAccount.AccountC.sendSOAP(new GetMsgRequest().Message(message3Id));

            // Verifications
            XmlNode m3 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message3Id + "']", null, null, null, 1);

            // Check that the message has FORWARDED status set 
            zAccount.AccountC.selectSOAP(m3, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountC.selectSOAP(m3, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO"/"CC"/"BCC" field
            zAccount.AccountC.selectSOAP(m3, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(m3, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(m3, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            // Verify the absence of Account4 in the "TO & CC" field
            zAccount.AccountC.selectSOAP(m3, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);

            #endregion

            #region Account4 Verification

            // Search for the message ID
            zAccount.AccountD.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountD.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message4Id, 1);
       
            // Get the message
            zAccount.AccountD.sendSOAP(new GetMsgRequest().Message(message4Id));

            // Verifications
            XmlNode m4 = zAccount.AccountD.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message4Id + "']", null, null, null, 1);

            // Check that the message has FORWARDED status set 
            zAccount.AccountD.selectSOAP(m4, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountD.selectSOAP(m4, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO"/"CC"/"BCC" field
            zAccount.AccountD.selectSOAP(m4, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountD.selectSOAP(m4, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountD.selectSOAP(m4, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            // Verify the absence of Account4 in the "TO & CC" field
            zAccount.AccountD.selectSOAP(m4, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);


            #endregion

            #endregion

        }

        [Test, Description("Verify that ZCO User can Forward a message (from the Alias_CaseSensitive Email Address)")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to ZCO User (To: Alias_CaseSensitive Email Address)",
            "2. ZCO: ZCO Users forwards the message to Account2, Account3, Account4 (To:Account2, CC:Account3, BCC:Account3)",
            "3. SOAP: Verify that the sent message appears in SENT folder and the FORWARDED status is set",
            "4. SOAP: Verify the message status in inbox of Account2, Account3 & Account4")]
        /*PrashantA [3-Jan-11]: Used mailReplyOOM() for same reason as of MailAction_07_1 issue
         */
        public void MailAction_07_3()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string alias = GlobalProperties.time() + GlobalProperties.counter();
            string aliasDisplayName = "ZCOUser_Alias" + alias;
            string aliasAddress = aliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string aliasAddress_caseInsensitive = "zcouser_alias" + alias + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string toEmailAddress = zAccount.AccountB.emailAddress;
            string ccEmailAddress = zAccount.AccountC.emailAddress;
            string bccEmailAddress = zAccount.AccountD.emailAddress;
            
            string originalMessageId, inboxId, sentId, forwardMessageId, message2Id, message3Id, message4Id;
            #endregion

            #region Create email alias for the ZCO user
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, aliasAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region SOAP Block: Account1 sends a message to the primary address of ZCO user (To: Alias_CaseSensitive Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, aliasAddress_caseInsensitive).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            System.Threading.Thread.Sleep(2000);
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User forwards the message
            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject);

            //Create reply mail object

            //Changed to mailReplyOOM() as the forwarded item was not getting synced to ZCS
            //RDOMail forwardMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.forward);
            RDOMail forwardMail = OutlookMailbox.Instance.mailReplyOOM(rmail, OutlookMailbox.mailReplyType.forward);
            zAssert.IsNotNull(forwardMail, "Verify that the reply mail object is created");

            //Add the recepients
            forwardMail.To = toEmailAddress;
            forwardMail.CC = ccEmailAddress;
            forwardMail.BCC = bccEmailAddress;

            forwardMail.Send();
            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: ZCO User - Verify that the sent message appears in SENT folder and the FORWARDED status is set

            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();

            // Search for the message using the Original Message ID retrieved before forwarding
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + originalMessageId + "']", null, null, null, 1);

            // Check that the original message has the status as FORWARDED 
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "wu", null, 1);

            // Search the message again to find it in SENT folder
            System.Threading.Thread.Sleep(2000);
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ") in:sent"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(forwardMessageId));

            m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);

            // Check that the mail forwarded is in the sent
            // Folder: Sent
            // Status: Forwarded /Unread
            // From: ZCO User
            // Sender: ZCO User
            // Reply: ZCO User
            // To: account2
            // Cc: account3
            // BCc: account4
            zAccount.AccountZCO.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "s", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "u", null, 1);

            //Have commented the soap validation of ZCO user's sent item as the sent item mime gets malformed.

            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            //zAccount.AccountZCO.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);

            #endregion

            #region SOAP Block: Verify the message status in inbox of Account2, Account3 & Account4

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(message2Id));

            // Verifications
            XmlNode m2 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message2Id + "']", null, null, null, 1);

            // Check that the message has FORWARDED status set 
            zAccount.AccountB.selectSOAP(m2, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(m2, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO"/"CC"/"BCC" field
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            // Verify the absence of Account4 in the "TO & CC" field
            zAccount.AccountB.selectSOAP(m2, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);

            #endregion

            #region Account3 Verification

            // Search for the message ID
            zAccount.AccountC.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountC.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message3Id, 1);

            // Get the message
            zAccount.AccountC.sendSOAP(new GetMsgRequest().Message(message3Id));

            // Verifications
            XmlNode m3 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message3Id + "']", null, null, null, 1);

            // Check that the message has FORWARDED status set 
            zAccount.AccountC.selectSOAP(m3, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountC.selectSOAP(m3, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO"/"CC"/"BCC" field
            zAccount.AccountC.selectSOAP(m3, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(m3, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountC.selectSOAP(m3, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            // Verify the absence of Account4 in the "TO & CC" field
            zAccount.AccountC.selectSOAP(m3, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);

            #endregion

            #region Account4 Verification

            // Search for the message ID
            zAccount.AccountD.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountD.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message4Id, 1);

            // Get the message
            zAccount.AccountD.sendSOAP(new GetMsgRequest().Message(message4Id));

            // Verifications
            XmlNode m4 = zAccount.AccountD.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message4Id + "']", null, null, null, 1);

            // Check that the message has FORWARDED status set 
            zAccount.AccountD.selectSOAP(m4, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountD.selectSOAP(m4, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO"/"CC"/"BCC" field
            zAccount.AccountD.selectSOAP(m4, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountD.selectSOAP(m4, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountD.selectSOAP(m4, "//mail:e[@t='c']", "a", zAccount.AccountC.emailAddress, null, 1);
            // Verify the absence of Account4 in the "TO & CC" field
            zAccount.AccountD.selectSOAP(m4, ("//mail:e[@a='" + zAccount.AccountD.emailAddress + "']"), null, null, null, 0);


            #endregion

            #endregion

        }

        [Test, Description("Verify that ZCO User can Forward a message (from the Primary Email Address) by checking the recepients mail boxes.")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to ZCO User (To: Primary Email Address)",
            "2. ZCO: ZCO Users forwards the message to Account2, Account3, Account4 (To:Account2, CC:Account3, BCC:Account3)",
            "3. SOAP: Verify the message in inbox of Account2, Account3 & Account4 and forward status is set")]
        // This test case is a variation of MailAction_07_1() test case. That test case used to verify the forwarded mail was sent to recipients
        // by checking the mail in sent folder of the ZCO user. Below test case verifies the mail was sent to recipients 
        // by checking their inbox. This test case was created as MailAction_07_1() has issues and fails.
        public void MailAction_07_4()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string originalMessageId, inboxId, sentId, forwardMessageId;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User (To: Primary Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);


            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User forwards the message

            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");
            //Create reply mail object
            RDOMail forwardMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.forward);
            zAssert.IsNotNull(forwardMail, "Verify that the reply mail object is created");
            
            //Add the recepients
            forwardMail.To = zAccount.AccountB.emailAddress;
            forwardMail.CC = zAccount.AccountC.emailAddress;
            forwardMail.BCC = zAccount.AccountD.emailAddress;

            forwardMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: accountB, accountC, accountD users - Verify that the sent message appears in inbox folder and the FORWARDED status is set

                   
            //AccountB
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(forwardMessageId));
            XmlNode m = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);

            //AccountC
            zAccount.AccountC.sendSOAP(new SearchRequest().
             Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountC.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);
            zAccount.AccountC.sendSOAP(new GetMsgRequest().Message(forwardMessageId));
            m = zAccount.AccountC.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);
            zAccount.AccountC.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountC.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);

            //AccountD
            zAccount.AccountD.sendSOAP(new SearchRequest().
             Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountD.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out forwardMessageId, 1);
            zAccount.AccountD.sendSOAP(new GetMsgRequest().Message(forwardMessageId));
            m = zAccount.AccountD.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + forwardMessageId + "']", null, null, null, 1);
            zAccount.AccountD.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountD.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
  
            #endregion
        }

        [Test, Description("Verify that ZCO User can Reply to a message")]
        [Ignore("Ignore the test")] // Test case failes as it is not able to sync sent folder to ZCS (redemption issue)
        [Category("Mail")]
        [Bug("30906")] 
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to the primary address of ZCO user (To: Primary Email Address)",
            "2. ZCO: ZCO User replies to the message",
            "3. SOAP: Verify that the sent message appears in SENT folder and the REPLYED status is set",
            "4. SOAP: Verify the message status in inbox of Account1",
            "5. SOAP: Verify the message is received without the ZCO user's primary email address in the 'TO' field")]
        public void MailAction_08_1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string originalMessageId, inboxId, sentId, replyMessageId, message1Id;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User (To: Primary Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User replies to the message

            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            //Add the recepients
            replyMail.To = zAccount.AccountB.emailAddress;
            replyMail.CC = zAccount.AccountC.emailAddress;
            replyMail.BCC = zAccount.AccountD.emailAddress;

            replyMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: ZCO User - Verify that the sent message appears in SENT folder and the REPLIED status is set

            // Search for the message using the Original Message ID retrieved before replying
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + originalMessageId + "']", null, null, null, 1);

            // Check that the original message has the status as REPLIED
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "ru", null, 1);

            // Search the message again to find it in SENT folder
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ") in:sent"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out replyMessageId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(replyMessageId));
            m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + replyMessageId + "']", null, null, null, 1);

            // Check that the mail replied is in the sent
            // Folder: Sent
            // Status: Replied /Unread
            // From: ZCO User
            // To: Account1
            zAccount.AccountZCO.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "r", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);

            #endregion

            #region SOAP Block: Verify the message status in inbox of Account1

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            // Verifications
            XmlNode m1 =  zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message1Id + "']", null, null, null, 1);

            // Check that the message has REPLIED status set 
            zAccount.AccountA.selectSOAP(m1, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(m1, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO" field
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountZCO.emailAddress, null, 0);

            #endregion

        }


        [Test, Description("Verify that ZCO User can Reply to a message")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to the primary address of ZCO user (To: Primary Email Address)",
            "2. ZCO: ZCO User replies to the message",
            "4. SOAP: Verify the message status in inbox of Account1",
            "5. SOAP: Verify the message is received without the ZCO user's primary email address in the 'TO' field")]
        // This is a variation of test case MailAction_08_1(). MailAction_08_1() failes as it is not able to sync sent folder to ZCS (redemption issue).
        // This test case is written to seperate the check for Account1's inbox for replied mail from MailAction_08_1(). 
        // This will not check for ZCo acount's sent folder in ZCS. 
        public void MailAction_08_4()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string originalMessageId, inboxId, sentId, message1Id;
            timestampTestCaseMaximum = 60;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User (To: Primary Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User replies to the message

            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            //Add the recepients
            replyMail.To = zAccount.AccountA.emailAddress;
            
            replyMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: Verify the message status in inbox of Account1

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            // Verifications
            XmlNode m1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message1Id + "']", null, null, null, 1);

            // Check that the message has unread status set 
            zAccount.AccountA.selectSOAP(m1, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(m1, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO" field
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountZCO.emailAddress, null, 0);

            #endregion

        }

        [Test, Description("Verify that ZCO User can Reply to a message")]
        [Ignore("Ignore the test")] // Test case failes as it is not able to sync sent folder to ZCS (redemption issue)
        [Category("Mail")]
        [Bug("30906")] 
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to the primary address of ZCO user (To: Alias Email Address)",
            "2. ZCO: ZCO User replies to the message",
            "3. SOAP: Verify that the sent message appears in SENT folder and the REPLYED status is set",
            "4. SOAP: Verify the message status in inbox of Account1",
            "5. SOAP: Verify the message is received without the ZCO user's primary email address in the 'TO' field")]
        public void MailAction_08_2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string aliasDisplayName = "ZCOUser_Alias" + GlobalProperties.time() + GlobalProperties.counter();
            string aliasAddress = aliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, inboxId, sentId, replyMessageId, message1Id;
            #endregion

            #region Create email alias for the ZCO user
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, aliasAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User (To: Alias Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, aliasAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User replies to the message

            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            //Add the recepients
            replyMail.To = zAccount.AccountA.emailAddress;
         
            replyMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: ZCO User - Verify that the sent message appears in SENT folder and the REPLIED status is set

            // Search for the message using the Original Message ID retrieved before replying
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + originalMessageId + "']", null, null, null, 1);

            // Check that the original message has the status as REPLIED
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "ru", null, 1);

            // Search the message again to find it in SENT folder
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ") in:sent"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out replyMessageId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(replyMessageId));
            m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + replyMessageId + "']", null, null, null, 1);

            // Check that the mail replied is in the sent
            // Folder: Sent
            // Status: Replied /Unread
            // From: ZCO User
            // To: Account1
            zAccount.AccountZCO.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "s", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);

            #endregion

            #region SOAP Block: Verify the message status in inbox of Account1

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            // Verifications
            XmlNode m1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message1Id + "']", null, null, null, 1);

            // Check that the message has REPLIED status set 
            zAccount.AccountA.selectSOAP(m1, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(m1, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO" field
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountZCO.emailAddress, null, 0);

            #endregion

        }

        [Test, Description("Verify that ZCO User can Reply to a message")]
        [Category("Mail")]
        [Bug("30906")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to the primary address of ZCO user (To: Alias Email Address)",
            "2. ZCO: ZCO User replies to the message",
            "3. SOAP: Verify the message status in inbox of Account1",
            "4. SOAP: Verify the message is received without the ZCO user's primary email address in the 'TO' field")]
        // This is a variation of test case MailAction_08_2(). MailAction_08_2() failes as it is not able to sync sent folder to ZCS (redemption issue).
        // This test case is written to seperate the check for Account1's inbox for replied mail from MailAction_08_2(). 
        // This will not check for ZCo acount's sent folder in ZCS. 
        public void MailAction_08_5()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string aliasDisplayName = "ZCOUser_Alias" + GlobalProperties.time() + GlobalProperties.counter();
            string aliasAddress = aliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, inboxId, sentId, message1Id;
            #endregion

            #region Create email alias for the ZCO user
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, aliasAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User (To: Alias Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, aliasAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion

            #region Outlook Block: ZCO User replies to the message

            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            //Add the recepients
            replyMail.To = zAccount.AccountA.emailAddress;
            
            replyMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

          

            #region SOAP Block: Verify the message status in inbox of Account1

            // Search for the message ID
            zAccount.AccountA.sendSOAP("<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + ") in:inbox</query>"
                + "</SearchRequest>");
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            // Verifications
            XmlNode m1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message1Id + "']", null, null, null, 1);

            // Check that the message has REPLIED status set 
            zAccount.AccountA.selectSOAP(m1, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(m1, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO" field
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountZCO.emailAddress, null, 0);

            #endregion

        }

        [Test, Description("Verify that ZCO User can Reply to a message")]
        [Ignore("Ignore the test")] // Test case failes as it is not able to sync sent folder to ZCS (redemption issue)
        [Category("Mail")]
        [Bug("30906")] 
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to the primary address of ZCO user (To: Alias_CaseSensitive Email Address)",
            "2. ZCO: ZCO User replies to the message",
            "3. SOAP: Verify that the sent message appears in SENT folder and the REPLYED status is set",
            "4. SOAP: Verify the message status in inbox of Account1",
            "5. SOAP: Verify the message is received without the ZCO user's primary email address in the 'TO' field")]
        public void MailAction_08_3()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string alias = GlobalProperties.time() + GlobalProperties.counter();
            string aliasDisplayName = "ZCOUser_Alias" + alias;
            string aliasAddress = aliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string aliasAddress_caseInsensitive = "zcouser_alias" + alias + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, inboxId, sentId, replyMessageId, message1Id;
            #endregion

            #region Create email alias for the ZCO user
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, aliasAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region SOAP Block: Account1 sends a message to the primary address of ZCO user (To: Alias_CaseSensitive Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, aliasAddress_caseInsensitive).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion
            #region Outlook Block: ZCO User replies to the message

            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();
            
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            //Add the recepients
            replyMail.To = zAccount.AccountA.emailAddress;

            replyMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: ZCO User - Verify that the sent message appears in SENT folder and the REPLIED status is set

            // Search for the message using the Original Message ID retrieved before replying
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(originalMessageId));

            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + originalMessageId + "']", null, null, null, 1);

            // Check that the original message has the status as REPLIED
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "ru", null, 1);

            // Search the message again to find it in SENT folder
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ") in:sent"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out replyMessageId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(replyMessageId));
            m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + replyMessageId + "']", null, null, null, 1);

            // Check that the mail replied is in the sent
            // Folder: Sent
            // Status: Replied /Unread
            // From: ZCO User
            // To: Account1
            zAccount.AccountZCO.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "l", sentId, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "s", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "u", null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);

            #endregion

            #region SOAP Block: Verify the message status in inbox of Account1

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            // Verifications
            XmlNode m1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message1Id + "']", null, null, null, 1);

            // Check that the message has REPLIED status set 
            zAccount.AccountA.selectSOAP(m1, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(m1, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO" field
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountZCO.emailAddress, null, 0);

            #endregion

        }

        [Test, Description("Verify that ZCO User can Reply to a message")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to the primary address of ZCO user (To: Alias_CaseSensitive Email Address)",
            "2. ZCO: ZCO User replies to the message",
            "3. SOAP: Verify the message status in inbox of Account1",
            "4. SOAP: Verify the message is received without the ZCO user's primary email address in the 'TO' field")]
        // This is a variation of test case MailAction_08_3(). MailAction_08_3() failes as it is not able to sync sent folder to ZCS (redemption issue).
        // This test case is written to seperate the check for Account1's inbox for replied mail from MailAction_08_3(). 
        // This will not check for ZCo acount's sent folder in ZCS. 
        public void MailAction_08_6()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string alias = GlobalProperties.time() + GlobalProperties.counter();
            string aliasDisplayName = "ZCOUser_Alias" + alias;
            string aliasAddress = aliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string aliasAddress_caseInsensitive = "zcouser_alias" + alias + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, inboxId, sentId,  message1Id;
            #endregion

            #region Create email alias for the ZCO user
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, aliasAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region SOAP Block: Account1 sends a message to the primary address of ZCO user (To: Alias_CaseSensitive Email Address)

            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, aliasAddress_caseInsensitive).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Get the folder ID of sent and inbox of ZCO user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);
            #endregion
            #region Outlook Block: ZCO User replies to the message

            // Make sure the mail is there in the Inbox.
            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the contacts folder exists");
            RDOMail rmail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rmail, "Verify that the Mail object is created");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rmail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            //Add the recepients
            replyMail.To = zAccount.AccountA.emailAddress;

            replyMail.Send();
            OutlookCommands.Instance.Sync();
            #endregion

        

            #region SOAP Block: Verify the message status in inbox of Account1

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(message1Id));

            // Verifications
            XmlNode m1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message1Id + "']", null, null, null, 1);

            // Check that the message has REPLIED status set 
            zAccount.AccountA.selectSOAP(m1, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(m1, "//mail:su", null, subject, null, 1);

            // Verify the ""FROM"/"TO" field
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(m1, "//mail:e[@t='t']", "a", zAccount.AccountZCO.emailAddress, null, 0);

            #endregion

        }

        [Test, Description("Verify ZCO can Unflag a message")]
        [Category("SMOKE"), Category("Mail")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to Sync User",
            "2. SOAP: Auth as Sync User & verify that the message is received correctly, Flag the message",
            "3. ZCO: Sync, Verify that the message is flagged, Now unflag it (CLEAR FLAG), Sync",
            "4. SOAP: Auth as Sync User & verify that the message is unflagged")]
        public void MailAction_09_1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & get the message and set the flag
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Sync the sent message to Outlook
            OutlookCommands.Instance.Sync();

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Flag the message
            zAccount.AccountZCO.sendSOAP(new MsgActionRequest().SetAction(messageId, MsgActionRequest.ActionOperation.flag));
            #endregion

            #region Outlook Block: Sync, Unflag the message (CLEAR FLAG), Sync
            OutlookCommands.Instance.Sync();

            // Find the message verify that its flagged.
            RDOMail rMailFlagged = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMailFlagged, "Check that message the received message exists in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olFlagMarked, rMailFlagged.FlagStatus, "Check that the message is flagged");
            rMailFlagged.FlagStatus = (int)OlFlagStatus.olNoFlag;
            rMailFlagged.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: Auth as Sync User & verify that the message is unflagged
            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify that the message is UNFLAGED
            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(m, "//mail:m", "f", "f", null, 0);

            #endregion

        }

        [Test, Description("Verify ZCO can sync an Unflagged a message which was earlier flagged")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. SOAP: Account1 sends a message to Sync User",
            "2. SOAP: Auth as Sync User & verify that the message is received correctly, Flag the message",
            "3. ZCO: Sync, Verify that the message is flagged, Sync",
            "4. SOAP: Auth as Sync User & Unflag the message",
            "5. ZCO: Sync, verify that the message is unflagged")]
        public void MailAction_09_2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & get the message and set the flag
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Sync the sent message to Outlook
            OutlookCommands.Instance.Sync();

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Flag the message
            zAccount.AccountZCO.sendSOAP(new MsgActionRequest().SetAction(messageId, MsgActionRequest.ActionOperation.flag));
            #endregion

            #region Outlook Block: Sync, Verify that the message is flagged, Sync
            OutlookCommands.Instance.Sync();

            // Find the message verify that its flagged.
            RDOMail rMailFlagged = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMailFlagged, "Check that message the received message exists in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olFlagMarked, rMailFlagged.FlagStatus, "Check that the message is flagged");
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: Auth as Sync User & Unflag the message

            // Unflag the message
            zAccount.AccountZCO.sendSOAP(new MsgActionRequest().SetAction(messageId, MsgActionRequest.ActionOperation.unflag));

            #endregion

            #region Outlook Block: Sync, Verify that the message is unflagged
            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olNoFlag, rMail.FlagStatus, "Check that the message has no flags");
            #endregion
        }
    }
}