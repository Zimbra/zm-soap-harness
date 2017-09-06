using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using Outlook = Microsoft.Office.Interop.Outlook;
using System.Collections;
using Redemption;
using System.Xml;


namespace clientTests.Client.Folders
{

    [TestFixture]
    public class GetFolder : BaseTestFixture
    {


        [Test, Description("Verify that ZCO can sync a folder")]
        [Category("SMOKE"), Category("Folder")]
        public void GetFolder_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
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
                            <folder name='" + folderName + @"' l='" + folderInboxId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse", null, null, null, 1);

            #endregion

            #region Outlook Block


            OutlookCommands.Instance.Sync();


            // Find the inbox
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            bool found = false;
            foreach (RDOFolder f in inboxFolder.Folders)
            {
                tcLog.Info("folder " + f.Name + " ... looking for " + folderName);

                if (f.Name.Equals(folderName))
                {
                    found = true;
                    break;
                }

            }

            zAssert.IsTrue(found, "Verify that the custom folder " + folderName + " was synced");


            #endregion
        }


        [Test, Description("Verify that ZCO can sync Nested folders under Inbox(Inbox/folder/subfolder1/subfolder11/subfolder111)")]
        [Category("SMOKE"),Category("Folder")]
        public void GetFolder_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder11Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder111Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderParentId;

            #endregion

            #region Account Setup

            #endregion

