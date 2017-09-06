using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.Appointments
{
    /**
     * 

<?xml version="1.0" encoding="utf-8"?>
<Sync xmlns="AirSync">
    <Collections>
        <Collection>
            <SyncKey>{05f02c5e-50de-327e-bfd9-8aa2822d220b}5</SyncKey>
            <CollectionId>10</CollectionId>
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
                    <ClientId>db368b3c-3710-444b-9a43-85a353f4395d</ClientId>
                    <ApplicationData>
                        <POOMCAL:Timezone>4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==</POOMCAL:Timezone>
                        <POOMCAL:AllDayEvent>0</POOMCAL:AllDayEvent>
                        <POOMCAL:StartTime>20140516T230000Z</POOMCAL:StartTime>
                        <POOMCAL:EndTime>20140517T000000Z</POOMCAL:EndTime>
                        <POOMCAL:DtStamp>20140514T224433Z</POOMCAL:DtStamp>
                        <POOMCAL:Location>Location</POOMCAL:Location>
                        <POOMCAL:Subject>ccccc</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>Description</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>s4@mu12.corp.zimbra.com</POOMCAL:OrganizerEmail>
                        <POOMCAL:UID>db368b3c-3710-444b-9a43-85a353f4395d</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>

     * 
     **/

    [TestFixture]
    public class CreateAppointment : Tests.BaseTestFixture
    {

        [Test, Description("Verify create basic appointment, sync to server"), //Subject, Content (Plain text), Location, FB as Busy
        Property("TestSteps", "1. Create a basic appointment with Subject, Content (Plain text), Location, FB as Busy on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void CreateAppointment01()
        {

            #region TEST SETUP

            // Set appointment details
 
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String location = "location" + HarnessProperties.getUniqueString();
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
                        <POOMCAL:Location>" + location + @"</POOMCAL:Location>
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject +@")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='"+ invId +@"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "loc", location, "Verify the appointment location is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");
            
            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");


            #endregion


        }

        [Test, Description("Verify create private appointment, sync to server"), //Sensitivity Private
        Property("TestSteps", "1. Create a private appointment on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void CreateAppointment02()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
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
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the appointment privacy is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            #endregion


        }

        [Test, Description("Verify create html content appointment, sync to server"), //Subject, Content (Html text)
        Property("TestSteps", "1. Create a Subject, Content (Html text) appointment on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void CreateAppointment03()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "&lt;html&gt;&lt;body&gt;This has html &lt;b&gt;bold&lt;/b&gt; &lt;i&gt;italics&lt;/i&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentFormatted = "<html><body>This has html <b>bold</b> <i>italics</i> text</body></html>";
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
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>2</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp/mail:descHtml", null, contentFormatted, "Verify the appointment html content is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            #endregion


        }

        [Test, Description("Verify create appointment with FB status as Free, sync to server"), //FB as Free
        Property("TestSteps", "1. Create appointment with FB status as Free on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void CreateAppointment04()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
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
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>0</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "F", "Verify the freebusy status is Free");
            
            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            #endregion


        }

        [Test, Description("Verify create appointment with FB status as Tentative, sync to server"), //FB as Tentative
        Property("TestSteps", "1. Create appointment with FB status as Tentative on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void CreateAppointment05()
        {

            #region TEST SETUP

            // Set appointment details
            //
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
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>1</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "T", "Verify the freebusy status is Tentative");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            #endregion


        }

        [Test, Description("Verify create appointment with FB status as Out Of Office, sync to server"), //FB as OOO
        Property("TestSteps", "1. Create appointment with FB status as Out Of Office on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")] 
        public void CreateAppointment06()
        {

            #region TEST SETUP

            // Set appointment details
            //
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
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>3</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "O", "Verify the freebusy status is Out Of Office");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            #endregion


        }

        [Test, Description("Verify create All day appointment with FB status as Out Of Office, sync to server"), //All day (single), FB as OOO
        Property("TestSteps", "1. Create All day appointment with FB status as Out Of Office on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")] 
        public void CreateAppointment07()
        {

            #region TEST SETUP

            // Set appointment details
            //
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
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>3</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "O", "Verify the freebusy status is Out Of Office");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "allDay", "1", "Verify the appointment is All day");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:s", "d", timestamp.AddDays(3).ToUniversalTime().ToString("yyyyMMdd"), "Verify if start date matches");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:e", "d", timestamp.AddDays(3).ToUniversalTime().ToString("yyyyMMdd"), "Verify if end date matches");

            #endregion


        }

        [Test, Description("Verify create All day appointment spanning two days with FB status as Free, sync to server"), //All day (two days), FB as Free
        Property("TestSteps", "1. Create All day appointment spanning two days with FB status as Free on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")] 
        public void CreateAppointment08()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
            String start = timestamp.AddDays(5).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(7).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

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
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>0</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "F", "Verify the freebusy status is Free");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "allDay", "1", "Verify the appointment is All day");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:s", "d", timestamp.AddDays(5).ToUniversalTime().ToString("yyyyMMdd"), "Verify if start date matches");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:e", "d", timestamp.AddDays(6).ToUniversalTime().ToString("yyyyMMdd"), "Verify if end date matches");

            #endregion


        }

        [Test, Description("Verify create appointment without reminder, sync to server"), //No reminder
        Property("TestSteps", "1. Create appointment without reminder, on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")] 
        public void CreateAppointment09()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(1).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime finishUTC = timestamp.AddDays(1).AddHours(1).ToUniversalTime();

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
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:alarm", 0, "Verify that alarm info is not returned i.e. reminder is not set");

            #endregion


        }

        [Test, Description("Verify create appointment with reminder, sync to server"), //Reminder=30 mins
        Property("TestSteps", "1. Create appointment with reminder on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void CreateAppointment10()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start = timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(1).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String reminder = "30";
            DateTime startUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime finishUTC = timestamp.AddDays(1).AddHours(1).ToUniversalTime();

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
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "m", reminder, "Verify the appointment reminder is set correctly");

            #endregion


        }

        [Test, Description("Verify create appointment with reminder set to 'At time of event', sync to server"), //Reminder=At time of event
        Property("TestSteps", "1. Create appointment with reminder set to 'At time of event' on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")] 
        public void CreateAppointment11()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(1).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String reminder = "0";                                                                                   //Reminder set as "At time of event"
            DateTime startUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime finishUTC = timestamp.AddDays(1).AddHours(1).ToUniversalTime();

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
                        <POOMCAL:Subject>" + subject + @"</POOMCAL:Subject>
                        <POOMCAL:Sensitivity>0</POOMCAL:Sensitivity>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rel", "s", "0", "Verify the appointment reminder is set correctly - set as 'At time of event' "); 

            #endregion


        }

        [Test, Description("Verify create appointment with category , sync to server"), //Category assigned
        Property("TestSteps", "1. Create appointment with category on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")] 
        public void CreateAppointment12()
        {

            #region TEST SETUP

            // Set appointment details
            //
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddDays(1).AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String category = "category" + HarnessProperties.getUniqueString();
            DateTime startUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime finishUTC = timestamp.AddDays(1).AddHours(1).ToUniversalTime();

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
                        <POOMCAL:Categories>
                            <POOMCAL:Category>" + category +@"</POOMCAL:Category>
                        </POOMCAL:Categories>
                        <POOMCAL:OrganizerEmail>" + TestAccount.EmailAddress + @"</POOMCAL:OrganizerEmail>
                        <POOMCAL:UID>" + ClientId + @"</POOMCAL:UID>
                        <POOMCAL:BusyStatus>2</POOMCAL:BusyStatus>
                        <POOMCAL:MeetingStatus>0</POOMCAL:MeetingStatus>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:appt", "tn", category, "Verify the appointment category is set correctly");

            #endregion


        }

        
    }


}
