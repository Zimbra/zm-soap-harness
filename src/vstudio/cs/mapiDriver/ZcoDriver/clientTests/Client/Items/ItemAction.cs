using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Xml;
using Soap;
using Redemption;
using SoapWebClient;
using SyncHarness;
using Microsoft.Office.Interop.Outlook;
using System.Text.RegularExpressions;
using System.IO;
using System.Collections;

namespace clientTests.Client.Items
{
    [TestFixture]
    public class ItemAction : BaseTestFixture
    {
        [Test, Description("Verify changed messages (op=delete) is synced to Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as the syncuser", "Add a message and Sync", "Delete (hard delete) message in ZCS and Sync", "Verify the message is deleted in ZCO")]
        public void ItemAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP
            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);


            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @" 


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);

            // Validate the message as not deleted
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the mailbox");

            #endregion

            #region SOAP

            // Apply "delete" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                                         SetAction(messageId, ItemActionRequest.ActionOperation.delete));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Validate the message as deleted
            rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNull(rMail, "Check that the message is no longer in the mailbox");

            #endregion

        }

        [Test, Description("Verify changed messages (op=read) is synced to Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as the syncuser", "Add a message and Sync", "Mark message as read in ZCS and Sync", "Verify the message is marked as read in ZCO")]
        public void ItemAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            // xpath = //mail:folder[@name='inbox']
            // set = folder.inbox.id
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        SetFlags("u").
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsTrue(rMail.UnRead, "Check that the message is unread");
            #endregion

            #region SOAP

            // Apply "read" operation to the new message
            zAccount.AccountZCO.sendSOAP(
                                                new ItemActionRequest().
                                                        SetAction(messageId, ItemActionRequest.ActionOperation.read)
                                            );


            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsFalse(rMail.UnRead, "Check that the message is read");

            #endregion

        }

        [Test, Description("Verify changed messages (op=flag) is synced to Outlook")]
        [BugAttribute("27954")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as the syncuser", "Add a message and Sync", "Flag message in ZCS and Sync", "Verify the message is flagged in ZCO")]
        public void ItemAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            // xpath = //mail:folder[@name='inbox']
            // set = folder.inbox.id
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        SetFlags("u").
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsTrue(rMail.UnRead, "Check that the message is unread");
            #endregion

            #region SOAP

            // Apply "flag" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                                         SetAction(messageId, ItemActionRequest.ActionOperation.flag));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Find the new message
            rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.AreEqual((int)OlFlagStatus.olFlagMarked, rMail.FlagStatus, "Check that the message has no flags");

            #endregion

        }

        [Test, Description("Verify changed messages (op=tag) is synced to Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as the syncuser", "Add a message and Sync", "Tag message in ZCS and Sync", "Verify the message is tagged in ZCO")]
        public void ItemAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId, tagId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP

            // Add a tag
            zAccount.AccountZCO.sendSOAP(
                                                new CreateTagRequest().
                                                        AddName(tagName)
                                            );

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            // xpath = //mail:folder[@name='inbox']
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        SetFlags("u").
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            ArrayList categoryList = null;

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            if (rMail.Categories == null)
            {
                zAssert.IsNull(rMail.Categories, "Check that there are no categories on the message");
            }
            else
            {
                // If there are categories on the message, then verify that the tag is not already listed
                // (But, there really should not be any categories)
                categoryList = new ArrayList();
                foreach (string s in rMail.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.DoesNotContain(tagName, categoryList, "Check that the new tag is not listed within the original message's categories");
            }


            // Find the new message
            rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsTrue(rMail.UnRead, "Check that the message is unread");
            #endregion

            #region SOAP

            // Apply "delete" operation to the new message
            zAccount.AccountZCO.sendSOAP(
                                                new ItemActionRequest().
                                                        SetAction(messageId, ItemActionRequest.ActionOperation.tag, tagId)
                                            );


            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Find the new message
            rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.Greater(rMail.Categories.Length, 0, "Check that at least one category is saved in the message");

            categoryList = new ArrayList();
            foreach (string s in rMail.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.Contains(tagName, categoryList, "Check that the new tag is listed within the message's categories");


            #endregion

        }

        [Test, Description("Verify changed messages (op=move) is synced to Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as the syncuser", "Add a message and Sync", "Move message to another folder in ZCS and Sync", "Verify the message is moved to this folder in ZCO")]
        public void ItemAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId, folderId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP

            // Add a subfolder
            //

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            // xpath = //mail:folder[@name='inbox']
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create the subfolder
            zAccount.AccountZCO.sendSOAP(
                                                new CreateFolderRequest().
                                                        AddFolder(new FolderObject().
                                                                        SetParent(inboxFolderId).
                                                                        SetName(folderName)
                                                                    ));

            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Add a new message to the inbox
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject,inboxFolder, true);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");

            #endregion

            #region SOAP

            // Apply "move" operation to the new message
            zAccount.AccountZCO.sendSOAP(
                                                new ItemActionRequest().
                                                        SetAction(messageId, ItemActionRequest.ActionOperation.move, folderId)
                                            );

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK
            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOFolder rFolder = OutlookMailbox.Instance.findFolder(folderName);
            rMail = OutlookMailbox.Instance.findMessage(subject, rFolder, true);

            zAssert.IsNotNull(rMail, "Check that the message is in the subfolder");

            #endregion

        }

        [Test, Description("Verify changed messages (op=trash) is synced to Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as the syncuser", "Add a message and Sync", "Delete (move to trash) message in ZCS and Sync", "Verify the message is deleted (moved to trash) in ZCO")]
        public void ItemAction_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            // xpath = //mail:folder[@name='inbox']
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Add a new message to the inbox
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region OLK
            OutlookCommands.Instance.Sync();

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");

            #endregion

            #region SOAP

            // Apply "move to trash" operation to the new message
            zAccount.AccountZCO.sendSOAP(
                                                new ItemActionRequest().
                                                        SetAction(messageId, ItemActionRequest.ActionOperation.trash, null)
                                            );


            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK
            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOFolder trashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            rMail = OutlookMailbox.Instance.findMessage(subject, trashFolder, true);
            zAssert.IsNotNull(rMail, "Check that the message exists in the trash");
            #endregion

        }

        [Test, Description("Verify changed tags (op=rename) is synced to Outlook")]
        [Bug("5579")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as the syncuser", "Add a message and Sync", "Tag the message in ZCS and sync", "Verify the message is present in ZCO",
            "Rename tag in ZCS and sync", "Verify that the tag on the message has new name")]
        public void ItemAction_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId, tagId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tag1Name = "tag1" + GlobalProperties.time() + GlobalProperties.counter();
            string tag2Name = "tag2" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP

            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().
                                         AddName(tag1Name));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);


            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            // Apply "delete" operation to the new message
            zAccount.AccountZCO.sendSOAP(
                                                new ItemActionRequest().
                                                        SetAction(messageId, ItemActionRequest.ActionOperation.tag, tagId)
                                            );

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion


            #region OLK

            OutlookCommands.Instance.Sync();
            ArrayList categoryList = null;

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsNotNull(rMail.Categories, "Check that the tag is applied to the message");
            categoryList = new ArrayList();
            foreach (string s in rMail.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.Contains(tag1Name, categoryList, "Check that the new tag is within the message's categories");
            zAssert.DoesNotContain(tag2Name, categoryList, "Check that the renamed tag is not within the message's categories");

            #endregion

            #region SOAP

            // Apply "tag" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                                         SetAction(tagId, ItemActionRequest.ActionOperation.rename, tag2Name));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK
            OutlookCommands.Instance.Sync();

            // Find the new message
            rMail = OutlookMailbox.Instance.findMessage(subject);

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsNotNull(rMail.Categories, "Check that at least one category is saved in the message");

            categoryList = new ArrayList();
            foreach (string s in rMail.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.DoesNotContain(tag1Name, categoryList, "Check that the old tag name is not listed within the message's categories");
            zAssert.Contains(tag2Name, categoryList, "Check that the new tag name is listed within the message's categories");

            #endregion

        }

        [Test, Description("Verify changed messages (op=update) is synced to Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Ignore("Duplicate of ItemAction_05")]
        public void ItemAction_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId, folderId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create the subfolder
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().
                                         AddFolder(new FolderObject().
                                         SetParent(inboxFolderId).
                                         SetName(folderName)));

            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folderId, 1);



            // Add a new message to the inbox
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion


            #region OLK


            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");

            #endregion

            #region SOAP
            // Apply "move" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                                         SetActionUpdate(messageId, folderId, null, null, null, null));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOFolder folder = OutlookMailbox.Instance.findFolder(folderName);
            rMail = OutlookMailbox.Instance.findMessage(subject, folder, true);
            zAssert.IsNotNull(rMail, "Check that the message is in the subfolder");

            #endregion

        }

        [Test, Description("Bug 14649: Verify that changed messages (op=read) is synced from Outlook")]
        [Bug("14649")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCS: AuthRequest as syncuser",
            "2. ZCS: Add a message in ZCS",
            "3. ZCO: Sync",
            "4. ZCO: Mark the mail as read in OL and sync",
            "5. ZCS: Verify message is read in ZCS")]
        public void ItemAction_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block: Auth as Sync User and Add a message.

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new AddMsgRequest().
                AddMessage(new MessageObject().
                SetParent(inboxFolderId).
                SetFlags("u").
                AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));

            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region Outlook Block: Sync to ZCS and mark the email as "READ" and Sync again

            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsTrue(rMail.UnRead, "Check that the message is unread");
            rMail.MarkRead(true);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block: Auth as Sync User, Search for the message and verify that the message is marked as "READ"

            // Search for the messageID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:content", null, content, null, 1);

            // Verify the message is READ. If mail is read then attribut "f" does not exists, hence checking 'f'='u' has zero occurence.
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:m[@f='u']", null, null, null, 0);

            #endregion
        }

        [Test, Description("Verify changed messages (op=unread) is synced to Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as sync user", "Add a message in ZCS and mark it as read", "Sync", "Check the message is read in ZCO", "Mark the message as unread in ZCS",
            "Sync and check whether the message is unread in ZCO")]
        public void ItemAction_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP
            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(
                                                new AddMsgRequest().
                                                        AddMessage(new MessageObject().
                                                                        SetParent(inboxFolderId).
                                                                        SetFlags("u").
                                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));


            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                SetAction(messageId, ItemActionRequest.ActionOperation.read));
            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();
            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsFalse(rMail.UnRead, "Check that the message is read");

            #endregion

            #region SOAP

            // Apply unread operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                                         SetAction(messageId, ItemActionRequest.ActionOperation.unread));


            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region OLK

            OutlookCommands.Instance.Sync();

            rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsTrue(rMail.UnRead, "Check that the message is unread");

            #endregion
        }

        [Test, Description("Bug 14649: Verify changed messages (op=unread) is synced from Outlook")]
        [Bug("14649")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCS: Auth as sync user",
            "2. ZCS: Add a message in ZCS and mark it as read",
            "3. ZCO: Sync",
            "4. ZCO: Check the message is read in ZCO and then mark it as unread",
            "5. ZCO: Sync",
            "6. ZCS: Check whether the message is unread in ZCS")]
        public void ItemAction_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block: Auth as Sync User, Add a message and mark as "READ"

            // Determine the folder ID of the inbox
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new AddMsgRequest().
                AddMessage(new MessageObject().
                SetParent(inboxFolderId).
                SetFlags("u").
                AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content + @"


")));

            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);

            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                SetAction(messageId, ItemActionRequest.ActionOperation.read));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Block: Sync to ZCS and mark the email as "UNREAD" and Sync again

            OutlookCommands.Instance.Sync();

            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsFalse(rMail.UnRead, "Check that the message is read");

            rMail.UnRead = true;

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Auth as Sync User, Search for the message and verify that the message is marked as "UNREAD"

            // Search for the messageID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:su", null, subject, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:content", null, content, null, 1);
            // Verify the message is UNREAD
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:m", "f", "u", null, 1);

            #endregion
        }

        [Test, Description("Verify that conversation tagged in ZWC reflected in ZCO")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Create a tag (SOAP)", "Create a Conversation (SOAP)", "Sync", "Apply the tag to the conversation (SOAP)", "Sync",
            "Verify the messages in the conversation have the tag applied (ZCO)")]
        public void ItemAction_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string messageId, tagId, convId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block to Create a tag and conversation.

            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            zAccount.AccountZCO.sendSOAP(
                                     new SendMsgRequest().
                                             AddMessage(new MessageObject().
                                                 Subject(subject).
                                                 AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                                                 BodyTextPlain(content)));

            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse/mail:m", "id", null, out messageId, 1);

            zAccount.AccountZCO.sendSOAP(
                                     new SendMsgRequest().
                                             AddMessage(new MessageObject().
                                                 SetOrigId(messageId).
                                                 ReplyType("w").
                                                 Subject((string)("Fwd:" + subject)).
                                                 AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                                                 BodyTextPlain((string)("Forwarded content" + content))));

            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse/mail:m", "id", null, out messageId, 1);

            #endregion

            #region SOAP to Tag a Conversation

            OutlookCommands.Instance.Sync();

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("conversation").
                                        Query((string)("in:" + GlobalProperties.getProperty("globals.sent") + " " + "subject:(" + subject + ")")));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:c", "id", null, out convId, 1);

            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
               SetAction(convId, ItemActionRequest.ActionOperation.tag, tagId));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(new SoapWebClient.ConvActionRequest().
                TagConvbyID(convId, "tag", tagId));

            #endregion

            #region Outlook block for Verification

            OutlookCommands.Instance.Sync();

            ArrayList categoryList = null;
            RDOFolder sentMail = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderSentMail);
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            // Find the new message
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, sentMail, true);
            zAssert.IsNotNull(rMail, "Check that the message is in the Sent Folder");
            zAssert.Greater(rMail.Categories.Length, 0, "Check that at least one category is saved in the message");

            categoryList = new ArrayList();
            foreach (string s in rMail.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.Contains(tagName, categoryList, "Check that the new tag is listed within the message's categories");

            rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Check that the message is in the Inbox Folder");
            zAssert.Greater(rMail.Categories.Length, 0, "Check that at least one category is saved in the message");

            categoryList = new ArrayList();
            foreach (string s in rMail.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.Contains(tagName, categoryList, "Check that the new tag is listed within the message's categories");

            #endregion
        }

        [Test, Description("Verify that conversation untagged in ZWC reflected in ZCO")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Create a tag (SOAP)", "Create a Conversation (SOAP) and tag it", "Sync", "Untag to the conversation (SOAP)", "Sync",
            "Verify the messages in the conversation have the untag applied (ZCO)")]
        public void ItemAction_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string messageId, tagId, convId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block to Create a tag and conversation.
            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            zAccount.AccountZCO.sendSOAP(
                                     new SendMsgRequest().
                                             AddMessage(new MessageObject().
                                                 Subject(subject).
                                                 AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                                                 BodyTextPlain(content)));

            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse/mail:m", "id", null, out messageId, 1);

            zAccount.AccountZCO.sendSOAP(
                                     new SendMsgRequest().
                                             AddMessage(new MessageObject().
                                                 SetOrigId(messageId).
                                                 ReplyType("w").
                                                 Subject("Fwd:" + subject).
                                                 AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                                                 BodyTextPlain("Forwarded content" + content)));

            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse/mail:m", "id", null, out messageId, 1);


            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("conversation").
                                        Query((string)("in:" + GlobalProperties.getProperty("globals.sent") + " " + "subject:(" + subject + ")")));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:c", "id", null, out convId, 1);

            zAccount.AccountZCO.sendSOAP(new SoapWebClient.ConvActionRequest().
                TagConvbyID(convId, "tag", tagId));

            #endregion

            #region SOAP to Tag a Conversation

            OutlookCommands.Instance.Sync();

            zAccount.AccountZCO.sendSOAP(new SoapWebClient.ConvActionRequest().
                TagConvbyID(convId, "!tag", tagId));

            #endregion

            #region Outlook block for Verification

            OutlookCommands.Instance.Sync();
            // Find the new message
            RDOFolder sentMail = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderSentMail);
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, sentMail, true);
            zAssert.IsNotNull(rMail, "Check that the message is in the Sent Folder");

            if (rMail.Categories == null)
            {
                zAssert.IsNull(rMail.Categories, "Check that there are no categories on the message");
            }

            rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Check that the message is in the Inbox Folder");

            if (rMail.Categories == null)
            {
                zAssert.IsNull(rMail.Categories, "Check that there are no categories on the message");
            }
            #endregion
        }

        [Test, Description("Verify unsupported items are ignored by ZCO")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("9776")]
        public void ItemAction_14()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string text = "some random text" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Outlook block to create notes item
            RDOFolder notesFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderJournal);
            RDONoteItem rNote = OutlookMailbox.Instance.CreateObject(OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderNotes), "IPM.StickyNote") as RDONoteItem;
            rNote.Subject = subject;
            rNote.Body = text;
            rNote.Color = rdoNoteColor.olPink;
            rNote.Save();
            #endregion

            #region Outlook block to verify that the its still running
            try
            {
                OutlookCommands.Instance.Sync();
            }
            catch(UnauthorizedAccessException e)
            {
            }
            zAssert.IsTrue(OutlookProcess.Instance.IsApplicationRunning(), "outlook is still running");
            #endregion

        }
    }
}