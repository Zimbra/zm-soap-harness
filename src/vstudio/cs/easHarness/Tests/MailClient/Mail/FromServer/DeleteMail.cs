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
    public class DeleteMail : Tests.BaseTestFixture
    {
        String folderid = HarnessProperties.getString("folder.inbox.id");
        String trashid = HarnessProperties.getString("folder.trash.id");

        // Soft delete message - Delete (move to trash) a message on the server. Sync to device
        [Test, Description("Sync soft deletion of mail to the device"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Delete the message from the server, 3. Sync to device, 4. Verify the mail got deleted from Inbox and added to Trash folder")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void GetDeletedMail01()
        {

            #region TEST SETUP
            
            #region Add a message to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
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
            String messageid = TestAccount.soapSelectValue(soapResponse, "//mail:m", "id");

            #endregion

            #region Sync so the device has the message

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Send the SyncRequest (Initial Sync) - Trash folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");
            
            #endregion

            #endregion

            #region TEST ACTION

            #region Delete the message from the server

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageid + @"' op='move' l='" + trashid + @"'/>
                </MsgActionRequest>");

            #endregion

            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the message got deleted from Inbox folder");

            // Device validation: Send the SyncRequest - Trash folder, should get Add for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the message got added in Trash folder");

            #endregion

        }

        // Hard delete message on the server. Sync to device
        [Test, Description("Sync hard deletion of mail to the device"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Delete the message from the server (Hard delete), 3. Sync to device, 4. Verify the mail got deleted from Inbox")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetDeletedMail02()
        {

            #region TEST SETUP

            #region Add a message to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
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
            String messageid = TestAccount.soapSelectValue(soapResponse, "//mail:m", "id");

            #endregion

            #region Sync so the device has the message

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Send the SyncRequest (Initial Sync) - Trash folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");
            
            #endregion         

            #endregion

            #region TEST ACTION

            #region Delete the message from the server (Hard delete)

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageid + @"' op='delete'/>
                </MsgActionRequest>");

            #endregion

            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            // Device validation: Send the SyncRequest - Trash folder, should get Delete for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            #endregion


        }

        // Soft delete message - Delete (move to trash) a message on the server, Later on delete that message from Trash. Sync to device
        [Test, Description("Sync Soft deletion and then hard deletion of mail to the device"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Soft delete the message from Inbox folder (Server) and Sync on device, 3. Now, delete the message from Trash folder (Server), 4. Sync to device, 5. Verify the mail got deleted from Inbox")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetDeletedMail03()
        {

            #region TEST SETUP

            #region Add a message to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
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
            String messageid = TestAccount.soapSelectValue(soapResponse, "//mail:m", "id");

            #endregion

            #region Sync so the device has the message

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Send the SyncRequest (Initial Sync) - Trash folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #endregion

            #region TEST ACTION

            #region Soft delete the message from Inbox folder (Server) and Sync on device

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageid + @"' op='move' l='" + trashid + @"'/>
                </MsgActionRequest>");

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the message got deleted from Inbox folder");

            // Device validation: Send the SyncRequest - Trash folder, should get Add for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the message got added in Trash folder");

            #endregion

            #region Now, delete the message from Trash folder (Server)

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageid + @"' op='delete'/>
                </MsgActionRequest>");

            #endregion

            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Trash folder, should get Delete for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Delete = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the message got deleted from Trash folder");

            #endregion

        }

    }
}