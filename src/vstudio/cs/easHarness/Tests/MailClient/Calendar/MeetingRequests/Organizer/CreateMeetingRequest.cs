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

    /*
         * Notes:
         * Some of the scenarios not automated, but should be considered are:
         - Search - Scenario for searching user, resource before adding to invite
     */

    [TestFixture]
    public class CreateMeetingRequests : Tests.BaseTestFixture
    {
        ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();
        ZimbraAccount resLocation = new ZimbraAccount().provisionLocation().authenticate();
        ZimbraAccount resEquipment = new ZimbraAccount().provisionEquipment().authenticate();

        public static String updateICS(String fileName, String method, String uId, String startTime, String endTime, String location, String summary, String description, ZimbraAccount attendee, String attendeeRole, ZimbraAccount organizer, String mtgClass, String mtgStatus)
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
                if (rLine.Contains("LOCATION"))
                {
                    rLine = rLine.Replace("ReplaceLocation", location);
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

        [Test, Description("Send basic meeting request to attendee using device"), //Simple meeting request, no reminder, no location
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to an attendee, 2. Verify the meeting invite is sent to attendee and calendar entry is created at both the organizer's and attendee's calendar")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void CreateMeetingRequest01()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();

            #endregion


            #region TEST ACTION

            // Send the SyncRequest with the new appointment
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>400000</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:OrganizerName>" + TestAccount.UserName + @"</POOMCAL:OrganizerName>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICS.ics";
            String method = "REQUEST";
            String desc = content;
            String status = "CONFIRMED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, ClientId, start, finish, null, subject, desc, attendee1, role, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //Organizer verification
            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the appointment privacy is set correctly i.e. public");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Attendee verification
            
            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting invite is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the appointment privacy is set correctly i.e. public");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");


            #endregion

        }

        [Test, Description("Send meeting request with location and reminder to attendee using device"), //Set reminder and location, check reminder is not applied for attendee
        Property("TestSteps", "1. Send an appointment with location and reminder from an organizer's device to an attendee, 2. Verify the meeting invite is sent to attendee and calendar entry is created at both the organizer's and attendee's calendar correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void CreateMeetingRequest02()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String location = "location" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String reminder = "60";
            

            #endregion


            #region TEST ACTION

            // Send the SyncRequest with the new appointment
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>400000</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:Reminder>" + reminder + @"</POOMCAL:Reminder>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Location>" + location + @"</POOMCAL:Location>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:OrganizerName>" + TestAccount.UserName + @"</POOMCAL:OrganizerName>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICSWithLocation.ics";
            String method = "REQUEST";
            String desc = content;
            String status = "CONFIRMED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, ClientId, start, finish, location, subject, desc, attendee1, role, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //Organizer verification
            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", location, "Verify the location is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");
            
            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");
            
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", reminder, "Verify the appointment reminder is correct i.e. 60 mins for organizer");


            //Attendee verification

            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting invite is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", location, "Verify the location is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");
            //We need to verify that reminder set by organizer (on device) does not apply to attendee
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", "5", "Verify the appointment reminder is correct i.e. 5 mins for attendee");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");


            #endregion

        }

        [Test, Description("Send private meeting request to attendee using device"), //Sensitivity=Private
        Property("TestSteps", "1. Send a private appointment from an organizer's device to an attendee, 2. Verify the meeting invite is sent to attendee and calendar entry is created at both the organizer's and attendee's calendar correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void CreateMeetingRequest03()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();

            #endregion


            #region TEST ACTION

            // Send the SyncRequest with the new appointment
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>400000</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>2</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:OrganizerName>" + TestAccount.UserName + @"</POOMCAL:OrganizerName>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICS.ics";
            String method = "REQUEST";
            String desc = content;
            String status = "CONFIRMED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PRIVATE";

            String icsFileName = updateICS(fileName, method, ClientId, start, finish, null, subject, desc, attendee1, role, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //Organizer verification
            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the appointment privacy is set correctly i.e. private");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Attendee verification

            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting invite is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the appointment privacy is set correctly i.e. private");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");


            #endregion

        }

        [Test, Description("Send All day meeting request to attendee using device"), //All day meeting request
        Property("TestSteps", "1. Send an all day appointment from an organizer's device to an attendee, 2. Verify the meeting invite is sent to attendee and calendar entry is created at both the organizer's and attendee's calendar correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void CreateMeetingRequest04()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            String start = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            
            #endregion


            #region TEST ACTION

            // Send the SyncRequest with the new appointment
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>400000</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>1</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:OrganizerName>" + TestAccount.UserName + @"</POOMCAL:OrganizerName>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>0</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICSAllDay.ics";
            String method = "REQUEST";
            String desc = content;
            String status = "CONFIRMED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";
            String stDate = timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd");
            String eDate = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd");

            String icsFileName = updateICS(fileName, method, ClientId, stDate, eDate, null, subject, desc, attendee1, role, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //Organizer verification
            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the appointment privacy is set correctly i.e. public");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "allDay", "1", "Verify the meeting type is All day");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "F", "Verify the organizer free busy status is Free");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:s", "d", timestamp.AddDays(3).ToUniversalTime().ToString("yyyyMMdd"), "Verify if start date matches");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:e", "d", timestamp.AddDays(3).ToUniversalTime().ToString("yyyyMMdd"), "Verify if end date matches");

            //Attendee verification

            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting invite is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the appointment privacy is set correctly i.e. public");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "allDay", "1", "Verify the meeting type is All day");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "F", "Verify the attendee free busy status is Free");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:s", "d", timestamp.AddDays(3).ToUniversalTime().ToString("yyyyMMdd"), "Verify if start date matches");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:e", "d", timestamp.AddDays(3).ToUniversalTime().ToString("yyyyMMdd"), "Verify if end date matches");



            #endregion

        }

        [Test, Description("Send basic meeting request to optional attendee using device"), //Attendee is optional
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to an optional attendee, 2. Verify the meeting invite is sent to attendee and calendar entry is created at both the organizer's and attendee's calendar correctly")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateMeetingRequest05()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();

            #endregion


            #region TEST ACTION

            // Send the SyncRequest with the new appointment
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>400000</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:OrganizerName>" + TestAccount.UserName + @"</POOMCAL:OrganizerName>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>2</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICS.ics";
            String method = "REQUEST";
            String desc = content;
            String status = "CONFIRMED";
            String role = "OPT-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, ClientId, start, finish, null, subject, desc, attendee1, role, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //Organizer verification
            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "OPT", "Verify the attendee role is Optional");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Attendee verification

            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting invite is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "OPT", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");


            #endregion

        }

        [Test, Description("Send meeting request to resources (location and equipment) using device"), 
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to a location/equipment, 2. Verify the meeting invite is sent to location/equipment and calendar entry is created at both the organizer's and location's calendar correctly")]
	    [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateMeetingRequest06()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();

            
            #endregion


            #region TEST ACTION

            // Send the SyncRequest with the new appointment
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCAL='Calendar'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>400000</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>" + start + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + finish + @"</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Location>" + resLocation.UserName + @"</POOMCAL:Location>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:OrganizerName>" + TestAccount.UserName + @"</POOMCAL:OrganizerName>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + resLocation.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + resLocation.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>3</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + resEquipment.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + resEquipment.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>3</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
                        </POOMCAL:Attendees>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @", " + resLocation.EmailAddress + @", " + resEquipment.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICSWithResources.ics";
            String method = "REQUEST";
            String desc = content;
            String status = "CONFIRMED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, ClientId, start, finish, null, subject, desc, attendee1, role, TestAccount, mClass, status);

            #region Update ICS file for resource info

            String readIcsFile = HarnessProperties.RootFolder + @"/data/" + icsFileName;
            String writeIcsFileName = "test" + HarnessProperties.getUniqueString() + ".ics";
            String writeIcsFile = HarnessProperties.RootFolder + @"/data/" + writeIcsFileName;

            //Modify ICS file
            TextReader rIcs = new StreamReader(readIcsFile);
            TextWriter wIcs = new StreamWriter(writeIcsFile);

            string rLine;
            while ((rLine = rIcs.ReadLine()) != null)
            {
                if (rLine.Contains("ATTENDEE") && rLine.Contains("RESOURCELOC"))
                {
                    rLine = rLine.Replace("RESOURCELOC", "RESOURCE");
                    rLine = rLine.Replace("ReplaceName", resLocation.UserName);
                    rLine = rLine.Replace("ReplaceEmail", resLocation.EmailAddress);
                }
                if (rLine.Contains("ATTENDEE") && rLine.Contains("RESOURCEEQP"))
                {
                    rLine = rLine.Replace("RESOURCEEQP", "RESOURCE");
                    rLine = rLine.Replace("ReplaceName", resEquipment.UserName);
                    rLine = rLine.Replace("ReplaceEmail", resEquipment.EmailAddress);
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            #endregion

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, writeIcsFileName, method);
            
            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received"); 

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            //Organizer verification
            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set (Device does not automatically sets)");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Attendee verification

            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting invite is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the location is not set");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the meeting content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the meeting organizer is set correctly");
            
            //Attendee
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Verify the meeting attendee is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "role", "REQ", "Verify the attendee role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "cutype", "IND", "Verify the attendee calendar user type is Individual");

            //Location
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", "", "Verify the meeting location is not set (Device does not automatically sets)");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", resLocation.EmailAddress, "Verify the meeting location email is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + resLocation.EmailAddress + "']", "role", "NON", "Verify the location role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + resLocation.EmailAddress + "']", "cutype", "RES", "Verify the location calendar user type is Resource");

            //Equipment
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", resEquipment.EmailAddress, "Verify the meeting equipment is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + resEquipment.EmailAddress + "']", "role", "NON", "Verify the equipment role is Required");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + resEquipment.EmailAddress + "']", "cutype", "RES", "Verify the equipment calendar user type is Resource");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            #endregion

        }
    }

}