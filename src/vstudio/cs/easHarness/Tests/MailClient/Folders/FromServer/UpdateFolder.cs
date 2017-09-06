using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Folders.FromServer
{
    [TestFixture]
    public class UpdateFolder : Tests.BaseTestFixture
    {

        [Test, Description("Sync renaming of folder name to the device"),
        Property("TestSteps", "1. Create a folder on the server, 2. Rename the new folder, 3. Sync to device, 4. Verify the folder is renamed correctly")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L1")]
        public void UpdateFolder01()
        {

            /*
             * Rename a folder on the server and sync to the device
             */

            #region TEST SETUP

            String folderName = "folder" + HarnessProperties.getUniqueString();
            String folderName1 = "folder" + HarnessProperties.getUniqueString();
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

            #endregion

            #region TEST ACTION

            // Rename the new folder
            XmlDocument FolderActionResponse = this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='rename' id='" + folderId + "' name='"+ folderName1 + "'/>" +
                    "</FolderActionRequest>");

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
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Update//FolderHierarchy:ServerId", null, folderId, "Verify the deleted folder is listed for deletion");
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Update//FolderHierarchy:DisplayName", null, folderName1, "Verify the deleted folder is listed for deletion");

            #endregion


        }


        [Test, Description("Sync movement of folder to the device"),
        Property("TestSteps", "1. Create 3 Folders i.e. Folder A, B, C, 2. Move folderB from folderA to folderC, 3. Sync to device, 4. Verify the folderB is moved from folderA to folderC correctly")]
        [Category("Functional")]
        [Category("Folders")]
        [Category("L2")]
        public void UpdateFolder02()
        {

            /*
             * Move a folder on the server and sync to the device
             */

 
            #region TEST SETUP

            // Create
            // * FolderA/FolderB
            // * FolderC
            String folderNameA = "folder" + HarnessProperties.getUniqueString();
            String folderNameB = "folder" + HarnessProperties.getUniqueString();
            String folderNameC = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderNameA + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderIdA = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderNameB + "' l='" + folderIdA + "'/>" +
                    "</CreateFolderRequest>");

            String folderIdB = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderNameC + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderIdC = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //As folder was created on server, it needs to be synced to device

            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            #endregion

            #region TEST ACTION

            // Move folderB from folderA to folderC
            XmlDocument FolderActionResponse = this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='move' id='" + folderIdB + "' l='" + folderIdC + "'/>" +
                    "</FolderActionRequest>");

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

            // Verify the moved folder is listed
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Update//FolderHierarchy:ServerId", null, folderIdB, "Verify the moved folder is listed");
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Update//FolderHierarchy:ParentId", null, folderIdC, "Verify the new parent folder ID is listed");

            #endregion


        }

        [Test, Description("Sync renaming and movement of folder to the device"),
        Property("TestSteps", "1. Create 3 Folders i.e. Folder A, B, C, 2. Move folderB from folderA to folderC, 3. Rename the new folder, 4. Sync to device, 5. Verify the folderB is moved from folderA to folderC correctly. Also verify the folder is renamed correctly")]
        [Category("Functional")]
        [Category("Folders")]
        [Category("L2")]
        public void MultipleUpdatesFolder01()
        {

            /*
             * Move and rename a folder on the server and sync to the device
             */


            #region TEST SETUP

            // Create
            // * FolderA/FolderB
            // * FolderC
            String folderNameA = "folder" + HarnessProperties.getUniqueString();
            String folderNameB = "folder" + HarnessProperties.getUniqueString();
            String folderNameNewB = "folder" + HarnessProperties.getUniqueString();
            String folderNameC = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderNameA + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderIdA = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderNameB + "' l='" + folderIdA + "'/>" +
                    "</CreateFolderRequest>");

            String folderIdB = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderNameC + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderIdC = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //As folder was created on server, it needs to be synced to device

            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            #endregion

            #region TEST ACTION

            // Move folderB from folderA to folderC
            XmlDocument FolderActionResponse = this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='move' id='" + folderIdB + "' l='" + folderIdC + "'/>" +
                    "</FolderActionRequest>");

            // Rename the new folder
            FolderActionResponse = this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='rename' id='" + folderIdB + "' name='" + folderNameNewB + "'/>" +
                    "</FolderActionRequest>");

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

            // Verify the moved folder is listed
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Update//FolderHierarchy:ServerId", null, folderIdB, "Verify the moved folder is listed");
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Update//FolderHierarchy:ParentId", null, folderIdC, "Verify the new parent folder ID is listed");
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:Update//FolderHierarchy:DisplayName", null, folderNameNewB, "Verify the new folder name is listed");

            #endregion


        }


    }
}
