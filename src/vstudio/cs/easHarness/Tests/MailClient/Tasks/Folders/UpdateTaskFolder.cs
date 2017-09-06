using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Tasks.Folders
{
    [TestFixture]
    class UpdateTaskFolder : Tests.BaseTestFixture
    {
        [Test, Description("Update Task Sub-folder and sync to server"),
        Property("TestSteps", "1. Create a sub-folder in Task folder, 2. Update the sub-folder name on device, 3. Sync to server and verify the folder is updated correctly")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void UpdateTaskFolder01()
        {
            #region TEST SETUP

            String parentFolderId = HarnessProperties.getString("folder.tasks.id");
            String folderName = "folder" + HarnessProperties.getUniqueString();
            String folderName1 = "folder" + HarnessProperties.getUniqueString();

            //Create a sub-folder in Task folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
            "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                "<folder name='" + folderName + "' l='" + parentFolderId + "' view='task'/>" +
            "</CreateFolderRequest>");

            String folderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //Sync new sub-folder to the device
            ZResponse response = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderSync xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
            "</FolderSync>");
            
            ZAssert.IsNotNull(response, "Verify the response was received");

            #endregion

            #region TEST ACTION
            
            //Update the sub-folder name on device
            ZResponse response1 = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderUpdate xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "<ServerId>" + folderId + @"</ServerId>" +
                "<ParentId>" + parentFolderId + @"</ParentId>" +
                "<DisplayName>" + folderName1 + @"</DisplayName>" +
            "</FolderUpdate>");

            ZAssert.IsNotNull(response1, "Verify the Folder update response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            XmlNode m = this.TestAccount.soapSelect(GetFolderResponse, "//mail:folder[@name='" + folderName + "']");
            XmlNode m1 = this.TestAccount.soapSelect(GetFolderResponse, "//mail:folder[@name='" + folderName1 + "']");

            ZAssert.IsNull(m, "Verify the folder with old name does not exist on server");
            ZAssert.IsNotNull(m1, "Verify the folder name is updated to new name");

            String parentid = this.TestAccount.soapSelectValue(GetFolderResponse, "//mail:folder[@name='" + folderName1 + "']", "l");
            ZAssert.AreEqual(parentid, parentFolderId, "Verify if parent folder id match");

            #endregion
        }
    }
}
