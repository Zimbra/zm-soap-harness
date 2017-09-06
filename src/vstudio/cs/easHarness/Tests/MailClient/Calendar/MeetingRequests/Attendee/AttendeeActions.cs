using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;
using System.IO;

namespace Tests.MailClient.Calendar.MeetingRequests.Attendee
{
    [TestFixture]
    public class AttendeeActions : Tests.BaseTestFixture
    {
        ZimbraAccount organizer = new ZimbraAccount().provision().authenticate();

        /*
         * Notes:
         * Some of the scenarios not automated, but should be considered are:
         * 1. Implement MoveItems command
         * After MeetingResponse, device (Nexus) user MoveItems command to move the Inbox invite to Trash
         * <?xml version="1.0" encoding="utf-8"?>
           <Moves xmlns="Move">
             <Move>
               <SrcMsgId>284</SrcMsgId>
               <SrcFldId>2</SrcFldId>
               <DstFldId>3</DstFldId>
             </Move>
           </Moves>
         * 
         * Later on doing sync on Inbox, should return Delete for this item
         * iPhone doesnt send MoveItems command, still next sync on inbox deletes the item.. Is iPhone device sending delete automatically??

         * 2. Have check that, after SendMail with Accept response is sent by attendee, do Sync of "Sent" (folderid=5), Add returns the sent invite
         * 
         * 3. Check behavior on iPhone and see what else commands are used and incorporate accordingly
         * 
         * */

