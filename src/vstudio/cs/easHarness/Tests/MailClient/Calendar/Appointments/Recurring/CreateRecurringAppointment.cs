using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.Appointments.Recurring
{
    
    [TestFixture]
    public class CreateRecurringAppointment : Tests.BaseTestFixture
    {

        /*Note:
         * For Timezone, I have used Mumbai IST in this test suite, because using PST (Los Angeles) was yielding shift of times when start and end dates were falling in DST and non-DST timeframe
         * Mumbai - IST base64 mapping   ==> tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
         * PST LosAngeles base64 mapping ==> 4AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///w==
         * /
       
        /*
         * Element definitions and values
         * Type - Recurrence type, Values: 0 - Daily, 1 - Weekly, 2 - Monthly, 3 - Monthly on nth day, 5 - Yearly, 6 - Yearly on nth day
         * DayOfWeek - Weekday identifier, Values: 1 - Sunday, 2- Monday, 4 - Tuesday, 8 - Wednesday, 16 - Thursday,  32 - Friday, 64 - Saturday, 127 - Last day of month
         *           - specified only when Type = 0, 1, 3 or 6
         *           - is sum of more than values above if appointment recurs on multiple days, Cannot be greater than 127
         * 
         */

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

        [Test, Description("Create recurring appointment repeat Daily (Frequency - Daily, Every 1 Days) with End date as Never, sync to server"), //Recurring Daily (Frequency - Daily, Every 1 Days), End Date as Never
        Property("TestSteps", "1. Create a new daily recurring appointment without end date on device, 2. Sync to server, 3. Verify the appointment is created correctly")]
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment01()
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>0</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                        </POOMCAL:Recurrence>
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
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "DAI", "Verify the appointment recurrs daily");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs daily after 1 days interval");
            
            //Add validation of non presence of End Date/Occurrences, indicating its Never
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:until", 0, "Verify that Soap element for End Date field is not present");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:count", 0, "Verify that Soap element for Number of Occurrences field is not present"); 

            #endregion


        }

        //Recurring Daily - Fixed End Date
        [Test, Description("Create recurring appointment repeat Daily (Frequency - Daily, Every 1 Days) with End date set, sync to server"),
        Property("TestSteps", "1. Create a new daily recurring appointment with end date on device, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Daily (Frequency - Daily, Every 1 Days), End Date specified
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void CreateRecurringAppointment02()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String endDate = timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>0</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:Until>" + endDate + @"</POOMCAL:Until>
                        </POOMCAL:Recurrence>
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

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:inst", 5, "Verify the number of occurrences in recurring series is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 2nd occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[3]", "ridZ", timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 3rd occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[4]", "ridZ", timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 4th occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[5]", "ridZ", timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 5th occurrence date is correct");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "DAI", "Verify the appointment recurrs daily");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs daily after 1 days interval");
            String endDateSoap = TestAccount.soapSelectValue(GetAppointmentResponse, "//mail:rule/mail:until", "d");

            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");

            #endregion

        }

        //Recurring Daily - Fixed number of occurrences
        [Test, Description("Create recurring appointment repeat Daily (Frequency - Daily, Every 1 Days) with number of occurrences set, sync to server"),
        Property("TestSteps", "1. Create a new daily recurring appointment with particular number number of occurances on device, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Daily (Frequency - Daily, Every 1 Days), Number of Occurrences specified
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void CreateRecurringAppointment03()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String numberOfOccurrences = "5";
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>0</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:Occurrences>" + numberOfOccurrences + @"</POOMCAL:Occurrences>                                                  
                        </POOMCAL:Recurrence>
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

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:inst", 5, "Verify the number of occurrences in recurring series is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", timestamp.AddDays(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 2nd occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[3]", "ridZ", timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 3rd occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[4]", "ridZ", timestamp.AddDays(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 4th occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[5]", "ridZ", timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 5th occurrence date is correct");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "DAI", "Verify the appointment recurrs daily");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs daily after 1 days interval");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:count", "num", numberOfOccurrences, "Verify the appointment occurrences count is correct");       
            
            #endregion

        }

        //Recurring Daily Custom (Every 2 Days)
        [Test, Description("Create recurring appointment repeat Custom (Frequency - Daily, Every 2 Days) with number of occurrences set, sync to server"),
        Property("TestSteps", "1. Create a custom appointment on device which recurrs after every 2 days and occurs for particular number number of instances, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Daily (Frequency - Daily, Every 2 Days), Number of Occurrences specified
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment04()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String numberOfOccurrences = "3";
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>0</POOMCAL:Type>
                            <POOMCAL:Interval>2</POOMCAL:Interval>
                            <POOMCAL:Occurrences>" + numberOfOccurrences + @"</POOMCAL:Occurrences>                                                  
                        </POOMCAL:Recurrence>
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

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:inst", 3, "Verify the number of occurrences in recurring series is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 2nd occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[3]", "ridZ", timestamp.AddDays(4).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 3rd occurrence date is correct");
            
            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "DAI", "Verify the appointment recurrs daily");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "2", "Verify the appointment recurrs daily after 2 days interval");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:count", "num", numberOfOccurrences, "Verify the appointment occurrences count is correct");

            #endregion

        }

        //Recurring Weekly - Default (Every 1 Week, on same weekday as appointment creation)  
        [Test, Description("Create recurring appointment repeat Weekly (Frequency - Weekly, Every 1 Weeks) with End date set, sync to server"),
        Property("TestSteps", "1. Create a weekly recurring appointment with end date on device, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Weekly (Frequency - Weekly, Every 1 Weeks), End Date specified
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment05()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String endDate = timestamp.AddDays(14).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>1</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfWeek>" + easDayOfWeek + @"</POOMCAL:DayOfWeek>
                            <POOMCAL:Until>" + endDate + @"</POOMCAL:Until>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(24).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:inst", 3, "Verify the number of occurrences in recurring series is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", timestamp.AddDays(7).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 2nd occurrence date is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[3]", "ridZ", timestamp.AddDays(14).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 3rd occurrence date is correct");
            
            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "WEE", "Verify the appointment recurrs weekly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs weekly after 1 weeks interval");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday", "day", soapDayOfWeek, "Verify that appointment recurrence Week day is correct");
            String endDateSoap = TestAccount.soapSelectValue(GetAppointmentResponse, "//mail:rule/mail:until", "d");
            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");


            #endregion

        }

        //Recurring Weekly - Custom (Every 1 Week, on different weekday as appointment creation)  
        [Test, Description("Create recurring appointment repeat Custom Weekly (Frequency - Weekly, Every 2 Weeks) with End date as Never, sync to server"),
        Property("TestSteps", "1. Create a custom appointment on device which recurrs after every 2 weeks without end date, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Custom Weekly (Frequency - Weekly, Every 1 Weeks), End Date as Never
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment06()
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

            String dayOfWeek = timestamp.AddDays(2).ToString("dddd"); //Adding 2 days so that apppointment does not recur on creation weekday
            String easDayOfWeek = getDayOfWeek(dayOfWeek); 
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();
            
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>1</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfWeek>" + easDayOfWeek + @"</POOMCAL:DayOfWeek>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(40).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct - same as start date");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 2nd occurrence date is correct - same as weekday selected (first week)");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[3]", "ridZ", timestamp.AddDays(9).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 3rd occurrence date is correct- same as weekday selected (second week)");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[4]", "ridZ", timestamp.AddDays(16).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 4th occurrence date is correct- same as weekday selected (third week)");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "WEE", "Verify the appointment recurrs weekly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs weekly after 1 weeks interval");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday", "day", soapDayOfWeek, "Verify that appointment recurrence Week day is correct");
     
            #endregion

        }

        //Recurring Weekly - Custom (Every 1 Week, Monday/Wednesday/Friday)  
        [Test, Description("Create recurring appointment repeat Custom Weekly (Frequency - Weekly, Every 1 Weeks on Monday/Wednesday/Friday) with End date as Never, sync to server"),
        Property("TestSteps", "1. Create a custom appointment on device which recurrs weekly on Monday/Wednesday/Friday without end date, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Custom Weekly (Frequency - Weekly on Mon/Wed/Fri)
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment07()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0);
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>1</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfWeek>42</POOMCAL:DayOfWeek>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(40).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "WEE", "Verify the appointment recurrs weekly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs weekly after 2 weeks interval");

            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday", 3, "Verify that weekday count is equal to 3");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[1]", "day", "MO", "Verify the appointment recurrs weekly on Monday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[2]", "day", "WE", "Verify the appointment recurrs weekly on Wednesday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[3]", "day", "FR", "Verify the appointment recurrs weekly on Friday");

            #endregion

        }

        //Recurring monthly - same date as creation date
        [Test, Description("Create recurring appointment repeat Monthly (Frequency - Monthly (same date as creation), Every 1 Months) with End date as Never, sync to server"),
        Property("TestSteps", "1. Create a monthly recurring appointment without end date on device, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Monthly (Frequency - Monthly, Every 1 Months), End Date as Never
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment08()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0).AddDays(1);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String dayOfMonth = timestamp.Day.ToString();

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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>2</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfMonth>" + dayOfMonth + @"</POOMCAL:DayOfMonth>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(40).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct - same as start date");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", timestamp.AddMonths(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 1st occurrence date is correct - occurs on same date next month");
            
            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "MON", "Verify the appointment recurrs monthly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bymonthday", "modaylist", dayOfMonth, "Verify that appointment recurrence month date is correct");

            #endregion

        }

        //Recurring monthly - recurs after 2 months, recur date different than creation date
        [Test, Description("Create recurring appointment repeat Monthly (Frequency - Monthly (recur date different than create date), Every 2 Months) Ends after 3 occurrences, sync to server"),
        Property("TestSteps", "1. Create a custom appointment on device  which recurrs after every 2 months on different date than created date and ends after 3 occurences, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Monthly (Frequency - Monthly, Every 2 Months), End Date after 3 occurrences
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment09()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0).AddDays(1);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String numberOfOccurrences = "3";

            String dayOfMonth = timestamp.AddDays(2).Day.ToString(); //Adding 2 days, so that apppointment does not recur on creation date

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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>2</POOMCAL:Type>
                            <POOMCAL:Interval>2</POOMCAL:Interval>
                            <POOMCAL:DayOfMonth>" + dayOfMonth + @"</POOMCAL:DayOfMonth>
                            <POOMCAL:Occurrences>" + numberOfOccurrences + @"</POOMCAL:Occurrences>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(120).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:inst", 3, "Verify the number of occurrences in recurring series is correct");          
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct - same as start date");
            //ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", timestamp.AddDays(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 2nd occurrence date is correct - occurs on set date same month");
            //ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[3]", "ridZ", timestamp.AddDays(2).AddMonths(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify 3rd occurrence date is correct - occurs on set date next month");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "MON", "Verify the appointment recurrs monthly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "2", "Verify the appointment recurrs after every 2 month");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:count", "num", numberOfOccurrences, "Verify the appointment has 3 occurrences");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bymonthday", "modaylist", dayOfMonth, "Verify that appointment recurrence month date is correct");

            #endregion

        }

        //Recurring Custom monthly - every third some weekday of month, Fixed end date
        [Test, Description("Create recurring appointment repeat Custom Monthly (Frequency - Monthly, Occurs on every 3rd random weekday, Every 1 Months) Fixed End date, sync to server"),
        Property("TestSteps", "1. Create a custom appointment on device  which recurrs monthly and occurs on every 3rd random weekday with fixed end date, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Custom Monthly (Every X Weekday of month)
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment10()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0).AddDays(1);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String endDate = timestamp.AddMonths(2).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            String dayOfWeek = timestamp.ToString("dddd"); 
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();
            
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>3</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfWeek>" + easDayOfWeek + @"</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>3</POOMCAL:WeekOfMonth>
                            <POOMCAL:Until>" + endDate + @"</POOMCAL:Until>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(90).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the SearchResponse recurrence-id info
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct - same as start date");
            
            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "MON", "Verify the appointment recurrs monthly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday", "ordwk", "3", "Verify that appointment occurs in 3rd week");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday", "day", soapDayOfWeek, "Verify that appointment occurs on correct weekday");

            String endDateSoap = TestAccount.soapSelectValue(GetAppointmentResponse, "//mail:rule/mail:until", "d");

            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");

            #endregion

        }

        //Recurring Custom monthly - every third day of month
        [Test, Description("Create recurring appointment repeat Custom Monthly (Frequency - Monthly, Occurs on 3rd day (Monday to Sunday) , Every 1 Months) End Date Never, sync to server"),
        Property("TestSteps", "1. Create recurring appointment on device repeat Custom Monthly (Frequency - Monthly, Occurs on 3rd day (Monday to Sunday) , Every 1 Months) End Date Never, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Custom Monthly (Every any X day of week )
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment11()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(1);
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>3</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfWeek>127</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>3</POOMCAL:WeekOfMonth>                           
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(90).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "MON", "Verify the appointment recurrs monthly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");
            
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[1]", "day", "SU", "Verify the appointment recurrs weekly on Sunday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[2]", "day", "MO", "Verify the appointment recurrs weekly on Monday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[3]", "day", "TU", "Verify the appointment recurrs weekly on Tuesday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[4]", "day", "WE", "Verify the appointment recurrs weekly on Wednesday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[5]", "day", "TH", "Verify the appointment recurrs weekly on Thursday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[6]", "day", "FR", "Verify the appointment recurrs weekly on Friday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[7]", "day", "SA", "Verify the appointment recurrs weekly on Saturday");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bysetpos", "poslist", "3", "Verify that appointment occurs on 3rd day");

            #endregion

        }

        //Recurring Custom monthly - every third weekday of month
        [Test, Description("Create recurring appointment repeat Custom Monthly (Frequency - Monthly, Occurs on 3rd weekday (Monday to Friday) , Every 1 Months) End Date Never, sync to server"),
        Property("TestSteps", "1.Create recurring appointment on device repeat Custom Monthly (Frequency - Monthly, Occurs on 3rd weekday (Monday to Friday) , Every 1 Months) End Date Never, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Custom Monthly (Every X Weekday(s) of month)
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment12()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 22, 0, 0).AddDays(1);
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>3</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfWeek>62</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>3</POOMCAL:WeekOfMonth>                           
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(90).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "MON", "Verify the appointment recurrs monthly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[1]", "day", "MO", "Verify the appointment recurrs weekly on Monday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[2]", "day", "TU", "Verify the appointment recurrs weekly on Tuesday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[3]", "day", "WE", "Verify the appointment recurrs weekly on Wednesday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[4]", "day", "TH", "Verify the appointment recurrs weekly on Thursday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday/mail:wkday[5]", "day", "FR", "Verify the appointment recurrs weekly on Friday");

            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='SA']", 0, "Verify that recurrence pattern does not has weekend Saturday");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='SU']", 0, "Verify that recurrence pattern does not has weekend Sunday");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bysetpos", "poslist", "3", "Verify that appointment occurs on 3rd weekday");
            
            #endregion

        }

        //Recurring Custom monthly - every third weekend of month
        [Test, Description("Create recurring appointment repeat Custom Monthly (Frequency - Monthly, Occurs on 3rd weekend day (Saturday and Sunday) , Every 1 Months) End Date Never, sync to server"),
        Property("TestSteps", "1.Create recurring appointment on device repeat Custom Monthly (Frequency - Monthly, Occurs on 3rd weekend day (Saturday and Sunday) , Every 1 Months) End Date Never, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Custom Monthly (Every X Weekend(s) of month)
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment13()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 14, 0, 0).AddDays(2);
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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>3</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfWeek>65</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>3</POOMCAL:WeekOfMonth>                           
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(90).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "MON", "Verify the appointment recurrs monthly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");
            
            ZAssert.XmlXpath(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='SA']", "Verify that recurrence pattern has Saturday as one of the weekends");
            ZAssert.XmlXpath(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='SU']", "Verify that recurrence pattern has Sunday as one of the weekends");

            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='MO']", 0, "Verify that recurrence pattern does not has weekday Monday");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='TU']", 0, "Verify that recurrence pattern does not has weekday Tuesday");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='WE']", 0, "Verify that recurrence pattern does not has weekday Wednesday");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='TH']", 0, "Verify that recurrence pattern does not has weekday Thursday");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday[@day='FR']", 0, "Verify that recurrence pattern does not has weekday Friday");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bysetpos", "poslist", "3", "Verify that appointment occurs on 3rd weekend day");
            
            #endregion

        }

        //Recurring yearly - same date/month as creation date
        [Test, Description("Create recurring appointment repeat Yearly (Frequency - Yearly (same date/month as creation), Every 1 Year) with No End date, sync to server"),
        Property("TestSteps", "1.Create recurring appointment on device repeat Yearly (Frequency - Yearly (same date/month as creation), Every 1 Year) with No End date, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Yearly (Frequency - Yearly, Every 1 Year), No End Date
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void CreateRecurringAppointment14()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 16, 0, 0).AddDays(2);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String endDate = timestamp.AddYears(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String dayOfMonth = timestamp.Day.ToString();
            String month = timestamp.Month.ToString();

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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>5</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfMonth>" + dayOfMonth + @"</POOMCAL:DayOfMonth>
                            <POOMCAL:MonthOfYear>" + month + @"</POOMCAL:MonthOfYear>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddYears(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct - same as start date");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", endDate, "Verify 2nd occurrence date is correct - after 1 year");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "YEA", "Verify the appointment recurrs yearly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bymonthday", "modaylist", dayOfMonth, "Verify that appointment recurrence month date is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bymonth", "molist", month, "Verify that appointment recurrence month is correct");

            //Add validation of non presence of End Date/Occurrences, indicating its Never
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:until", 0, "Verify that Soap element for End Date field is not present");
            ZAssert.XmlXpathCount(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:count", 0, "Verify that Soap element for Number of Occurrences field is not present"); 

            #endregion

        }

        //Recurring yearly - same date/month as creation date
        [Test, Description("Create recurring appointment repeat Yearly (Frequency - Yearly (same date/month as creation), Every 1 Year) with Fixed End date, sync to server"),
        Property("TestSteps", "1.Create recurring appointment on device repeat Yearly (Frequency - Yearly (same date/month as creation), Every 1 Year) with Fixed End date, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Yearly (Frequency - Yearly, Every 1 Year), End Date set
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment15()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 18, 0, 0).AddDays(2);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String endDate = timestamp.AddYears(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String dayOfMonth = timestamp.Day.ToString();
            String month = timestamp.Month.ToString();

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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>5</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:DayOfMonth>" + dayOfMonth + @"</POOMCAL:DayOfMonth>
                            <POOMCAL:MonthOfYear>" + month + @"</POOMCAL:MonthOfYear>
                            <POOMCAL:Until>" + endDate + @"</POOMCAL:Until>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddYears(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:inst", 2, "Verify the number of occurrences in recurring series is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct - same as start date");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[2]", "ridZ", endDate, "Verify 2nd occurrence date is correct - after 1 year");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "YEA", "Verify the appointment recurrs yearly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bymonthday", "modaylist", dayOfMonth, "Verify that appointment recurrence month date is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bymonth", "molist", month, "Verify that appointment recurrence month is correct");

            String endDateSoap = TestAccount.soapSelectValue(GetAppointmentResponse, "//mail:rule/mail:until", "d");
            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");

            #endregion

        }

        //Recurring yearly - Custom recurrs on 3rd Wednesday of next month
        [Test, Description("Create recurring appointment repeat Custom Yearly (Frequency - Yearly (Recurrence on next month 3rd Wednesday), Every 1 Year) with Fixed Occurrences, sync to server"),
        Property("TestSteps", "1.Create recurring appointment on device repeat Custom Yearly (Frequency - Yearly (Recurrence on next month 3rd Wednesday), Every 1 Year) with Fixed Occurrences, 2. Sync to server, 3. Verify the appointment is created correctly")] //Recurring Custom Yearly (Frequency - Yearly, 3rd week Wed of next month, Every 1 Year), Fixed Occurrences
        [Category("Functional")]
        [Category("Calendar")]
        [Category("L2")]
        public void CreateRecurringAppointment16()
        {

            #region TEST SETUP

            // Set appointment details

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 20, 0, 0).AddDays(2);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            DateTime startUTC = timestamp.ToUniversalTime();
            DateTime finishUTC = timestamp.AddHours(1).ToUniversalTime();
            String numberOfOccurrences = "3";

            String month = timestamp.AddMonths(1).Month.ToString();

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
                        <POOMCAL:TimeZone>tv7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==</POOMCAL:TimeZone>
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
                        <POOMCAL:Recurrence>
                            <POOMCAL:Type>6</POOMCAL:Type>
                            <POOMCAL:Interval>1</POOMCAL:Interval>
                            <POOMCAL:Occurrences>" + numberOfOccurrences + @"</POOMCAL:Occurrences>
                            <POOMCAL:DayOfWeek>8</POOMCAL:DayOfWeek>
                            <POOMCAL:WeekOfMonth>3</POOMCAL:WeekOfMonth>
                            <POOMCAL:MonthOfYear>" + month + @"</POOMCAL:MonthOfYear>
                        </POOMCAL:Recurrence>
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

            String expandStart = System.Convert.ToString(timestamp.AddDays(-2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddYears(2).AddMonths(2).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:appt", "invId");

            //Check the number of occurrences are correct in SearchResponse and also recurrence-id info
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:inst", 3, "Verify the number of occurrences in recurring series is correct");
            ZAssert.XmlXpathMatch(SearchResponse.DocumentElement, "//mail:inst[1]", "ridZ", start, "Verify 1st occurrence date is correct - same as start date");

            XmlDocument GetAppointmentResponse = TestAccount.soapSend(@"<GetAppointmentRequest  xmlns='urn:zimbraMail' id='" + invId + @"'/>");

            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the appointment subject is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:desc", null, content, "Verify the appointment content is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:or", "a", TestAccount.EmailAddress, "Verify the appointment organizer is set correctly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:comp", "fb", "B", "Verify the freebusy status is Busy");

            DateTime soapStartUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:s");
            ZAssert.AreEqual(startUTC, soapStartUTC, "Verify that the appointment start time (UTC format) is correct");

            DateTime soapEndUTC = ZAssert.toUTC(GetAppointmentResponse, "//mail:e");
            ZAssert.AreEqual(finishUTC, soapEndUTC, "Verify that the appointment end time (UTC format) is correct");

            //Verify Recurrence Pattern
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:recur/mail:add/mail:rule", "freq", "YEA", "Verify the appointment recurrs yearly");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:interval", "ival", "1", "Verify the appointment recurrs after every 1 month");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:count", "num", numberOfOccurrences, "Verify the appointment number of occurrences is correct");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bysetpos", "poslist", "3", "Verify that appointment occurs in 3rd week");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:byday//mail:wkday", "day", "WE", "Verify that appointment occurs on Wednesday");
            ZAssert.XmlXpathMatch(GetAppointmentResponse.DocumentElement, "//mail:rule/mail:bymonth", "molist", month, "Verify that appointment recurrence month is correct");

            #endregion

        }
        
    }

}
