using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using System.Xml;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Mail.Bugs
{
    [TestFixture]
    class Bug92978 : Tests.BaseTestFixture
    {

        [Test(Description = "Verify when messages are moved from Inbox to other folder and back same gets synced on device"),
        Property("Bug", 92978), 
        Property("TestSteps", "1. Add two messages to the mailbox, 2. Create a new folder under Inbox, 3. Sync the messages and created folder on device, 4. Move the messages from Inbox to other folder, 5. Sync the messages on device. Verify messages were deleted from inbox, 6. Move the messages from Other folder back to Inbox, 7. Sync and verify on device the messages are shown in Inbox and deleted from new folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void Bug92978_01()
        {
            
            #region Add two messages to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");
            XmlDocument[] soapResponse = new XmlDocument[2];
            String messageid, messageid_1;
            for (int i = 0; i < 2; i++)
            {
                String subject = "subject" + HarnessProperties.getUniqueString();
                soapResponse[i] = TestAccount.soapSend(
                    @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: " + subject + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content 



                        </content>
                    </m>
                </AddMsgRequest>");

            }
            messageid = TestAccount.soapSelectValue(soapResponse[0], "//mail:m", "id");       
            messageid_1 = TestAccount.soapSelectValue(soapResponse[1], "//mail:m", "id");
           

            #endregion

            #region Create a new folder under Inbox

            String folderName = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");

            XmlDocument CreateFolderResponse = TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderName + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String Newfolderid = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            #endregion

            #region Sync the messages and created folder on device

            TestClient.sendRequest(new ZSyncRequest(TestAccount));  // Sync for inbox folder on device
            ZSyncRequest syncRequest_NewFolder = new ZSyncRequest(TestAccount);
            syncRequest_NewFolder.CollectionId = Newfolderid;

            ZSyncResponse sResponse = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for other folder on device
            ZAssert.IsNotNull(sResponse, "Verify the Sync response was received");
            String syncKey_newFolder = sResponse.SyncKey;
           

            #endregion

            #region Move the messages from Inbox to other folder

            TestAccount.soapSend(
                   @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"," + messageid_1 + @"' op='move' l='" + Newfolderid + @"'/>
                    </MsgActionRequest>");

            #endregion

            #region Sync the messages on device. Verify messages were deleted from inbox

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
           
            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");
            XmlElement Delete_secondItem = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(Delete_secondItem, "Verify the Second mail deleted was returned in the Sync Response");


            syncRequest_NewFolder.SyncKey = syncKey_newFolder;
            ZSyncResponse syncResponse_2 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse_2, "Verify the Sync response was received");

            XmlElement Add_1 = ZSyncResponse.getMatchingElement(syncResponse_2.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add_1, "Verify Add for first item was returned");
            XmlElement Add_2 = ZSyncResponse.getMatchingElement(syncResponse_2.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(Add_2, "Verify Add for second item was returned");
            #endregion

            #region Move the messages from Other folder back to Inbox

            TestAccount.soapSend(
                   @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"," + messageid_1 + @"' op='move' l='" + parentFolderId + @"'/>
                    </MsgActionRequest>");

            #endregion

            #region Sync and verify on device the messages are shown in Inbox and deleted from new folder.

           
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.IsTrue(syncResponse.XmlElement.InnerXml.Contains(folderid), "Verify Add for Inbox folder is returned");
            XmlElement AddInbox_1 = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(AddInbox_1, "Verify Add for first item was returned");
            XmlElement AddInbox_2 = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(AddInbox_2, "Verify Add for second item was returned");
           

            // Verify mails deleted for new folder
            String new_SyncKey = syncResponse_2.SyncKey;
            syncRequest_NewFolder.SyncKey = new_SyncKey;
            syncResponse_2 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse_2, "Verify the Sync response was received");


            Delete = ZSyncResponse.getMatchingElement(syncResponse_2.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the first mail deleted was returned in the Sync Response");
            Delete_secondItem = ZSyncResponse.getMatchingElement(syncResponse_2.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(Delete_secondItem, "Verify the Second mail deleted was returned in the Sync Response");



            #endregion

         }

        [Test(Description = "Verify when messages are moved from one folder to other folder and back same gets synced on device"),
        Property("Bug", 92978), 
        Property("TestSteps", "1. Create two folders under Inbox and sync on device, 2. Add two messages to the first folder, 3. Move the messages from first  to second folder, 4. Sync the second folder to have new messages moved, 5. Move the messages from second folder back to first, 6. Sync and verify on device the messages are shown in First folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void Bug92978_02()
        {

            #region Create two folders under Inbox and sync on device

            String folderName_1 = "folder" + HarnessProperties.getUniqueString();
            String folderName_2 = "folder" + HarnessProperties.getUniqueString();
            String parentFolderId = HarnessProperties.getString("folder.inbox.id");

            XmlDocument CreateFolderResponse = TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + folderName_1 + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");

            String folderid_1 = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            XmlDocument CreateFolderResponse_2 = TestAccount.soapSend(
                  "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                      "<folder name='" + folderName_2 + "' l='" + parentFolderId + "'/>" +
                  "</CreateFolderRequest>");
            String folderid_2 = TestAccount.soapSelectValue(CreateFolderResponse_2, "//mail:folder", "id");
           
            // Sync the folders on device
            TestClient.sendRequest(new ZSyncRequest(TestAccount));  // Sync for inbox folder on device
            ZSyncRequest syncRequest_NewFolder = new ZSyncRequest(TestAccount);
            
           syncRequest_NewFolder.CollectionId = folderid_1;
           ZSyncResponse sResponse_1 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for first folder on device
           ZAssert.IsNotNull(sResponse_1, "Verify the Sync response was received for first folder");
           String skey_f1 = sResponse_1.SyncKey;

          // TestClient.sendRequest(syncRequest_NewFolder);

           syncRequest_NewFolder.CollectionId = folderid_2; 
           ZSyncResponse sResponse_2 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for second folder on device
           ZAssert.IsNotNull(sResponse_2, "Verify the Sync response was received for second folder");
         

           #endregion

            #region Add two messages to the first folder

            String folderid = HarnessProperties.getString("folder.inbox.id");
            XmlDocument[] soapResponse = new XmlDocument[2];
            String messageid, messageid_1;
            for (int i = 0; i < 2; i++)
            {
                String subject = "subject" + HarnessProperties.getUniqueString();
                soapResponse[i] = TestAccount.soapSend(
                    @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid_1 + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: " + subject + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content 



                        </content>
                    </m>
                </AddMsgRequest>");

            }

            messageid = TestAccount.soapSelectValue(soapResponse[0], "//mail:m", "id");      
            messageid_1 = TestAccount.soapSelectValue(soapResponse[1], "//mail:m", "id");

            syncRequest_NewFolder.SyncKey = skey_f1;
            syncRequest_NewFolder.CollectionId = folderid_1;
            ZSyncResponse sResponse_0 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for first folder on device
            ZAssert.IsNotNull(sResponse_0, "Verify the Sync response was received for first folder");
            String new_SynckeyFolder1 = sResponse_0.SyncKey;
        
            #endregion

            #region Move the messages from first  to second folder

            TestAccount.soapSend(
                  @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"," + messageid_1 + @"' op='move' l='" + folderid_2 + @"'/>
                    </MsgActionRequest>");

            #endregion

            #region Sync the second folder to have new messages moved

            syncRequest_NewFolder.CollectionId = folderid_1;
            syncRequest_NewFolder.SyncKey = new_SynckeyFolder1;
            ZSyncResponse sResponse_3 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for first folder on device
            ZAssert.IsNotNull(sResponse_3, "Verify the Sync response was received for first folder");

            //Verify Delete returned
            XmlElement Delete_firstItemFolder1 = ZSyncResponse.getMatchingElement(sResponse_3.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete_firstItemFolder1, "Verify the Delete was returned in the Sync Response");
            XmlElement Delete_secondItemFolder1 = ZSyncResponse.getMatchingElement(sResponse_3.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(Delete_secondItemFolder1, "Verify the Second mail deleted was returned in the Sync Response");



            syncRequest_NewFolder.CollectionId = folderid_2;
            sResponse_2 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for second folder on device
            ZAssert.IsNotNull(sResponse_2, "Verify the Sync response was received for second folder");

            // Verify the add returned
            XmlElement Add_1 = ZSyncResponse.getMatchingElement(sResponse_2.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add_1, "Verify Add for first item was returned");
            XmlElement Add_2 = ZSyncResponse.getMatchingElement(sResponse_2.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(Add_2, "Verify Add for first item was returned");

            String skey_f2 = sResponse_2.SyncKey;

         

            #endregion

            #region Move the messages from second folder back to first

            TestAccount.soapSend(
                   @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"," + messageid_1 + @"' op='move' l='" + folderid_1 + @"'/>
                    </MsgActionRequest>");

            #endregion

            #region Sync and verify on device the messages are shown in First folder.

            syncRequest_NewFolder.CollectionId = folderid_1;
            sResponse_1 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for first folder on device
            ZAssert.IsNotNull(sResponse_1, "Verify the Sync response was received for first folder");

            ZAssert.IsTrue(sResponse_1.XmlElement.InnerXml.Contains(folderid_1), "Verify Add for first  folder is returned");

            XmlElement AddFolder_1 = ZSyncResponse.getMatchingElement(sResponse_1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(AddFolder_1, "Verify Add for first item was returned");
            XmlElement AddFolder_2 = ZSyncResponse.getMatchingElement(sResponse_1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(AddFolder_2, "Verify Add for first item was returned");


            // Verify delete returned for second folder
            syncRequest_NewFolder.CollectionId = folderid_2;
            syncRequest_NewFolder.SyncKey = skey_f2;
            ZSyncResponse sResponse_4 = TestClient.sendRequest(syncRequest_NewFolder) as ZSyncResponse; // Sync for second folder on device
            ZAssert.IsNotNull(sResponse_4, "Verify the Sync response was received for second folder");

            XmlElement Delete = ZSyncResponse.getMatchingElement(sResponse_4.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");
            XmlElement Delete_secondItem = ZSyncResponse.getMatchingElement(sResponse_4.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid_1 + "']");
            ZAssert.IsNotNull(Delete_secondItem, "Verify the Second mail deleted was returned in the Sync Response");



            #endregion

        }
    }
}
