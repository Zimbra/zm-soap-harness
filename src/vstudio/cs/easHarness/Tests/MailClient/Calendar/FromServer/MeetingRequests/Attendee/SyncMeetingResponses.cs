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
    public class SyncMeetingResponses : Tests.BaseTestFixture
    {
        ZimbraAccount organizer = new ZimbraAccount().provision().authenticate();

        [Test, Description("Verify bug#102936 - 3 meetings, 1st declined, 2nd declined and 3rd accepted from ZWC and sync to the device"),
        Property("TestSteps", "1. Send 3 appointment requests to an attendee, 2. Decline 1st and 2nd invite and accept 3rd invite from attendee's ZWC, 3. Sync to attendee's device, 4. Verify the 3rd invite is added to the attendee's calendar"),
        Property("Bug", 102936)]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void Bug102936()
        {

            #region TEST SETUP

            //Appt1

            String subject1 = "subject" + HarnessProperties.getUniqueString();
            String content1 = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp1 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start1 = timestamp1.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish1 = timestamp1.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject1 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"' d='" + organizer.UserName + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' d='" + TestAccount.UserName + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start1 + @"'/>
                                <e d='" + finish1 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject1 + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' p='" + TestAccount.UserName + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content1 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            //Appt2

            String subject2 = "subject" + HarnessProperties.getUniqueString();
            String content2 = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp2 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start2 = timestamp2.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish2 = timestamp2.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject2 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"' d='" + organizer.UserName + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' d='" + TestAccount.UserName + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start2 + @"'/>
                                <e d='" + finish2 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject2 + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' p='" + TestAccount.UserName + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content2 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            //Appt3

            String subject3 = "subject" + HarnessProperties.getUniqueString();
            String content3 = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp3 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start3 = timestamp3.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish3 = timestamp3.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject3 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"' d='" + organizer.UserName + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' d='" + TestAccount.UserName + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start3 + @"'/>
                                <e d='" + finish3 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject3 + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' p='" + TestAccount.UserName + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content3 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            #endregion


            #region TEST ACTION
            // Attendee responds to the meeting invites using ZWC

            //1 Decline 1st invite
            String expandStart = System.Convert.ToString(timestamp1.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp1.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>" + subject1 + @" inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            String invId1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            TestAccount.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='DECLINE' id='" + invId1 + @"' compNum='" + compNum1 + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + organizer.EmailAddress + @"'/>
					    <su>DECLINE: " + subject1 + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

            //2 Decline 2nd invite
            SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>" + subject2 + @" inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            String invId2 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum2 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            TestAccount.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='DECLINE' id='" + invId2 + @"' compNum='" + compNum2 + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + organizer.EmailAddress + @"'/>
					    <su>DECLINE: " + subject2 + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

            //3 Accept 3rd invite
            SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>" + subject3 + @" inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            String invId3 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum3 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            TestAccount.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='ACCEPT' id='" + invId3 + @"' compNum='" + compNum3 + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + organizer.EmailAddress + @"'/>
					    <su>ACCEPT: " + subject3 + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

            // Send the SyncRequest

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            //Verify there is only 1 Add record and that is for Accepted meeting from ZWC
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns 1 item");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject3 + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content3, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start3, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish3, "Verify the EndTime field is correct");
            
            //Attendee
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "3", "Verify the attendee status is 3 (Accepted)");

            #endregion

        }

        [Test, Description("Verify ZWC accepted meeting syncs to the attendee's device (meeting synced to device prior accept)"),
        Property("TestSteps", "1. Send an appointment to an attendee, 2. Accept  the invite from attendee's ZWC, 3. Sync to attendee's device, 4. Verify the invite is added to the attendee's calendar correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void SyncMeetingResponse_01()
        {

            #region TEST SETUP

            //Appt

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
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

            //Sync to attendee's device

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            #endregion


            #region TEST ACTION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>" + subject + @" inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            String invId1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            TestAccount.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='ACCEPT' id='" + invId1 + @"' compNum='" + compNum1 + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + organizer.EmailAddress + @"'/>
					    <su>ACCEPT: " + subject + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

            // Send the SyncRequest

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements

            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            //Attendee
            Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "3", "Verify the attendee status is 3 (Accepted)");

            #endregion

        }

        [Test, Description("Verify ZWC tentatively accepted meeting syncs to the attendee's device (meeting synced to device prior tentative accept)"),
        Property("TestSteps", "1. Send an appointment to an attendee, 2. Tentatively accept  the invite from attendee's ZWC, 3. Sync to attendee's device, 4. Verify the invite is added to the attendee's calendar correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void SyncMeetingResponse_02()
        {

            #region TEST SETUP

            //Appt

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
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

            //Sync to attendee's device

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            #endregion


            #region TEST ACTION

            // Attendee tentatively accepts meeting invite using ZWC

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>" + subject + @" inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            String invId1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            TestAccount.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='TENTATIVE' id='" + invId1 + @"' compNum='" + compNum1 + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + organizer.EmailAddress + @"'/>
					    <su>TENTATIVE: " + subject + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

            // Send the SyncRequest

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements

            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            //Attendee
            Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "2", "Verify the attendee status is 2 (Tentatively Accepted)");

            #endregion

        }

        [Test, Description("Verify ZWC declined meeting syncs to the attendee's device (meeting synced to device prior decline)"),
        Property("TestSteps", "1. Send an appointment to an attendee, 2. Decline the invite from attendee's ZWC, 3. Sync to attendee's device, 4. Verify the invite is not added to the attendee's calendar")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void SyncMeetingResponse_03()
        {

            #region TEST SETUP

            //Appt

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0);
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

            //Sync to attendee's device

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText; 
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            #endregion


            #region TEST ACTION

            // Attendee accepts meeting invite using ZWC

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>" + subject + @" inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            String invId1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            TestAccount.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='DECLINE' id='" + invId1 + @"' compNum='" + compNum1 + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + organizer.EmailAddress + @"'/>
					    <su>DECLINE: " + subject + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

            // Send the SyncRequest

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Delete/> elements
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Delete/AirSync:ServerId", null, ServerId, "Verify the declined meeting is deleted in Sync response");

            #endregion

        }

        [Test, Description("Verify ZWC tentatively accepted meeting syncs to the attendee's device (meeting *not* synced to device prior tentative accept)"),
        Property("TestSteps", "1. Send an appointment to an attendee, 2. Tentatively accept the invite from attendee's ZWC, 3. Sync to attendee's device, 4. Verify the invite is not added to the attendee's calendar")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void SyncMeetingResponse_04()
        {

            #region TEST SETUP

            //Appt

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0);
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

            // Attendee tentatively accepts meeting invite using ZWC

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>" + subject + @" inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            String invId1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum1 = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            TestAccount.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='TENTATIVE' id='" + invId1 + @"' compNum='" + compNum1 + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + organizer.EmailAddress + @"'/>
					    <su>TENTATIVE: " + subject + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

            // Send the SyncRequest

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Change was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify the content field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:StartTime", null, start, "Verify the StartTime field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:EndTime", null, finish, "Verify the EndTime field is correct");

            //Attendee
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "2", "Verify the attendee status is 2 (Tentatively Accepted)");

            #endregion

        }

    }
}

