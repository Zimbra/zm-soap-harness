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
    public class DeleteMail_Dumpster : Tests.BaseTestFixture
    {
        String folderid = HarnessProperties.getString("folder.inbox.id");
        String trashid = HarnessProperties.getString("folder.trash.id");

        [SetUp]
        public void BeforeTest()
        {
            XmlDocument ModifyAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                "<ModifyAccountRequest xmlns='urn:zimbraAdmin'>"
                + "<id xmlns=''>" + TestAccount.ZimbraId + "</id>"
                + "<a n='zimbraDumpsterEnabled'>TRUE</a>"
                + "</ModifyAccountRequest>");

            XmlNode response = ZimbraAdminAccount.GlobalAdmin.soapSelect(ModifyAccountResponse, "//admin:ModifyAccountResponse");

        }

        // Soft delete message - Delete (move to trash) a message on the server. Sync to device
        [Test, Description("Sync soft deletion of mail to the device with zimbraDumpsterEnabled set to TRUE"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Delete the message from the server, 3. Sync to device, 4. Verify the mail got deleted from Inbox and added to Trash folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
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
        [Test, Description("Sync hard deletion of mail to the device with zimbraDumpsterEnabled set to TRUE"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Delete the message from the server (Hard delete), 3. Sync to device, 4. Verify deleted message is in Dumpster folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
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
            ZAssert.IsNull(m, "Verify the message is not present in Trash folder i.e. is Hard deleted");

            // Server validation: Search deleted message is in Dumpster folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' inDumpster='1' types='message'>
                        <query>-in:/Junk</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m[@id='" + messageid + "']");
            ZAssert.IsNotNull(m, "Verify the message is present in Dumpster");

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            #endregion


        }

        /* Hard Delete email (Delete from Inbox and then from Trash) on server, Sync to device
           Later on recover email from Dumpster to Inbox (recovered to different folder from where it got deleted) */
        [Test, Description("Sync Soft deletion, hard deletion and then recovery of mail from Dumpster to the device"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Delete the message from the server (Hard delete), 3. Verify deleted message is in Dumpster folder, 4. Recover the message from Dumpster to Inbox, 5. Sync to device, 6. Verify the mail got added to Inbox")]
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

            #region Sync Trash folder, message should get deleted

            // Device validation: Send the SyncRequest - Trash folder, should get Delete for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = trashid;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            Delete = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the message got deleted from Trash folder");

            #endregion

            #region Verify message is in dumpster folder

            // Server validation: Search deleted message is in Dumpster folder
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' inDumpster='1' types='message'>
                        <query>-in:/Junk</query>
			        </SearchRequest>");

            XmlNode m = TestAccount.soapSelect(SearchResponse, "//mail:m[@id='" + messageid + "']");
            ZAssert.IsNotNull(m, "Verify the message is present in Dumpster");

            #endregion

            #region Recover deleted email from Dumpster to Inbox folder

            TestAccount.soapSend(
                    @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"' op='recover' l='" + folderid + @"'/>
                    </MsgActionRequest>");

            #endregion

            #endregion

            #region TEST VERIFICATION

            // Server validation: Search message is recovered in Inbox folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is present in Inbox folder");

            // Device validation: Send the SyncRequest - Inbox folder, should get Add for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            //Validating on subject, since message is added back with new message id
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the email gets recovered and synced on the device");

            #endregion

        }

        /* Hard Delete email from Inbox folder on Device, Sync to device
           Later on recover email from Dumpster to Inbox (recovered to same folder from where it got deleted)
           Bug#98183 */
        [Test, Description("Sync Soft deletion, hard deletion and then recovery of mail from Dumpster to the same folder from where it was deleted to the device"),
        Property("Bug", 98183), 
        Property("TestSteps", "1. Add a message to the mailbox, 2. Delete the message from the server (Hard delete), 3. Verify deleted message is in Dumpster folder, 4. Recover the message from Dumpster to same folder, 5. Sync to device, 6. Verify the mail got added to same folder from where it was deleted")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetDeletedMail04()
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

            #endregion

            #endregion

            #region TEST ACTION

            #region Soft delete the message from Inbox folder (Server) and Sync on device

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageid + @"' op='delete'/>
                </MsgActionRequest>");

            // Device validation: Send the SyncRequest - Inbox folder, should get Delete for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Delete, "Verify the message got deleted from Inbox folder");

            #endregion

            #region Verify message is in dumpster folder

            // Server validation: Search deleted message is in Dumpster folder
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' inDumpster='1' types='message'>
                        <query>-in:/Junk</query>
			        </SearchRequest>");

            XmlNode m = TestAccount.soapSelect(SearchResponse, "//mail:m[@id='" + messageid + "']");
            ZAssert.IsNotNull(m, "Verify the message is present in Dumpster");

            #endregion

            #region Recover deleted email from Dumpster to Inbox folder

            TestAccount.soapSend(
                    @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"' op='recover' l='" + folderid + @"'/>
                    </MsgActionRequest>");

            #endregion

            #endregion

            #region TEST VERIFICATION

            // Server validation: Search message is recovered in Inbox folder
            SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");

            m = TestAccount.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is present in Inbox folder");

            // Device validation: Send the SyncRequest - Inbox folder, should get Add for the message
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Validating on subject, since message is added back with new message id
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the email gets recovered and synced on the device");

            #endregion

        }

    }
}
