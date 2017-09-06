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
    public class GetMeeting : Tests.BaseTestFixture
    {
        ZimbraAccount organizer = new ZimbraAccount().provision().authenticate();
        ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();
        ZimbraAccount resLocation = new ZimbraAccount().provisionLocation().authenticate();
        ZimbraAccount resEquipment = new ZimbraAccount().provisionEquipment().authenticate();
        
        [Test, Description("Verify basic meeting request (as attendee) sync to the device"), //No reminder, no location
        Property("TestSteps", "1. Send a basic appointment with no reminder and no location to the attendee on device, 2. Sync to device of the attendee, 3. Verify the appointment is created in attendee's calendar with correct details")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeeting01()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"' d='" + organizer.UserName + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' d='" + TestAccount.UserName + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' p='" + TestAccount.UserName + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, "5", "Verify the attendee reminder is set to default i.e. 5 mins when organizer has not set any reminder");
            ZAssert.XmlXpathCount(Add, "//calendar:Location", 0, "Verify that location is not set");

            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");
            
            #endregion

        }

        [Test, Description("Verify meeting request with location and reminder (as attendee) sync to the device"), //Set reminder and location, check reminder is not applied for attendee
        Property("TestSteps", "1. Send an appointment with location and reminder to the attendee on device, 2. Sync to device of the attendee, 3. Verify the appointment is created in attendee's calendar with correct details")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeeting02()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String location = "location" + HarnessProperties.getUniqueString();
            String reminder = "30";
            
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
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

            #endregion


            #region TEST ACTION

            // Send the SyncRequest

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Add, "//calendar:Location", null, location, "Verify the location field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, "5", "Verify the attendee reminder is not equal to the value set by organizer, is set to default i.e. 5 mins");

            #endregion

        }

        [Test, Description("Verify private meeting request (as attendee) sync to the device"), //Sensitivity=Private
        Property("TestSteps", "1. Send a private appointment to the attendee on device, 2. Sync to device of the attendee, 3. Verify the appointment is created in attendee's calendar with correct details")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeeting03()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PRI' transp='0' fb='B' status='CONF'>
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

            #endregion


            #region TEST ACTION

            // Send the SyncRequest

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "2", "Verify the Sensitivity/Privacy is set to Private");

            #endregion

        }

        [Test, Description("Verify All day meeting request (as attendee) sync to the device"), //All day meeting request
        Property("TestSteps", "1. Send an All day meeting appointment to the attendee on device, 2. Sync to device of the attendee, 3. Verify the appointment is created in attendee's calendar with correct details")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void GetMeeting04()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd");
            String finish = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd");

            TimeZoneInfo tzi = TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time");  //This is the preferred timezone used for test accounts
            TimeSpan ts = tzi.GetUtcOffset(DateTime.Now.AddDays(2));

            int offset = ts.Hours;
            int offsetAdd = offset * -1;

            String startUTC = timestamp.AddDays(1).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");
            String finishUTC = timestamp.AddDays(2).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='1' class='PUB' transp='0' fb='F' status='CONF'>
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

            #endregion


            #region TEST ACTION

            // Send the SyncRequest

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, startUTC, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finishUTC, "Verify the EndTime field is correct");

            // Attendee1
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "1", "Verify the all day setting is true");
            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "0", "Verify the FreeBusy status is correct (Free)");
            
            #endregion

        }

        [Test, Description("Verify meeting request to optional attendee (device user) and resources - location and equipment sync to the device"),
        Property("TestSteps", "1. Send an appointment to optional attendee on device, 2. Sync to device of the attendee, 3. Verify the appointment is created in attendee's calendar with correct details")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void GetMeeting05()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='"+ resLocation.UserName + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"' d='" + organizer.UserName + @"'/>
                                <at a='" + attendee1.EmailAddress + @"' d='" + attendee1.UserName + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <at a='" + TestAccount.EmailAddress + @"' d='" + TestAccount.UserName + @"' role='OPT' ptst='NE' rsvp='1'/>
                                <at a='" + resLocation.EmailAddress + @"' d='" + resLocation.UserName + @"' role='NON' cutype='RES' ptst='NE' rsvp='1'/>
                                <at a='" + resEquipment.EmailAddress + @"' d='" + resEquipment.UserName + @"' role='NON' cutype='RES' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <e a='" + attendee1.EmailAddress + @"' p='" + attendee1.UserName + @"' t='t'/>
					    <e a='" + TestAccount.EmailAddress + @"' p='" + TestAccount.UserName + @"' t='t'/>
                        <e a='" + resLocation.EmailAddress + @"' p='" + resLocation.UserName + @"' t='t'/>
                        <e a='" + resEquipment.EmailAddress + @"' p='" + resEquipment.UserName + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Location", null, resLocation.UserName, "Verify the Location field is correct");

            // Attendee verification
            //Required Attendee
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + attendee1.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name", null, attendee1.UserName, "Verify the attendee name is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            //Self - Optional attendee
            Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name", null, TestAccount.UserName, "Verify the attendee name is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "2", "Verify the attendee type is 2 (Optional)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            //Resource1 - Location
            Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + resLocation.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name", null, resLocation.UserName, "Verify the attendee name is correct");            
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "3", "Verify the attendee type is 3 (Resource)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");
            
            //Resource2 - Equipment
            Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + resEquipment.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name", null, resEquipment.UserName, "Verify the attendee name is correct");            
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "3", "Verify the attendee type is 1 (Resource)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            #endregion

        }

    }
}
