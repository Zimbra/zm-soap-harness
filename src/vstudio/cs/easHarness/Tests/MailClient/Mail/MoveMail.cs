using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using System.Xml;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Mail
{
    [TestFixture]
    public class MoveMail : Tests.BaseTestFixture
    {

        String inboxFolderId = HarnessProperties.getString("folder.inbox.id");
        String subFolderId, subFolderName;
        String rootFolderId, rootFolderName;

        //Move email from Inbox folder to Sub folder on Device 
        [Test, Description("Move email from Inbox folder to Sub folder on Device and sync to server"),
        Property("TestSteps", "1. Create sub folder inside Inbox, 2. Add message to the inbox folder, 3. Move the message in Device from Inbox to Sub Folder, 4. Verify message got moved to sub folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void MoveMail01()
        {

            #region TEST SETUP

            #region Create sub folder (Inbox level)
            subFolderName = "folder" + HarnessProperties.getUniqueString();

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + subFolderName + "' l='" + inboxFolderId + "'/>" +
                    "</CreateFolderRequest>");

            subFolderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            #endregion

            #region FolderSync
            // Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            ZFolderSyncResponse folderSync = response as ZFolderSyncResponse;
            ZAssert.IsNotNull(folderSync, "Verify the Folder Sync response was received");

            #endregion

            #region Add message to Inbox folder

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + inboxFolderId + @"' >
                        <content>Date: Mon, 9 Dec 2016 15:25:36 -0800 (PST)
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

            String messageid = TestAccount.soapSelectValue(soapResponse, "//mail:m", "id");

            #endregion

            #endregion

            #region TEST ACTION

            #region Sync the message to the client

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Send the SyncRequest (Initial Sync) - Sub folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region Move the message on device from Inbox to sub-folder

            ZResponse moveResponse = TestClient.sendRequest(
                 TestAccount,
                 "<?xml version='1.0' encoding='utf-8'?>" +
                 "<Moves xmlns='Move'>" +
                     "<Move>" +
                         "<SrcMsgId>" + messageid + @"</SrcMsgId>" +
                         "<SrcFldId>" + inboxFolderId + @"</SrcFldId>" +
                         "<DstFldId>" + subFolderId + @"</DstFldId>" +
                     "</Move>" +
                  "</Moves>");

            ZAssert.IsNotNull(moveResponse, "Verify the MoveItems response was received");

            //Validate Move Response
            ZAssert.XmlXpathMatch(moveResponse.XmlElement, "//Move:Status", null, "3", "Verify that Move response status is 3 i.e. Success flag for Move action");

            #endregion

            #endregion

            #region TEST VERIFICATION

            #region Verify message got moved to sub folder

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            // Device validation: Send the SyncRequest - sub folder, should get Add for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Server validation: Search moved message in Inbox folder
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");

            XmlNode m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNull(m, "Verify the message is not present in Inbox folder");

            // Server validation: Search moved message in sub folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox/" + subFolderName + @"</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is present in sub folder folder");

            #endregion

            #endregion

        }

        //Move email from Sub folder to Root folder on Device 
        [Test, Description("Move email from Sub folder to Root folder on Device and sync to server"),
        Property("TestSteps", "1. Create folder at root level, 2. Create sub folder inside Inbox, 2. Add message to the Inbox sub folder, 3. Move the message in Device from Inbox sub folder to root folder, 4. Verify message got moved to root folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void MoveMail02()
        {

            #region TEST SETUP

            #region Create sub folder (Inbox level)
            subFolderName = "folder" + HarnessProperties.getUniqueString();

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + subFolderName + "' l='" + inboxFolderId + "'/>" +
                    "</CreateFolderRequest>");

            subFolderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            #endregion

            #region Create root level folder
            rootFolderName = "folder" + HarnessProperties.getUniqueString();

            // Get the server's folder structrue
            // So we can put the new folder in the Root
            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            String folderRootId = this.TestAccount.soapSelectValue(GetFolderResponse, "//mail:folder[@name='USER_ROOT']", "id");

            // Create the new folder
            CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + rootFolderName + "' l='" + folderRootId + "'/>" +
                    "</CreateFolderRequest>");

            rootFolderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            #endregion

            #region FolderSync
            // Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            ZFolderSyncResponse folderSync = response as ZFolderSyncResponse;
            ZAssert.IsNotNull(folderSync, "Verify the Folder Sync response was received");

            #endregion

            #region Initial Sync sub and root folders

            // Send the SyncRequest (Initial Sync) - sub folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            // Send the SyncRequest (Initial Sync) - root folder
            ZSyncRequest syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = rootFolderId;
            ZSyncResponse syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest2.CollectionId = rootFolderId;
            syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region Add message to sub folder

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + subFolderId + @"' >
                        <content>Date: Mon, 9 Dec 2016 15:25:36 -0800 (PST)
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

            String messageid = TestAccount.soapSelectValue(soapResponse, "//mail:m", "id");

            #endregion

            #endregion

            #region TEST ACTION

            #region Sync the message to the client

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion

            #region Move the message on device from Inbox to sub-folder

            ZResponse moveResponse = TestClient.sendRequest(
                 TestAccount,
                 "<?xml version='1.0' encoding='utf-8'?>" +
                 "<Moves xmlns='Move'>" +
                     "<Move>" +
                         "<SrcMsgId>" + messageid + @"</SrcMsgId>" +
                         "<SrcFldId>" + subFolderId + @"</SrcFldId>" +
                         "<DstFldId>" + rootFolderId + @"</DstFldId>" +
                     "</Move>" +
                  "</Moves>");

            ZAssert.IsNotNull(moveResponse, "Verify the MoveItems response was received");

            //Validate Move Response
            ZAssert.XmlXpathMatch(moveResponse.XmlElement, "//Move:Status", null, "3", "Verify that Move response status is 3 i.e. Success flag for Move action");

            #endregion

            #endregion

            #region TEST VERIFICATION

            #region Verify message got moved to root folder

            // Device validation: Send the SyncRequest - sub folder, should get Delete for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            // Device validation: Send the SyncRequest - root folder, should get Add for the message
            syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest2.CollectionId = rootFolderId;
            syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse2, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse2.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Server validation: Search moved message in sub folder
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox/" + subFolderName + @"</query>
			        </SearchRequest>");

            XmlNode m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNull(m, "Verify the message is not present in sub folder");

            // Server validation: Search moved message in root folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:" + rootFolderName + @"</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is present in root folder folder");

            #endregion

            #endregion

        }
      
    }

}

