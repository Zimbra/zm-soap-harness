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

    [TestFixture]
    public class Ping : Tests.BaseTestFixture
    {
        private String inboxFolderid = HarnessProperties.getString("folder.inbox.id");
        private String contactFolderid = HarnessProperties.getString("folder.contacts.id");
        private String calendarFolderid = HarnessProperties.getString("folder.calendar.id");
        private String taskFolderId = HarnessProperties.getString("folder.tasks.id");

        [Test, Description("Verify push change (1 email) for Inbox folder"),
        Property("TestSteps", "1. Set the mobile on Push mode, 2. Send a new mail to the device user, 3. Verify the mail is received at the device automatically without manually syncing it")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void Ping01()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            ZPingResponse pingResponse = null;

            Thread t1 = new Thread(
                () =>
                {
                    pingResponse = TestClient.sendRequestASync(new ZPingRequest(TestAccount)) as ZPingResponse;
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
Subject: " + subject + @"
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
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "2", "Verify that Ping response status is 2 i.e. changes detected for push folders");
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Folders//Ping:Folder", null, inboxFolderid, "Verify that changes are detected in correct folder i.e. Inbox");
 
            //Issue Sync for above folder
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From field is correct");

            Thread.Sleep(2000);  //Doing this deliberately, as it appears that if Ping requests come fast, server returns old folder and does not create Ping listener session

            #endregion

        }

        [Test, Description("Verify push change (1 contact) for Contacts folder"),
        Property("TestSteps", "1. Set the mobile on Push mode, 2. Add a new contact from ZWC of the device user, 3. Verify the contact is synced at the device automatically without manually syncing it")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void Ping02()
        {

            #region TEST SETUP

            String firstname = "first" + HarnessProperties.getUniqueString();
            String lastname = "last" + HarnessProperties.getUniqueString();
            String email = "email" + HarnessProperties.getUniqueString() + "@example.com";

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

            //String xml = "";   //This will send Ping request with empty body. Currently, commented as old response is returned by server (Will debug in Dev env)

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

            //Add contact, so that Ping response is received
            TestAccount.soapSend(
                @"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname + @"</a>
                        <a n='lastName'>" + lastname + @"</a>
                        <a n='email'>" + email + @"</a>
                    </cn>     
                </CreateContactRequest>");

            Thread.Sleep(1000);

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(pingResponse, "Verify that Ping response was received from the server");

            //Validate Ping Response
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "2", "Verify that Ping response status is 2 i.e. changes detected for push folders");
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Folders//Ping:Folder", null, contactFolderid, "Verify that changes are detected in correct folder i.e. Contacts");

            //Issue Sync for above folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = contactFolderid;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//contacts:Email1Address[text() = '" + email + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//contacts:Email1Address ", null, email, "Verify the Email1Address field is correct");
            ZAssert.XmlXpathMatch(Add, "//contacts:LastName", null, lastname, "Verify the LastName field is correct");
            ZAssert.XmlXpathMatch(Add, "//contacts:FirstName", null, firstname, "Verify the FirstName field is correct");

            System.Threading.Thread.Sleep(2000);

            #endregion

        }

        [Test, Description("Verify push change (1 appointment) for Calendar folder"),
        Property("TestSteps", "1. Set the mobile on Push mode, 2. Send a new appointment to the device user, 3. Verify the appointment is received at the device automatically without manually syncing it")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void Ping03()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            ZPingResponse pingResponse = null;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <Folders>
                      <Folder>
                        <Id>10</Id>
                        <Class>Calendar</Class>
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

            //Add appointment, so that Ping response is received
            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + calendarFolderid + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            Thread.Sleep(1000);

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(pingResponse, "Verify that Ping response was received from the server");

            //Validate Ping Response
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "2", "Verify that Ping response status is 2 i.e. changes detected for push folders");
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Folders//Ping:Folder", null, calendarFolderid, "Verify that changes are detected in correct folder i.e. Calendar");

            //Issue Sync for above folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = calendarFolderid;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            System.Threading.Thread.Sleep(2000);

            #endregion

        }

        [Test, Description("Verify push change (1 task) for Calendar folder"),
        Property("TestSteps", "1. Set the mobile on Push mode, 2. Add a new task from ZWC of the device user, 3. Verify the task is synced at the device automatically without manually syncing it")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void Ping04()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            ZPingResponse pingResponse = null;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <Folders>
                      <Folder>
                        <Id>15</Id>
                        <Class>Tasks</Class>
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

            Thread.Sleep(2000); //Wait for 2 seconds to complete above PingRequest so that Tasks folder is monitored for changes

            //Add task, so that Ping response is received
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
                @"<CreateTaskRequest xmlns='urn:zimbraMail'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='1' priority='5' status='NEED' percentComplete='0'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateTaskRequest>");

            Thread.Sleep(1000);

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(pingResponse, "Verify that Ping response was received from the server");

            //Validate Ping Response
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "2", "Verify that Ping response status is 2 i.e. changes detected for push folders");
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Folders//Ping:Folder", null, taskFolderId, "Verify that changes are detected in correct folder i.e. Tasks");

            //Issue Sync for above folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//tasks:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");

            System.Threading.Thread.Sleep(5000);

            #endregion

        }

        [Test, Description("Verify push changes for Mail subfolder"), //Flow: Create 2 Mail subfolders and set push mode sync for 1 subfolder, Inject emails in both subfolders and check Ping response reports changes for only subscribed subfolder
        Property("TestSteps", "1. Set the mobile on Push mode, 2. Add a new mail subfolder from ZWC of the device user, 3. Verify the folder synced to the device automatically without manually syncing it")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void Ping05()
        {

            #region TEST SETUP

            String sfolder1name = "sfolder" + HarnessProperties.getUniqueString();
            String sfolder2name = "sfolder" + HarnessProperties.getUniqueString();
            String subject1 = "subject" + HarnessProperties.getUniqueString();
            String subject2 = "subject" + HarnessProperties.getUniqueString();
            ZPingResponse pingResponse = null;

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + sfolder1name + "' l='" + inboxFolderid + "'/>" +
                    "</CreateFolderRequest>");

            String sfolder1Id = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder[@name='" + sfolder1name + "']", "id");

            CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + sfolder2name + "' l='" + inboxFolderid + "'/>" +
                    "</CreateFolderRequest>");

            String sfolder2Id = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder[@name='" + sfolder2name + "']", "id");

            //Initial Sync subfolder1
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = sfolder1Id;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            //Initial Sync subfolder2
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = sfolder2Id;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            //Subscribe subfolder1 for Push
            String xml = @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <Folders>
                      <Folder>
                        <Id>" + sfolder1Id + @"</Id>
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

            //Add email to subfolder2 folder (push not enabled for this folder)
            TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + sfolder2Id + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo2@example.com
To: bar2@example.com
Subject: " + subject2 + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content 



                        </content>
                    </m>
                </AddMsgRequest>");

            //Add email to subfolder1 folder (push enabled for this folder)
            TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + sfolder1Id + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo1@example.com
To: bar1@example.com
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
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Status", null, "2", "Verify that Ping response status is 2 i.e. changes detected for push folders");

            //Verify that, only Folder is returned in Ping response and that is sfolder1
            ZAssert.XmlXpathCount(pingResponse.XmlElement, "//Ping:Folders//Ping:Folder", 1, "Verify that Ping response returns 1 Folder info");
            ZAssert.XmlXpathMatch(pingResponse.XmlElement, "//Ping:Folders//Ping:Folder", null, sfolder1Id, "Verify that changes are detected in correct folder i.e. subfolder1");

            //Issue Sync for above folder
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = sfolder1Id;
            //syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject1 + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject1, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar1@example.com", "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo1@example.com", "Verify the From field is correct");

            System.Threading.Thread.Sleep(1000);

            #endregion

        }

    }

}

