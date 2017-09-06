using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.FromServer.MeetingRequests.Attendee
{
    [TestFixture]
    public class GetMeetingUpdate : Tests.BaseTestFixture
    {
        ZimbraAccount organizer = new ZimbraAccount().provision().authenticate();
        ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();
        
        [Test, Description("Verify meeting update (subject and content changes) sync to the attendee's device"), //No reminder, no location
        Property("TestSteps", "1. Send an appointment to attendee on device, 2. Sync to device of the attendee, 3. Update subject and content of the appointment at organizer's end, 4. Sync to attendee's device and Verify the appointment is updated at attendee's calendar and appropriate mail is sent to attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeetingUpdate01()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            
            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = organizer.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the subject is correct in organizer's calendar");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the content is correct in organizer's calendar");

            // Send the SyncRequest to get the appointment

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Verify original subject/content of appointment in attendee's calendar

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the subject is correct in Attendee's calendar");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content is correct in Attendee's calendar");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting invite is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting invite received by attendee");
            
            String org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting invite received by attendee");

            #endregion


            #region TEST ACTION
            // Modify the appointment - change subject and content
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            String newContent = "content" + HarnessProperties.getUniqueString();

            XmlDocument ModifyAppointmentResponse = organizer.soapSend(
                @"<ModifyAppointmentRequest  id='" + invId + @"' xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + newSubject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + newSubject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + newContent + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + newSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting update is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, newContent, "Verify the content field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting update received by attendee");

            org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting update received by attendee");

            // Send the SyncRequest for Calendar folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements

            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, "5", "Verify the attendee reminder is set to default i.e. 5 mins when organizer has not set any reminder");
            ZAssert.XmlXpathCount(Change, "//calendar:Location", 0, "Verify that location is not set");

            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, newSubject, "Verify the Subject field is correct (changed)");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, newContent, "Verify the content field is correct (changed)");

            #endregion

        }

        [Test, Description("Verify meeting update (change privacy/sensitivity from non-private to private) sync to the attendee's device"),
        Property("TestSteps", "1. Send an appointment to attendee on device, 2. Sync to device of the attendee, 3. Update privacy from non-private to private of the appointment at organizer's end, 4. Sync to attendee's device and Verify the appointment is updated at attendee's calendar and appropriate mail is sent to attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void GetMeetingUpdate02()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            
            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = organizer.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the subject is correct in organizer's calendar");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the privacy is correct in organizer's calendar");

            // Send the SyncRequest to get the appointment

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Verify original subject/content of appointment in attendee's calendar

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the subject is correct in Attendee's calendar");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the privacy is correct in Attendee's calendar");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting invite is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting invite received by attendee");

            String org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting invite received by attendee");

            ZAssert.XmlXpathMatch(Add, "//email:Sensitivity", null, "0", "Verify the Privacy field is correct i.e. Public in meeting invite received by attendee");
            

            #endregion


            #region TEST ACTION
            // Modify the appointment - change privacy
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            
            XmlDocument ModifyAppointmentResponse = organizer.soapSend(
                @"<ModifyAppointmentRequest  id='" + invId + @"' xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + newSubject + @"' allDay='0' class='PRI' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + newSubject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + newSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting update is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting update received by attendee");

            org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting update received by attendee");

            ZAssert.XmlXpathMatch(Add, "//email:Sensitivity", null, "2", "Verify the privacy is correct i.e. Private in meeting update received by attendee");

            // Send the SyncRequest for Calendar folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements

            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, "5", "Verify the attendee reminder is set to default i.e. 5 mins when organizer has not set any reminder");
            ZAssert.XmlXpathCount(Change, "//calendar:Location", 0, "Verify that location is not set");

            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, newSubject, "Verify the Subject field is correct (changed)");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct (changed)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "2", "Verify the Sensitivity/Privacy is set to Private (changed)");
            
            #endregion

        }

        [Test, Description("Verify meeting update (change location and reminder) sync to the attendee's device"),
        Property("TestSteps", "1. Send an appointment to attendee on device, 2. Sync to device of the attendee, 3. Update location and reminder of the appointment at organizer's end, 4. Sync to attendee's device and Verify the appointment is updated at attendee's calendar and appropriate mail is sent to attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeetingUpdate03()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String location = "location" + HarnessProperties.getUniqueString();
            String reminder = "30";

            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + location + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
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
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = organizer.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the subject is correct in organizer's calendar");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", location, "Verify the location is correct in organizer's calendar");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", reminder, "Verify the appointment reminder is correct in organizer's calendar");

            // Send the SyncRequest to get the appointment

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Verify original subject/content of appointment in attendee's calendar

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the subject is correct in Attendee's calendar");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, "5", "Verify the attendee reminder is set to default i.e. 5 mins when organizer has set reminder to 30 mins");
            ZAssert.XmlXpathMatch(Add, "//calendar:Location", null, location, "Verify that location is correct in Attendee's calendar");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting invite is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting invite received by attendee");

            String org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting invite received by attendee");

            ZAssert.XmlXpathMatch(Add, "//email:Location", null, location, "Verify the Location field is correct in meeting invite received by attendee");
            
            #endregion


            #region TEST ACTION
            // Modify the appointment - change subject, location and reminder
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            String newLocation = "location" + HarnessProperties.getUniqueString();
            String newReminder = "60";

            XmlDocument ModifyAppointmentResponse = organizer.soapSend(
                @"<ModifyAppointmentRequest  id='" + invId + @"' xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + newSubject + @"' loc='" + newLocation + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                                <alarm action='DISPLAY'>
                                    <trigger>
                                        <rel m='" + newReminder + @"' related='START' neg='1'/>
                                    </trigger>
                                </alarm>
                            </comp>
                        </inv>
                        <su>" + newSubject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + newSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting update is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting update received by attendee");

            org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting update received by attendee");

            ZAssert.XmlXpathMatch(Add, "//email:Location", null, newLocation, "Verify the Location field is correct in meeting update received by attendee");
            
            // Send the SyncRequest for Calendar folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements

            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            
            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, newSubject, "Verify the Subject field is correct (changed)");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, "5", "Verify the attendee reminder is set to default i.e. 5 mins when organizer has changed reminder to 60 mins");
            ZAssert.XmlXpathMatch(Change, "//calendar:Location", null, newLocation, "Verify that location is correct (changed)");


            #endregion

        }

        [Test, Description("Verify meeting update (change meeting start/end time) sync to the attendee's device"),
        Property("TestSteps", "1. Send an appointment to attendee on device, 2. Sync to device of the attendee, 3. Update start/end time of the appointment at organizer's end, 4. Sync to attendee's device and Verify the appointment is updated at attendee's calendar and appropriate mail is sent to attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void GetMeetingUpdate04()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"); 
            String startEmail = timestamp.ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z"); //2015-07-07T08:30:00.000Z format used in meeting invite/update start/end times
            String finishEmail = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z");
            
            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = organizer.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the subject is correct in organizer's calendar");
            
            // Send the SyncRequest to get the appointment

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Verify original subject/content of appointment in attendee's calendar

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the subject is correct in Attendee's calendar");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the meeting start time is correct in Attendee's calendar");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the meeting end time is correct in Attendee's calendar");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting invite is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting invite received by attendee");

            String org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting invite received by attendee");

            ZAssert.XmlXpathMatch(Add, "//email:StartTime", null, startEmail, "Verify the StartTime field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:EndTime", null, finishEmail, "Verify the EndTime field is correct in meeting invite received by attendee");
            
            #endregion


            #region TEST ACTION
            // Modify the appointment - change start and end time (push by 2hrs)
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            String newStart = timestamp.AddHours(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String newFinish = timestamp.AddHours(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String newStartEmail = timestamp.AddHours(2).ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z");
            String newFinishEmail = timestamp.AddHours(3).ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z");
            
            XmlDocument ModifyAppointmentResponse = organizer.soapSend(
                @"<ModifyAppointmentRequest  id='" + invId + @"' xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + newSubject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + newStart + @"'/>
                                <e d='" + newFinish + @"'/>
                            </comp>
                        </inv>
                        <su>" + newSubject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + newSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting update is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting update received by attendee");

            org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting update received by attendee");

            ZAssert.XmlXpathMatch(Add, "//email:StartTime", null, newStartEmail, "Verify the StartTime field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:EndTime", null, newFinishEmail, "Verify the EndTime field is correct in meeting update received by attendee");
            
            // Send the SyncRequest for Calendar folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements

            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, "5", "Verify the attendee reminder is set to default i.e. 5 mins when organizer has not set any reminder");
            ZAssert.XmlXpathCount(Change, "//calendar:Location", 0, "Verify that location is not set");

            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, newSubject, "Verify the Subject field is correct (changed)");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, newStart, "Verify the StartTime field is correct (changed)");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, newFinish, "Verify the EndTime field is correct (changed)");
            
            #endregion

        }

        [Test, Description("Verify meeting update (add new attendee) sync to the attendee's device"),
        Property("TestSteps", "1. Send an appointment to attendee on device, 2. Sync to device of the attendee, 3. Add a new attendee to the appointment at organizer's end, 4. Sync to both the attendee's device's and Verify the appointment is updated at attendee 1's calendar and added to Attendee 2's calendar and appropriate mail is sent to both attendees")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeetingUpdate05()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = organizer.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the subject is correct in organizer's calendar");
            
            // Send the SyncRequest to get the appointment

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Verify original subject/content of appointment in attendee's calendar

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the subject is correct in Attendee's calendar");
            
            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting invite is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting invite received by attendee");

            String org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting invite received by attendee");

            #endregion


            #region TEST ACTION
            // Modify the appointment - add new attendee
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            
            XmlDocument ModifyAppointmentResponse = organizer.soapSend(
                @"<ModifyAppointmentRequest  id='" + invId + @"' xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + newSubject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <at a='" + attendee1.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + newSubject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <e a='" + attendee1.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + newSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting update is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field has device user in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, attendee1.EmailAddress, "Verify the To field has new attendee in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting update received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting update received by attendee");

            org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting update received by attendee");

            // Send the SyncRequest for Calendar folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements

            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Change, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, "5", "Verify the attendee reminder is set to default i.e. 5 mins when organizer has not set any reminder");
            ZAssert.XmlXpathCount(Change, "//calendar:Location", 0, "Verify that location is not set");

            // Attendee1 - Device user
            XmlElement Attendee1 = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee1, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee (Device) Name field is correct");
            ZAssert.XmlXpathMatch(Attendee1, "//calendar:AttendeeType", null, "1", "Verify the attendee (Device) type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee1, "//calendar:AttendeeStatus", null, "5", "Verify the attendee (Device) status is 5 (Needs Action)");

            // Attendee2 - New attendee
            XmlElement Attendee2 = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + attendee1.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee2, "//calendar:Name ", null, attendee1.UserName, "Verify the Attendee (New) Name field is correct");
            ZAssert.XmlXpathMatch(Attendee2, "//calendar:AttendeeType", null, "1", "Verify the attendee (New) type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee2, "//calendar:AttendeeStatus", null, "5", "Verify the attendee (New) status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Change, "//calendar:Subject", null, newSubject, "Verify the Subject field is correct (changed)");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");

            #endregion

        }
    }
}
