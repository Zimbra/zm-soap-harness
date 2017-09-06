using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using NUnit.Framework;
using System.Threading;

namespace Tests.MailClient.Ping 
{
    class Ping_Error : Tests.BaseTestFixture
    {

        private String inboxFolderid = HarnessProperties.getString("folder.inbox.id");

        [Test, Description("Verify Ping response - required parameters missing (Folders)"),
        Property("TestSteps", "1. Send ping request, 2. Wait for 4 seconds to complete above PingRequest so that Inbox folder is monitored for changes, 3. Verify that Ping response is correct")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void Ping_Error01()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            ZPingResponse pingResponse = null;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <HeartbeatInterval>300</HeartbeatInterval>
                  </Ping>";

            Thread t1 = new Thread(
                () =>
                {
                    pingResponse = TestClient.sendRequestASync(new ZPingRequest(TestAccount, xml)) as ZPingResponse;
                });

            #endregion


            #region TEST ACTION

            //1 Send a Ping request
            t1.Start();

            Thread.Sleep(4000); //Wait for 4 seconds to complete above PingRequest so that Inbox folder is monitored for changes

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(pingResponse, "Verify that Ping response was received from the server");

            //Validate Ping Response
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "3", "Verify that Ping response status is 3 i.e. required parameters missing");

            System.Threading.Thread.Sleep(2000);

            #endregion

        }

        [Test, Description("Verify Ping response - HeartBeatInterval out of range"), //Flow: Client sends HBI out of range, Server returns closest in-range HBI, Client re-issues Ping with new HBI, check Sync
        Property("TestSteps", "1. Send ping request, 2. Wait for 2 seconds to complete above PingRequest so that Inbox folder is monitored for changes, 2. Verify that Ping response is correct")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void Ping_Error02()
        {

            #region TEST SETUP

            String subject1 = "subject" + HarnessProperties.getUniqueString();
            String subject2 = "subject" + HarnessProperties.getUniqueString();
            ZPingResponse pingResponse = null;
            ZPingResponse pingResponse1 = null;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <HeartbeatInterval>250</HeartbeatInterval>
                    <Folders>
                      <Folder>
                        <Id>2</Id>
                        <Class>Email</Class>
                      </Folder>
                    </Folders>
                  </Ping>";

            Thread t1 = new Thread(
                () =>
                {
                    pingResponse = TestClient.sendRequestASync(new ZPingRequest(TestAccount, xml)) as ZPingResponse;
                });

            #endregion


            #region TEST ACTION

            //1 Send a Ping request
            t1.Start();

            Thread.Sleep(2000); //Wait for 2 seconds to complete above PingRequest so that Inbox folder is monitored for changes

            //Add email to Inbox folder, so that Ping response is received
            TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + inboxFolderid + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: " + subject1 + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content 



                        </content>
                    </m>
                </AddMsgRequest>");

            Thread.Sleep(1000);

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(pingResponse, "Verify that Ping response was received from the server");

            //Validate Ping Response
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "5", "Verify that Ping response status is 5 i.e. Client sent HeartBeatInterval is out of range");
            String heartBeatInterval = ZAssert.XmlXpathValue(pingResponse.XmlElement, "//Ping:HeartbeatInterval");

            //Client reissues Ping request with Server suggested HeartBeatInterval
            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <HeartbeatInterval>" + heartBeatInterval + @"</HeartbeatInterval>
                    <Folders>
                      <Folder>
                        <Id>2</Id>
                        <Class>Email</Class>
                      </Folder>
                    </Folders>
                  </Ping>";

            Thread t2 = new Thread(
                () =>
                {
                    pingResponse1 = TestClient.sendRequestASync(new ZPingRequest(TestAccount, xml1)) as ZPingResponse;
                });

            t2.Start();

            Thread.Sleep(2000);

            //Add email to Inbox folder, so that Ping response is received
            TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + inboxFolderid + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo1@example.com
To: bar1@example.com
Subject: " + subject2 + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content 



                        </content>
                    </m>
                </AddMsgRequest>");

            Thread.Sleep(1000);

            ZAssert.IsNotNull(pingResponse1, "Verify that Ping response was received from the server");

            //Validate Ping Response
            ZAssert.XmlXpathMatch(pingResponse1.XmlElement, "//Ping:Status", null, "2", "Verify that Ping response status is 2 i.e. changes detected for push folders");
            ZAssert.XmlXpathMatch(pingResponse1.XmlElement, "//Ping:Folders//Ping:Folder", null, inboxFolderid, "Verify that changes are detected in correct folder i.e. Inbox");

            //Issue Sync for above folder
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 2, "Verify that Sync response returns 2 items");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject1 + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject1, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From field is correct");

            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject2 + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject2, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar1@example.com", "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo1@example.com", "Verify the From field is correct");

            System.Threading.Thread.Sleep(5000);

            #endregion


        }

        [Test, Description("Verify Ping response - no changes for push monitored folders"),
        Property("TestSteps", "1. Send ping request, 2. Wait for 300 seconds (5 mins), so that Heartbeatinterval expires and Server returns response with no changes detected, 2. Verify that Ping response is correct")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void Ping_Error03()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            ZPingResponse pingResponse = null;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <Folders>
                      <Folder>
                        <Id>7</Id>
                        <Class>Contacts</Class>
                      </Folder>
                    </Folders>
                  </Ping>";

            Thread t1 = new Thread(
                () =>
                {
                    pingResponse = TestClient.sendRequestASync(new ZPingRequest(TestAccount, xml)) as ZPingResponse;
                });

            #endregion


            #region TEST ACTION

            //1 Send a Ping request
            t1.Start();

            Thread.Sleep(2000); //Sleep for 2 seconds, if thread terminates due to response, no need to sleep for 5 mins as below

            if (t1.IsAlive)
                Thread.Sleep(300000); //Wait for 300 seconds (5 mins), so that Heartbeatinterval expires and Server returns response with no changes detected

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(pingResponse, "Verify that Ping response was received from the server");

            //Validate Ping Response
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "1", "Verify that Ping response status is 1 i.e. The heartbeat interval expired before any changes occurred in the folders being monitored");

            #endregion

        }

    }
}
