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
    class DeleteTaskFolder : Tests.BaseTestFixture
    {
        [Test, Description("Delete Task sub-folder and sync to server "),
        Property("TestSteps", "1. Create a new folder inside Tasks folder, 2. Delete the new folder from device, 3. Sync to server and Verify the folder is deleted")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void DeleteTaskFolder01()
        {
            #region TEST SETUP

            String folderName = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.tasks.id");

            //Create the new folder
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

            //Delete the folder from device
            ZResponse response1 = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderDelete xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "<ServerId>"+ folderId +@"</ServerId>" + 
            "</FolderDelete>");

            ZAssert.IsNotNull(response1, "Verify the Folder delete response was received");
            
            #endregion

            #region TEST VERIFICATION

            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            XmlNode m = this.TestAccount.soapSelect(GetFolderResponse, "//mail:folder[@name='" + folderName + "']");

            ZAssert.IsNull(m, "Verify the folder does not exist on server");

            #endregion

        }
    }
}
