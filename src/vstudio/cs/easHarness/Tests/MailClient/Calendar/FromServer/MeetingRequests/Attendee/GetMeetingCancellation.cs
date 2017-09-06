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
    public class GetMeetingCancellation : Tests.BaseTestFixture
    {

        ZimbraAccount organizer = new ZimbraAccount().provision().authenticate();
        ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();
        
        [Test, Description("Verify meeting cancellation sync to the attendee's device"),
        Property("TestSteps", "1. Send an appointment to attendee on device, 2. Sync to device of the attendee, 3. Cancel the appointment at organizer's end, 4. Sync to attendee's device and Verify the appointment is deleted from attendee's calendar and cancellation mail is sent to attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeetingCancellation01()
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
            // Organizer cancels the meeting 
            String cancelSubject = "Cancelled: " + subject;

            XmlDocument CancelAppointmentResponse = organizer.soapSend(
                @"<CancelAppointmentRequest  id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m>
                      <e a='" + TestAccount.EmailAddress + @"' t='t'/>        
                      <su>" + cancelSubject + @"</su>
                      <mp ct='text/plain'>
                            <content>" + content + @"</content>
                      </mp>
                    </m>
                </CancelAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + cancelSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting cancellation is received in Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting cancellation received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting cancellation received by attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting cancellation received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting cancellation received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Canceled", "Verify the Message class field is correct in meeting cancellation received by attendee");

            org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting cancellation received by attendee");

            // Send the SyncRequest for Calendar folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Delete/> elements

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response i.e. Cancelled event is deleted from attendee's calendar on device");

            #endregion

        }

        [Test, Description("Verify meeting cancellation sync to the attendee's device - scenario Organizer removes attendee"),
        Property("TestSteps", "1. Send an appointment to attendee on device, 2. Sync to device of the attendee, 3. Remove the attendee from invitees at organizer's end, 4. Sync to attendee's device and Verify the appointment is deleted from attendee's calendar and appropriate mail is sent to attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void GetMeetingCancellation02()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();

            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <at a='" + attendee1.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <e a='" + attendee1.EmailAddress + @"' t='t'/>
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
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct (Device user) in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, attendee1.EmailAddress, "Verify the To field is correct (Another attendee) in meeting invite received by attendee");      
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting invite received by attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Request", "Verify the Message class field is correct in meeting invite received by attendee");

            String org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting invite received by attendee");

            #endregion


            #region TEST ACTION

            // Organizer removes device user from attendee list 
            String cancelSubject = "Cancelled: " + subject;
            String newContent = content + "\nRemoved " + TestAccount.EmailAddress + " from the attendee list";

            XmlDocument ModifyAppointmentResponse = organizer.soapSend(
                @"<ModifyAppointmentRequest  id='" + invId + @"' xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + attendee1.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + attendee1 + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + newContent + @"</content>
                        </mp>
                    </m>     
                </ModifyAppointmentRequest>");

            #endregion


            #region TEST VERIFICATION

            String removedAttendeeContent = "You have been removed from the attendee list by the organizer.";

            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + cancelSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Meeting cancellation is received in Removed Attendee's Inbox");

            ZAssert.XmlXpathMatch(Add, "//email:From", null, organizer.EmailAddress, "Verify the From field is correct in meeting cancellation received by Removed attendee");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct in meeting cancellation received by Removed attendee");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, removedAttendeeContent, "Verify the content field is correct in meeting cancellation received by Removed attendee");
            ZAssert.XmlXpathMatch(Add, "//email:ContentClass", null, "urn:content-classes:calendarmessage", "Verify the Content class field is correct in meeting cancellation received by Removed attendee");
            ZAssert.XmlXpathMatch(Add, "//email:MessageClass", null, "IPM.Schedule.Meeting.Canceled", "Verify the Message class field is correct in meeting cancellation received by Removed attendee");

            org = Add.SelectSingleNode("//email:Organizer", ZAssert.NamespaceManager).InnerText;
            ZAssert.StringContains(org, organizer.EmailAddress, "Verify that organizer email address is correct in meeting cancellation received by Removed attendee");

            // Send the SyncRequest for Calendar folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
            
            // Get the matching <Delete/> elements

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response i.e. Cancelled event is deleted from Removed attendee's calendar on device");

            #endregion

        }

    }
}

