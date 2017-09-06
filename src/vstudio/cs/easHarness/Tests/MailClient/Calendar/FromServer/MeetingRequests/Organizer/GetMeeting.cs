using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.FromServer.MeetingRequests.Organizer
{
    [TestFixture]
    public class GetMeeting : Tests.BaseTestFixture
    {

        [Test, Description("Verify basic meeting request (as organizer) sync to the device"),
        Property("TestSteps", "1. Send an appointment to 4 attendees with different roles i.e. CHAir, REQuired, OPTional, NON-participant, 2. Sync to organizer device, 3. Verify the invite is added and attendees have correct roles")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void GetMeeting01()
        {



            #region TEST SETUP

            // Add an appointment to the mailbox
            //
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            // role = CHAir, REQuired, OPTional, NON-participant (ie informational)
            // ptst (ParTSTat - participation status) = "NE"eds-action, "TE"ntative, "AC"cept, "DE"clined,
            ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();
            ZimbraAccount attendee2 = new ZimbraAccount().provision().authenticate();
            ZimbraAccount attendee3 = new ZimbraAccount().provision().authenticate();
            ZimbraAccount attendee4 = new ZimbraAccount().provision().authenticate();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <at a='" + attendee1.EmailAddress + @"' role='CHA' ptst='NE' rsvp='1'/>
							    <at a='" + attendee2.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
							    <at a='" + attendee3.EmailAddress + @"' role='OPT' ptst='NE' rsvp='1'/>
							    <at a='" + attendee4.EmailAddress + @"' role='NON' ptst='NE' rsvp='1'/>
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion




            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message

            // Attendee1
            XmlElement Attendee1 = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + attendee1.EmailAddress + "']");
            ZAssert.XmlXpathCount(Attendee1, "//calendar:AttendeeType", 0, "Verify the attendee type is unlisted (Chair)");
            ZAssert.XmlXpathMatch(Attendee1, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            XmlElement Attendee2 = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + attendee2.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee2, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee2, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            XmlElement Attendee3 = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + attendee3.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee3, "//calendar:AttendeeType", null, "2", "Verify the attendee type is 2 (Optional)");
            ZAssert.XmlXpathMatch(Attendee3, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            XmlElement Attendee4 = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + attendee4.EmailAddress + "']");
            ZAssert.XmlXpathCount(Attendee4, "//calendar:AttendeeType", 0, "Verify the attendee type is unlisted (Non-participant)");
            ZAssert.XmlXpathMatch(Attendee4, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");



            #endregion


        }


        //  verb           : ACCEPT, COMPLETED, DECLINE, DELEGATED, TENTATIVE  (Completed/Delegated are NOT supported as of 9/12/2005)
        [TestCase("ACCEPT", "3"), Description("Verify basic meeting request (as organizer): participant status"),
        Property("TestSteps", "1. Send an appointment to an attendee, 2. Respond with Accept/Decline/Tentative, 2. Sync to organizer device, 3. Verify the invite is updated with attendee's response")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        [TestCase("DECLINE", "4")]
        [TestCase("TENTATIVE", "2")]
        public void GetMeeting02(String verb, String attendeeStatus)
        {



            #region TEST SETUP

            // Send a meeting request
            //
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            // role = CHAir, REQuired, OPTional, NON-participant (ie informational)
            // ptst (ParTSTat - participation status) = "NE"eds-action, "TE"ntative, "AC"cept, "DE"clined,
            ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();

            TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <at a='" + attendee1.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + attendee1.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            // Attendee sends response

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @"</query>
                </SearchRequest>");

            XmlNode appt = attendee1.soapSelect(SearchResponse, "//mail:appt");
            String invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");
            String compNum = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "compNum");


            attendee1.soapSend(
                 @"<SendInviteReplyRequest xmlns='urn:zimbraMail' verb='" + verb + @"' id='" + invId + @"' compNum='" + compNum + @"' updateOrganizer='TRUE'>
                    <m rt='r'>
					    <e t='t' a='" + TestAccount.EmailAddress + @"'/>
					    <su>" + subject + @"</su>
					    <mp ct='text/plain'>
						    <content>content" + HarnessProperties.getUniqueString() + @"</content>
					    </mp>
				    </m>
			    </SendInviteReplyRequest>");

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

            // Attendee1
            XmlElement Attendee1 = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + attendee1.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee1, "//calendar:AttendeeStatus", null, attendeeStatus, "Verify the attendee status is correct (3-Accepted, 4-Decline, 2-Tentative, 5-Needs Action)");




            #endregion


        }

    }
}
