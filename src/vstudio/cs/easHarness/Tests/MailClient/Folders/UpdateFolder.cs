using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Folders
{
    [TestFixture]
    public class UpdateFolder : Tests.BaseTestFixture
    {

        [Test, Description("Update folder name on device and sync to server"),
        Property("TestSteps", "1. Create Folder on server, 2. Update the folder on device, 3. Sync to server, 4. Verify the folder is updated")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L1")]
        public void UpdateFolder01()
        {

            /*
             * Update folder name on device and verify if it is synced to server
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

            // Send FolderUpdate request
            response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderUpdate xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                    "<ServerId>" + folderId + @"</ServerId>" +
                    "<ParentId>" + parentFolderId + @"</ParentId>" +
                    "<DisplayName>" + folderName1 + @"</DisplayName>" +
                 "</FolderUpdate>"); 

            ZAssert.IsNotNull(response, "Verify the Folder Update response was received");

            #endregion



            #region TEST VERIFICATION

            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            String folderNameCheck = this.TestAccount.soapSelectValue(GetFolderResponse, "//mail:folder[@id='" + folderId + "']", "name");

            ZAssert.AreEqual(folderName1, folderNameCheck, "Verify that folder name as updated on device is synced to server");

            #endregion


        }

    }
}
