using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Zimbra.EasHarness.ActiveSync;
using Utilities;
using System.Xml;

namespace Tests.MailClient.Folders.Mountpoints.FromServer
{

    [TestFixture]
    public class GetMountpoint : BaseTestFixture
    {

        [Test, Description("Verify MountPoint created on server is not returned to the device"),
        Property("TestSteps", "1. AccountA creates a folder, 2. AccountA shares folder with EAS Test Account, 3. EAS Test Account mounts the folder, 4. EAS Test Account syncs to device, 5. Verify the mountpoint is not returned")]
        [Category("Functional")]
        [Category("Folder")]
        [Category("L2")]
        public void GetMountpoint01()
        {

            /*
             * Create a mountpoint in Root on the server, sync that to the device, verify the mountpoint is not returned (shared folders are not supported by zimbra mobile sync
             */

            /*
             * 1. AccountA creates a folder
             * 2. AccountA shares folder with EAS Test Account
             * 3. EAS Test Account mounts the folder
             * 4. EAS Test Account syncs to device
             * 5. Verify the mountpoint is returned
             */


            #region TEST SETUP

            // Create the source account
            ZimbraAccount AccountA = new ZimbraAccount().provision().authenticate();

            String folderName = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");

            // Create the new folder
            XmlDocument CreateFolderResponse = AccountA.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderName + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            // Share the new folder
            XmlDocument FolderActionRequest = AccountA.soapSend(
                    "<FolderActionRequest  xmlns='urn:zimbraMail'>" +
                        "<action op='grant' id='"+ folderId +"'>" +
                            "<grant gt='usr' perm='rwidax' d='" + this.TestAccount.EmailAddress +"'/>" +
                        "</action>" +
                    "</FolderActionRequest >");

            String mountpointName = "mountpoint" + HarnessProperties.getUniqueString();
            String parentMountpointId = HarnessProperties.getString("folder.inbox.id");

            // create the mountpoint
            XmlDocument CreateMountpointRequest = this.TestAccount.soapSend(
                    "<CreateMountpointRequest xmlns='urn:zimbraMail'>" +
                        "<link view='message' zid='"+ AccountA.ZimbraId +"' rid='"+ folderId +"' name='"+ mountpointName +"' l='"+ parentMountpointId +"'/>" +
                    "</CreateMountpointRequest>");


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

            // Verify the mountpoint is not returned
            ZAssert.XmlXpathCount(folderSync.XmlElement, "//*[text()='" + mountpointName + "']", 0, "Verify message mountpoints are not returned by the server");

            #endregion


        }

    }
}
