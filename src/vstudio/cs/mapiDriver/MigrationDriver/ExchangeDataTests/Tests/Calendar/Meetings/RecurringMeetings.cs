using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Calendar
{
    public class RecurringMeetings : BaseTestFixture
    {
        private string DefaultDomain;
        private string Organizer;

        public RecurringMeetings()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            Organizer = "zma1";
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Verify a monthly recurring meeting happening every 22th day of month  is migrated correctly")]
        public void TC1_MeetingRecMonthly()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_MeetingRecMonthly");

            #region Test Case variables
            string mtgSubject = "meeting4";
            string mtgContent = "Content4 Recurring monthly – 3 occurrences";
            DateTime startTimeLocal = new DateTime(2012, 5, 22, 11, 30, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 22, 12, 0, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string appointmentVisibility = "PUB"; //public appointment
            string location = "location4";
            string frequency = "MON";
            string occurenceDate = "22";
            string occurrences = "3";
            string interval = "1";
            string appointmentId = null;
            
            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + mtgSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            
            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); 
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "AC", null, 1); //attendee participation status is AC - Accept
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonthday", "modaylist", occurenceDate, null, 1); //which day of month

            #endregion

        }

        [Test, Description("Verify a daily recurring meeting with 1st occurrence as exception (time and content modified) is migrated correctly")]
        public void TC2_MeetingRecDailyWith1stOccurrenceAsException()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_MeetingRecDailyWith1stOccurrenceAsException");

            #region Test Case variables
            string mtgSubject = "meeting5";
            string mtgContent = "Content5 Daily recurring ends after 5 occurrence";
            string exmtgContent = "Content5 Daily recurring ends after 5 occurrence Exception meeting. Timing is moved to 11am – 11.30am";
            DateTime startTimeLocal = new DateTime(2012, 5, 28, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 28, 10, 30, 0);
            DateTime exStartTimeLocal = new DateTime(2012, 5, 28, 11, 0, 0);
            DateTime exEndTimeLocal = new DateTime(2012, 5, 28, 11, 30, 0);
            string calExpStart = (startTimeLocal.AddDays(-1) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string calExpEnd = (startTimeLocal.AddDays(6) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string location = "location5";
            string frequency = "DAI";
            string occurrences = "5";
            string interval = "1";
            string appointmentId = null;
            string exAppointmentId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment' calExpandInstStart='" + calExpStart + "' calExpandInstEnd='" + calExpEnd + "'>"
                + "<query> subject:(" + mtgSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out exAppointmentId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); 
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "AC", null, 1); //attendee participation status is AC - Accept
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);

            // Get the exception of recurring meeting
            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + exAppointmentId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + exAppointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:s", "d", exStartTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:e", "d", exEndTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:fr", null, exmtgContent, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at", "ptst", "NE", null, 1); //attendee has not responded to exception instance

            #endregion

        }

        [Test, Description("Verify a yearly recurring meeting with 1st occurrence as exception (attachment added) is migrated correctly")]
        [Bug("77744")]
        public void TC3_MeetingRecYearlyWith1stOccurrenceAsException()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_MeetingRecYearlyWith1stOccurrenceAsException");

            #region Test Case variables
            string mtgSubject = "meeting7";
            string mtgContent = "Content7 Recurring yearly ends after 2 occurrence. With word attachment";
            string exmtgContent = "Content7 Recurring yearly ends after 2 occurrence. With word attachment <<MigrationTool CommandLine Interface.docx>>";
            DateTime startTimeLocal = new DateTime(2012, 5, 28, 14, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 28, 14, 30, 0);
            DateTime exStartTimeLocal = new DateTime(2012, 5, 28, 14, 0, 0);
            DateTime exEndTimeLocal = new DateTime(2012, 5, 28, 14, 30, 0);
            string calExpStart = (startTimeLocal.AddDays(-1) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string calExpEnd = (startTimeLocal.AddDays(2) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string location = "location7";
            string frequency = "YEA";
            string monthDay = "28";
            string monthNumber = "5";
            string occurrences = "2";
            string interval = "1";
            string appointmentId = null;
            string exAppointmentId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment' calExpandInstStart='" + calExpStart + "' calExpandInstEnd='" + calExpEnd + "'>"
                + "<query> subject:(" + mtgSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out exAppointmentId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); 
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee not responded to meeting series
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonthday", "modaylist", monthDay, null, 1); //which day of month
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonth", "molist", monthNumber, null, 1); //which month

            // Get the exception of recurring meeting
            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + exAppointmentId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + exAppointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:s", "d", exStartTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:e", "d", exEndTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:fr", null, exmtgContent, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at", "ptst", "NE", null, 1); //attendee has not responded to exception instance
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "MigrationTool  CommandLine Interface.docx", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", null, 1);
            
            #endregion

        }

        [Test, Description("Verify a weekly recurring meeting with migrated user as attendee is migrated correctly")]
        public void TC4_MeetingRecWeeklyAttendee()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_MeetingRecWeeklyAttendee");

            #region Test Case variables
            string mtgSubject = "meeting12";
            string mtgContent = "Content12 Recurring Meeting invite from ma2 – reminder 1hr Occurs every Monday effective 5/21/2012 until 6/18/2012 from 3:00 PM to 3:30 PM";
            DateTime startTimeLocal = new DateTime(2012, 5, 21, 15, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 21, 15, 30, 0);
            DateTime seriesEndDate = new DateTime(2012, 6, 18, 23, 59, 59); //Its observed that, series end date time in recurring appointment is set to 11:59:59 pm of the end by date
            string organizer = "ma2";
            string attendee = "ma1";
            string attendeeRole = "REQ";
            string location = "location12";
            string frequency = "WEE";
            string weekDay = "MO";
            string interval = "1";
            string appointmentId = null;
            
            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + mtgSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            
            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "d", organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); 
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "T", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:byday/mail:wkday", "day", weekDay, null, 1); //which day of week

            SoapTest soapTest = new SoapTest();
            DateTime soapUTCEndDate = soapTest.toUTC(m, "//mail:until");

            ZAssert.AreEqual(seriesEndDate.ToUniversalTime(), soapUTCEndDate, "Verify that the series end date (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify a daily recurring meeting having two exceptions: 2nd occurrence cancelled and 3rd occurrence has new attendee, is migrated correctly")]
        public void TC5_MeetingRecDailyWithTwoExceptions()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_MeetingRecDailyWithTwoExceptions");

            #region Test Case variables
            string mtgSubject = "meeting19";
            string mtgContent = "Content19 Recurring dailt - 4 occurrences Cancel 2nd instance Add ma3 to 3rd instance";
            string exMtgContent = "Adding ma3 to 3rd instance";
            DateTime startTimeLocal = new DateTime(2012, 11, 5, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 11, 5, 11, 0, 0);
            string cancelledOccurenceDate = "20121106T180000Z";
            string calExpStart = (startTimeLocal.AddDays(-1) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string calExpEnd = (startTimeLocal.AddDays(6) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string attendee = "ma2";
            string attendeeException = "ma3";
            string attendeeRole = "REQ";
            string location = "location19";
            string frequency = "DAI";
            string occurrences = "4";
            string interval = "1";
            string appointmentId = null;
            string exAppointmentId = null;
            
            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment' calExpandInstStart='" + calExpStart + "' calExpandInstEnd='" + calExpEnd + "'>"
                + "<query> subject:(" + mtgSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out exAppointmentId, 1);

            //To verify 2nd occurrence was cancelled, we can check two things in searchresponse 
            //1. Number of inst nodes is not equal to 4
            //2. Instance for cancelled occurrence is not returned
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[4]", null, null, null, 0);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ridZ='" + cancelledOccurenceDate + "']", null, null, null, 0);
            
            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); 
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "AC", null, 1); //attendee participation status is AC - Accept
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);

            // Get the exception of recurring meeting
            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + exAppointmentId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + exAppointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at[1]", "a", attendee, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at[2]", "a", attendeeException, null, 1); //2nd Attendee match should be equal to added attendee in exception instance
            TargetAccount.selectSOAP(m1, "//mail:fr", null, exMtgContent, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at[1]", "ptst", "AC", null, 1); //Original attendee has accepted exception instance
            TargetAccount.selectSOAP(m1, "//mail:at[2]", "ptst", "NE", null, 1); //New attendee has not responded to exception instance

            #endregion

        }
    }
}