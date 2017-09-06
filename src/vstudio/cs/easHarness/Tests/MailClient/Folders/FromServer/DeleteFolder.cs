using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using System.Xml;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Folders.FromServer
{
    [TestFixture]
    public class DeleteFolder : Tests.BaseTestFixture
    {

        /**
         * Delete a folder on the server, sync to the device
         **/
        [Test, Description("Sync deletion of folder to the device"),
        Property("TestSteps", "1. Create a folder on the server, 2. Delete the folder, 3. Sync to device, 4. Verify the folder is deleted")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L0")]
        public void DeleteFolder01()
        {

            /*
             * Create a folder on the server
             * Sync
             * Delete the folder on the server
             * Sync ... Verify the sync response contains the deleted folder
             */

            #region TEST SETUP

            String folderName = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderName + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //As folder was created on server, it needs to be synced to device

            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            // Delete the new folder
            XmlDocument FolderActionResponse = this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='delete' id='" + folderId + "'/>" +
                    "</FolderActionRequest>");


            #endregion

            #region TEST ACTION

            // Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            #endregion



            #region TEST VERIFICATION

            // Verify the correct response type
            ZFolderSyncResponse folderSync = response as ZFolderSyncResponse;
            ZAssert.IsNotNull(folderSync, "Verify the Folder Sync response was received");

            // Verify the deleted folder is listed
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Delete//FolderHierarchy:ServerId", null, folderId, "Verify the deleted folder is listed for deletion");

            #endregion


        }

        /**
         * Delete two folders on the server, sync to the device
         **/
        [Test, Description("Sync deletion of two folders to the device"),
        Property("TestSteps", "1. Create  two folders on the server, 2. Delete the folders, 3. Sync to device, 4. Verify the folders are deleted")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L1")]
        public void DeleteFolder02()
        {

            /*
             * Create a folder on the server
             * Sync
             * Delete the folder on the server
             * Sync ... Verify the sync response contains the deleted folder
             */

            #region TEST SETUP

            String folderName1 = "folder" + HarnessProperties.getUniqueString();
            String folderName2 = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderName1 + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderId1 = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderName2 + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderId2 = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //As folder was created on server, it needs to be synced to device

            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            // Delete the new folder
            XmlDocument FolderActionResponse = this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='delete' id='" + folderId1 + "'/>" +
                    "</FolderActionRequest>");

            FolderActionResponse = this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='delete' id='" + folderId2 + "'/>" +
                    "</FolderActionRequest>");


            #endregion

            #region TEST ACTION

            // Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            #endregion



            #region TEST VERIFICATION

            // Verify the correct response type
            ZFolderSyncResponse folderSync = response as ZFolderSyncResponse;
            ZAssert.IsNotNull(folderSync, "Verify the Folder Sync response was received");

            // Verify the deleted folder is listed
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Delete//FolderHierarchy:ServerId", null, folderId1, "Verify the deleted folder 1 is listed for deletion");
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Delete//FolderHierarchy:ServerId", null, folderId2, "Verify the deleted folder 2 is listed for deletion");

            #endregion


        }
    }
}
