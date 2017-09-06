using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Zimbra.EasHarness.ActiveSync;
using Utilities;
using System.Xml;

namespace Tests.MailClient.Tasks.FromServer.Folders
{
    class UpdateTaskFolder : Tests.BaseTestFixture
    {
        [Test, Description("Sync Task sub-folder updated on server to the device"),
        Property("TestSteps", "1. Create a folder on server, 2. Rename the new folder, 3. Sync to device and verify the folder is updated properly")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void UpdateTaskFolder01()
        {
            #region TEST SETUP

            String folderName = "folder" + HarnessProperties.getUniqueString();
            String folderName1 = "folder" + HarnessProperties.getUniqueString();
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");

            //Create a folder on server and sync to device
            XmlDocument CreateFolderResponse = TestAccount.soapSend(
            @"<CreateFolderRequest xmlns='urn:zimbraMail'>
	            <folder l='" + taskFolderId + @"' name='" + folderName + @"' view='task'/>
            </CreateFolderRequest>");

            String FolderId = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderSync xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
            "</FolderSync>");

            ZAssert.IsNotNull(response, "Verify the folder sync response is received");

            #endregion

            #region TEST ACTION

            //Rename the new folder
            XmlDocument FolderActionResponse = this.TestAccount.soapSend(
            "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                "<action op='rename' id='" + FolderId + "' name='" + folderName1 + "'/>" +
            "</FolderActionRequest>");

            //Send FolderSync
            ZResponse response1 = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderSync xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
            "</FolderSync>");

            ZAssert.IsNotNull(response1, "Verify the folder sync response is received");

            //Get the matching Update element
            XmlElement Update = ZSyncResponse.getMatchingElement(response1.XmlElement, "//FolderHierarchy:Update", "//FolderHierarchy:ServerId[text() = '" + FolderId + "']");
            ZAssert.IsNotNull(Update, "Verify the Update was returned in the Sync Response");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Update, "//FolderHierarchy:DisplayName", null, folderName1, "Verify the new folder name is returned");
            ZAssert.XmlXpathMatch(Update, "//FolderHierarchy:ParentId", null, taskFolderId, "Verify the updated folder is still inside Task folder");
            
            #endregion
        }
    }
}
