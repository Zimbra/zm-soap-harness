using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Zimbra.EasHarness.ActiveSync;
using Utilities;
using System.Xml;

namespace Tests.MailClient.Folders.FromServer
{

    [TestFixture]
    public class GetFolder : BaseTestFixture
    {

        [Test, Description("Sync creation of folder at root level to the device"),
        Property("TestSteps", "1. Create folder on server at root level, 2. Sync to device, 3. Verify the folder is created at root level")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L0")]
        public void GetFolder01()
        {

            /*
             * Create a folder in Root on the server, sync that to the device
             */



            #region TEST SETUP

            String foldername = "folder" + HarnessProperties.getUniqueString();

            // Get the server's folder structrue
            // So we can put the new folder in the Root
            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            String folderRootId = this.TestAccount.soapSelectValue(GetFolderResponse, "//mail:folder[@name='USER_ROOT']", "id");

            // Create the new folder
            this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + foldername + "' l='" + folderRootId + "'/>" +
                    "</CreateFolderRequest>");

            #endregion



            #region TEST ACTION


            // Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
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

            // Verify the new folder exists
            ZAssert.XmlXpathMatch(folderSync.XmlElement, "//FolderHierarchy:DisplayName", null, foldername, "Verify the new folder name is returned");

            #endregion


        }

    }
}
