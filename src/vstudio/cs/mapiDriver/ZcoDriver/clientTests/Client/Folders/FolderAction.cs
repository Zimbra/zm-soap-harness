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
    public class FolderAction : BaseTestFixture
    {
        [Test, Description("Verify that Folder moved to another folder by ZWC moved by ZCO too")]
        [Category("SMOKE"), Category("Folder")]
        //[Ignore("Ignore a test")]
        public void FolderAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderId;
            string inboxFolderId;
            string sentFolderId;

            #endregion

            #region SOAP Block

            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");
            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that the custom folder " + folderName + " was synced");

            #endregion


            #region SOAP Block to Move the folder

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='move' id='" + folderId + @"' l='" + sentFolderId + @"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #region Outlook block for Verification

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOFolder sentFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderSentMail);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");
            zAssert.IsNotNull(sentFolder, "Check that the sent folder exists");

            rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNull(rdoFolder, "Verify the folder no longer exists in the inbox folder");

            rdoFolder = OutlookMailbox.Instance.findFolder(folderName, sentFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify the folder exists in the sent folder");

            #endregion
        }

        [Test, Description("Verify that Folder moved to another folder by ZCO moved by ZWC too")]
        [Category("Folder")]
        //[Ignore("Ignore a test:Verification is Incomplete")]
        public void FolderAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderId;
            string parentId;
            string inboxFolderId;
            string sentFolderId;

            #endregion

            #region SOAP Block


            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);


            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");
            RDOFolder sentFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderSentMail);
            zAssert.IsNotNull(sentFolder, "Check that the sent folder exists");

            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that the custom folder " + folderName + " was synced");

            #endregion

            #region Outlook block to Move Folder to Sent Folder

            rdoFolder.MoveTo(sentFolder);

            OutlookCommands.Instance.Sync();

            #endregion


            #region Verification using SOAP Block

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + folderName + "']", "l", null, out parentId, 1);

            zAssert.AreEqual(sentFolderId, parentId, "Verify the folder's parent id is the sent folder id");

            #endregion


        }


        [Test, Description("Verify that Folder(with Messages) moved to another folder by ZWC moved by ZCO too")]
        [Category("Folder")]
        public void FolderAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder2Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Id;
            string folder2Id;
            string inboxFolderId;
            string sentFolderId;

            #endregion

            #region SOAP Block


            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder1Name + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder1Id, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder2Name + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder2Id, 1);

            string subject = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
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


            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder1 = OutlookMailbox.Instance.findFolder(folder1Name, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder1, "Verify that folder1 is synced to outlook");

            RDOFolder rdoFolder2 = OutlookMailbox.Instance.findFolder(folder2Name, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder2, "Verify that folder2 is synced to outlook");

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject, rdoFolder1, false);
            zAssert.IsNotNull(rdoMail, "Verify that the message is synced");

            #endregion

            #region Outlook Sync

            OutlookCommands.Instance.Sync();

            #endregion

            #region Move Folder to Another Folder in ZWC

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='move' id='" + folder1Id + @"' l='" + folder2Id + @"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Sync

            OutlookCommands.Instance.Sync();

            #endregion

            #region Verification on ZCO Side.

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            rdoFolder2 = OutlookMailbox.Instance.findFolder(folder2Name, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder2, "Verify that folder2 is synced to outlook");

            rdoFolder1 = OutlookMailbox.Instance.findFolder(folder1Name, inboxFolder, false);
            zAssert.IsNull(rdoFolder1, "Verify that folder1 no longer exists in the inbox");

            rdoFolder1 = OutlookMailbox.Instance.findFolder(folder1Name, rdoFolder2, false);
            zAssert.IsNotNull(rdoFolder1, "Verify that folder1 exists in the subfolder");

            rdoMail = OutlookMailbox.Instance.findMessage(subject, rdoFolder1, false);
            zAssert.IsNotNull(rdoMail, "Verify that the message remains in folder1");

            #endregion

        }


        [Test, Description("Verify that Folder(with Messages) moved to another folder by ZCO moved by ZWC too")]
        [Category("Folder")]
        public void FolderAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder2Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Id;
            string folder2Id;
            string inboxFolderId;
            string sentFolderId;

            #endregion

            #region SOAP Block


            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.sent") + "']", "id", null, out sentFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder1Name + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder1Id, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder2Name + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder2Id, 1);

            string subject = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
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


            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder1 = OutlookMailbox.Instance.findFolder(folder1Name, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder1, "Verify that folder1 is synced to outlook");

            RDOFolder rdoFolder2 = OutlookMailbox.Instance.findFolder(folder2Name, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder2, "Verify that folder2 is synced to outlook");

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject, rdoFolder1, false);
            zAssert.IsNotNull(rdoMail, "Verify that the message is synced");

            #endregion

            #region Move the folder using ZCO

            rdoFolder1.MoveTo(rdoFolder2);//Move Folder1 to Folder2

            #endregion

            #region Outlook Sync

            OutlookCommands.Instance.Sync();

            #endregion

            #region Verification on ZWC Side.

            // Verify that folder1 is located in folder2
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + folder1Name + "']", "l", folder2Id, null, 1);

            // Verify the message still exists in folder1
            zAccount.AccountZCO.sendSOAP(@"
                        <SearchRequest xmlns='urn:zimbraMail' types='message'>
                            <query>subject:(" + subject + @")</query>
                        </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "l", folder1Id, null, 1);

            #endregion

        }

        [Test, Description("Verify that Folder renamed by ZWC renamed by ZCO too")]
        [Category("Folder")]
        public void FolderAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderNameNew = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderId;
            string inboxFolderId;

            #endregion

            #region SOAP Block

            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");
            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that the custom folder " + folderName + " was synced");

            #endregion


            #region SOAP Block to Move the folder

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='rename' id='" + folderId + @"' name='" + folderNameNew + @"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #region Outlook block for Verification

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNull(rdoFolder, "Verify the old folder name no longer exists");

            rdoFolder = OutlookMailbox.Instance.findFolder(folderNameNew, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify the new folder name does exist");

            #endregion
        }

        [Test, Description("Verify that Folder renamed by ZCO renamed by ZWC too")]
        [Category("Folder")]
        public void FolderAction_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderNameNew = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderId;
            string inboxFolderId;

            #endregion

            #region SOAP Block

            // Get all folders
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");
            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that the custom folder " + folderName + " was synced");

            rdoFolder.Name = folderNameNew;

            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #endregion


            #region SOAP Block to Verify

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + folderName + "']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + folderNameNew + "']", null, null, null, 1);

            #endregion

        }

        [Test, Description("Verify that Folder emptied in ZWC emptied by ZCO too")]
        [Category("Folder")]
        public void FolderAction_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderId;
            string inboxFolderId;

            #endregion

            #region SOAP Block


            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);


            string subject = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            zAccount.AccountZCO.sendSOAP(@"
                    <AddMsgRequest xmlns='urn:zimbraMail'>
                        <m l='" + folderId + @"'>
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


            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that folder is synced to outlook");

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject, rdoFolder, false);
            zAssert.IsNotNull(rdoMail, "Verify that the message is synced");

            #endregion

            #region Empty the folder using SOAP

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='empty' id='" + folderId + @"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Sync

            OutlookCommands.Instance.Sync();

            #endregion

            #region Verification on ZCO Side.

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that folder still exists");

            rdoMail = OutlookMailbox.Instance.findMessage(subject, rdoFolder, false);
            zAssert.IsNull(rdoMail, "Verify that the message is emptied from the folder");

            #endregion

        }

        [Test, Description("Verify that Folder(with SubFolder(with Messages) and Messages) emptied in ZWC emptied by ZCO too")]
        [Category("Folder")]
        public void FolderAction_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Id;
            string folder2Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder2Id;
            string inboxFolderId;

            #endregion

            #region SOAP Block


            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder1Name + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder1Id, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folder2Name + @"' l='" + folder1Id + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder2Id, 1);


            string subject1 = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            zAccount.AccountZCO.sendSOAP(@"
                    <AddMsgRequest xmlns='urn:zimbraMail'>
                        <m l='" + folder1Id + @"'>
                            <content>From: foo@example.com 
To: bar@example.com 
Subject: " + subject1 + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body



                            </content>
                        </m>
                    </AddMsgRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", null, null, null, 1);

            string subject2 = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            zAccount.AccountZCO.sendSOAP(@"
                    <AddMsgRequest xmlns='urn:zimbraMail'>
                        <m l='" + folder2Id + @"'>
                            <content>From: foo@example.com 
To: bar@example.com 
Subject: " + subject2 + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body



                            </content>
                        </m>
                    </AddMsgRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", null, null, null, 1);


            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder1 = OutlookMailbox.Instance.findFolder(folder1Name, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder1, "Verify that folder is synced to outlook");

            RDOMail rdoMail1 = OutlookMailbox.Instance.findMessage(subject1, rdoFolder1, false);
            zAssert.IsNotNull(rdoMail1, "Verify that the message is synced");

            RDOFolder rdoFolder2 = OutlookMailbox.Instance.findFolder(folder2Name, rdoFolder1, false);
            zAssert.IsNotNull(rdoFolder2, "Verify that folder is synced to outlook");

            RDOMail rdoMail2 = OutlookMailbox.Instance.findMessage(subject2, rdoFolder2, false);
            zAssert.IsNotNull(rdoMail2, "Verify that the message is synced");

            #endregion

            #region Empty the folder using SOAP

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='empty' id='" + folder1Id + @"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Sync

            OutlookCommands.Instance.Sync();

            #endregion

            #region Verification on ZCO Side.

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            rdoFolder1 = OutlookMailbox.Instance.findFolder(folder1Name, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder1, "Verify that folder is synced to outlook");

            rdoMail1 = OutlookMailbox.Instance.findMessage(subject1, rdoFolder1, false);
            zAssert.IsNull(rdoMail1, "Verify that the message is emptied");

            rdoFolder2 = OutlookMailbox.Instance.findFolder(folder2Name, rdoFolder1, false);
            zAssert.IsNull(rdoFolder2, "Verify that folder is emptied");

            rdoMail2 = OutlookMailbox.Instance.findMessage(subject2, inboxFolder, true);
            zAssert.IsNull(rdoMail2, "Verify that the message is emptied");


            #endregion

        }


        [Test, Description("Verify that Mark all messages in a folder as read in ZCO should reflect in ZWC")]
        [Category("Folder")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void FolderAction_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folderId;
            string inboxFolderId;

            #endregion

            #region SOAP Block


            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            // Create a folder in the inbox
            zAccount.AccountZCO.sendSOAP(@"
                        <CreateFolderRequest xmlns='urn:zimbraMail'>
                            <folder name='" + folderName + @"' l='" + inboxFolderId + @"'/>
                        </CreateFolderRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);


            string subject = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            zAccount.AccountZCO.sendSOAP(@"
                    <AddMsgRequest xmlns='urn:zimbraMail'>
                        <m l='" + folderId + @"' f='u'>
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


            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that folder is synced to outlook");

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject, rdoFolder, false);
            zAssert.IsNotNull(rdoMail, "Verify that the message is synced");
            zAssert.IsTrue(rdoMail.UnRead, "Verify that the message is unread");

            #endregion

            #region Empty the folder using SOAP

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='read' id='" + folderId + @"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Sync

            OutlookCommands.Instance.Sync();

            #endregion

            #region Verification on ZCO Side.

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that folder is synced to outlook");

            rdoMail = OutlookMailbox.Instance.findMessage(subject, rdoFolder, false);
            zAssert.IsNotNull(rdoMail, "Verify that the message exists");
            zAssert.IsFalse(rdoMail.UnRead, "Verify that the message is read");

            #endregion

        }

    }
}

