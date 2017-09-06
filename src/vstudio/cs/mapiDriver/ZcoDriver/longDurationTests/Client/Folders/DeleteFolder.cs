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

namespace longDurationTests.Client.Folders
{
    [TestFixture]
    public class DeleteFolder : clientTests.BaseTestFixture
    {

        [Test, Description("Hard Delete:Verify that Folder(Having Messages and Folder with Messages) deleted by ZWC deleted by ZCO")]
        [Category("SMOKE"), Category("Folder")]
        public void DeleteFolder_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folder1Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder2Name = String.Format("folder{0}{1}", GlobalProperties.time(), GlobalProperties.counter());
            string folder1Id;
            string folder2Id;
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

            int found = 0;
            foreach (RDOFolder f1 in inboxFolder.Folders)
            {
                tcLog.Info("folder " + f1.Name + " ... looking for " + folder1Name + " and " + folder2Name);
                if (f1.Name.Equals(folder1Name))
                {
                    found++;
                    foreach (RDOFolder f2 in f1.Folders)
                    {
                        if (f2.Name.Equals(folder2Name))
                            found++;
                    }
                }
            }
            zAssert.AreEqual(2, found, "Verify both " + folder1Name + " and " + folder2Name + " are found");

            foreach (string s in subjects)
            {
                RDOMail m = OutlookMailbox.Instance.findMessage(s);
                zAssert.IsNotNull(m, "Verify the message with subject " + s + " exists in the ZCO mailbox");
            }

            #endregion

            //Sync to Outlook
            OutlookCommands.Instance.Sync();


            #region SOAP Block to Delete the folder

            zAccount.AccountZCO.sendSOAP(@"
                <FolderActionRequest xmlns='urn:zimbraMail'>
                    <action op='delete' id='" + folder1Id + @"'/>
                </FolderActionRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:FolderActionResponse", null, null, null, 1);

            #endregion

            //Sync to Outlook
            OutlookCommands.Instance.Sync();

            #region Outlook block for Verification

            inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Check that the inbox folder exists");

            found = 0;
            foreach (RDOFolder f in inboxFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folder1Name + " and " + folder2Name);
                if (f.Name.Equals(folder1Name))
                    found++;
                if (f.Name.Equals(folder2Name))
                    found++;
            }
            zAssert.AreEqual(0, found, "Verify neither folders are found");

            RDOFolder trashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            zAssert.IsNotNull(trashFolder, "Check that the Trash folder exists");

            found = 0;
            foreach (RDOFolder f in inboxFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folder1Name + " and " + folder2Name);
                if (f.Name.Equals(folder1Name))
                    found++;
                if (f.Name.Equals(folder2Name))
                    found++;
            }
            zAssert.AreEqual(0, found, "Verify neither " + folder1Name + " nor " + folder2Name + " are found in the trash");

            found = 0;
            foreach (string s in subjects)
            {
                RDOMail m = OutlookMailbox.Instance.findMessage(s);
                if (m != null)
                    found++;
            }
            zAssert.AreEqual(0, found, "Verify none of the messages are found");


            #endregion

        }

    }
}
