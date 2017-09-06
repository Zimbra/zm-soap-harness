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
         
     */

    [TestFixture]
    public class UpdateMeetingRequest : Tests.BaseTestFixture
    {
        ZimbraAccount attendee1 = new ZimbraAccount().provision().authenticate();
        ZimbraAccount attendee2 = new ZimbraAccount().provision().authenticate();
        
        public static String updateICS(String fileName, String method, String uId, String startTime, String endTime, String location, String summary, String description, ZimbraAccount attendee1, String attendee1Role, ZimbraAccount attendee2, String attendee2Role, ZimbraAccount organizer, String mtgClass, String mtgStatus)
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
                    rLine = rLine.Replace("ReplaceRole", attendee1Role);
                    rLine = rLine.Replace("ReplaceName", attendee1.UserName);
                    rLine = rLine.Replace("ReplaceEmail", attendee1.EmailAddress);
                }
                if (rLine.Contains("ATTENDEE") && rLine.Contains("Attendee2Role") && attendee1Role!=null)
                {
                    rLine = rLine.Replace("Attendee2Role", attendee2Role);
                    rLine = rLine.Replace("ReplaceName", attendee2.UserName);
                    rLine = rLine.Replace("ReplaceEmail", attendee2.EmailAddress);
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

        [Test, Description("Update meeting request using device - change subject and content"),
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to an attendee, 2. Change the Subject and content from organizer's device, 3. Verify the calendar entries at both Attendee and organizer are updated correctly and a update notification is sent to attendee")] 
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void UpdateMeetingRequest01()
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

            // Modify the appointment - change subject and content
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
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress +@"</POOMCAL:Email>
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

            String mimeText =
            @"Subject: " + newSubject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICS.ics";
            String method = "REQUEST";
            String desc = newContent;
            String status = "CONFIRMED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, UID, start, finish, null, newSubject, desc, attendee1, role, null, null, TestAccount, mClass, status);

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
            
            GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Organizer verification- Verify the meeting subject is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, newContent, "Organizer verification- Verify the meeting content is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Organizer verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Organizer verification- Verify the meeting attendee is correct");
            
            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Organizer verification- Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Organizer verification- Verify that the meeting end time (UTC format) is correct");

            //Attendee verification

            //Meeting invite in Inbox
            XmlDocument SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + newSubject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting update is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + newSubject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Attendee verification- Verify the meeting subject is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, newContent, "Attendee verification- Verify the meeting content is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Attendee verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Attendee verification- Verify the meeting attendee is correct");
            
            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Attendee verification- Verify that the meeting start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Attendee verification- Verify that the meeting end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Update meeting request using device - change privacy/sensitivity non-private to private"),
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to an attendee, 2. Change the meeting from organizer's device: change privacy/sensitivity non-private to private, 3. Verify the calendar entries at both Attendee and organizer are updated correctly and a update notification is sent to attendee")] 
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void UpdateMeetingRequest02()
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
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the meeting privacy is set correctly i.e. public");

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

            // Modify the appointment - change privacy from normal to private
            String newSubject = "subject" + HarnessProperties.getUniqueString();

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
                        <POOMCAL:Sensitivity>2</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
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
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + newSubject + @"
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

            String icsFileName = updateICS(fileName, method, UID, start, finish, null, newSubject, desc, attendee1, role, null, null, TestAccount, mClass, status);

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

            GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Organizer verification- Verify the meeting subject is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Organizer verification- Verify the meeting content is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Organizer verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Organizer verification- Verify the meeting attendee is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PRI", "Organizer verification- Verify the meeting privacy is correct - changed");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Organizer verification- Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Organizer verification- Verify that the meeting end time (UTC format) is correct");

            //Attendee verification

            //Meeting invite in Inbox
            XmlDocument SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + newSubject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting update is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + newSubject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Attendee verification- Verify the meeting subject is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Attendee verification- Verify the meeting content is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Attendee verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Attendee verification- Verify the meeting attendee is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PRI", "Attendee verification- Verify the meeting privacy is correct - changed");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Attendee verification- Verify that the meeting start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Attendee verification- Verify that the meeting end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Update meeting request using device - change location and reminder"),
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to an attendee, 2. Change the meeting from organizer's device: change location and reminder, 3. Verify the calendar entries at both Attendee and organizer are updated correctly and a update notification is sent to attendee")] 
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void UpdateMeetingRequest03()
        {

            #region TEST SETUP


            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String location = "location" + HarnessProperties.getUniqueString();
            String reminder = "30";

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' loc='" + location + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <at a='" + attendee1.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
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
					    <e a='" + attendee1.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the meeting subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", location, "Verify the meeting location is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", reminder, "Verify the meeting reminder is set correctly");

            //Get Attendee reminder time
            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String attendeeinvId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + attendeeinvId + @"'/>");

            String attendeeReminder = attendee1.soapSelectValue(GetAppointmentResponse, "//mail:rel", "m");
            
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

            // Modify the appointment - change location and reminder
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            String newLocation = "location" + HarnessProperties.getUniqueString();
            String newReminder = "60";

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
                        <POOMCAL:Reminder>" + newReminder + @"</POOMCAL:Reminder>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Location>" + newLocation + @"</POOMCAL:Location>
                        <POOMCAL:Subject>" + newSubject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
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
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + newSubject + @"
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

            String icsFileName = updateICS(fileName, method, UID, start, finish, newLocation, newSubject, desc, attendee1, role, null, null, TestAccount, mClass, status);

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = MimeBuilder.getICSMime(mimeText, desc, icsFileName, method);

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION
            
            //Organizer verification

            GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Organizer verification- Verify the meeting subject is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Organizer verification- Verify the meeting content is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Organizer verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Organizer verification- Verify the meeting attendee is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", newLocation, "Organizer verification- Verify the meeting location is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", newReminder, "Organizer verification- Verify the appointment reminder is correct - changed");
            
            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Organizer verification- Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Organizer verification- Verify that the meeting end time (UTC format) is correct");

            //Attendee verification

            //Meeting invite in Inbox
            SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + newSubject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting update is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            
            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + attendeeinvId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Attendee verification- Verify the meeting subject is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Attendee verification- Verify the meeting content is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Attendee verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Attendee verification- Verify the meeting attendee is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", newLocation, "Attendee verification- Verify the meeting location is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", attendeeReminder, "Attendee verification- Verify the meeting reminder is correct - not updated for attendee");
            
            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Attendee verification- Verify that the meeting start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Attendee verification- Verify that the meeting end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Update meeting request using device - change meeting start/end time"),
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to an attendee, 2. Change the meeting from organizer's device:  change meeting start/end time, 3. Verify the calendar entries at both Attendee and organizer are updated correctly and a update notification is sent to attendee")] 
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void UpdateMeetingRequest04()
        {

            #region TEST SETUP


            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
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

            DateTime soapOrgStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapOrgStartUTC, "Verify that the meeting start time (UTC format) is correct");

            DateTime soapOrgEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapOrgEndUTC, "Verify that the meeting end time (UTC format) is correct");
            
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

            // Modify the appointment - change time (start and end times pushed by 3 hrs)
            String newSubject = "subject" + HarnessProperties.getUniqueString();
            String newStart = timestamp.AddHours(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String newFinish = timestamp.AddHours(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime newStartUTC = timestamp.AddHours(3).ToUniversalTime();
            DateTime newFinishUTC = timestamp.AddHours(4).ToUniversalTime();

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
                        <POOMCAL:StartTime>" + newStart + @"</POOMCAL:StartTime>
                        <POOMCAL:EndTime>" + newFinish + @"</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>" + DateTime.Now.ToString(@"yyyyMMdd\THHmmss\Z") + @"</POOMCAL:DtStamp>
                        <POOMCAL:Subject>" + newSubject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
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
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            String mimeText =
            @"Subject: " + newSubject + @"
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

            String icsFileName = updateICS(fileName, method, UID, newStart, newFinish, null, newSubject, desc, attendee1, role, attendee2, role, TestAccount, mClass, status);

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

            GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Organizer verification- Verify the meeting subject is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Organizer verification- Verify the meeting content is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Organizer verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Organizer verification- Verify the meeting attendee is correct");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(newStartUTC, soapStartUTC, "Organizer verification- Verify that the meeting start time (UTC format) is correct - changed");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(newFinishUTC, soapEndUTC, "Organizer verification- Verify that the meeting end time (UTC format) is correct - changed");

            //Attendee verification

            //Meeting invite in Inbox
            XmlDocument SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + newSubject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting update is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + newSubject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Attendee verification- Verify the meeting subject is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Attendee verification- Verify the meeting content is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Attendee verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at", "a", attendee1.EmailAddress, "Attendee verification- Verify the meeting attendee is correct");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(newStartUTC, soapStartUTC, "Attendee verification- Verify that the meeting start time (UTC format) is correct - changed");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(newFinishUTC, soapEndUTC, "Attendee verification- Verify that the meeting end time (UTC format) is correct - changed");

            #endregion

        }

        [Test, Description("Update meeting request using device - add new attendee"),
        Property("TestSteps", "1. Send a basic appointment from an organizer's device to an attendee, 2. Change the meeting from organizer's device:  add new attendee, 3. Verify the calendar entries at both Attendee and organizer are updated correctly ")] 
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void UpdateMeetingRequest05()
        {

            #region TEST SETUP


            // Add an appointment to the mailbox

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
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
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>1</POOMCAL:MeetingStatus>
                        <POOMCAL:Attendees>
                            <POOMCAL:Attendee>
                                <POOMCAL:Name>" + attendee1.UserName + @"</POOMCAL:Name>
                                <POOMCAL:Email>" + attendee1.EmailAddress + @"</POOMCAL:Email>
                                <POOMCAL:AttendeeType>1</POOMCAL:AttendeeType>
                            </POOMCAL:Attendee>
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

            String mimeText =
            @"Subject: " + newSubject + @"
From: " + TestAccount.EmailAddress + @"
To: " + attendee1.EmailAddress + @"
To: " + attendee2.EmailAddress + @"
Date: Thu, 14 Nov 2015 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "RequestICS-2Attendees.ics";
            String method = "REQUEST";
            String desc = content;
            String status = "CONFIRMED";
            String role = "REQ-PARTICIPANT";
            String mClass = "PUBLIC";

            String icsFileName = updateICS(fileName, method, UID, start, finish, null, newSubject, desc, attendee1, role, attendee2, role, TestAccount, mClass, status);

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
                if (rLine.Contains("ATTENDEE") && rLine.Contains("Attendee2Role"))
                {
                    rLine = rLine.Replace("Attendee2Role", role);
                    rLine = rLine.Replace("ReplaceName", attendee2.UserName);
                    rLine = rLine.Replace("ReplaceEmail", attendee2.EmailAddress);
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            #endregion
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

            GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Organizer verification- Verify the meeting subject is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Organizer verification- Verify the meeting content is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Organizer verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "d", attendee1.UserName, "Organizer verification- Verify the existing attendee1 details");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee2.EmailAddress + "']", "d", attendee2.UserName, "Organizer verification- Verify the new attendee2 details");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Organizer verification- Verify that the meeting start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Organizer verification- Verify that the meeting end time (UTC format) is correct");

            
            //Attendee1 verification

            //Meeting invite in Inbox
            XmlDocument SearchResponse = attendee1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + newSubject + @")</query>
			        </SearchRequest>");
            XmlNode m = attendee1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting update is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee1.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + newSubject + @")</query>
                </SearchRequest>");

            invId = attendee1.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee1.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Attendee verification- Verify the meeting subject is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Attendee verification- Verify the meeting content is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Attendee verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "d", attendee1.UserName, "Attendee1 verification- Verify the existing attendee1 details");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee2.EmailAddress + "']", "d", attendee2.UserName, "Attendee1 verification- Verify the new attendee2 details");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Attendee verification- Verify that the meeting start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Attendee verification- Verify that the meeting end time (UTC format) is correct");

            //Attendee2 verification

            //Meeting invite in Inbox
            SearchResponse = attendee2.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + newSubject + @")</query>
			        </SearchRequest>");
            m = attendee2.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the meeting update is received by the attendee");

            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:c", "f", "v", "Verify the email type is calendar invite i.e. has f=v");

            //Meeting in Calendar
            SearchResponse = attendee2.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + newSubject + @")</query>
                </SearchRequest>");

            invId = attendee2.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            GetAppointmentResponse = attendee2.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", newSubject, "Attendee verification- Verify the meeting subject is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Attendee verification- Verify the meeting content is correct - changed");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Attendee verification- Verify the meeting organizer is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee1.EmailAddress + "']", "d", attendee1.UserName, "Attendee2 verification- Verify the existing attendee1 details");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:at[@a='" + attendee2.EmailAddress + "']", "d", attendee2.UserName, "Attendee2 verification- Verify the new attendee2 details");

            soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Attendee verification- Verify that the meeting start time (UTC format) is correct");

            soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Attendee verification- Verify that the meeting end time (UTC format) is correct");

            #endregion

        }
    }

}