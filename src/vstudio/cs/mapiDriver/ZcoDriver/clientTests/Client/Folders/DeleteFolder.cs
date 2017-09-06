using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using Redemption;
using log4net;
using System.Xml;
using System.Collections;

namespace clientTests.Client.Folders
{
    [TestFixture]
    public class DeleteFolder : BaseTestFixture
    {

        [Test, Description("Hard Delete:Verify that Folder deleted by ZCO deleted by ZWC")]
        [Category("SMOKE"), Category("Folder")]
        public void DeleteFolder_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string folderId;
            string folderInboxId;

            #endregion

            #region Account Setup

            #endregion

            #region SOAP Block

            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                <CreateFolderRequest xmlns='urn:zimbraMail'>
                    <folder name='"+ folderName +@"' l='"+ folderInboxId +@"'/>
                </CreateFolderRequest>");
            XmlNode createFolderResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(createFolderResponse, "//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);
            zAssert.IsNotNull(folderId, "Verify the folder ID was found");

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();


            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox); 
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            bool found = false;
            foreach (RDOFolder f in inboxFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);

                if (f.Name.Equals(folderName))
                {
                    found = true;
                }

            }
            zAssert.IsTrue(found, "Verify that the custom folder " + folderName + " was synced");

            #endregion


            #region SOAP Block to Delete the folder

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='delete' id='"+ folderId +@"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);


            #endregion


            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #region Outlook block for Verification

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            found = false;
            foreach (RDOFolder f in inboxFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);

