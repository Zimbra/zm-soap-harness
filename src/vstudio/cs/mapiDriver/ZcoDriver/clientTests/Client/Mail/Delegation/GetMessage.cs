using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Text.RegularExpressions;
using Redemption;

namespace clientTests.Client.Mail.Delegation
{
    [TestFixture]
    public class GetMessage : BaseTestFixture
    {
        [Test, Description("Verify that ZCO can open another user's mailbox")]
        [Category("Mail"), Category("SMOKE")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. Account1 shares mail folder to syncuser with reviewer rights",
            "2. Syncuser mounts the shared folder",
            "3. Verify that syncuser can mount and search message in shared folder")]
        public void OpenMailbox_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, message2Id, folderId;
            #endregion
            
            #region creating account
            zAccount userB = new zAccount();
            userB.createAccount();
            userB.login();

            #endregion
            
            #region SOAP Block: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            userB.sendSOAP(new GetFolderRequest());

            userB.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Create a folder in the inbox
            userB.sendSOAP(new CreateFolderRequest().
                AddFolder(new FolderObject().
                SetName(folderName).
                SetParent(inboxId)));

            userB.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            userB.sendSOAP(new FolderActionRequest().
                GrantFolderbyID(folderId,
                FolderActionRequest.grantUser, zAccount.AccountZCO.emailAddress, FolderActionRequest.rightsZcoAdministrator));

            // Add a message to the account mailbox
            userB.sendSOAP(new AddMsgRequest().
                AddMessage(new MessageObject().
                SetParent(folderId).
                AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"

")));
            userB.selectSOAP("//mail:m", "id", null, out message2Id, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userB);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");
           

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, mountpointInbox, true);
            zAssert.IsNotNull(rMail, "Verify that the mail appears in the delegate store");

            // Verify the message data
            zAssert.AreEqual(subject, rMail.Subject, "Verify the delegate message subject matches");
            zAssert.IsTrue(rMail.Body.Contains(content), "Verify the delegate message content matches the expected " + content);

            #endregion
        }

