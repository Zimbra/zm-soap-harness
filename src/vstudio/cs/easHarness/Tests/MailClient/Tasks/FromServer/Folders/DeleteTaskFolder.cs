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
    [TestFixture]
    class DeleteTaskFolder : Tests.BaseTestFixture
    {
        [Test, Description("Sync the deletion of Task sub-folder to the device - Soft Delete"),
        Property("TestSteps", "1. Create a Task sub-folder on server, 2. Delete the Task sub-folder and sync to device, 3. Verify the folder is moved to trash on server and not displayed on device")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void DeleteTaskFolder01()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String folderName = "folder" + HarnessProperties.getUniqueString();

            //Create a Task sub-folder on server and sync to device
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

            //Delete the Task sub-folder on server
            XmlDocument FolderActionResponse = TestAccount.soapSend(
            "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                "<action op='trash' id='" + FolderId + "'/>" +
            "</FolderActionRequest>");
            
            //Get the latest changes on folder
            ZResponse response1 = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderSync xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
            "</FolderSync>");

            ZAssert.IsNotNull(response1, "Verify the folder sync response is received");
            
            #endregion/

            #region TEST VERIFICATION
            
            XmlElement Update = ZSyncResponse.getMatchingElement(response1.XmlElement, "//FolderHierarchy:Update", "//FolderHierarchy:ServerId[text() = '" + FolderId + "']");
            ZAssert.IsNotNull(Update, "Verify the Update was returned in the Sync Response");

            ZAssert.XmlXpathMatch(Update, "//FolderHierarchy:DisplayName", null, folderName, "Verify the folder display name is correct");
            ZAssert.XmlXpathMatch(Update, "//FolderHierarchy:ParentId", null, "3", "Verify the Task sub-folder is moved to Trash folder");
            ZAssert.XmlXpathMatch(Update, "//FolderHierarchy:Type", null, "15", "Verify the deleted sub-folder is of type Task");
            
            #endregion
        }

        [Test, Description("Sync the deletion of Task sub-folder to the device - Hard Delete"),
        Property("TestSteps", "1. Create a Task sub-folder on server, 2. Delete the Task sub-folder(Hard delete) and sync to device, 3. Verify the folder is deleted on server and not displayed on device")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void DeleteTaskFolder02()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String folderName = "folder" + HarnessProperties.getUniqueString();

            //Create a Task sub-folder on server and sync to device
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

            //Delete the Task sub-folder on server - Hard Delete
            XmlDocument FolderActionResponse = TestAccount.soapSend(
            "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                "<action op='delete' id='" + FolderId + "'/>" +
            "</FolderActionRequest>");

            //Sync the changes to device
            ZResponse response1 = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderSync xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
            "</FolderSync>");

            ZAssert.IsNotNull(response1, "Verify the folder sync response is received");

            #endregion

            #region TEST VERIFICATION

            XmlElement Delete = ZSyncResponse.getMatchingElement(response1.XmlElement, "//FolderHierarchy:Delete", "//FolderHierarchy:ServerId[text() = '" + FolderId + "']");
            ZAssert.IsNotNull(Delete, "Verify the deleted folder is listed for deletion");

            #endregion
        }
    }
}
