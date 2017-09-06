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
    class CreateTaskFolder : Tests.BaseTestFixture
    {
        [Test, Description("Create a sub-folder inside Task folder and sync to server"),
        Property("TestSteps", "1. Create a new folder inside Tasks folder on device, 2. Sync to server, 3. Verify the folder is created correctly")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void CreateTaskFolder01()
        {    
            #region TEST SETUP

            //Set Tasks details
            String parentFolderId = HarnessProperties.getString("folder.tasks.id");
            String folderName = "newFolder" + HarnessProperties.getUniqueString();

            #endregion

            // Create a Sub-Folder in Tasks folder
            #region TEST ACTION

            //Send the SyncRequest with the new folder
            ZResponse response = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderCreate xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "<ParentId>" + parentFolderId + @"</ParentId>" +
                "<DisplayName>" + folderName + @"</DisplayName>" +
                "<Type>15</Type>" +
            "</FolderCreate>");

            ZAssert.IsNotNull(response, "Verify the Folder Create response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            XmlNode m = this.TestAccount.soapSelect(GetFolderResponse, "//mail:folder[@name='" + folderName + "']");

            ZAssert.IsNotNull(m, "Verify the folder is created");

            String parentid = this.TestAccount.soapSelectValue(GetFolderResponse, "//mail:folder[@name='" + folderName + "']", "l");
            ZAssert.AreEqual(parentid, parentFolderId, "Verify if parent folder id match");

            #endregion
        }

        [Test, Description("Create a Task folder at root level and sync to server"),
        Property("TestSteps", "1. Create a new Task folder at root level on device, 2. Sync to server, 3. Verify the folder is created correctly")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void CreateTaskFolder02()
        {
            #region TEST SETUP

            //Set Tasks details
            String rootFolderId = "0";
            String folderName = "newFolder" + HarnessProperties.getUniqueString();

            #endregion

            // Create a root level Task Folder
            #region TEST ACTION

            //Send the SyncRequest with the new folder
            ZResponse response = TestClient.sendRequest(
            TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderCreate xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "<ParentId>" + rootFolderId + @"</ParentId>" +
                "<DisplayName>" + folderName + @"</DisplayName>" +
                "<Type>15</Type>" +
            "</FolderCreate>");

            ZAssert.IsNotNull(response, "Verify the Folder Create response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            XmlNode m = this.TestAccount.soapSelect(GetFolderResponse, "//mail:folder[@name='" + folderName + "']");

            ZAssert.IsNotNull(m, "Verify the folder is created");

            String parentFolderid = this.TestAccount.soapSelectValue(GetFolderResponse, "//mail:folder[@name='" + folderName + "']", "l");
            ZAssert.AreEqual("1", parentFolderid, "Verify the Task folder is created at root level");

            #endregion
        }
    }
}
