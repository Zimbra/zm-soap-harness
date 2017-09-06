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
    public class MarkReadMail : Tests.BaseTestFixture
    {


        [Test, Description("Mark a mail as read on device and sync to server"),
        Property("TestSteps", "1. Add an unread mail to the mailbox, 2. Read mail on device, 3. Sync to server, 4. Verify the mail is in Read state.")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void MarkReadMail01()
        {

            /*
             * Mark a message read on the client.  Sync
             */

            #region TEST SETUP

            #region Add a unread (f='u') message to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"' f='u'>
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

            XmlDocument getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid + @"'/>
                </GetMsgRequest>");

            #endregion


            #endregion



            #region TEST ACTION

            #region Sync the message to the client

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the initial sync response was received");

            #endregion


            #region Mark the message as read on the client

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:email='Email'>
    <Collections>
        <Collection>
            <SyncKey>"+ TestAccount.Device.SyncKeys[folderid] +@"</SyncKey>
            <CollectionId>"+ folderid + @"</CollectionId>
            <GetChanges>0</GetChanges>
            <Commands>
                <Change>
                    <ServerId>" + messageid + @"</ServerId>
                    <ApplicationData>
                        <email:Read>1</email:Read>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the delta sync response was received");

            #endregion



            #endregion




            #region TEST VERIFICATION


            #region Verify the message has the read flag

            getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid +@"'/>
                </GetMsgRequest>");
            String f = TestAccount.soapSelectValue(getMsgResponse, "//mail:m", "f");

            ZAssert.StringDoesNotContain(f, "u", "Verify the flags do not contain unread");

            #endregion


            #endregion


        }

        [Test, Description("Mark a mail as unread on device and sync to server"),
        Property("TestSteps", "1. Add a read mail to the mailbox, 2. Mark it as unread on device, 3. Sync to server, 4. Verify the mail is in unread state.")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void MarkReadMail02()
        {

            /*
             * Mark a message unread on the client.  Sync
             */

            #region TEST SETUP

            #region Add a read message to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");

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

            XmlDocument getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid + @"'/>
                </GetMsgRequest>");

            #endregion


            #endregion



            #region TEST ACTION

            #region Sync the message to the client

            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the initial sync response was received");

            #endregion


            #region Mark the message as read on the client

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:email='Email'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>0</GetChanges>
            <Commands>
                <Change>
                    <ServerId>" + messageid + @"</ServerId>
                    <ApplicationData>
                        <email:Read>0</email:Read>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the delta sync response was received");

            #endregion

            #endregion

            #region TEST VERIFICATION

            #region Verify the message has unread flag

            getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid + @"'/>
                </GetMsgRequest>");
            String f = TestAccount.soapSelectValue(getMsgResponse, "//mail:m", "f");

            ZAssert.StringContains(f, "u", "Verify the flags contains unread");

            #endregion


            #endregion


        }

    }
}
