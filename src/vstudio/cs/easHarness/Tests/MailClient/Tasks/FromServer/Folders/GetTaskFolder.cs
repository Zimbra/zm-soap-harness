using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Tasks.FromServer.Folders
{
    [TestFixture]
    class GetTaskFolder : Tests.BaseTestFixture
    {
        [Test, Description("Sync new sub-folder created in the Task folder to the device"),
        Property("TestSteps", "1. Create a folder in Task folder on server and sync to device, 2. Verify the new folder exists")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTaskFolder01()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String folderName = "folder" + HarnessProperties.getUniqueString();

            #endregion

            #region TEST ACTION

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

            //Get the matching Add element
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//FolderHierarchy:Add", "//FolderHierarchy:ServerId[text() = '" + FolderId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion

            #region TEST VERIFICATION

            // Verify the new folder exists
            ZAssert.XmlXpathMatch(Add, "//FolderHierarchy:DisplayName", null, folderName, "Verify the folder display name is correct");
            ZAssert.XmlXpathMatch(Add, "//FolderHierarchy:ParentId", null, taskFolderId, "Verify the new folder is created inside Task folder");

            #endregion
        }

        [Test, Description("Sync new Task folder created at root level to the device"),
        Property("TestSteps", "1. Create a folder at root level on server and sync to device, 2. Verify the new folder exists")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTaskFolder02()
        {
            #region TEST SETUP

            String folderName = "folder" + HarnessProperties.getUniqueString();

            #endregion

            #region TEST ACTION

            //Create a folder on server and sync to device
            XmlDocument CreateFolderResponse = TestAccount.soapSend(
            @"<CreateFolderRequest xmlns='urn:zimbraMail'>
	            <folder l='1' name='" + folderName + @"' view='task'/>
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

            //Get the matching Add element
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//FolderHierarchy:Add", "//FolderHierarchy:ServerId[text() = '" + FolderId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion

            #region TEST VERIFICATION

            // Verify the new folder exists
            ZAssert.XmlXpathMatch(Add, "//FolderHierarchy:DisplayName", null, folderName, "Verify the folder display name is correct");
            ZAssert.XmlXpathMatch(Add, "//FolderHierarchy:ParentId", null, "0", "Verify the new Task folder is created at root level");

            #endregion
        }
    }
}
