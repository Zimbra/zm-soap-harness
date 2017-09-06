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
    public class DeleteMail : Tests.BaseTestFixture
    {

        String inboxFolderid = HarnessProperties.getString("folder.inbox.id");
        String trashFolderid = HarnessProperties.getString("folder.trash.id");

        //Soft Delete email from Inbox folder on Device 
        [Test, Description("Soft Delete email from Inbox folder on Device and sync to server"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Soft delete the message on device, 3. Sync to server; Verify deleted message is in Trash folder")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void DeleteMail01()
        {

            #region TEST SETUP

            // Add a message to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + inboxFolderid + @"' >
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

            #region TEST ACTION

            #region Sync the message to the client


            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Send the SyncRequest (Initial Sync) - Trash folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashFolderid;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashFolderid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region Soft Delete the message on device

            ZResponse moveResponse = TestClient.sendRequest(
                 TestAccount,
                 "<?xml version='1.0' encoding='utf-8'?>" +
                 "<Moves xmlns='Move'>" +
                     "<Move>" +
                         "<SrcMsgId>" + messageid + @"</SrcMsgId>" +
                         "<SrcFldId>" + inboxFolderid + @"</SrcFldId>" +
                         "<DstFldId>" + trashFolderid + @"</DstFldId>" +
                     "</Move>" +
                  "</Moves>");

            ZAssert.IsNotNull(moveResponse, "Verify the MoveItems response was received");

            //Validate Move Response
            ZAssert.XmlXpathMatch(moveResponse.XmlElement, "//Move:Status", null, "3", "Verify that Move response status is 3 i.e. Success flag for Move action");

            #endregion

            #endregion

            #region TEST VERIFICATION

            #region Verify message got deleted

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            // Device validation: Send the SyncRequest - Trash folder, should get Add for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashFolderid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Server validation: Search deleted message in Inbox folder
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");

            XmlNode m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNull(m, "Verify the message is not present in Inbox folder");

            // Server validation: Search deleted message in Trash folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:trash</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is present in Trash folder");

            #endregion

            #endregion

        }

        //Hard Delete email from Inbox folder on Device 
        [Test, Description("Hard Delete email from Inbox folder on Device and sync to server"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Hard delete the message on device, 3. Sync to server; Verify deleted message is not present in Trash")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void DeleteMail02()
        {

            #region TEST SETUP

            // Add a message to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + inboxFolderid + @"' >
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

            #region TEST ACTION

            #region Sync the message to the client

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Send the SyncRequest (Initial Sync) - Trash folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashFolderid;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashFolderid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region Delete1: Soft Delete (move to Trash) the message on device

            ZResponse moveResponse = TestClient.sendRequest(
                 TestAccount,
                 "<?xml version='1.0' encoding='utf-8'?>" +
                 "<Moves xmlns='Move'>" +
                     "<Move>" +
                         "<SrcMsgId>" + messageid + @"</SrcMsgId>" +
                         "<SrcFldId>" + inboxFolderid + @"</SrcFldId>" +
                         "<DstFldId>" + trashFolderid + @"</DstFldId>" +
                     "</Move>" +
                  "</Moves>");

            ZAssert.IsNotNull(moveResponse, "Verify the MoveItems response was received");

            //Validate Move Response
            ZAssert.XmlXpathMatch(moveResponse.XmlElement, "//Move:Status", null, "3", "Verify that Move response status is 3 i.e. Success flag for Move action");

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            // Device validation: Send the SyncRequest - Trash folder, should get Add for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashFolderid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Confirm message got deleted from Inbox (Server)
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");

            XmlNode m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNull(m, "Verify the message is not present in Inbox folder");

            // Confirm message got moved to Trash (Server)
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:trash</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is present in Trash folder");

            #endregion

            #region Delete2: Delete message from Device's Trash folder

            ZSyncRequest syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest2.DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:email='Email'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[trashFolderid] + @"</SyncKey>
            <CollectionId>" + trashFolderid + @"</CollectionId>
            <DeletesAsMoves>0</DeletesAsMoves>
            <GetChanges>0</GetChanges>
            <Commands>
                <Delete>
                    <ServerId>" + messageid + @"</ServerId>
                </Delete>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            ZSyncResponse syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse2, "Verify the delta sync response was received");

            #endregion

            #endregion

            #region TEST VERIFICATION

            #region Verify message got deleted on server

            // Server validation: Search deleted message in Inbox folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNull(m, "Verify the message is not present in Inbox folder");

            // Server validation: Search deleted message in Trash folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:trash</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNull(m, "Verify the message is not present in Trash folder i.e. is Hard deleted");

            #endregion

            #endregion

        }
    }

}