        public static String updateICS(String fileName, String method, String uId, String startTime, String endTime, String summary, String description, ZimbraAccount attendee, String ptst, ZimbraAccount Organizer, String Status)
        {
            String readIcsFile = HarnessProperties.RootFolder + @"/data/" + fileName;
            String writeIcsFileName = "test" + HarnessProperties.getUniqueString() + ".ics";
            String writeIcsFile = HarnessProperties.RootFolder + @"/data/" + writeIcsFileName;

            #region Modify ICS file
            TextReader rIcs = new StreamReader(readIcsFile);
            TextWriter wIcs = new StreamWriter(writeIcsFile);

            string rLine;
            while ((rLine = rIcs.ReadLine()) != null)
            {
                if (rLine.Contains("METHOD"))
                {
                    rLine = rLine.Replace("ReplaceMethod", method);
                }
                if (rLine.Contains("UID"))
                {
                    rLine = rLine.Replace("ReplaceUID", uId);
                }
                if (rLine.Contains("DTSTAMP"))
                {
                    rLine = rLine.Replace("ReplaceTimeStamp", startTime);
                }
                if (rLine.Contains("DTSTART"))
                {
                    rLine = rLine.Replace("ReplaceDateStart", startTime);
                }
                if (rLine.Contains("DTEND"))
                {
                    rLine = rLine.Replace("ReplaceDateEnd", endTime);
                }
                if (rLine.Contains("SUMMARY"))
                {
                    rLine = rLine.Replace("ReplaceMeetingName", summary);
                }
                if (rLine.Contains("DESCRIPTION"))
                {
                    rLine = rLine.Replace("ReplaceMeetingDescription", description);
                }
                if (rLine.Contains("ORGANIZER"))
                {
                    rLine = rLine.Replace("ReplaceName", Organizer.UserName);
                    rLine = rLine.Replace("ReplaceEmail", Organizer.EmailAddress);
                }
                if (rLine.Contains("ATTENDEE"))
                {
                    rLine = rLine.Replace("ReplacePartStat", ptst);
                    rLine = rLine.Replace("ReplaceName", attendee.UserName);
                    rLine = rLine.Replace("ReplaceEmail", attendee.EmailAddress);
                }
                if (rLine.Contains("STATUS"))
                {
                    rLine = rLine.Replace("ReplaceStatus", Status);
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            #endregion

            return writeIcsFileName;
        }

        [Test, Description("Verify Accept action by attendee using device"),
        Property("TestSteps", "1. Send an appointment to an attendee on device, 2. Accept the invite from attendee's device, 3. Verify the response is received at organizer's end and entry is created in attendee's calendar")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void AcceptOnDevice()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
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

            #endregion


            #region TEST ACTION

            // Send the SyncRequest for Calendar folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Get the UID of meeting 
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Get the ServerId for Invite received in Inbox
            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send MeetingResponse request
            ZMeetingResponse meetingResponseReq = new ZMeetingResponse(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<MeetingResponse xmlns='MeetingResponse'>" +
                    "<Request>" +
                        "<UserResponse>1</UserResponse>" +
                        "<CollectionId>2</CollectionId>" +
                        "<RequestId>" + ServerId + "</RequestId>" +
                    "</Request>" +
                "</MeetingResponse>");


            ZMeetingResponse_Resp meetingResponseRes = TestClient.sendRequest(meetingResponseReq) as ZMeetingResponse_Resp;
            ZAssert.IsNotNull(meetingResponseRes, "Verify the MeetingResponse response was received");

            String CalendarId = meetingResponseRes.CalendarId;

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            //Verify that, Server returns Change record with Attendee Accept response to MeetingResponse request initiated on device
            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Attendee status
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "3", "Verify the attendee status is 3 (Accepted)");

            String mimeText =
            @"Subject: Accepted: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + organizer.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "ReplyICS.ics";
            String method = "REPLY";
            String desc = "Accept: " + subject;
            String status = "CONFIRMED";
            String partstat = "ACCEPTED";

            String icsFileName = updateICS(fileName, method, UID, start, finish, subject, desc, TestAccount, partstat, organizer, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION
            //Organizer verification

            XmlDocument SearchResponse = organizer.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>inid:" + HarnessProperties.getString("folder.inbox.id") + @" subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = organizer.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting response is received by the organizer");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:su", null, "Accepted: " + subject, "Verify the Accept meeting response subject matches");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:m", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + TestAccount.EmailAddress + "']", "ptst", "AC", "Verify that attendee participation status is Accepted");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:reply[@at='" + TestAccount.EmailAddress + "']", "ptst", "AC", "Verify that attendee participation status is Accepted in received Replies");

            //Attendee verification
            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:appt", "ptst", "AC", "Verify that attendee participation status is Accepted");

            #endregion

        }

        [Test, Description("Verify Tentative Accept action by attendee using device"),
        Property("TestSteps", "1. Send an appointment to an attendee on device, 2. Tentatively accept the invite from attendee's device, 3. Verify the response is received at organizer's end and entry is created in attendee's calendar")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void TentativeAcceptOnDevice()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox
            
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
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

            #endregion


            #region TEST ACTION

            // Send the SyncRequest for Calendar folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Get the UID of meeting 
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Get the ServerId for Invite received in Inbox
            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send MeetingResponse request
            ZMeetingResponse meetingResponseReq = new ZMeetingResponse(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<MeetingResponse xmlns='MeetingResponse'>" +
                    "<Request>" +
                        "<UserResponse>2</UserResponse>" +
                        "<CollectionId>2</CollectionId>" +
                        "<RequestId>" + ServerId + "</RequestId>" +
                    "</Request>" +
                "</MeetingResponse>");


            ZMeetingResponse_Resp meetingResponseRes = TestClient.sendRequest(meetingResponseReq) as ZMeetingResponse_Resp;
            ZAssert.IsNotNull(meetingResponseRes, "Verify the MeetingResponse response was received");

            String CalendarId = meetingResponseRes.CalendarId;

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            //Verify that, Server returns Change record with Attendee Tentative Accept response to MeetingResponse request initiated on device
            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Attendee status
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Change, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "2", "Verify the attendee status is 2 (Tentative Accepted)");

            String mimeText =
            @"Subject: Tentative: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + organizer.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "ReplyICS.ics";
            String method = "REPLY";
            String desc = "Tentative: " + subject;
            String status = "CONFIRMED";
            String partstat = "TENTATIVE";

            String icsFileName = updateICS(fileName, method, UID, start, finish, subject, desc, TestAccount, partstat, organizer, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION
            //Organizer verification

            XmlDocument SearchResponse = organizer.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>inid:" + HarnessProperties.getString("folder.inbox.id") + @" subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = organizer.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting response is received by the organizer");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:su", null, "Tentative: " + subject, "Verify the Tentative meeting response subject matches");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:m", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + TestAccount.EmailAddress + "']", "ptst", "TE", "Verify that attendee participation status is Tentatively Accepted");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:reply[@at='" + TestAccount.EmailAddress + "']", "ptst", "TE", "Verify that attendee participation status is Tentatively Accepted in received Replies");

            //Attendee verification
            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:appt", "ptst", "TE", "Verify that attendee participation status is Tentatively Accepted");

            #endregion


        }

