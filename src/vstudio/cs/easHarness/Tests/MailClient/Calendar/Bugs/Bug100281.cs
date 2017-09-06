using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;
using System.IO;

namespace Tests.MailClient.Calendar.Bugs
{
    [TestFixture]
    class Bug100281 : Tests.BaseTestFixture
    {

        ZimbraAccount organizer = new ZimbraAccount().provision().authenticate();

        [Test, Description("Cancel the already synced meeting from server and verify the meeting is deleted from device even after accepting the stale meeting request"),
        Property("TestSteps", "1. Add a calendar meeting request and send to user on device, 2. Cancel meeting request from organiser and send to attendee, 3. Without syncing on device the Cancelled meeting, Accept the same meeting request from device, 4. Sync  and Verify the cancelled calendar item is deleted from device")]
        [Property("Bug", 100281)]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void Bug100281_01()
        {

            #region Add a calendar meeting request and send to user on device.

            String subject_cal = "subject" + HarnessProperties.getUniqueString();
            String content_cal = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = organizer.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject_cal + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + organizer.EmailAddress + @"'/>
                                <at a='" + TestAccount.EmailAddress + @"' role='REQ' ptst='NE' rsvp='1'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject_cal + @"</su>
					    <e a='" + TestAccount.EmailAddress + @"' t='t'/>
                        <mp ct='text/plain'>
                            <content>" + content_cal + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String invId = organizer.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "invId");
                
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Calendar Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject_cal + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify Add contents are correctly returned on device
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerEmail ", null, organizer.EmailAddress, "Verify the Organizer Email field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:OrganizerName ", null, organizer.UserName, "Verify the Organizer Name field is correct");
            ZAssert.XmlXpathMatch(Add, "//calendar:Subject", null, subject_cal, "Verify the Subject field is correct");
            XmlElement Attendee = ZSyncResponse.getMatchingElement(Add, "//calendar:Attendee", "//calendar:Email[text() = '" + TestAccount.EmailAddress + "']");
                    
            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            String UID = Add.SelectSingleNode("//calendar:UID", ZAssert.NamespaceManager).InnerText;
           
            #endregion

            #region Cancel meeting request from organiser and send to attendee

            XmlDocument CancelMeetingResponse = organizer.soapSend(
             @"<CancelAppointmentRequest  id='" + invId + @"' comp='0' xmlns='urn:zimbraMail'>
                    <m>
                      <e a='" + TestAccount.EmailAddress + @"' t='t'/>        
                      <su>" + subject_cal + @"</su>
                      <mp ct='text/plain'>
                            <content>" + content_cal + @"</content>
                      </mp>
                    </m>
                </CancelAppointmentRequest>");

            #endregion

            #region Without syncing on device the Cancelled meeting, Accept the same meeting request from device

            // Send Accept from device Calendar and sync to server
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
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>32768</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCAL:TimeZone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:TimeZone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:Subject>" + subject_cal + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content_cal + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:UID>" + UID + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
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

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Synx to server the change request
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            //Verify delete for the cancelled calendar item was returned
            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Delete, "Verify Delete returned from the server for ServerID:- " + ServerId);

            #endregion

         

        }

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
    }
}
