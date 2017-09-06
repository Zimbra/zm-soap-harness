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
    public class GetAppointment : Tests.BaseTestFixture
    {

        [Test, Description("Verify basic appointment sync to the device"), // Subject, Content (Plain text), FB as Busy, No Reminder
        Property("TestSteps", "1. Add an appointment with Subject, Content (Plain text), FB as Busy, No Reminder to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void GetAppointment01()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
 
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='"+ subject +@"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='"+ TestAccount.EmailAddress +@"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject +@"</su>
                        <mp ct='text/plain'>
                            <content>"+ content +@"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            //Verify content is plain text - update this test in future with better validation for plain/html content, currently it seems devices sync text as plain text always.. May be new devices handle this differently 
            //Validation for Body:Type
            //Validation for NativeBodyType

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");

            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            #endregion

        }

        [Test, Description("Verify various appointment values (location, allday(false)) are synced correctly to the device"), //Plain text, Location
        Property("TestSteps", "1. Add an appointment with Plain text, Location to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void GetAppointment02()
        {

            #region TEST SETUP


            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            
            String location = "location" + HarnessProperties.getUniqueString();
            
            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='"+ location +@"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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


            #endregion


            #region TEST ACTION


            // Sync the calendar
            //

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the new <Add/> Element
            
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:Location", null, location, "Verify the appointment location is returned");
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "0", "Verify the all day setting is false");


            #endregion


        }

        [Test, Description("Verify an all day appointment (FB status as Free) is synced correctly to the device"), //Plain text, All day, FB status=Free
        Property("TestSteps", "1. Add an appointment with Plain text, All day, FB status=Free to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void GetAppointment03()
        {


            #region TEST SETUP


            // Add an appointment to the mailbox
            //
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            String start = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd"); 
            String finish = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd"); 
            
            /*
            String startUTC = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finishUTC = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            Above is not working, it seems that, Datetime reference is picked of server and UTC time ends up as GMT-5 instead of +5:30
            This behavior is different if compared with non-all day meetings
            * */

            TimeZoneInfo tzi = TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time");  //This is the preferred timezone used for test accounts
            TimeSpan ts = tzi.GetUtcOffset(DateTime.Now.AddDays(2));          

            int offset = ts.Hours;
            int offsetAdd = offset * -1;

            String startUTC = timestamp.AddDays(1).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");
            String finishUTC = timestamp.AddDays(2).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='1' class='PUB' transp='0' fb='F' status='CONF'>
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


            #endregion


            #region TEST ACTION


            // Sync the calendar

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the new <Add/> Element

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "1", "Verify the all day setting is true");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, startUTC, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finishUTC, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "0", "Verify the FreeBusy status is correct (Free)");    


            #endregion


        }
        
        [Test, Description("Verify an all day appointment spanning 2 days (FB status as Out Of Office) is synced correctly to the device"), //Plain text, All day, FB status=Out Of Office
        Property("TestSteps", "1. Add an appointment with Plain text, All day, FB status=Out Of Office to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetAppointment04()
        {


            #region TEST SETUP


            // Add an appointment to the mailbox
            //
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            String start = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd");
            String finish = timestamp.AddDays(5).ToUniversalTime().ToString(@"yyyyMMdd");

            /*
            String startUTC = timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finishUTC = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            Above is not working, it seems that, Datetime reference is picked of server and UTC time ends up as GMT-5 instead of +5:30
            This behavior is different if compared with non-all day meetings
            * */

            TimeZoneInfo tzi = TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time");  //This is the preferred timezone used for test accounts
            TimeSpan ts = tzi.GetUtcOffset(DateTime.Now.AddDays(4));

            int offset = ts.Hours;
            int offsetAdd = offset * -1;

            String startUTC = timestamp.AddDays(3).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");
            String finishUTC = timestamp.AddDays(5).AddHours(offsetAdd).ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='1' class='PUB' transp='0' fb='O' status='CONF'>
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



            #endregion


            #region TEST ACTION


            // Sync the calendar

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the new <Add/> Element

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "1", "Verify the all day setting is true");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, startUTC, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finishUTC, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "3", "Verify the FreeBusy status is correct (Out Of Office)");


            #endregion


        }
        
        [Test, Description("Verify private appointment sync to the device"), // Subject, Content (Plain text), Sensitivity=Private
        Property("TestSteps", "1. Add an appointment with Subject, Content (Plain text), Sensitivity=Private to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void GetAppointment05()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
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

            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "2", "Verify the Sensitivity is correct (Private)");

            #endregion

        }
        
        [Test, Description("Verify appointment with FreeBusy status as Tentative is sync to the device"), // Subject, Content (Plain text), FB status=Tentative
        Property("TestSteps", "1. Add an appointment with Subject, Content (Plain text), FB status=Tentative to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetAppointment06()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='T' status='CONF'>
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

            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "1", "Verify the FreeBusy status is correct (Tentative)");
            
            #endregion

        }
        
        [Test, Description("Verify appointment with FreeBusy status as OutOfOffice is sync to the device"), // Subject, Content (Plain text), FB status=OOO
        Property("TestSteps", "1. Add an appointment with Subject, Content (Plain text), FB status=OOO to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
    	[Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetAppointment07()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 22, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
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
                </CreateAppointmentRequest>");

            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "3", "Verify the FreeBusy status is correct (Out Of Office)");

            #endregion

        }
        
        [Test, Description("Verify appointment with reminder set is sync to the device"), // Subject, Content (Plain text), Reminder=30 mins
        Property("TestSteps", "1. Add an appointment with Subject, Content (Plain text), Reminder=30 mins to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void GetAppointment08()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(1).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String reminder = "30";

            TestAccount.soapSend(
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

            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, reminder, "Verify the Reminder field is correct");

            #endregion

        }
 
        [Test, Description("Verify appointment with reminder set to 'At time of event', is sync to the device"), // Subject, Content (Plain text), Reminder=0 mins
        Property("TestSteps", "1. Add an appointment with Subject, Content (Plain text), Reminder=0 mins to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")] 
        public void GetAppointment09()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(1).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String reminder = "0";

            TestAccount.soapSend(
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

            #endregion


            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, TestAccount.EmailAddress, "Verify the Organizer field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, reminder, "Verify the Reminder field is correct i.e. set to 'At time of event'"); 

            #endregion

        }

    }

}
