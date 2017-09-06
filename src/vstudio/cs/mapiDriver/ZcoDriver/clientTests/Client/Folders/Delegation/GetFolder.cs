using System;
using System.Collections.Generic;
using System.Text;
using SyncHarness;
using NUnit.Framework;
using SoapWebClient;
using Redemption;
using System.Collections;
using SoapAdmin;
using System.Text.RegularExpressions;
using System.IO;

namespace clientTests.Client.Folders.Delegation
{
    public class GetFolder : BaseTestFixture
    {
        [Test, Description("Verify ZCO can open other users folder[Default folder:Inbox etc.]")]
        [Category("SMOKE"), Category("Folder")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS", "Share the inbox folder with syncuser", "Sync", "Open the shared Inbox folder in ZCO",
            "Verify the shared Inbox folder can be mounted")]
        public void GetFolder_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string inboxFolderId;
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
            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder 'Inbox' appears in the delegate store");

            #endregion

        }

        [Test, Description("Verify ZCO can open other users folder[User created folder]")]
        [Category("Folder")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS  and Create a folder", "Share the folder with syncuser", "Sync", "Open the shared folder in ZCO",
            "Verify the shared folder can be mounted")]
        public void GetFolder_Basic_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string account2FolderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string account2InboxFolderId, account2FolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it
            // Get all folders to determine the root folder id

            zAccount.AccountB.sendSOAP(new GetFolderRequest());
            zAccount.AccountB.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out account2InboxFolderId, 1);

            zAccount.AccountB.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(account2FolderName).
                                                SetParent(account2InboxFolderId))
                                        );

            zAccount.AccountB.selectSOAP("//mail:folder", "id", null, out account2FolderId, 1);

            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account2InboxFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            // Share it with the delegatee (sync user)
            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account2FolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountB);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(defaultFolder, "Verify that the default folder appears in the delegate store");

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(account2FolderName, defaultFolder, false);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");
            #endregion
        }

        [Test, Description("Verify ZCO can not delete/edit/insert/move folder when shared as readonly (r) (rights=rightsZcoReviewer)")]
        [Category("Folder")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auht as user1 in ZCS and add Folder", "Share the Inbox and User Created folder with syncuser", "Sync", "Verify that delete/edit/insert/move actions are not allowed on shared folders")]
        public void GetFolder_Basic_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string account1FolderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string ZCO1FolderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string ZCO2FolderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string folderInboxId, account1FolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the root folder id
            zAccount.AccountB.sendSOAP(new GetFolderRequest());
            zAccount.AccountB.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            // Create a contacts folder in
            zAccount.AccountB.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(account1FolderName).
                                                SetParent(folderInboxId))
                                        );

            zAccount.AccountB.selectSOAP("//mail:folder", "id", null, out account1FolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderInboxId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1FolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );
            #endregion

            #region Outlook Block to check share mounted Correctly

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountB);

            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder sharedInboxFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(sharedInboxFolder, "Verify that the shared folder appears in the delegate store");

            RDOFolder sharedFolder = OutlookMailbox.Instance.findFolder(account1FolderName, sharedInboxFolder, true);
            zAssert.IsNotNull(sharedFolder, "Verify that the Inbox folder appears in the delegate store");

            #endregion

            #region verification

            //Insert

            UnauthorizedAccessException u = null;
            try
            {
                RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
                sharedFolder.Folders.Add(ZCO2FolderName, inboxFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that execption is thrown when trying to create new folder under shared folder");

            //edit

            // Editing the folder. For this, tried to change the name of the folder. It does not change as the user has readonly rights.
            // However, the problem is it does not throw exception. The redemption is eating up the exception zco throws. If I manually rename the folder, zco throws the exception correctly.
            // hence commenting out the following checks for edit.

            //u = null;
            //try
            //{
            //    sharedFolder.Name = "newfolder" + GlobalProperties.time() + GlobalProperties.counter();
            //    sharedFolder.Save();
            //}
            //catch (UnauthorizedAccessException e)
            //{
            //    u = e;
            //}
            //zAssert.IsNotNull(u, "verify that execption is thrown when trying to rename shared folder");

            //Move
            u = null;
            try
            {
                sharedFolder.MoveTo(sharedInboxFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that execption is thrown when trying to move shared folder to shared Inbox");

            //Delete

            u = null;
            try
            {
                sharedFolder.Delete();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that execption is thrown when trying to delete shared folder");

            #endregion
        }

        [Test, Description("Verify ZCO can delete/edit/insert/move folder when shared as (rw) (rights=rightsZcoDelegate)")]
        [Category("Folder")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add Folder", "Share the Inbox and User Created folder with syncuser", "Sync", "Verify that delete/edit/insert/move actions are allowed on shared folders")]
        public void GetFolder_Basic_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string account1FolderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string ZCOfolderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string folderInboxId, account1FolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the root folder id
            zAccount.AccountB.sendSOAP(new GetFolderRequest());
            zAccount.AccountB.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            // Create a contacts folder in
            zAccount.AccountB.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetView("contact").
                                                SetName(account1FolderName).
                                                SetParent(folderInboxId))
                                        );

            zAccount.AccountB.selectSOAP("//mail:folder", "id", null, out account1FolderId, 1);

            // Share it with the delegatee (sync user)

            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderInboxId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoDelegate) //Earlier permission granted was rightsZcoAuthor, which I changed to rightsZcoDelegate since Author permission is not supported
                                        );

            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1FolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoDelegate)
                                        );
            #endregion

            #region Outlook Block to check share mounted Correctly

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountB);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder sharedInboxFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(sharedInboxFolder, "Verify that the shared folder appears in the delegate store");

            RDOFolder sharedFolder = OutlookMailbox.Instance.findFolder(account1FolderName, sharedInboxFolder, true);
            zAssert.IsNotNull(sharedFolder, "Verify that the Inbox folder appears in the delegate store");
            #endregion

            #region verification

            //Insert

            UnauthorizedAccessException u = null;
            try
            {
                RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
                sharedFolder.Folders.Add(ZCOfolderName, inboxFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that execption is thrown when trying to create new folder under shared folder");

            //Edit
            u = null;
            try
            {
                sharedFolder.Name = "NewFolder" + GlobalProperties.time() + GlobalProperties.counter();
                sharedFolder.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that execption is thrown when trying to Rename shared folder");

            //Move
            u = null;
            try
            {
                RDOFolder sharedSubFolder = OutlookMailbox.Instance.findFolder(ZCOfolderName, sharedFolder, true);
                sharedSubFolder.MoveTo(sharedInboxFolder); //this throws exception Error in IMAPIFolder.CopyFolder(FOLDER_MOVE): RPC_E_SERVERFAULT
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that execption is not thrown when trying to move shared folder to shared Inbox");

            //Delete

            u = null;
            try
            {
                sharedFolder.Delete();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that execption is thrown when trying to delete shared folder");

            #endregion
        }

        [Test, Description("Verify ZCO can delete/edit/insert/move folder when shared as (rwid) (rights=rightsZcoAdministrator)")]
        [Category("Folder")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add Folder", "Share the Inbox and User Created folder with syncuser", "Sync", "Verify that delete/edit/insert/move actions are allowed on shared folders")]
        public void GetFolder_Basic_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string Folder1Name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string Folder2Name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string ZCOFolderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string folderInboxId, folder1Id, folder2Id;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the root folder id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            // Create a contacts folder in
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetView("message").
                                                SetName(Folder1Name).
                                                SetParent(folderInboxId))
                                        );

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folder1Id, 1);
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetView("message").
                                                SetName(Folder2Name).
                                                SetParent(folderInboxId))
                                        );

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folder2Id, 1);

            // Share it with the delegatee (sync user)

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderInboxId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folder1Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folder2Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            #endregion

            #region Outlook Block to check share mounted Correctly

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder sharedInboxFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(sharedInboxFolder, "Verify that the shared folder appears in the delegate store");

            RDOFolder shared1Folder = OutlookMailbox.Instance.findFolder(Folder1Name, sharedInboxFolder, true);
            zAssert.IsNotNull(shared1Folder, "Verify that the Inbox folder appears in the delegate store");

            RDOFolder shared2Folder = OutlookMailbox.Instance.findFolder(Folder2Name, sharedInboxFolder, true);
            zAssert.IsNotNull(shared2Folder, "Verify that the Inbox folder appears in the delegate store");
            #endregion

            #region verification

            //Insert

            UnauthorizedAccessException u = null;
            try
            {
                RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
                shared1Folder.Folders.Add(ZCOFolderName, inboxFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that execption is thrown when trying to create new folder under shared folder");

            //Edit
            u = null;
            try
            {
                shared1Folder.Name = "NewFolder" + GlobalProperties.time() + GlobalProperties.counter();
                shared1Folder.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that execption is thrown when trying to Rename shared folder");

            //Move
            u = null;
            Exception exp=null;
            try
            {
                shared1Folder.MoveTo(shared2Folder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            catch (Exception e)
            {
                exp = e;
            }
            zAssert.IsNull(u, "Verify that execption is thrown when trying to move shared folder to shared Inbox");
            //Delete

            u = null;
            try
            {
                shared1Folder.Delete();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that execption is thrown when trying to delete shared folder");

            #endregion
        }

    }
}
