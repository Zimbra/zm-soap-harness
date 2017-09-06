using System;
using System.Collections.Generic;
using System.Text;
using SyncHarness;
using NUnit.Framework;
using SoapWebClient;
using Redemption;
using System.Collections;

namespace restartTests.Client.Folders.Bugs
{
    public class FolderBugs : clientTests.BaseTestFixture
    {
        [Test, Description("Fix 'Outbox1' and 'Sync Issues1' folder names")]
        [Category("Folder")]
        [Ignore("Need to fix OutlookProcess.StopOutlookApp() - use ExecTestFixture")]
        [Bug("14618")]
        [TestSteps("1. Create a new folder Outbox (or Sync Issues) on web client.",
                   "2. After sync, you'll notice the old Outbox in Outlook is renamed to Outbox1. The new Outbox is the folder that's synced from server.",
                   "3. Delete Outbox either on web client or in Outlook.",
                   "4. Close Outlook.",
                   "5. Restart Outlook, the Outbox1 is renamed back to Outbox",
                   "6.And it should still be a special folder with regular Outbox icon next to it")]
        public void Bug_14618()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string outboxFolderName = "Outbox";
            string outbox1FolderName = "Outbox1";
            string rootFolderId, outboxFolderId;
            #endregion

            #region SOAP Block

            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.root") + "']", "id", null, out rootFolderId, 1);

            // Create a folder under root
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().
                AddFolder(new FolderObject().SetName(outboxFolderName).SetParent(rootFolderId)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out outboxFolderId, 1);

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            // Find the Root Folder
            RDOFolder rootFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(rootFolder, "Check that the rootFolder exists");

            bool found1 = false;
            bool found2 = false;

            foreach (RDOFolder f in rootFolder.Folders)
            {

                if (f.Name.Equals(outboxFolderName))
                {
                    found1 = true;
                }
                if (f.Name.Equals(outbox1FolderName))
                {
                    found2 = true;
                }
            }
            zAssert.IsTrue(found1, "Verify that the custom folder " + outboxFolderName + " was synced");
            zAssert.IsTrue(found2, "Verify that the custom folder " + outbox1FolderName + " was synced");

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block to Delete the folder
            zAccount.AccountZCO.sendSOAP(new SoapWebClient.FolderActionRequest().DeleteFolderbyID(outboxFolderId));
            OutlookCommands.Instance.Sync();
            #endregion

            #region Shutdown ZCO
            OutlookProcess.Instance.StopApplication("Kill Outlook");
            #endregion

            #region Start ZCO
            OutlookProfile profile = new OutlookProfile(zAccount.AccountZCO);
            OutlookProcess.Instance.StartApplication(profile);
            tcLog.Debug("Initialized the default Sync Client user");

            #endregion

            #region Verification on ZCO Side
            found1 = false;
            found2 = false;

            rootFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            foreach (RDOFolder f in rootFolder.Folders)
            {

                if (f.Name.Equals(outboxFolderName))
                {
                    found1 = true;
                }
                if (f.Name.Equals(outbox1FolderName))
                {
                    found2 = true;
                }
            }
            zAssert.IsTrue(found1, "Verify that the custom folder " + outboxFolderName + " was synced");
            zAssert.IsFalse(found2, "Verify that the custom folder " + outbox1FolderName + " was removed by ZCO correctly");
            #endregion

        }

        [Test, Description("Bug 16881: Outbox1 is back")]
        [Category("SMOKE"), Category("Folder")]
        [Bug("16881")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. SOAP: Create a new folder Outbox",
            "2. ZCO: Sync",
            "3. SOAP/ZCO: Delete Outbox either on web client or in Outlook.",
            "4. ZCO: Sync and Restart Outlook, Verify that the Outbox1 is renamed back to Outbox")]
        public void Bug_16881()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string outboxFolderName = "Outbox";
            string outbox1FolderName = "Outbox1";
            string rootFolderId, outboxFolderId;
            #endregion

            #region SOAP Block

            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.root") + "']", "id", null, out rootFolderId, 1);

            // Create a folder under root
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().
                AddFolder(new FolderObject().SetName(outboxFolderName).SetParent(rootFolderId)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out outboxFolderId, 1);

            #endregion

            #region Outlook Block: Verify that OUTBOX is synced as "OUTBOX" in ZCO and the outlook's outbox is renamed to "OUTBOX1"

            OutlookCommands.Instance.Sync();

            // Find the Root Folder
            RDOFolder rootFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(rootFolder, "Check that the rootFolder exists");

            bool found1 = false;
            bool found2 = false;

            foreach (RDOFolder f in rootFolder.Folders)
            {

                if (f.Name.Equals(outboxFolderName))
                {
                    found1 = true;
                }
                if (f.Name.Equals(outbox1FolderName))
                {
                    found2 = true;
                }
            }
            zAssert.IsTrue(found1, "Verify that the custom folder " + outboxFolderName + " was synced to ZCO");
            zAssert.IsTrue(found2, "Verify that Outlook's \"OUTBOX\" is renamed to " + outbox1FolderName);

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Delete the folder "OUTBOX"
            zAccount.AccountZCO.sendSOAP(new SoapWebClient.FolderActionRequest().DeleteFolderbyID(outboxFolderId));
            #endregion

            #region Outlook Block: Sync Outlook and Restart Outlook

            OutlookCommands.Instance.Sync();

            #region Shutdown Outlook

            OutlookProcess.Instance.StopApplication("Kill Outlook");

            #endregion

            #region Start Outlook
            OutlookProfile profile = new OutlookProfile(zAccount.AccountZCO);
            OutlookProcess.Instance.StartApplication(profile);
            #endregion

            #endregion

            #region Outlook Block: Verify that Outbox1 is renamed back to Outbox

            found1 = false;
            found2 = false;

            rootFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            foreach (RDOFolder f in rootFolder.Folders)
            {

                if (f.Name.Equals(outboxFolderName))
                {
                    found1 = true;
                }
                if (f.Name.Equals(outbox1FolderName))
                {
                    found2 = true;
                }
            }
            zAssert.IsTrue(found1, "Verify that Outlook's \"OUTBOX1\" is renamed back to \"OUTBOX\"");
            zAssert.IsFalse(found2, "Verify that the custom folder \"OUTBOX\" was removed from Outlook");

            #endregion

        }
    }
}
