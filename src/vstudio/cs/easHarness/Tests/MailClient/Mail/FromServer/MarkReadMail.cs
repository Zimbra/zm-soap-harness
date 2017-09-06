using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using System.Xml;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Mail.FromServer
{

    [TestFixture]
    public class MarkReadMail : Tests.BaseTestFixture
    {

        [Test, Description("Sync message read operation to the device"),
        Property("TestSteps", "1. Add an unread mail to the mailbox, 2. Read mail, 3. Sync to device, 4. Verify the mail is in Read state on device")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void MarkReadOnServer()
        {

            /*
             * Mark message as Read on server.  Sync
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

            #endregion

            #region Sync so the device has the message

            TestClient.sendRequest(new ZSyncRequest(TestAccount));

            #endregion

            #region Read message on the server

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"' op='read'/>
                    </MsgActionRequest>");

            #endregion

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents contains the correct Read Status. 1 is Read, 0 is Unread
            ZAssert.XmlXpathMatch(Change, "//email:Read", null, "1", "Verify the Read status is correct. 1==Read");


            #endregion

        }

        [Test, Description("Sync message unread operation to the device"),
        Property("TestSteps", "1. Add a read mail to the mailbox, 2. Unread mail, 3. Sync to device, 4. Verify the mail is in unread state on device")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void MarkUnReadOnServer()
        {

            /*
             * Mark message as Unread on server.  Sync
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

            #endregion

            #region Sync so the device has the message

            TestClient.sendRequest(new ZSyncRequest(TestAccount));

            #endregion

            #region Read message on the server

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"' op='!read'/>
                    </MsgActionRequest>");

            #endregion

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + messageid + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents contains the correct Read Status. 1 is Read, 0 is Unread
            ZAssert.XmlXpathMatch(Change, "//email:Read", null, "0", "Verify the Read status is correct. 0==Unread");


            #endregion

        }
    }
}