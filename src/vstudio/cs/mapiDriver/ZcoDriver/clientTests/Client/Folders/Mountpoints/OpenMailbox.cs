using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using Redemption;

namespace clientTests.Client.Folders.Mountpoints
{

    [TestFixture]
    public class OpenMailbox : BaseTestFixture
    {

        [Test, Description("Verify that ZCO can open another user's mailbox")]
        [Category("Folder")]
        public void OpenMailbox_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());




            #region Test Case variables

            string account2folderinboxID;
            string account2folderID;
            string account2foldername = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string account2messagesubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string account2messagecontent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string account2messageID;

            #endregion



            #region SOAP: Delegate creates folder and shares it


            // Auth as the delegate
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out account2folderinboxID, 1);



            // Create a folder in the inbox
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(account2foldername).
                                                SetParent(account2folderinboxID))
                                        );

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out account2folderID, 1);



            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account2folderID,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );



            // Add a message to the account mailbox
            zAccount.AccountA.sendSOAP(new AddMsgRequest().
                                            AddMessage(new MessageObject().
                                                            SetParent(account2folderID).
                                                            AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + account2messagesubject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + account2messagecontent + @"




")));
            zAccount.AccountA.selectSOAP("//mail:m", "id", null, out account2messageID, 1);

            #endregion


            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            // Sync any changes
            OutlookCommands.Instance.Sync();

            // Sync the GAL so that the address is now in the GAL.
            // To mount a mailbox, the delegate account must be in the GAL first
            OutlookCommands.Instance.SyncGAL();

            // Mount the mailbox
            // This function does:
            // A. Sync GAL
            // B. Run MountIt.exe
            // C. Sync
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);


            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");


            // Make sure the folder is there
            // Find the root folder in the mountpoint
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account2foldername, mountpointInbox, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            // Make sure the message is there
            RDOMail message1 = OutlookMailbox.Instance.findMessage(account2messagesubject, folder1, false);
            zAssert.IsNotNull(message1, "Verify that the message appears in the delegate store");


            #endregion



        }




    }
}
