using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;
using System.Xml;
using Zimbra.EasHarness.ActiveSync;
using NUnit.Framework;

namespace Tests.MailClient.Mail.FromServer
{

    [TestFixture]
    public class MoveMail : Tests.BaseTestFixture
    {
        String inboxFolderId = HarnessProperties.getString("folder.inbox.id");
        String subFolderId, subFolderName;
        String rootFolderId, rootFolderName;

        // Move message from Inbox to sub folder on the server. Sync to device
        [Test, Description("Sync movement of message from Inbox to Sub Folder to the device"),
        Property("TestSteps", "1. Create a folder inside Inbox, 2. Add message to Inbox folder, 3. Move the message from from Inbox to sub folder, 4. Sync to device, 5. Verify message got deleted from Inbox and added to Sub folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMovedMail01()
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

            #region Sync so the device has the message

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Send the SyncRequest (Initial Sync) - sub folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #endregion

            #region TEST ACTION

            #region Move the message from from Inbox to sub folder on the server

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageid + @"' op='move' l='" + subFolderId + @"'/>
                </MsgActionRequest>");

            #endregion

            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the message got moved from Inbox folder");

            // Device validation: Send the SyncRequest - sub folder, should get Add for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the message got moved to sub folder");

            #endregion

        }

        // Move message from sub folder to root folder on the server. Sync to device
        [Test, Description("Sync movement of message from Sub Folder to root folder to the device"),
        Property("TestSteps", "1. Create a folder inside Inbox, 2. Create root level folder, 3. Add message to Subfolder, 4. Move the message from sub folder to root level folder, 5. Sync to device, 6. Verify message got deleted from sub folder and added to root folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMovedMail02()
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

            #region Sync the message to the client

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion

            #endregion

            #region TEST ACTION

            #region Move the message from from Inbox to sub folder on the server

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageid + @"' op='move' l='" + rootFolderId + @"'/>
                </MsgActionRequest>");

            #endregion

            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - sub folder, should get Delete for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the message got moved from sub folder");

            // Device validation: Send the SyncRequest - root folder, should get Add for the message
            syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest2.CollectionId = rootFolderId;
            syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse2.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the message got moved to root folder");

            #endregion

        }

    }
}