        [Test, Description("Verify ZCO action other than read are not allowed when the mailbox is shared as readonly (r) (rights=rightsZcoReviewer)")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. Account1 shares mail folder to syncuser with reviewer rights",
            "2. Syncuser mounts the shared folder",
            "3. Verify that action other than read are not allowed on mail from shared folder")]
        public void OpenMailbox_Basic_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject3" + GlobalProperties.time() + GlobalProperties.counter();
            string content3 = "content3" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, message1Id;
            #endregion

            #region SOAP Block: Delegate creates folder and shares it
            zAccount userA = new zAccount();
            userA.createAccount();
            userA.login();

            //Account A shares inbox to ZCO user
            userA.sendSOAP(new GetFolderRequest());
            userA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            userA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoReviewer));

            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject1).
                            AddAddress(MessageObject.AddressType.To, userA.emailAddress).
                            BodyTextPlain(content1)));

            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject2).
                            AddAddress(MessageObject.AddressType.To, userA.emailAddress).
                            BodyTextPlain(content2)));

            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                Subject(subject3).
                AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                BodyTextPlain(content3)));

            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Account A get the message id
            userA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject1 + ")"));
            userA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            #endregion

            #region Outlook Block: Sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = null;
            RDOFolder mountpointInbox = null;
            try
            {
                mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);
                zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
                mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
                zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");
            }
            catch (HarnessException e)
            {
                throw new HarnessException("Exception is thrown while opening another users mailbox", e);
            }
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rMail1 = OutlookMailbox.Instance.findMessage(subject1, mountpointInbox, false);
            zAssert.IsNotNull(rMail1, "Verify that the mail appears in the delegate store");

            RDOMail rMail2 = OutlookMailbox.Instance.findMessage(subject2, mountpointInbox, false);
            zAssert.IsNotNull(rMail2, "Verify that the mail appears in the delegate store");
            #endregion

            #region Verification

            RDOMail rMail = null;
            UnauthorizedAccessException u = null;

            //Copy/Insert
            u = null;
            try
            {
                rMail = OutlookMailbox.Instance.findMessage(subject3, inboxFolder, true);
                rMail.CopyTo(mountpointInbox);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that the UnauthorizedAccessException is thrown when trying to copy/insert the mail into the shared folder");

            //mark as read
            u = null;
            try
            {
                rMail1.MarkRead(true);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that the UnauthorizedAccessException is thrown when trying to mark the mail as read into the shared folder");

            //flag
            u = null;
            try
            {
                rMail1.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that the UnauthorizedAccessException is thrown when trying to flag the mail in the shared folder");

            //Move the mail
            u = null;
            try
            {
                rMail1.Move(inboxFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that the UnauthorizedAccessException is thrown when trying to move the mail from the shared folder");

            //Delete Operation
            u = null;
            try
            {
                rMail2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that the UnauthorizedAccessException is thrown when trying to delete the mail");

            #endregion

        }

        [Test, Description("Verify ZCO action other than read are not allowed when the mailbox is shared as readonly (rw) (rights=rightsZcoDelegate)")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. Account1 shares mail folder to syncuser with delegate rights",
            "2. Syncuser mounts the shared folder",
            "3. Verify that action other than read/modify are allowed on mail from shared folder")]
        public void OpenMailbox_Basic_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject3" + GlobalProperties.time() + GlobalProperties.counter();
            string content3 = "content3" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, message1Id;
            #endregion

            #region SOAP Block: Delegate creates folder and shares it
            zAccount userA = new zAccount();
            userA.createAccount();
            userA.login();

            //Account A shares inbox to ZCO user
            userA.sendSOAP(new GetFolderRequest());
            userA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            userA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoDelegate));

            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject1).
                            AddAddress(MessageObject.AddressType.To, userA.emailAddress).
                            BodyTextPlain(content1)));

            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject2).
                            AddAddress(MessageObject.AddressType.To, userA.emailAddress).
                            BodyTextPlain(content2)));

            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                Subject(subject3).
                AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                BodyTextPlain(content3)));

            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Account A get the message id
            userA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject1 + ")"));
            userA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            #endregion

            #region Outlook Block: Sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = null;
            RDOFolder mountpointInbox = null;
            try
            {
                mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);
                zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
                mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
                zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");
            }
            catch (HarnessException e)
            {
                throw new HarnessException("Exception is thrown while opening another users mailbox", e);
            }
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            System.Threading.Thread.Sleep(3000);
            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(6000);
            //find the mail in the shared inbox
            RDOMail rMail1 = OutlookMailbox.Instance.findMessage(subject1, mountpointInbox, false);
            zAssert.IsNotNull(rMail1, "Verify that the mail appears in the delegate store");

            RDOMail rMail2 = OutlookMailbox.Instance.findMessage(subject2, mountpointInbox, false);
            zAssert.IsNotNull(rMail2, "Verify that the mail appears in the delegate store");
            #endregion

            #region Verification

            RDOMail rMail = null;
            UnauthorizedAccessException u = null;

            //Copy/Insert
            u = null;
            try
            {
                rMail = OutlookMailbox.Instance.findMessage(subject3, inboxFolder, true);
                rMail.CopyTo(mountpointInbox);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that the UnauthorizedAccessException is NOT thrown when trying to copy/insert the mail into the shared folder");

            //mark as read
            u = null;
            try
            {
                rMail1.MarkRead(true);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that syncuser can mark mail as read into the shared folder");

            //flag
            u = null;
            try
            {
                rMail1.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that syncuser can flag the mail in the shared folder");

            //Move the mail
            u = null;
            try
            {
                rMail1.Move(inboxFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that the UnauthorizedAccessException is NOT thrown when trying to move the mail from the shared folder");

            //Delete Operation
            u = null;
            try
            {
                rMail2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that the UnauthorizedAccessException is NOT thrown when trying to delete the mail");

            #endregion

        }

    }
}
