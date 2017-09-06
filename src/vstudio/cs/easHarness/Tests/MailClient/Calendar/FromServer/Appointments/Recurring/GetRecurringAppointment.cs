using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.FromServer.Appointments.Recurring
{
    [TestFixture]
    public class GetRecurringAppointment : Tests.BaseTestFixture
    {

        //This is temporary function, replace this with static Dictionary object in HarnessProperties
        public String getDayOfWeek(String WeekDay)
        {
            if (WeekDay == "Sunday")
                return "1";
            else if (WeekDay == "Monday")
                return "2";
            else if (WeekDay == "Tuesday")
                return "4";
            else if (WeekDay == "Wednesday")
                return "8";
            else if (WeekDay == "Thursday")
                return "16";
            else if (WeekDay == "Friday")
                return "32";
            else if (WeekDay == "Saturday")
                return "64";
            else
                return "0";
        }

        [Test, Description("Verify daily recurring appointment (ends after X occurrences) sync to the device"), // Recurring Daily, Ends after 3 occurrences
        Property("TestSteps", "1. Add a daily recurring appointment (ends after X occurrences) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void GetRecurringAppointment01()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='DAI'>
                                            <interval ival='1' />
                                            <count num='3' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "0", "Verify that appointment recurrence type is Daily");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 day");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "3", "Verify that appointment recurrence ends after 3 occurrences");

            #endregion

        }

        [Test, Description("Verify daily recurring appointment (no End date) sync to the device"), // Recurring Daily, No End date
        Property("TestSteps", "1. Add a daily recurring appointment (no End date) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void GetRecurringAppointment02()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='DAI'>
                                            <interval ival='1' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "0", "Verify that appointment recurrence type is Daily");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 day");
            
            //Verify End date is Never
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Occurrences", 0, "Verify that recurrence pattern does not have Occurrences info");
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Until", 0, "Verify that recurrence pattern does not have Until info");

            #endregion

        }

        [Test, Description("Verify daily recurring appointment (ends at Fixed date) sync to the device"), // Recurring Daily, Fixed End date
        Property("TestSteps", "1. Add a daily recurring appointment (ends at Fixed date) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void GetRecurringAppointment03()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String endDate = timestamp.AddDays(6).ToString(@"yyyyMMdd");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='DAI'>
                                            <interval ival='1' />
                                            <until d='" + endDate + @"'/>
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "0", "Verify that appointment recurrence type is Daily");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 day");

            String easEndDate = ZAssert.XmlXpathValue(Add, "//calendar:Recurrence//calendar:Until");
            ZAssert.AreEqual(easEndDate.Substring(0, 8), endDate, "Verify that End Date of recurring appointment is correct");

            #endregion

        }

        [Test, Description("Verify daily recurring appointment (every weekday) sync to the device"), // Recurring Daily, Every Weekdays (Mon to Fri) ends after 10 occurrences
        Property("TestSteps", "1. Add a daily recurring appointment (every weekday) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void GetRecurringAppointment04()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='DAI'>
                                            <interval ival='1' />
                                            <count num='10' />
                                            <byday>
                                                <wkday day='MO' />
                                                <wkday day='TU' />
                                                <wkday day='WE' />
                                                <wkday day='TH' />
                                                <wkday day='FR' />
                                            </byday>
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "0", "Verify that appointment recurrence type is Daily");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 day");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "10", "Verify that appointment recurrence ends after 10 occurrences");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, "62", "Verify that appointment recurs on weekdays only i.e. Monday thru Friday");

            #endregion

        }

        [Test, Description("Verify daily recurring appointment (recurring every 2 days) sync to the device"), // Recurring Daily, Every 2 days, Fixed End date
        Property("TestSteps", "1. Add a daily recurring appointment (recurring every 2 days) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment05()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String endDate = timestamp.AddDays(10).ToString(@"yyyyMMdd");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='DAI'>
                                            <interval ival='2' />
                                            <until d='" + endDate + @"'/>
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "0", "Verify that appointment recurrence type is Daily");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "2", "Verify that appointment recurs after every 2 days");

            String easEndDate = ZAssert.XmlXpathValue(Add, "//calendar:Recurrence//calendar:Until");
            ZAssert.AreEqual(easEndDate.Substring(0, 8), endDate, "Verify that End Date of recurring appointment is correct");

            #endregion

        }

        [Test, Description("Verify weekly recurring appointment (same weekday) sync to the device"), // Recurring Weekly, recur on same weekday ends after 3 occurrences
        Property("TestSteps", "1. Add a weekly recurring appointment (same weekday)  to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void GetRecurringAppointment06()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='WEE'>
                                            <interval ival='1' />
                                            <count num='3' />
                                            <byday>
                                                <wkday day='" + soapDayOfWeek + @"' />
                                            </byday>
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "1", "Verify that appointment recurrence type is Weekly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 week");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "3", "Verify that appointment recurrence ends after 3 occurrences");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, easDayOfWeek, "Verify that appointment recurs on correct weekday");

            #endregion

        }

        [Test, Description("Verify weekly recurring appointment (different weekday) sync to the device"), // Recurring Weekly, recur on dayafter weekday, Fixed end date
        Property("TestSteps", "1. Add a weekly recurring appointment (different weekday) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment07()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(1); //Adding one day, so start time will be next day
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String endDate = timestamp.AddDays(21).ToString(@"yyyyMMdd");

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='WEE'>
                                            <interval ival='1' />
                                            <until d='" + endDate + @"'/>
                                            <byday>
                                                <wkday day='" + soapDayOfWeek + @"' />
                                            </byday>
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "1", "Verify that appointment recurrence type is Weekly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 week");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, easDayOfWeek, "Verify that appointment recurs on correct weekday");

            String easEndDate = ZAssert.XmlXpathValue(Add, "//calendar:Recurrence//calendar:Until");
            ZAssert.AreEqual(easEndDate.Substring(0, 8), endDate, "Verify that End Date of recurring appointment is correct");

            #endregion

        }

        [Test, Description("Verify weekly recurring appointment (recurring every 2 weeks on Mondy, Wednesday, Friday) sync to the device"), // Recurring Weekly, recur every 2 weeks on Mon/Wed/Fri, No end date
        Property("TestSteps", "1. Add a weekly recurring appointment (recurring every 2 weeks on Mondy, Wednesday, Friday) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment08()
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
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='WEE'>
                                            <interval ival='2' />
                                            <byday>
                                                <wkday day='MO' />
                                                <wkday day='WE' />
                                                <wkday day='FR' />
                                            </byday>
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "1", "Verify that appointment recurrence type is Weekly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "2", "Verify that appointment recurs after every 2 weeks");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, "42", "Verify that appointment recurs on Monday, Wednesday and Friday");

            #endregion

        }

        [Test, Description("Verify monthly recurring appointment (same monthday) sync to the device"), // Recurring Monthly, recur on same monthday ends after 4 occurrences
        Property("TestSteps", "1. Add a monthly recurring appointment (same monthday) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void GetRecurringAppointment09()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 6, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfMonth = timestamp.Day.ToString();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='MON'>
                                            <interval ival='1' />
                                            <count num='4' />
                                            <bymonthday modaylist='" + dayOfMonth + @"' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "2", "Verify that appointment recurrence type is Monthly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 month");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "4", "Verify that appointment recurrence ends after 4 occurrences");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfMonth", null, dayOfMonth, "Verify that appointment recurs on correct monthday");

            #endregion

        }

        [Test, Description("Verify monthly recurring appointment (different monthday) sync to the device"), // Recurring Monthly, recur on different monthday, no End date
        Property("TestSteps", "1. Add a monthly recurring appointment (different monthday) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment10()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(2); //Added 2 days, so that appointment is created on different month date
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfMonth = timestamp.Day.ToString();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='MON'>
                                            <interval ival='2' />
                                            <bymonthday modaylist='" + dayOfMonth + @"' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "2", "Verify that appointment recurrence type is Monthly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "2", "Verify that appointment recurs after every 1 month");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfMonth", null, dayOfMonth, "Verify that appointment recurs on correct monthday");

            #endregion

        }

        [Test, Description("Verify monthly recurring appointment (every 2nd week's X day) sync to the device"), // Recurring Monthly, recur on 2nd week's X day (Mon to Sun) of every month, Fixed end date
        Property("TestSteps", "1. Add a monthly recurring appointment (every 2nd week's X day) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment11()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 22, 0, 0).AddDays(2);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String endDate = timestamp.AddMonths(3).ToString(@"yyyyMMdd");

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            String dayOfMonth = timestamp.Day.ToString();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='MON'>
                                            <interval ival='1' />
                                            <until d='" + endDate + @"'/>
                                            <byday>
                                                <wkday day='" + soapDayOfWeek + @"' />
                                            </byday>
                                            <bysetpos poslist='2' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "3", "Verify that appointment recurrence type is Monthly Custom");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 month");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, easDayOfWeek, "Verify that appointment recurs on correct day of week");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:WeekOfMonth", null, "2", "Verify that appointment recurs on week day of 2nd week");

            String easEndDate = ZAssert.XmlXpathValue(Add, "//calendar:Recurrence//calendar:Until");
            ZAssert.AreEqual(easEndDate.Substring(0, 8), endDate, "Verify that End Date of recurring appointment is correct");

            #endregion

        }

        [Test, Description("Verify monthly recurring appointment (every 2nd day) sync to the device"), // Recurring Monthly, recur on 2nd day (Mon to Sun) of every month, Fixed occurrences
        Property("TestSteps", "1. Add a monthly recurring appointment (every 2nd day) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment12()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0).AddDays(3);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='MON'>
                                            <interval ival='1' />
                                            <count num='4' />
                                            <byday>
                                                <wkday day='SU' />
                                                <wkday day='MO' />
                                                <wkday day='TU' />
                                                <wkday day='WE' />
                                                <wkday day='TH' />
                                                <wkday day='FR' />
                                                <wkday day='SA' />
                                            </byday>
                                            <bysetpos poslist='2' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "3", "Verify that appointment recurrence type is Monthly Custom");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 month");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "4", "Verify that appointment recurs for 4 occurrences");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, "127", "Verify that appointment recurs on correct days of week - i.e. Monday through Sunday");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:WeekOfMonth", null, "2", "Verify that appointment recurs on week day of 2nd week");

            #endregion

        }

        [Test, Description("Verify monthly recurring appointment (every 2nd weekday) sync to the device"), // Recurring Monthly, recur on 2nd weekday (Mon to Fri) of every month, Fixed occurrences
        Property("TestSteps", "1. Add a monthly recurring appointment (every 2nd weekday) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment13()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(3);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='MON'>
                                            <interval ival='1' />
                                            <count num='4' />
                                            <byday>
                                                <wkday day='MO' />
                                                <wkday day='TU' />
                                                <wkday day='WE' />
                                                <wkday day='TH' />
                                                <wkday day='FR' />
                                            </byday>
                                            <bysetpos poslist='2' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "3", "Verify that appointment recurrence type is Monthly Custom");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 month");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "4", "Verify that appointment recurs for 4 occurrences");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, "62", "Verify that appointment recurs on correct days of week - i.e. Monday through Friday");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:WeekOfMonth", null, "2", "Verify that appointment recurs on week day of 2nd week");

            #endregion

        }

        [Test, Description("Verify monthly recurring appointment (every 2nd weekend day) sync to the device"), // Recurring Monthly, recur on 2nd weekend day (Sat/Sun) of every month, Fixed occurrences
        Property("TestSteps", "1. Add a monthly recurring appointment (every 2nd weekend day) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment14()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 22, 0, 0).AddDays(3);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='MON'>
                                            <interval ival='1' />
                                            <count num='4' />
                                            <byday>
                                                <wkday day='SU' />
                                                <wkday day='SA' />
                                            </byday>
                                            <bysetpos poslist='2' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "3", "Verify that appointment recurrence type is Monthly Custom");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 month");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "4", "Verify that appointment recurs for 4 occurrences");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, "65", "Verify that appointment recurs on correct weekend days - i.e. Saturday/Sunday");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:WeekOfMonth", null, "2", "Verify that appointment recurs on week day of 2nd week");

            #endregion

        }

        [Test, Description("Verify yearly recurring appointment (same monthday, No end date) sync to the device"), // Recurring Yearly, recur on same monthday, No end date
        Property("TestSteps", "1. Add a yearly recurring appointment (same monthday, No end date) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void GetRecurringAppointment15()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0).AddDays(4);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfMonth = timestamp.Day.ToString();
            String month = timestamp.Month.ToString();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='YEA'>
                                            <interval ival='1' />
                                            <bymonthday modaylist='" + dayOfMonth + @"' />
                                            <bymonth molist='" + month + @"' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "5", "Verify that appointment recurrence type is Yearly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 year");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfMonth", null, dayOfMonth, "Verify that appointment recurs on correct monthday");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:MonthOfYear", null, month, "Verify that appointment recurs on correct month");

            //Verify End date is Never
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Occurrences", 0, "Verify that recurrence pattern does not have Occurrences info");
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Until", 0, "Verify that recurrence pattern does not have Until info");

            #endregion

        }

        [Test, Description("Verify yearly recurring appointment (same monthday, Fixed occurrences) sync to the device"), // Recurring Yearly, recur on same monthday ends after 2 occurrences
        Property("TestSteps", "1. Add a yearly recurring appointment (same monthday, Fixed occurrences) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment16()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(4);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfMonth = timestamp.Day.ToString();
            String month = timestamp.Month.ToString();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='YEA'>
                                            <interval ival='1' />
                                            <count num='2' />
                                            <bymonthday modaylist='" + dayOfMonth + @"' />
                                            <bymonth molist='" + month + @"' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "5", "Verify that appointment recurrence type is Yearly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 year");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "2", "Verify that appointment recurrence ends after 2 occurrences");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfMonth", null, dayOfMonth, "Verify that appointment recurs on correct monthday");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:MonthOfYear", null, month, "Verify that appointment recurs on correct month");

            #endregion

        }

        [Test, Description("Verify yearly recurring appointment (every 2nd's week's X day of current month) sync to the device"), // Recurring Yearly, recur on 2nd week's X day (Mon to Sun) of current month, ends after 4 occurrences
        Property("TestSteps", "1. Add a yearly recurring appointment (every 2nd's week's X day of current month) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment17()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 22, 0, 0).AddDays(4);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            String month = timestamp.Month.ToString();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='YEA'>
                                            <interval ival='1' />
                                            <count num='4' />
                                            <bymonth molist='" + month + @"' />
                                            <byday>
                                                <wkday day='" + soapDayOfWeek + @"' />
                                            </byday>
                                            <bysetpos poslist='2' />
                                        </rule>
                                    </add>
                                </recur>
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

            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "0", "Verify the Meeting status is correct (is Appoinment)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity is correct (Public/Normal)");
            ZAssert.XmlXpathCount(Add, "//calendar:Reminder", 0, "Verify that Reminder field is not returned in Add command - i.e. Appointment Reminder not set on device");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "6", "Verify that appointment recurrence type is Custom Yearly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 year");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Occurrences", null, "4", "Verify that appointment recurrence ends after 4 occurrences");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfWeek", null, easDayOfWeek, "Verify that appointment recurs on correct weekday");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:WeekOfMonth", null, "2", "Verify that appointment recurs on correct week i.e. 2nd week");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:MonthOfYear", null, month, "Verify that appointment recurs on correct month");

            #endregion

        }
     
        // Create monthly and yearly recurring appt, sync to device, reconfigure account and verify both appts sync
        [Test, Description("Verify re-syncing of yearly recurring appointment (No end date) to the device works"), 
        Property("TestSteps", "1. Add a re-syncing of yearly recurring appointment (No end date) to the mailbox, 2. Sync to device, 3. Verify the appointment details are correct"),
        Property("Bug", 102916)]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetRecurringAppointment18()
        {

            #region TEST SETUP

            #region Appt1 - Monthly recurring appointment (No end date)
            String subject1 = "subject" + HarnessProperties.getUniqueString();
            String content1 = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp1 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0).AddDays(5);
            String start1 = timestamp1.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish1 = timestamp1.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfMonth = timestamp1.Day.ToString();
            String month = timestamp1.Month.ToString();

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject1 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='MON'>
                                            <interval ival='1' />
                                            <bymonthday modaylist='" + dayOfMonth + @"' />
                                        </rule>
                                    </add>
                                </recur>
                                <s d='" + start1 + @"'/>
                                <e d='" + finish1 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject1 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content1 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String apptId1 = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "apptId");

            #endregion 

            #region Appt2 - Yearly recurring appointment (No end date)
            String subject2 = "subject" + HarnessProperties.getUniqueString();
            String content2 = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp2 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(5);
            String start2 = timestamp1.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish2 = timestamp1.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
           
            //Create yearly recurring - No end date
            CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject2 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='YEA'>
                                            <interval ival='1' />
                                            <bymonthday modaylist='" + dayOfMonth + @"' />
                                            <bymonth molist='" + month + @"' />
                                        </rule>
                                    </add>
                                </recur>
                                <s d='" + start2 + @"'/>
                                <e d='" + finish2 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject2 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content2 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String apptId2 = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "apptId");

            #endregion

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 2, "Verify that Sync response returns 2 items");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[1]//AirSync:ServerId", null, apptId1, "Verify that 1st Add record has info of 1st appointment");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[2]//AirSync:ServerId", null, apptId2, "Verify that 2nd Add record has info of 2nd appointment");

            // Resync Calendar
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = "0";
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; 
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            //First sync to get batch of first 10 items - current test appointments will not be there in 1st batch
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String; 
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; 
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            //Second sync to get batch of next 10 items - current test appointments will be there in 2nd batch
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
       
            #endregion


            #region TEST VERIFICATION

            // Verify details of  Monthly recurring appointment
            XmlElement  Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject1 + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response i.e. Monthly recurring appointment synced");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "2", "Verify that appointment recurrence type is Monthly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 month");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfMonth", null, dayOfMonth, "Verify that appointment recurs on correct monthday");

            //Verify End date is Never
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Occurrences", 0, "Verify that recurrence pattern does not have Occurrences info");
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Until", 0, "Verify that recurrence pattern does not have Until info");

            // Verify details of  Yearly recurring appointment
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject2 + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response  i.e. Yearly recurring appointment synced");

            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Type", null, "5", "Verify that appointment recurrence type is Yearly");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:Interval", null, "1", "Verify that appointment recurs after every 1 year");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:DayOfMonth", null, dayOfMonth, "Verify that appointment recurs on correct monthday");
            ZAssert.XmlXpathMatch(Add, "//calendar:Recurrence//calendar:MonthOfYear", null, month, "Verify that appointment recurs on correct month");

            //Verify End date is Never
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Occurrences", 0, "Verify that recurrence pattern does not have Occurrences info");
            ZAssert.XmlXpathCount(Add, "//calendar:Recurrence//calendar:Until", 0, "Verify that recurrence pattern does not have Until info");

            #endregion

        }

        #region IgnoreBlock
        /*Cases for yearly - on 2nd Day of month, on 2nd weekday of month, on 2nd weekend day of month are pending
         * Issues - wrong recurrence pattern for all of these cases
         * Wait for bug#101801 to get fixed 
         * 
         * <POOMCAL:Recurrence>
                            <POOMCAL:Type>6</POOMCAL:Type>
                            <POOMCAL:DayOfWeek>127</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>4</POOMCAL:WeekOfMonth> //this was for 4th day of month
                            <POOMCAL:MonthOfYear>11</POOMCAL:MonthOfYear>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:Occurrences>2</POOMCAL:Occurrences>
                        </POOMCAL:Recurrence>

         * 
         * <POOMCAL:Recurrence>
                            <POOMCAL:Type>6</POOMCAL:Type>
                            <POOMCAL:DayOfWeek>62</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>2</POOMCAL:WeekOfMonth>
                            <POOMCAL:MonthOfYear>11</POOMCAL:MonthOfYear>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:Occurrences>2</POOMCAL:Occurrences>
                        </POOMCAL:Recurrence>
         * 
         * <POOMCAL:Recurrence>
                            <POOMCAL:Type>6</POOMCAL:Type>
                            <POOMCAL:DayOfWeek>65</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>2</POOMCAL:WeekOfMonth>
                            <POOMCAL:MonthOfYear>11</POOMCAL:MonthOfYear>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:Occurrences>2</POOMCAL:Occurrences>
                        </POOMCAL:Recurrence>
         */

        #endregion

    }   


}
