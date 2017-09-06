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
    public class FlagMail : Tests.BaseTestFixture
    {

        //Flag on device
        [Test, Description("Flag a mail on device and sync to server"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Flag the mail on device, 3. Sync to server; Verify the mail is flagged")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void FlagMail01()
        {

            /*
             * Mark a message as flagged on the client.  Sync
             */

            #region TEST SETUP

            #region Add a message to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"' >
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


            #region Mark the message as flagged on the client

            syncResponse = TestClient.sendRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:email='Email'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>1</GetChanges>
            <DeletesAsMoves>1</DeletesAsMoves>
            <WindowSize>512</WindowSize>
            <Commands>
                <Change>
                    <ServerId>" + messageid + @"</ServerId>
                    <ApplicationData>
                        <email:Flag>
                            <email:Status>2</email:Status>
                            <email:FlagType>Flag for follow up</email:FlagType>
                        </email:Flag>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>") as ZSyncResponse;

            ZAssert.IsNotNull(syncResponse, "Verify the delta sync response was received");

            #endregion


            #endregion


            #region TEST VERIFICATION


            #region Verify the message has the flagged attribute

            getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid +@"'/>
                </GetMsgRequest>");
            String f = TestAccount.soapSelectValue(getMsgResponse, "//mail:m", "f");

            ZAssert.StringContains(f, "f", "Verify the flags attribute contains 'f' (flagged)");

            #endregion


            #endregion

        }

        //Unflag on device - return <Flag/>
        [Test, Description("Unflag a mail on device(iPhone, Xperia device) and sync to server"),
        Property("TestSteps", "1. Add a a flagged message to the mailbox, 2. UnFlag the mail on device, 3. Sync to server; Verify the mail is not flagged")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void FlagMail02()
        {

            /*
             * Remove message flag (unflag) on the client.  Sync (Unflagging method used on iPhone, Xperia Zwhich returns empty Flag info i.e. <Flag/>)
             */

            #region TEST SETUP

            #region Add a message to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"' f='fu'>
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


            #region Remove message flag (unflag) on the client

            syncResponse = TestClient.sendRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:email='Email'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>1</GetChanges>
            <DeletesAsMoves>1</DeletesAsMoves>
            <WindowSize>512</WindowSize>
            <Commands>
                <Change>
                    <ServerId>" + messageid + @"</ServerId>
                    <ApplicationData>
                        <email:Flag/>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>") as ZSyncResponse;

            ZAssert.IsNotNull(syncResponse, "Verify the delta sync response was received");

            #endregion


            #endregion


            #region TEST VERIFICATION


            #region Verify the message has the flagged attribute

            getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid + @"'/>
                </GetMsgRequest>");
            String f = TestAccount.soapSelectValue(getMsgResponse, "//mail:m", "f");

            ZAssert.StringDoesNotContain(f, "f", "Verify the flags attribute does not contain 'f' (is un-flagged)");

            #endregion

            #endregion

        }

        //Unflag on device - set FlagStatus as 1
        [Test, Description("Unflag a mail on device(Nokia Lumia) and sync to server"),
        Property("TestSteps", "1. Add a a flagged message to the mailbox, 2. UnFlag the mail on device, 3. Sync to server; Verify the mail is not flagged")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void FlagMail03()
        {

            /*
             * Mark complete flag (unflag) on the client.  Sync (Unflagging method used on Nokia Lumia)
             */

            #region TEST SETUP

            #region Add a message to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"' f='fu'>
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

            #region Remove message flag (unflag) on the client

            String time = String.Format("{0:yyyy-MM-ddThh:mm:ss.000Z}", DateTime.UtcNow);
            String day = String.Format("{0:yyyy-MM-ddThh:mm:ss.000Z}", DateTime.Today.ToUniversalTime());

            syncResponse = TestClient.sendRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:email='Email' xmlns:tasks='Tasks'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>1</GetChanges>
            <DeletesAsMoves>1</DeletesAsMoves>
            <WindowSize>512</WindowSize>
            <Commands>
                <Change>
                    <ServerId>" + messageid + @"</ServerId>
                    <ApplicationData>
                        <email:Flag>
                            <email:Status>1</email:Status>
                            <email:FlagType>Flag for follow up</email:FlagType>
                            <email:CompleteTime>" + time + @"</email:CompleteTime>
                            <tasks:DateCompleted>" + day + @"</tasks:DateCompleted>
                            <tasks:ReminderSet>0</tasks:ReminderSet>
                        </email:Flag>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>") as ZSyncResponse;

            ZAssert.IsNotNull(syncResponse, "Verify the delta sync response was received");

            #endregion

            #endregion


            #region TEST VERIFICATION

            #region Verify the message has the flagged attribute

            getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid + @"'/>
                </GetMsgRequest>");
            String f = TestAccount.soapSelectValue(getMsgResponse, "//mail:m", "f");

            ZAssert.StringDoesNotContain(f, "f", "Verify the flags attribute does not contain 'f' (is un-flagged)");

            #endregion

            #endregion

        }

        //Unflag on device - set FlagStatus as 0
        [Test, Description("Unflag a mail on device(FlagStatus as 0) and sync to server"),
        Property("TestSteps", "1. Add a a flagged message to the mailbox, 2. UnFlag the mail on device, 3. Sync to server; Verify the mail is not flagged")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void FlagMail04()
        {

            /*
             * Clear flag (unflag) on the client.  Sync (Unflagging method not observed on any device, but supported by ActiveSync i.e. setting FlagStatus as 0
             */

            #region TEST SETUP

            #region Add a message to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"' f='fu'>
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


            #region Remove message flag (unflag) on the client

            syncResponse = TestClient.sendRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:email='Email' xmlns:tasks='Tasks'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>1</GetChanges>
            <DeletesAsMoves>1</DeletesAsMoves>
            <WindowSize>512</WindowSize>
            <Commands>
                <Change>
                    <ServerId>" + messageid + @"</ServerId>
                    <ApplicationData>
                        <email:Flag>
                            <email:Status>0</email:Status>
                            <email:FlagType>Flag for follow up</email:FlagType>
                        </email:Flag>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>") as ZSyncResponse;

            ZAssert.IsNotNull(syncResponse, "Verify the delta sync response was received");

            #endregion

            #endregion


            #region TEST VERIFICATION


            #region Verify the message has the flagged attribute

            getMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
                    <m id='" + messageid + @"'/>
                </GetMsgRequest>");
            String f = TestAccount.soapSelectValue(getMsgResponse, "//mail:m", "f");

            ZAssert.StringDoesNotContain(f, "f", "Verify the flags attribute does not contain 'f' (is un-flagged)");

            #endregion

            #endregion

        }
    }

}
