using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;
using System.IO;

namespace Tests.MailClient.Calendar.MeetingRequests.Organizer
{

    [TestFixture]
    public class CancelMeetingRequest : Tests.BaseTestFixture
    {

        ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();
        ZimbraAccount attendee2 = new ZimbraAccount().provision().authenticate();
        
        public static String updateICS(String fileName, String method, String uId, String startTime, String endTime, String summary, String description, ZimbraAccount attendee, String attendeeRole, ZimbraAccount organizer, String mtgClass, String mtgStatus)
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
                    rLine = rLine.Replace("ReplaceName", organizer.UserName);
                    rLine = rLine.Replace("ReplaceEmail", organizer.EmailAddress);
                }
                if (rLine.Contains("ATTENDEE") && rLine.Contains("ReplaceRole"))
                {
                    rLine = rLine.Replace("ReplaceRole", attendeeRole);
                    rLine = rLine.Replace("ReplaceName", attendee.UserName);
                    rLine = rLine.Replace("ReplaceEmail", attendee.EmailAddress);
                }
                if (rLine.Contains("CLASS"))
                {
                    rLine = rLine.Replace("ReplaceClass", mtgClass);
                }
                if (rLine.Contains("STATUS"))
                {
                    rLine = rLine.Replace("ReplaceStatus", mtgStatus);
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            #endregion

            return writeIcsFileName;
        }

        [Test, Description("Cancel meeting by organizer using device"),
        Property("TestSteps", "1. Send an appointment from an organizer with device to an attendee, 2. Sync to organizer's device, 3. Cancel the meeting from Organizer's device, 4. Verify the meeting is deleted from organizer's calendar and a cancellation mail is sent to attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void CancelMeetingRequest01()
        {

            #region TEST SETUP


            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
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

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            
            // Send the SyncRequest to get the appointment

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new appointment

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;


            #endregion


            #region TEST ACTION

            // Cancel meeting
           
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
            <WindowSize>25</WindowSize>
            <Options>
                <FilterType>5</FilterType>
                <MIMETruncation>8</MIMETruncation>
            </Options>
            <Commands>
                <Delete>
                    <ServerId>" + ServerId + @"</ServerId>
                </Delete>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + "Cancelled: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICS.ics";
            String method = "CANCEL";
            String desc = content;
            String status = "CANCELLED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, UID, start, finish, subject, desc, attendee1, role, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION
            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //**Organizer verification**
            XmlDocument SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:appt", 0, "Organizer- Verify the appointment is deleted and hence does not exists in the calendar");

            //Search in Trash folder
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.trash.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:appt", 1, "Organizer- Verify the appointment is deleted and hence exists in the Trash");

            //**Attendee verification**

            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + @"Cancelled" + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting cancellation is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            String attendee1invId = attendee1.soapSelectValue(SearchResponse, "//mail:m", "id");

            XmlDocument GetMsgResponse = attendee1.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + attendee1invId + @"'/>
			        </GetMsgRequest>");
            m = attendee1.soapSelect(GetMsgResponse, "//mail:m");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Attendee- Verify the Invitees value is correct i.e. should be attendee1");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:appt", 0, "Attendee- Verify the appointment is deleted and hence does not exists in the calendar");

            //Search in Trash folder
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.trash.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:appt", 1, "Organizer- Verify the appointment is deleted and hence exists in the Trash");


            #endregion

        }

        [Test, Description("Cancel meeting using device - Edit meeting and remove one attendee"),
        Property("TestSteps", "1. Send an appointment from an organizer with device to two different attendees, 2. Sync to organizer's device, 3. Edit the meeting and remove one attendee from the meeting using Organizer's device, 4. Verify the meeting update notification is sent to one and cancellation to other attendee")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")]
        public void CancelMeetingRequest02()
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

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <at a='" + attendee1.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <at a='" + attendee2.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
					    <e a='" + attendee1.EmailAddress + @"' t='t'/>
                        <e a='" + attendee2.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");

            // Send the SyncRequest to get the appointment

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new appointment

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            String UID = Add.SelectSingleNode("//Calendar:UID", ZAssert.NamespaceManager).InnerText;


            #endregion


            #region TEST ACTION

            // Modify the appointment - add new attendee
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            String newContent = "content" + HarnessProperties.getUniqueString();      

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
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Subject>" + newSubject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + newContent + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee2.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee2.EmailAddress + @"</POOMCAL:Email>
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

            //2 SendMail commands would be sent by device: 1 for Cancellation, 2 for Update

            //SendMail 1
            String mimeText =
            @"Subject: " + "Cancelled: " + newSubject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICS.ics";
            String method = "CANCEL";
            String status = "CANCELLED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, UID, start, finish, newSubject, newContent, attendee1, role, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, newContent, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            //SendMail 2
            mimeText =
            @"Subject: " + newSubject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee2.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            method = "REQUEST";
            status = "CONFIRMED";

            icsFileName = updateICS(fileName, method, UID, start, finish, newSubject, newContent, attendee2, role, TestAccount, mClass, status);

            // Create SendMail request
            request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, newContent, icsFileName, method);

            response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION
            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //Organizer verification

            GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Organizer verification- Verify the meeting subject is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, newContent, "Organizer verification- Verify the meeting content is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Organizer verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee2.EmailAddress + "']", "d", attendee2.UserName, "Organizer verification- Verify the attendee2 exists");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "mail:at[@a='" + attendee1.EmailAddress + "']", 0, "Organizer verification- Verify that removed attendee (attendee1) is no more listed in attendees list");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Organizer verification- Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Organizer verification- Verify that the meeting end time (UTC format) is correct");

            //Attendee2 verification

            //Meeting invite in Inbox
            XmlDocument SearchResponse = attendee2.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + newSubject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee2.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting update is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee2.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + newSubject + @")</query>
                </SearchRequest>");

            invId = attendee2.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee2.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Attendee2 verification- Verify the meeting subject is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, newContent, "Attendee2 verification- Verify the meeting content is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Attendee2 verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee2.EmailAddress + "']", "d", attendee2.UserName, "Attendee2 verification- Verify the attendee2 details");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "mail:at[@a='" + attendee1.EmailAddress + "']", 0, "Attendee2 verification- Verify that removed attendee (attendee1) is no more listed in attendees list");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Attendee2 verification- Verify that the meeting start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Attendee2 verification- Verify that the meeting end time (UTC format) is correct");

            //Attendee1 (Removed Attendee) verification
            
            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:appt", 0, "Attendee1- Verify the appointment is deleted and hence does not exists in the calendar");
            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + @"Cancelled" + @")</query>
			        </SearchRequest>");
            m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting cancellation is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            String attendee1invId = attendee1.soapSelectValue(SearchResponse, "//mail:m", "id");

            XmlDocument GetMsgResponse = attendee1.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + attendee1invId + @"'/>
			        </GetMsgRequest>");
            m = attendee1.soapSelect(GetMsgResponse, "//mail:m");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Removed attendee verification- Verify the Invitees value is correct i.e. should be attendee1");

            
            #endregion

        }
    }

}