                if (f.Name.Equals(folderName))
                {
                    found = true;
                }

            }
            zAssert.IsFalse(found, "(Checked in Inbox)Verify that the custom folder " + folderName + " deleted from ZWC deleted from ZCO too.");

            RDOFolder trashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            zAssert.IsNotNull(trashFolder, "Check that the Trash folder exists");

            found = false;
            foreach (RDOFolder f in trashFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);

                if (f.Name.Equals(folderName))
                {
                    found = true;
                }

            }
            zAssert.IsFalse(found, "(Checked in Trash)Verify that the custom folder " + folderName + " deleted from ZWC deleted from ZCO too.");

            #endregion


        }

        [Test, Description("Move to Trash:Verify that Folder deleted(move to Trash) by ZWC deleted(moved to Trash) by ZCO")]
        [Category("SMOKE"), Category("Folder")]
        public void DeleteFolder_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderId;
            string inboxFolderId;
            string trashFolderId;

            #endregion

            #region Account Setup

            #endregion

            #region SOAP Block


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") +"']", "id", null, out inboxFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") +"']", "id", null, out trashFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                <CreateFolderRequest xmlns='urn:zimbraMail'>
                    <folder name='" + folderName + @"' l='" + inboxFolderId + @"'/>
                </CreateFolderRequest>");
            XmlNode createFolderResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(createFolderResponse, "//mail:folder[@name='" + folderName + "']", "id", null, out folderId, 1);
            zAssert.IsNotNull(folderId, "Verify the folder ID was found");

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            // Find the inbox

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder found = null;
            foreach (RDOFolder f in inboxFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);

                if (f.Name.Equals(folderName))
                {
                    found = f;
                }

            }
            zAssert.IsNotNull(found, "Verify that the custom folder " + folderName + " was synced");

            #endregion


            #region SOAP Block to Delete (move to Trash)the folder

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='move' id='" + folderId + @"' l='"+ trashFolderId +@"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);


            #endregion


            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #region Outlook block for Verification

            RDOFolder inboxFolder2 = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder2, "Check that the inbox folder exists");

            found = null;
            foreach (RDOFolder f in inboxFolder2.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);

                if (f.Name.Equals(folderName))
                {
                    found = f;
                }

            }
            zAssert.IsNull(found, "(Checked in Inbox)Verify that the custom folder " + folderName + " deleted from ZWC deleted from ZCO too.");

            RDOFolder trashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            zAssert.IsNotNull(trashFolder, "Check that the Trash folder exists");

            found = null;
            foreach (RDOFolder f in trashFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);

                if (f.Name.Equals(folderName))
                {
                    found = f;
                }

            }
            zAssert.IsNotNull(found, "(Checked in Trash)Verify that the custom folder " + folderName + " exists in the trash.");

            #endregion



        }

        [Test, Description("Hard Delete:Verify that Folder(containing Messages and folder with messages) deleted by ZCO deleted by ZWC")]
        [Category("Folder")]
        public void DeleteFolder_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder2Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Id;
            string folder2Id;
            RDOFolder folder1rdo;
            RDOFolder folder2rdo;
            string inboxFolderId;

            XmlNode createFolderResponse;

            #endregion

            #region SOAP Block


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                <CreateFolderRequest xmlns='urn:zimbraMail'>
                    <folder name='" + folder1Name + @"' l='" + inboxFolderId + @"'/>
                </CreateFolderRequest>");
            createFolderResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(createFolderResponse, "//mail:folder[@name='" + folder1Name + "']", "id", null, out folder1Id, 1);
            zAssert.IsNotNull(folder1Id, "Verify the folder1 ID was found");

            zAccount.AccountZCO.sendSOAP(@"
                <CreateFolderRequest xmlns='urn:zimbraMail'>
                    <folder name='" + folder2Name + @"' l='" + folder1Id + @"'/>
                </CreateFolderRequest>");
            createFolderResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(createFolderResponse, "//mail:folder[@name='" + folder2Name + "']", "id", null, out folder2Id, 1);
            zAssert.IsNotNull(folder2Id, "Verify the folder2 ID was found");


            // Add 5 messages to each folder.
            // Save the message subjects for searching later
            //
            ArrayList subjects = new ArrayList();
            string subject;

            for (int i = 0; i < 5; i++)
            {
                subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
                subjects.Add(subject);

                zAccount.AccountZCO.sendSOAP(@"
                    <AddMsgRequest xmlns='urn:zimbraMail'>
                        <m l='" + folder1Id + @"'>
                            <content>From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body



                            </content>
                        </m>
                    </AddMsgRequest>");
                zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", null, null, null, 1);

                subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
                subjects.Add(subject);

                zAccount.AccountZCO.sendSOAP(@"
                    <AddMsgRequest xmlns='urn:zimbraMail'>
                        <m l='" + folder2Id + @"'>
                            <content>From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body



                            </content>
                        </m>
                    </AddMsgRequest>");
                zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", null, null, null, 1);

            }




            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            folder1rdo = null;
            folder2rdo = null;
            foreach (RDOFolder f1 in inboxFolder.Folders)
            {
                tcLog.Info("folder " + f1.Name + " ... looking for " + folder1Name +" and "+ folder2Name);
                if (f1.Name.Equals(folder1Name))
                {
                    folder1rdo = f1;
                    foreach (RDOFolder f2 in f1.Folders)
                    {
                        if (f2.Name.Equals(folder2Name))
                            folder2rdo = f2;
                    }
                }
            }
            zAssert.IsNotNull(folder1rdo, "Verify " + folder1Name + " is found");
            zAssert.IsNotNull(folder2rdo, "Verify " + folder2Name + " is found");

            foreach (string s in subjects)
            {
                RDOMail m = OutlookMailbox.Instance.findMessage(s, folder1rdo, true);
                zAssert.IsNotNull(m, "Verify the message with subject " + s + " exists in the ZCO mailbox");
            }

            #endregion

            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #region Hard Delete the Folder containing Messages and folder with messages.(Delete the Folder and then delete it from deleted items folder)
            //Due to unavailability of Folder redemption using Delete the Folder and then delete it from deleted items folder logic.

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);

            foreach (RDOFolder f in inboxFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folder1Name + " & " + folder2Name);
                if (f.Name.Equals(folder1Name))
                {
                    f.Delete();
                }
            }

            RDOFolder trashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);

            foreach (RDOFolder f in trashFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folder1Name + " & " + folder2Name);
                if (f.Name.Equals(folder1Name))
                {
                    f.Delete();
                }
            }


            #endregion


            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #region ZWC block for Verification

            foreach (string s in subjects) {

                zAccount.AccountZCO.sendSOAP(@"
                    <SearchRequest xmlns='urn:zimbraMail' types='message'>
	                    <query>subject:('"+ s +@"')</query>
	                </SearchRequest>");
                zAccount.AccountZCO.selectSOAP("//mail:m[@l='" + folder2Id + "']", null, null, null, 0);

            }

            #endregion


        }


    }
}
