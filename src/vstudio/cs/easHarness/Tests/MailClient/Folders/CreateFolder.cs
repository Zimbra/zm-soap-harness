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
    public class CreateFolder : Tests.BaseTestFixture
    {

        [Test, Description("Create folder on device and sync to server"),
        Property("TestSteps", "1. Create Folder on device, 2. Sync to server, 3. Verify the folder is created")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L0")]
        public void CreateFolder01()
        {

            /*
             * Create folder on device and verify if it is synced to server
             */

            #region TEST SETUP

            String folderName = "newFolder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");
            
            #endregion

            #region TEST ACTION

            // Send FolderCreate request
            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderCreate xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                    "<ParentId>" + parentFolderId + @"</ParentId>" +
                    "<DisplayName>" + folderName + @"</DisplayName>" +
                    "<Type>12</Type>" +
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

    }
}
