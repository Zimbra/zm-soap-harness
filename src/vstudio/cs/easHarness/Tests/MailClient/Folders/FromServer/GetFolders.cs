using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Folders.FromServer
{
    [TestFixture]

    public class GetFolders : Tests.AuthenticatedTestFixture
    {

        [Test, Description("Sync all system folders to the device"),
        Property("TestSteps", "1. Configure an account  on device using ActiveSync protocol, 2. Verify all system folders e.g. Inbox, Sent, Calendar, Tasks, ect are synced to device")]
        [Category("Smoke")]
        [Category("Folders")]
        [Category("L0")]
        public void GetFolders01()
        {

            /*
             * Verify basic FolderSync command
             */


            // Send OPTIONS
            TestClient.sendRequest(new ZOptionsRequest(TestAccount));

            // Send Provision
            TestClient.sendProvisionTransaction();



            // Send FolderSync
            ZResponse response = TestClient.sendRequest(new ZFolderSyncRequest(TestAccount));
            ZAssert.IsNotNull(response, "Verify the response is correctly received");

            ZFolderSyncResponse folderSyncResponse = response as ZFolderSyncResponse;
            ZAssert.IsNotNull(response, "Verify the Folder Sync Resopnse was received");

            // Verify the system folders exist
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Inbox", "Verify the system Inbox is returned");
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Trash", "Verify the system Trash is returned");
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Junk", "Verify the system Junk is returned");
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Sent", "Verify the system Sent is returned");
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Drafts", "Verify the system Drafts is returned");
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Contacts", "Verify the system Contacts is returned");
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Calendar", "Verify the system Calendar is returned");
            ZAssert.XmlXpathMatch(response.XmlElement, "//FolderHierarchy:DisplayName", null, "Tasks", "Verify the system Tasks is returned");

        }


    }



}
