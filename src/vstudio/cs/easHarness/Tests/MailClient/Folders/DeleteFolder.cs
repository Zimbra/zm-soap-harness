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
    public class DeleteFolder : Tests.BaseTestFixture
    {

        [Test, Description("Delete folder on device and sync to server"),
        Property("TestSteps", "1. Create Folder on server, 2. Delete the folder on device, 3. Sync to server, 4. Verify the folder is deleted")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L0")]
        public void DeleteFolder01()
        {

            /*
             * Delete folder on device and verify if it is synced to server
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

            #endregion

            #region TEST ACTION

            // Send FolderDelete request
            response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderDelete xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                    "<ServerId>" + folderId + @"</ServerId>" +
                "</FolderDelete>");
            
            ZAssert.IsNotNull(response, "Verify the Folder Update response was received");

            #endregion



            #region TEST VERIFICATION

            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            XmlNode m = this.TestAccount.soapSelect(GetFolderResponse, "//mail:folder[@name='" + folderName + "']");

            ZAssert.IsNull(m, "Verify the folder does not exist on server");

            #endregion


        }

    }
}