        [Test, Description("Verify Decline action by attendee using device"),
        Property("TestSteps", "1. Send an appointment to an attendee on device, 2. Decline the invite from attendee's device, 3. Verify the response is received at organizer's end and entry is not created in attendee's calendar")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void DeclineOnDevice()
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

            #endregion


            #region TEST ACTION

            // Send the SyncRequest for Calendar folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Get the UID of meeting 
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;


            // Send the SyncRequest for Inbox folder

            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Inbox Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Get the ServerId for Invite received in Inbox
            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Send MeetingResponse request
            ZMeetingResponse meetingResponseReq = new ZMeetingResponse(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<MeetingResponse xmlns='MeetingResponse'>" +
                    "<Request>" +
                        "<UserResponse>3</UserResponse>" +
                        "<CollectionId>2</CollectionId>" +
                        "<RequestId>" + ServerId + "</RequestId>" +
                    "</Request>" +
                "</MeetingResponse>");

            ZMeetingResponse_Resp meetingResponseRes = TestClient.sendRequest(meetingResponseReq) as ZMeetingResponse_Resp;
            ZAssert.IsNotNull(meetingResponseRes, "Verify the MeetingResponse response was received");

            String CalendarId = meetingResponseRes.CalendarId;

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            //Verify that, Server returns Delete record as response to MeetingResponse request initiated on device
            // Get the matching Delete/> elements
            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + CalendarId + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response for the declined meeting on device");

            String mimeText =
            @"Subject: Declined: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + organizer.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "ReplyICS.ics";
            String method = "REPLY";
            String desc = "Declined: " + subject;
            String status = "CONFIRMED";
            String partstat = "DECLINED";

            String icsFileName = updateICS(fileName, method, UID, start, finish, subject, desc, TestAccount, partstat, organizer, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION
            //Organizer verification

            XmlDocument SearchResponse = organizer.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>inid:" + HarnessProperties.getString("folder.inbox.id") + @" subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = organizer.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting response is received by the organizer");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:su", null, "Declined: " + subject, "Verify the Decline meeting response subject matches");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:m", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            XmlDocument GetAppointmentResponse = organizer.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + TestAccount.EmailAddress + "']", "ptst", "DE", "Verify that attendee participation status is Declined");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:reply[@at='" + TestAccount.EmailAddress + "']", "ptst", "DE", "Verify that attendee participation status is Declined in received Replies");

            //Attendee verification
            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:appt", "ptst", "DE", "Verify that attendee participation status is Declined");
            #endregion


        }

        
        //Change reminder - iPhone Device
        [Test, Description("Verify reminder change by attendee using device"),
        Property("TestSteps", "1. Send an appointment to an attendee on iPhone device, 2. Sync to attendee's device, 3. Change the reminder from attendee's device, 4. Verify the Appointment is saved with updated reminder")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ChangeReminderOnDevice()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String reminder = "15";

            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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

            // Send the SyncRequest for Calendar folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;

            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, "5", "Verify the attendee reminder is correct");
            
            // Attendee Details
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            // Change Reminder to 30 mins
            String newReminder = "30";

            syncRequest = new ZSyncRequest(TestAccount,
    @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <Class>Calendar</Class>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <MIMETruncation>8</MIMETruncation>
            </Options>
            <Commands>
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:Reminder>" + newReminder + @"</POOMCAL:Reminder>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
                        <POOMCAL:MeetingStatus>3</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + TestAccount.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + TestAccount.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
            

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message

            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, newReminder, "Verify the Reminder value is correct");