            #region SOAP Block


            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderParentId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder1Name + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder11Name + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder111Name + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);


            #endregion

            #region Outlook Block
            
            
            OutlookCommands.Instance.Sync();


            // Find the inbox

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            foreach (RDOFolder a in inboxFolder.Folders)
            {
                if (a.Name.Equals(folderName))
                {
                    zAssert.AreEqual(folderName, a.Name, "Found /inbox/" + folderName);
                    foreach (RDOFolder b in a.Folders)
                    {
                        if (b.Name.Equals(folder1Name))
                        {
                            zAssert.AreEqual(folder1Name, b.Name, "Found /inbox/" + folderName + "/" + folder1Name);
                            foreach (RDOFolder c in b.Folders)
                            {
                                if (c.Name.Equals(folder11Name))
                                {
                                    zAssert.AreEqual(folder1Name, b.Name, "Found /inbox/" + folderName + "/" + folder1Name +"/" + folder11Name);
                                    foreach (RDOFolder d in c.Folders)
                                    {
                                        if (d.Name.Equals(folder111Name))
                                        {
                                            zAssert.AreEqual(folder1Name, b.Name, "Found /inbox/" + folderName + "/" + folder1Name + "/" + folder11Name +"/"+ folder111Name);
                                            return; // All Done!
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

            }


            zAssert.Fail("Never found all the folders!");


            #endregion
        }

        [Test, Description("Verify that ZCO can sync Nested folders under ROOT(ROOT/folder/subfolder1/subfolder11/subfolder111)")]
        [Category("SMOKE"),Category("Folder")]
        public void GetFolder_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder11Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder111Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderParentId;

            #endregion

            #region Account Setup

            #endregion

            #region SOAP Block


            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.root") + "']", "id", null, out folderParentId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder1Name + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder11Name + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder111Name + @"' l='" + folderParentId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderParentId, 1);


            #endregion

            #region Outlook Block


            OutlookCommands.Instance.Sync();


            // Find the inbox

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox).Parent;
            zAssert.IsNotNull(inboxFolder, "Check that the USER_ROOT folder exists");

            foreach (RDOFolder a in inboxFolder.Folders)
            {
                if (a.Name.Equals(folderName))
                {
                    zAssert.AreEqual(folderName, a.Name, "Found /inbox/" + folderName);
                    foreach (RDOFolder b in a.Folders)
                    {
                        if (b.Name.Equals(folder1Name))
                        {
                            zAssert.AreEqual(folder1Name, b.Name, "Found /inbox/" + folderName + "/" + folder1Name);
                            foreach (RDOFolder c in b.Folders)
                            {
                                if (c.Name.Equals(folder11Name))
                                {
                                    zAssert.AreEqual(folder1Name, b.Name, "Found /inbox/" + folderName + "/" + folder1Name + "/" + folder11Name);
                                    foreach (RDOFolder d in c.Folders)
                                    {
                                        if (d.Name.Equals(folder111Name))
                                        {
                                            zAssert.AreEqual(folder1Name, b.Name, "Found /inbox/" + folderName + "/" + folder1Name + "/" + folder11Name + "/" + folder111Name);
                                            return; // All Done!
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

            }


            zAssert.Fail("Never found all the folders!");


            #endregion
        }

        [Test, Description("GetFolder.cs: Create folder with different default views")]
        [Category("SMOKE"),Category("Folder")]
        //1. Using SOAP, create folders with:
        //     view={types}
        //                {types} = comma-separated list.  Legal values are:conversation|message|contact|appointment|task|note|wiki|document
        //2. Sync to ZCO
        //3. Verify that the folders are synced correctly

        public void GetFolder_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());


            #region Test Case Veriables

            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder2Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder3Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder4Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder5Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderInboxId;
            string folderRootId;
            string folderContactsId;
            string folderCalendarId;
            string folderTasksId;

            #endregion

            #region SOAP Block to Create a Contact

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.root") + "']", "id", null, out folderRootId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out folderContactsId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out folderCalendarId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out folderTasksId, 1);


            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder1Name + @"' l='" + folderInboxId + @"' view='converstation'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder2Name + @"' l='" + folderRootId + @"' view='message'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", null, null, null, 1);


            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder3Name + @"' l='" + folderContactsId + @"' view='contact'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", null, null, null, 1);


            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder4Name + @"' l='" + folderCalendarId + @"' view='appointment'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder5Name + @"' l='" + folderTasksId + @"' view='task'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", null, null, null, 1);



            #endregion

            #region Outlook block for Verification of synced folders at ZCO side.

            //Sync ZCO
            OutlookCommands.Instance.Sync();

            RDOFolder rdoInboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOFolder rdoRootFolder = rdoInboxFolder.Parent;
            RDOFolder rdoContactFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDOFolder rdoCalendarFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            RDOFolder rdoTaskFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);

            zAssert.IsNotNull(rdoInboxFolder, "Check that the Inbox folder exists");
            zAssert.IsNotNull(rdoRootFolder, "Check that the Root folder exists");
            zAssert.IsNotNull(rdoContactFolder, "Check that the Contact folder exists");
            zAssert.IsNotNull(rdoCalendarFolder, "Check that the Calendar folder exists");
            zAssert.IsNotNull(rdoTaskFolder, "Check that the inbox Tasks exists");

            RDOFolder rdoFolder;

            rdoFolder = OutlookMailbox.Instance.findFolder(folder1Name, rdoInboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify the 'message' folder is synced");

            rdoFolder = OutlookMailbox.Instance.findFolder(folder2Name, rdoRootFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify the 'message' folder is synced");

            rdoFolder = OutlookMailbox.Instance.findFolder(folder3Name, rdoContactFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify the 'message' folder is synced");

            rdoFolder = OutlookMailbox.Instance.findFolder(folder4Name, rdoCalendarFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify the 'message' folder is synced");

            rdoFolder = OutlookMailbox.Instance.findFolder(folder5Name, rdoTaskFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify the 'message' folder is synced");


            #endregion


        }
        [Test, Description("Sync a new folder with a message")]
        [Category("SMOKE"),Category("Folder")]
        public void GetFolder_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Steps:
            //1. Create a new folder (SOAP)
            //2. Add a message to the new folder (SOAP)
            //3. Sync
            //4. Verify that the folder and message appear (ZCO)
            //

            #region Test Case Veriables

            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Id;
            string folderInboxId;
            string messageSubject = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());

            #endregion


#region SOAP

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            // Create the subfolder
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder1Name + @"' l='" + folderInboxId + @"' view='converstation'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder1Id, 1);




            // Add a new message to the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <AddMsgRequest xmlns='urn:zimbraMail'>
                            <m l='" + folderInboxId + @"'>
                                <content>From: foo@example.com 
To: bar@example.com 
Subject: " + messageSubject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body



                                </content>
                            </m>
                        </AddMsgRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse", null, null, null, 1);

            #endregion


            #region OLK


            OutlookCommands.Instance.Sync();

            RDOFolder rdoFolderInbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(messageSubject, rdoFolderInbox, false);
            zAssert.IsNotNull(rdoMail, "Check that the message is in the inbox");

            #endregion


        }

        [Test, Description("GetFolder.cs: Create folder with different charset names")]
        [Category("SMOKE"),Category("Folder")]
        //Execute tests in both directions (soap -> ZCO)
        //1. Create folder with characters such as French "

        public void GetFolder_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test Case Veriables



            Dictionary<string, string> fNames = new Dictionary<string, string>();
            fNames.Add("Japanese", "\u30ed\u30fc\u30ab\u30eb\u306e\u5931\u6557" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("French", "\u00c0\u00e9\u00e9t\u00e9" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Italian", " Et\u00e0\u00e8\u00c8" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Russian", "\u041e\u0442\u043c\u0435\u043d\u0435" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Korian", "\uc11c\ubc84 \uc2e4\ud328" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Chinese Simplified", "\u670d\u52a1\u5668\u6545\u969c" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Chinese HongCong", "\u4f3a\u670d\u5668\u6545\u969c" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("German", "ung\u00fcltiger f\u00fcr" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Dutch", "\u00c6ndret" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Spanish", "reuni\u00f3n petici\u00f3n\u00f3n" + GlobalProperties.time() + GlobalProperties.counter());

            string folderInboxId;

            #endregion

            #region SOAP Block to Create a Folder

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            foreach (string key in fNames.Keys)
            {
                zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + fNames[key] + @"' l='" + folderInboxId + @"'/>
                        </CreateFolderRequest>");
                zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", null, null, null, 1);

            }

            #endregion

            #region Outlook block for Verification of synced folders at ZCO side.
            
            //Sync ZCO
            OutlookCommands.Instance.Sync();

            RDOFolder rdoInboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(rdoInboxFolder, "Check that the Inbox Folder exists");


            foreach (string key in fNames.Keys)
            {
                RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(fNames[key], rdoInboxFolder, false);
                zAssert.IsNotNull(rdoFolder, "Verify the folder with special character name "+ fNames[key] +" is found");
            }

            #endregion


        }


        [Test, Description("Verify that ZCO can sync a folder(Case Sensetive)")]
        [Category("SMOKE"),Category("Folder")]
        public void GetFolder_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = UtilFunctions.RandomUpperLowerStringGenerator();
            string folderInboxId;

            #endregion

            #region Account Setup

            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            zAccount.AccountZCO.sendSOAP(@"
                    <CreateFolderRequest xmlns='urn:zimbraMail'>
                        <folder name='" + folderName + @"' l='" + folderInboxId + @"'/>
                    </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", null, null, null, 1);


            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();


            // Find the inbox
            RDOFolder rdoInboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(rdoInboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, rdoInboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that the custom folder " + folderName + " was synced");


            #endregion
        }

    }
}
