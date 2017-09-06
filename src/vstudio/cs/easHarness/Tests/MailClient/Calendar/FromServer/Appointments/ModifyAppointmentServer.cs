using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.FromServer.Appointments
{
    [TestFixture]
    public class ModifyAppointmentServer : Tests.BaseTestFixture
    {

        [Test, Description("Modify a basic appointment on server - change subject, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: Change subject, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void ModifyAppointmentServer01()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");
          

            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Modify appointment on server

            String newSubject = "subject" + HarnessProperties.getUniqueString();
            
            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + newSubject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + newSubject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + newSubject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
            
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, newSubject, "Verify the Subject field is modified correctly");

            #endregion

        }

        [Test, Description("Verify modify appointment content on server - no content to set content, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: no content to set content, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void ModifyAppointmentServer02()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "";
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify that content field is not returned in Add command
            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Data", 0, "Verify that Data (Content) field is not returned in Add command");

            //Modify appointment on server
            String newContent = "content" + HarnessProperties.getUniqueString();

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + newContent + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, newContent, "Verify the Content field is modified correctly");
            

            #endregion

        }

        [Test, Description("Verify modify appointment content on server - change content, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change content, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void ModifyAppointmentServer03()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify content
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is set correctly");

            //Modify appointment on server
            String newContent = "content" + HarnessProperties.getUniqueString();

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + newContent + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, newContent, "Verify the Content field is modified correctly");


            #endregion

        }

        [Test, Description("Verify modify appointment location on server - no location to set location, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: no location to set location, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void ModifyAppointmentServer04()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String location = "";

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + location + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify location field is not returned in Add command
            ZAssert.XmlXpathCount(Add, "//calendar:Location", 0, "Verify that Location field is not returned in Add command");

            //Modify appointment on server
            String newLocation = "location" + HarnessProperties.getUniqueString();

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + newLocation + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Location", null, newLocation, "Verify the Location field is modified correctly");


            #endregion


        }

        [Test, Description("Verify modify appointment location on server - change location, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change location, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void ModifyAppointmentServer05()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String location = "location" + HarnessProperties.getUniqueString();

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + location + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify location
            ZAssert.XmlXpathMatch(Add, "//calendar:Location", null, location, "Verify the Location field is set correctly");

            //Modify appointment on server
            String newLocation = "location" + HarnessProperties.getUniqueString();

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + newLocation + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Location", null, newLocation, "Verify the Location field is modified correctly");


            #endregion

        }

        [Test, Description("Verify modify appointment time on server - time changed (same day), sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: time changed (same day), 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void ModifyAppointmentServer06()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            
            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject +  @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify Start and End Time
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
          
            //Modify appointment on server
            String newStart = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String newFinish = timestamp.AddDays(2).AddHours(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + newStart + @"'/>
                                <e d='" + newFinish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, newStart, "Verify the StartTime field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, newFinish, "Verify the EndTime field is modified correctly");
          

            #endregion


        }

        [Test, Description("Verify modify appointment time on server - time changed (different day), sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: time changed (different day), 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void ModifyAppointmentServer07()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 21, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(2).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            
            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject +  @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify Start and End Time
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
          
            //Modify appointment on server
            String newStart = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String newFinish = timestamp.AddDays(3).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + newStart + @"'/>
                                <e d='" + newFinish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, newStart, "Verify the StartTime field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, newFinish, "Verify the EndTime field is modified correctly");
          

            #endregion


        }

        [Test, Description("Verify modify appointment on server - change from normal to all-day (also change FB status from Busy to Free), sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change from normal to all-day (also change FB status from Busy to Free), 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void ModifyAppointmentServer08()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(3).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            
            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject +  @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify Start and End Time
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (non-All day)");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
          
            //Modify appointment on server
            timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            String newStart = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd"); 
            String newFinish = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd");

            TimeZoneInfo tzi = TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time");  //This is the preferred timezone used for test accounts
            TimeSpan ts = tzi.GetUtcOffset(DateTime.Now.AddDays(3));

            int offset = ts.Hours;
            int offsetAdd = offset * -1;

            String startUTC = timestamp.AddDays(2).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");
            String finishUTC = timestamp.AddDays(3).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");
            
            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='1' class='PUB' transp='0' fb='F' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + newStart + @"'/>
                                <e d='" + newFinish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "1", "Verify the Appointment type is modified correctly (set to All day)");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "0", "Verify the FreeBusy status is modified correctly  (to Free)");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, startUTC, "Verify the StartTime field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finishUTC, "Verify the EndTime field is modified correctly");
          

            #endregion


        }

        [Test, Description("Verify modify appointment on server - change from all day to normal, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change from all day to normal, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void ModifyAppointmentServer09()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd");
            String finish = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd");

            TimeZoneInfo tzi = TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time");  //This is the preferred timezone used for test accounts
            TimeSpan ts = tzi.GetUtcOffset(DateTime.Now.AddDays(4));

            int offset = ts.Hours;
            int offsetAdd = offset * -1;

            String startUTC = timestamp.AddDays(3).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");
            String finishUTC = timestamp.AddDays(4).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='1' class='PUB' transp='0' fb='B' status='CONF'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify Start and End Time
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "1", "Verify the Appointment type is correct (All day)");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, startUTC, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finishUTC, "Verify the EndTime field is correct");

            //Modify appointment on server
            String newStart = timestamp.AddDays(4).AddHours(10).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String newFinish = timestamp.AddDays(4).AddHours(11).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + newStart + @"'/>
                                <e d='" + newFinish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");

            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is modified correctly (to non-All day)");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, newStart, "Verify the StartTime field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, newFinish, "Verify the EndTime field is modified correctly");


            #endregion

        }

        [Test, Description("Verify modify appointment on server - no reminder to set reminder, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: no reminder to set reminder, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ModifyAppointmentServer10()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(4).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify reminder is not set
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command");
            
            //Modify appointment on server
            String reminder = "30";
            
            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                                <alarm action='DISPLAY'>
                                    <trigger>
                                        <rel m='" + reminder + @"' related='START' neg='1'/>
                                    </trigger>
                                </alarm>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, reminder, "Verify the Reminder field is set correctly");

            #endregion

        }

        [Test, Description("Verify modify appointment on server - change reminder, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change reminder, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ModifyAppointmentServer11()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(4).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String reminder = "15";

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                                <alarm action='DISPLAY'>
                                    <trigger>
                                        <rel m='" + reminder + @"' related='START' neg='1'/>
                                    </trigger>
                                </alarm>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify reminder
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, reminder, "Verify the Reminder field is correct");

            //Modify appointment on server
            String newReminder = "5";

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                                <alarm action='DISPLAY'>
                                    <trigger>
                                        <rel m='" + newReminder + @"' related='START' neg='1'/>
                                    </trigger>
                                </alarm>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, newReminder, "Verify the Reminder field is set correctly");

            #endregion

        }

        [Test, Description("Verify modify appointment on server - change from public to private, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change from public to private, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ModifyAppointmentServer12()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(4).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify sensitivity
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity field is correct (Public)");

            //Modify appointment on server
            
            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PRI' transp='0' fb='B' status='CONF'>
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
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "2", "Verify the Sensitivity is modified correctly (to Private)");

            #endregion

        }

        [Test, Description("Verify modify appointment on server - change from private to public, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change from private to public, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ModifyAppointmentServer13()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(4).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PRI' transp='0' fb='B' status='CONF'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify sensitivity
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "2", "Verify the Sensitivity field is correct (Private)");

            //Modify appointment on server
            
            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is modified correctly (to Public)");

            #endregion

        }

        [Test, Description("Verify modify appointment on server - change FB status from Busy to OutOfOffice, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: change FB status from Busy to OutOfOffice, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ModifyAppointmentServer14()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(4).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify FB status
            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");

            //Modify appointment on server
            
            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='O' status='CONF'>
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
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Normal/Public)");

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "3", "Verify the FreeBusy status is modified correctly (to Out of Office)");
            

            #endregion

        }

        
        [Test, Description("Verify modify appointment on server - clear/unset location, content and reminder, sync to device"),
        Property("TestSteps", "1. Add an appointment to the mailbox and syc to device, 2. Modify appointment on server: clear/unset location, content and reminder, 3. Sync to device and verify the appointment is modified correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void ModifyAppointmentServer15()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 22, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(4).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String location = "location" + HarnessProperties.getUniqueString();
            String reminder = "30";

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + location + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                                <alarm action='DISPLAY'>
                                    <trigger>
                                        <rel m='" + reminder + @"' related='START' neg='1'/>
                                    </trigger>
                                </alarm>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");


            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify content, location and remimder
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the Content field is set correctly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Location", null, location, "Verify the Location field is set correctly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, reminder, "Verify the Reminder field is set correctly");

            //Modify appointment on server
            String newContent = "";
            String newLocation = "";

            XmlDocument ModifyAppointmentResponse = TestAccount.soapSend(
                @"<ModifyAppointmentRequest id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m  l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + newLocation + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + newContent + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the Appointment type is correct (Non-all day)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Normal/Public)");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");

            //Verify that Content, Location and Reminder fields are unset on device i.e. not returned in Change command
            ZAssert.XmlXpathCount(Change, "//AirSyncBase:Data", 0, "Verify that Data (Content) field is unset/cleared on device");
            ZAssert.XmlXpathCount(Change, "//calendar:Location", 0, "Verify that Location field is unset/cleared on device");
            ZAssert.XmlXpathCount(Change, "//calendar:Reminder", 0, "Verify that Reminder field is unset/cleared on device");

            #endregion

        }
        
    }
}
