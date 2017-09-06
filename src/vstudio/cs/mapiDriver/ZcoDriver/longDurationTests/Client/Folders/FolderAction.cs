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

namespace longDurationTests.Client.Folders
{

    [TestFixture]
    public class FolderAction : clientTests.BaseTestFixture
    {
        [Test, Description("Verify that 100 messages marked read (SOAP) are synced to ZCO")]
        [Category("SMOKE"), Category("Folder")]
        //[Ignore("Ignore a test")]
        public void FolderAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            const int numberOfMessages = 100;
            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
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


            ArrayList subjects = new ArrayList();
            for (int i = 0; i < numberOfMessages; i++)
            {

                string subject = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
                subjects.Add(subject);

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
                zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse", null, null, null, 1);

            }

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that folder is synced to outlook");

            zAssert.AreEqual(numberOfMessages, rdoFolder.Items.Count, "Verify that all the messages are located in the folder");
            foreach (RDOMail m in rdoFolder.Items)
            {
                zAssert.IsTrue(m.UnRead, "Verify that the message is unread");
            }

            #endregion

            #region Mark all messages in the folder as readusing SOAP

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

            zAssert.AreEqual(numberOfMessages, rdoFolder.Items.Count, "Verify that all the messages are located in the folder");
            foreach (RDOMail m in rdoFolder.Items)
            {
                zAssert.IsFalse(m.UnRead, "Verify that the message is read");
            }


            #endregion

        }


        [Test, Description("Verify that Folder(with SubFolder(with Messages) and Messages) emptied in ZWC emptied by ZCO too")]
        [Category("Folder")]
        public void FolderAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            const int numberOfMessages = 100;
            string folderName = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
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


            ArrayList subjects = new ArrayList();
            for (int i = 0; i < numberOfMessages; i++)
            {

                string subject = String.Format("subject{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
                subjects.Add(subject);

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
                zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse", null, null, null, 1);

            }

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, inboxFolder, false);
            zAssert.IsNotNull(rdoFolder, "Verify that folder is synced to outlook");

            zAssert.AreEqual(numberOfMessages, rdoFolder.Items.Count, "Verify that all the messages are located in the folder");

            #endregion

            #region Mark all messages in the folder as readusing SOAP

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
            zAssert.IsNotNull(rdoFolder, "Verify that folder is synced to outlook");

            zAssert.AreEqual(0, rdoFolder.Items.Count, "Verify that all the messages are deleted from the folder");
            #endregion

        }


    }
}