            //Soap Verification

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", organizer.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", TestAccount.EmailAddress, "Verify the meeting attendee is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the meeting end time (UTC format) is correct");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the meeting privacy is set correctly i.e. public");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the meeting freebusy status is Busy");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", newReminder, "Verify the meeting reminder is modified correctly");         

            #endregion

        }

        //Change FB status - iPhone Device
        [Test, Description("Verify FB change by attendee using device"),
        Property("TestSteps", "1. Send an appointment to an attendee on iPhone device, 2. Sync to attendee's device, 3. Change the Free/Busy status from attendee's device, 4. Verify the Appointment is saved with updated FB status")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ChangeFBStatusOnDevice()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 22, 0, 0);
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

            // Send the SyncRequest for Calendar folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;

            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, "5", "Verify the attendee reminder is correct");

            // Attendee Details
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            // Change BusyStatus to Free
            String newFBStatus = "0";

            syncRequest = new ZSyncRequest(TestAccount,
    @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <Class>Calendar</Class>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <MIMETruncation>8</MIMETruncation>
            </Options>
            <Commands>
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:BusyStatus>" + newFBStatus + @"</POOMCAL:BusyStatus>
                        <POOMCAL:Reminder>5</POOMCAL:Reminder>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
                        <POOMCAL:MeetingStatus>3</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + TestAccount.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + TestAccount.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message

            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, newFBStatus, "Verify the FBStatus  value is correct");

            //Soap Verification

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", organizer.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", TestAccount.EmailAddress, "Verify the meeting attendee is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the meeting end time (UTC format) is correct");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the meeting privacy is set correctly i.e. public");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", "5", "Verify the meeting reminder is set correctly");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "F", "Verify the meeting freebusy status is modified correctly i.e. Free");

            #endregion

        }

        //Change Privacy - iPhone Device
        [Test, Description("Verify Privacy change by attendee using device"),
        Property("TestSteps", "1. Send an appointment to an attendee on iPhone device, 2. Sync to attendee's device, 3. Change the privacy status from attendee's device, 4. Verify the Appointment is saved with updated privacy ")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ChangePrivacyOnDevice()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0).AddDays(1);
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

            // Send the SyncRequest for Calendar folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;

            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, "5", "Verify the attendee reminder is correct");

            // Attendee Details
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            // Change Privacy to Private
            String newSensitivity = "2";

            syncRequest = new ZSyncRequest(TestAccount,
    @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <Class>Calendar</Class>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <MIMETruncation>8</MIMETruncation>
            </Options>
            <Commands>
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:Reminder>5</POOMCAL:Reminder>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>" + newSensitivity + @"</POOMCAL:Sensitivity>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
                        <POOMCAL:MeetingStatus>3</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + TestAccount.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + TestAccount.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message

            ZAssert.XmlXpathMatch(Change, "//calendar:Sensitivity", null, newSensitivity, "Verify the Privacy/Sensitivity  value is correct");

            //Soap Verification

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", organizer.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", TestAccount.EmailAddress, "Verify the meeting attendee is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the meeting end time (UTC format) is correct");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", "5", "Verify the meeting reminder is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the meeting freebusy status is Free");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the meeting privacy is modified correctly i.e. private");
            
            #endregion

        }

        //Change reminder and FB status - Non iPhone Device
        [Test, Description("Verify reminder/FB change by attendee using non-iPhone device"),
        Property("TestSteps", "1. Send an appointment to an attendee with non iPhone device,  2. Sync to attendee's device, 3. Change the privacy status from attendee's device, 4. Verify the Appointment is saved with updated privacy ")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void ChangeReminderFBOnNoniPhoneDevice()
        {

            #region TEST SETUP

            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(1);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String reminder = "15";

            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
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

            // Send the SyncRequest for Calendar folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;
            String Timezone = Add.SelectSingleNode("//Calendar:TimeZone", ZAssert.NamespaceManager).InnerText;
            String DtStamp = Add.SelectSingleNode("//Calendar:DtStamp", ZAssert.NamespaceManager).InnerText;

            ZAssert.XmlXpathMatch(Add, "//calendar:MeetingStatus", null, "3", "Verify the meeting status is Meeting Received");
            ZAssert.XmlXpathMatch(Add, "//calendar:BusyStatus", null, "2", "Verify the FreeBusy status is correct (Busy)");
            ZAssert.XmlXpathMatch(Add, "//calendar:Sensitivity", null, "0", "Verify the Sensitivity/Privacy is set to Public");
            ZAssert.XmlXpathMatch(Add, "//calendar:AllDayEvent", null, "0", "Verify the meeting is not all day");
            ZAssert.XmlXpathMatch(Add, "//calendar:Reminder", null, "5", "Verify the attendee reminder is correct");

            // Attendee Details
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:Name ", null, TestAccount.UserName, "Verify the Attendee Name field is correct");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeType", null, "1", "Verify the attendee type is 1 (Required)");
            ZAssert.XmlXpathMatch(Attendee, "//calendar:AttendeeStatus", null, "5", "Verify the attendee status is 5 (Needs Action)");

            // Change Reminder and FB status
            String newReminder = "30";
            String newFBStatus = "1"; //Tentative

            syncRequest = new ZSyncRequest(TestAccount,
    @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <Class>Calendar</Class>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <MIMETruncation>8</MIMETruncation>
            </Options>
            <Commands>
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>" + Timezone + @"</POOMCAL:TimeZone>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
                        <POOMCAL:DtStamp>" + DtStamp + @"</POOMCAL:DtStamp>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + organizer.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:OrganizerName>" + organizer.UserName + @"</POOMCAL:OrganizerName>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + TestAccount.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + TestAccount.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:BusyStatus>" + newFBStatus + @"</POOMCAL:BusyStatus>
                        <POOMCAL:Reminder>" + newReminder + @"</POOMCAL:Reminder>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>                        
                        <POOMCAL:MeetingStatus>3</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <Change/> element contents match the message

            ZAssert.XmlXpathMatch(Change, "//calendar:Reminder", null, newReminder, "Verify the Reminder value is correct");
            ZAssert.XmlXpathMatch(Change, "//calendar:BusyStatus", null, newFBStatus, "Verify the FBStatus value is correct");

            //Soap Verification

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", organizer.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", TestAccount.EmailAddress, "Verify the meeting attendee is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the meeting end time (UTC format) is correct");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the meeting privacy is set correctly i.e. public");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", newReminder, "Verify the meeting reminder is modified correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "T", "Verify the meeting freebusy status is modified correctly i.e. Tentative");

            #endregion

        }

    }
}

