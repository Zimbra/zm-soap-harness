using System;
using System.Collections.Generic;
using System.Text;
using SyncHarness;
using NUnit.Framework;
using SoapWebClient;
using Redemption;
using System.Collections;

namespace clientTests.Client.Folders.Bugs
{
    public class FolderBugs : BaseTestFixture
    {

        [Test, Description("Local failure created when new shared folder is added to mounted mailbox")]
        [Category("Folder")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("32593")]
        [TestSteps(
            "1. Mount some shared mail box",
            "2. Share additional folder for that mailbox",
            "3. Sync",
            "4. Primary store mailbox contains local failure message.")]
        public void Bug_32593()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string accountAfolder1Name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string accountAfolder2Name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string accountAfolder1Id;
            string accountAfolder2Id;
            string parentFolderId;

            #endregion

            #region Account Setup

            #endregion

            #region SOAP: Delegate creates folder and shares it

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(accountAfolder1Name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out accountAfolder1Id, 1);


            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(accountAfolder2Name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out accountAfolder2Id, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                accountAfolder1Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer));

            zAccount.AccountA.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Mount the mailbox
            // This function does:
            // A. Sync GAL
            // B. Run MountIt.exe
            // C. Sync
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Find the root folder in the mountpoint
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(accountAfolder1Name, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            #endregion

            #region Sharing another folder Inbox to account1

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                accountAfolder2Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer));

            zAccount.AccountA.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);


            #endregion

            #region Mount the shared Inbox folder

            OutlookCommands.Instance.Sync();

            RDOFolder folder2 = OutlookMailbox.Instance.findFolder(accountAfolder2Name, mountpointContacts, true);
            zAssert.IsNotNull(folder2, "Verify that the shared folder appears in the delegate store");

            #endregion

        }



        [Test, Description("Task list sync from Outlook does not work")]
        [Category("Folder")]
        [Bug("26989")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("1. Mount some shared mail box", "2. Share additional folder for that mailbox", "3. Sync", "4. Primary store mailbox contains local failure message.")]
        public void Bug_26989()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string folderId, parentFolderId, taskId;
            #endregion

            #region Creating folder in ZCO

            //Redemption.RDOFolder 
            RDOFolder taskFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            taskFolder.Folders.Add(folderName, taskFolder);

            #endregion

            OutlookCommands.Instance.Sync();

            #region SOAP Verification of Folder synced in ZWC

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + folderName + "']", "l", null, out parentFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out taskId, 1);
            zAssert.AreEqual(parentFolderId, taskId, "Parent folder id of the folder matched");

            #endregion
        }


        [Test, Description("Deleted items folder shows in all delegate stores")]
        [Category("Contact")]
        [Bug("29164")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS", "Share the inbox folder with syncuser", "Sync", "Open the shared Inbox folder in ZCO",
            "Verify the shared Inbox folder can be mounted", "Also check that the Share does not contain deleted items folder")]
        public void Bug_29164()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string inboxFolderId;

            // This test case on its own runs fine. However, in automation, this test case may be throwing "ZCO dropped conflict message", which is not marked as read. So some of the subsequest test cases mare failing because of this local failure message.
            // This failure may be happening because are trying to mount mailbox of same user, accountA in multiple test cases. So the sequence of actions performed may be causing this local failure notice. Since we do not know which exact sequence causes this, the only solution is to try mounting different user's mailbox.
            // Hence creating a new user. 

            zAccount userA = new zAccount();
            userA.createAccount();
            userA.login();
            #endregion

            #region SOAP: Delegate creates folder and shares it

            userA.sendSOAP(new GetFolderRequest());
            userA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            userA.sendSOAP(new FolderActionRequest().
                                           GrantFolderbyID(
                                               inboxFolderId,
                                               FolderActionRequest.grantUser,
                                               zAccount.AccountZCO.emailAddress,
                                               FolderActionRequest.rightsZcoReviewer)
                                       );
            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");
            System.Runtime.InteropServices.COMException u = null;

            try
            {
                RDOFolder trashFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that the shared folder 'Deleted Items' does not appears in the delegate store and throws exception");

            #endregion
        }
        [Test, Description("Verify that ZCO can open another user's mailbox")]
        [Category("Folder")]
        [Bug("32309")]
        [TestSteps(
            "ZWC user shares folder with ZCO user",
            "ZWC user adds a message that creates a ZCO Local Failure",
            "ZCO user mounts the mailbox",
            "ZCO user syncs the mailbox folder",
            "Confirm no crash.  Confirm Local Failure message is placed in the local folder")]
        public void Bug_32309()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string accountAfolderinboxID;
            string accountAfoldername = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string accountAfolderID;
            string accountAmessagesubject = "Bug32309";
            string accountAmessageID;

            #endregion

            #region Account Setup

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out accountAfolderinboxID, 1);



            // Create a folder in the inbox
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(accountAfoldername).
                                                SetParent(accountAfolderinboxID))
                                        );

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out accountAfolderID, 1);



            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                accountAfolderID,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );



            // Add a message to the account mailbox
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFile = GlobalProperties.TestMailRaw + @"\SyncIssues\LocalFailures\32309.txt";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountA.emailAddress);
            MailInject.injectLMTP(zAccount.AccountA.zimbraMailHost, mimeFile, recipients, GlobalProperties.getProperty("defaultorigination.email"));

            zAccount.AccountA.sendSOAP(new SearchRequest().
                                                Types("message").
                                                Query("subject:(" + accountAmessagesubject + ")"));

            zAccount.AccountA.selectSOAP("//mail:m", "id", null, out accountAmessageID, 1);

            zAccount.AccountA.sendSOAP(new ItemActionRequest().
                                                SetAction(accountAmessageID, ItemActionRequest.ActionOperation.move, accountAfolderID));

            zAccount.AccountA.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            // Sync any changes
            OutlookCommands.Instance.Sync();

            // Sync the GAL so that the address is now in the GAL.
            // To mount a mailbox, the delegate account must be in the GAL first
            OutlookCommands.Instance.SyncGAL();


            // Mount the mailbox
            // This function does:
            // A. Sync GAL
            // B. Run MountIt.exe
            // C. Sync
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);


            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");


            // Make sure the folder is there
            // Find the root folder in the mountpoint
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(accountAfoldername, mountpointInbox, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            // Make sure the message is there
            RDOMail message1 = OutlookMailbox.Instance.findMessage(accountAmessagesubject, folder1, false);
            zAssert.IsNotNull(message1, "Verify that the message appears in the delegate store");

            // Sync any changes
            OutlookCommands.Instance.Sync();


            RDOFolder inbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOFolder localFailures = OutlookMailbox.Instance.findFolder("Local Failures", inbox.Parent, true);

            // Per bug 32309, a local failure should be placed in the local "Inbox" and the local "Local Failures" folders

            List<RDOMail> rdoMail = OutlookMailbox.Instance.findMessages("Local Failure Notice", inbox, false);
            zAssert.IsNotNull(rdoMail, "Verify the Local Failure Notice is generated in the inbox folder");
            foreach (RDOMail mail in rdoMail)
            {
                mail.UnRead = false;
                mail.Save();
            }

            rdoMail = OutlookMailbox.Instance.findMessages("Local Failure Notice", localFailures, false);
            zAssert.IsNotNull(rdoMail, "Verify the Local Failure Notice is generated in the Local Failures folder");
            foreach (RDOMail mail in rdoMail)
            {
                mail.UnRead = false;
                mail.Save();
            }

            #endregion

        }

        [Test, Description("illegal folder names are allowed in outlook connector such as 'My : Folder'")]
        [Category("Folder")]
        public void Bug_5811()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = "My : Folder";
            #endregion

            #region Creating folder in ZCO with Illegal name and Checked whether It returns any exception

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            ArgumentException a = null;

            try
            {
                inboxFolder.Folders.Add(folderName, inboxFolder);
            }
            catch (ArgumentException e)
            {
                a = e;
            }

            zAssert.IsNotNull(a, "Verify that ArgumentException execption is thrown when trying to create a folder with illegal name");

            #endregion

        }


        [Test, Description("Junk and Junk E-mail Folder")]
        [Category("Folder")]
        [Bug("20318")]
        [TestSteps("1. Login to SyncUser",
                   "2. Check that Junk E-mail folder is not synced to ZCO")]
        public void Bug_20318()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string junkFolderName = "Junk E-mail";

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            // Find the Root Folder

            RDOFolder rootFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(rootFolder, "Check that the rootFolder exists");

            bool found1 = false;

            foreach (RDOFolder f in rootFolder.Folders)
            {

                if (f.Name.Equals(junkFolderName))
                {
                    found1 = true;
                }
            }
            zAssert.IsFalse(found1, "Verify that the custom folder " + junkFolderName + " was synced");

            #endregion
        }



        [Test, Description("Bug 13164:Subfolder of Drafts and Sync Issues can be created through Outlook")]
        [Category("Folder")]
        [Bug("13164")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("In ZCO create a folder under Draft", "Sync", "Check that Subfolder present under Drafts in ZWC",
         "Exception returned if you try to create a folder under Junk in ZCO", "Unable to create folder under Junk")]
        public void Bug_13164()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderId, parentFolderId, draftId;
            string draftSubfolder = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string junkSubfolder = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Creating folder in ZCO

            //Redemption.RDOFolder 
            RDOFolder draftsFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts);
            draftsFolder.Folders.Add(draftSubfolder, draftsFolder);

            #endregion

            OutlookCommands.Instance.Sync();

            #region SOAP Verification of Folder synced in ZWC

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + draftSubfolder + "']", "id", null, out folderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + draftSubfolder + "']", "l", null, out parentFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftId, 1);
            zAssert.AreEqual(parentFolderId, draftId, "Parent folder id of the folder matched.Folder is present under Draft folder");
            #endregion

            #region Creating folder under Junk Mail

            RDOFolder junkFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderJunk);
            System.Runtime.InteropServices.COMException u = null;

            try
            {
                junkFolder.Folders.Add(junkSubfolder, junkFolder);
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that ArgumentException execption is thrown when trying to create a folder under Junk folder");
            #endregion
        }


        [Test, Description("sync error from conflicting folder names on move")]
        [Bug("5628")]
        [SyncDirection(SyncDirection.NOSYNC)]
        [Category("Folder")]
        [TestSteps("1.Create a Folder say X and Y under Root Folder", "Create another Folder Z under folder X and folder Y", "Move folder Z under X to Y", "Folder Z moved to folder Y renamed to Z1")]
        public void Bug_5628()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folder1Name = "folder1" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string folder2Name = "folder2" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string folder3Name = "folder3" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string folder4Name = "folder4" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Creating folder in ZCO

            //Redemption.RDOFolder 

            RDOFolder rootFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);

            RDOFolder folder1 = rootFolder.Folders.Add(folder1Name, rootFolder);

            RDOFolder folder2 = rootFolder.Folders.Add(folder2Name, rootFolder);

            RDOFolder folder3 = folder1.Folders.Add(folder3Name, rootFolder);

            RDOFolder folder4 = folder2.Folders.Add(folder4Name, rootFolder);

            folder4.MoveTo(folder1);

            bool flag1 = false;
            bool flag2 = false;
            bool flag3 = false;
            RDOFolder renamedFolder4 = null;
            foreach (RDOFolder f in folder2.Folders)
            {
                if (f.Name.Equals(folder4.Name))
                {
                    flag1 = false;
                }
                else { flag1 = true; }
            }

            foreach (RDOFolder f1 in folder1.Folders)
            {
                if (f1.Name.Equals(folder3.Name))
                {
                    flag2 = true;
                }
                if (!f1.Name.Equals(folder4.Name))
                {
                    flag3 = true;
                    renamedFolder4 = f1;
                }
            }

            zAssert.IsFalse(flag1, "Verified that folder" + folder4.Name + "is not present under" + folder2.Name);
            zAssert.IsTrue(flag2, "Verified that folder" + folder3.Name + "is present under" + folder1.Name);
            zAssert.IsTrue(flag3, "Verified that folder" + folder4.Name + "is present under" + folder1.Name + "but renamed to" + renamedFolder4.Name);
            #endregion

        }

        [Test, Description("Open shared calendar mounts the wrong store")]
        [Category("Folder")]
        [Bug("13600")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS", "Share the Calendar folder with syncuser", "Sync", "Open the shared Calendar folder in ZCO",
            "Verify the shared Calendar folder can be mounted")]
        public void Bug_13600()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string calendarFolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                           GrantFolderbyID(
                                               calendarFolderId,
                                               FolderActionRequest.grantUser,
                                               zAccount.AccountZCO.emailAddress,
                                               FolderActionRequest.rightsZcoReviewer)
                                       );
            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder 'Calendar' appears in the delegate store");

            #endregion
        }

        [Test, Description("Cannot sync delegate Inbox")]
        [Category("Folder")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("52177")]
        [TestSteps(
            "1. User1 shares inbox with ZCO user",
            "2. ZCO user opens user1's mailbox",
            "3. Sync",
            "4. Local failure and nothing is synced.")]
        public void Bug_52177()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string inboxFolderId, messageId;
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Create account

            zAccount userA = new zAccount();

            userA.createAccount();
            userA.login();
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the root folder id

            userA.sendSOAP(new GetFolderRequest());
            userA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            userA.sendSOAP(new FolderActionRequest().
                                           GrantFolderbyID(
                                               inboxFolderId,
                                               FolderActionRequest.grantUser,
                                               zAccount.AccountZCO.emailAddress,
                                               FolderActionRequest.rightsZcoReviewer)
                                       );
            // Add a message to the account mailbox
            userA.sendSOAP(new AddMsgRequest().
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
            userA.selectSOAP("//mail:m", "id", null, out messageId, 1);

            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder 'Inbox' appears in the delegate store");

            //find the mail in the shared inbox
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, defaultFolder, false);
            zAssert.IsNotNull(rMail, "Verify that the mail appears in the delegate store");

            // Verify the message data
            zAssert.IsTrue(rMail.Body.Contains(content), "Verify the delegate message content matches the expected " + content);

            OutlookCommands.Instance.Sync();
            // Verify that there are no local failures
            RDOMail localFailureMail = OutlookMailbox.Instance.findMessage("Local Failure Notice");
            if (localFailureMail != null)
            {
                zAssert.IsFalse(localFailureMail.UnRead, "Verify that local failure is not generated and the current failure is from another case");
            }
            else
                zAssert.IsNull(localFailureMail, "Verify that local failure is not generated");
            #endregion
        }
    }
}
