using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Calendar 
{
    public class RecurringTests : BaseTestFixture
    {
        public RecurringTests()
        {
            this.PstFilename = "/general/calendar/pstimport2_calendar.pst";
        }

        [Test, Description("Import a PST file having recurring appointment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported appointment",
            "5. Check the appointment content: organizer, subject, body, reminder, series start/end dates, recurrence pattern")]
        public void TC1_RecurringAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_RecurringAppointment");

            #region Test Case variables

            string apptSubject = "RecurringAppointment_weekly";
            string apptContent = "RecurringAppointment Occurs Weekly - every wednesday from Sep 5, end after 3 occurrences, 4 pm to 4:30 pm";
            string organizer = "pstimport2@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2016, 1, 6, 16, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 6, 16, 30, 0);
            string frequency = "WEE";
            string occurrences = "3";
            string interval = "1";
            string day = "WE";
            string defaultReminderMins = "15"; 
            string appointmentId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + apptSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day, null, 1);    

            #endregion
        }

        [Test, Description("Import a PST file having recurring meeting")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, attendee, subject, body, reminder, series start/end dates, recurrence pattern")]
        public void TC2_RecurringMeeting()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_RecurringMeeting");

            #region Test Case variables

            string apptSubject = "RecurringMeeting_Weekly";
            string apptContent = "Recurring meeting, occurs weekly - starts 5 Sep 5 pm to 5:30 pm, ends after 2 occurrences";
            string organizer = "pstimport2@exchange2010.lab";
            string attendee = "pstimport1@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2016, 1, 6, 17, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 6, 17, 30, 0);
            string frequency = "WEE";
            string occurrences = "2";
            string interval = "1";
            string day = "WE";
            string defaultReminderMins = "15";
            string appointmentId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + apptSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "a", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day, null, 1);

            #endregion
        }

        [Test, Description("Import a PST file having recurring meeting containing two exceptions - 2nd occurrence time changed")] 
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, attendee, subject, body, reminder, series start/end dates, recurrence pattern")]
        public void TC3_RecurringMeetingWithException1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_RecurringMeetingWithException1");

            #region Test Case variables

            string apptSubject = "Recurring_daily_with_exceptions";
            string apptContent = "Recurring_daily_with_exceptions - Daily starts 5 Sep 6 pm to 6:30 pm - end after 4 occurrences";
            string exApptContent = "Recurring_daily_with_exceptions - Daily starts 5 Sep 6 pm to 6:30 pm - end after 4 occurrences 2nd instance - change time from 6 pm to 7 pm";
            string organizer = "pstimport2@exchange2010.lab";
            string attendee = "pstimport1@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2012, 9, 5, 18, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 9, 5, 18, 30, 0);
            DateTime exStartTimeLocal = new DateTime(2012, 9, 6, 19, 0, 0);
            DateTime exEndTimeLocal = new DateTime(2012, 9, 6, 19, 30, 0);
            string calExpStart = (startTimeLocal.AddDays(-1) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string calExpEnd = (startTimeLocal.AddDays(6) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
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
                + "<query> subject:(" + apptSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1'][1]", "invId", null, out exAppointmentId, 1);
            
            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "a", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);

            // Get the exception of recurring meeting
            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + exAppointmentId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + exAppointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:or", "a", organizer, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at", "a", attendee, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:s", "d", exStartTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:e", "d", exEndTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:fr", null, exApptContent, null, 1); 
            
            #endregion
        }

        [Test, Description("Import a PST file having recurring meeting containing two exceptions - 3rd occurrence - added attendee")] 
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, attendee, subject, body, reminder, series start/end dates, recurrence pattern")]
        public void TC4_RecurringMeetingWithException2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_RecurringMeetingWithException2");

            #region Test Case variables

            string apptSubject = "Recurring_daily_with_exceptions";
            string apptContent = "Recurring_daily_with_exceptions - Daily starts 5 Sep 6 pm to 6:30 pm - end after 4 occurrences";
            string exApptContent = "Recurring_daily_with_exceptions - Daily starts 5 Sep 6 pm to 6:30 pm - end after 4 occurrences Instance3 - Added pstimport3 as required attendee";
            string organizer = "pstimport2@exchange2010.lab";
            string attendee = "pstimport1@exchange2010.lab";
            string attendeeException = "pstimport3@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2012, 9, 5, 18, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 9, 5, 18, 30, 0);
            string calExpStart = (startTimeLocal.AddDays(-1) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string calExpEnd = (startTimeLocal.AddDays(6) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string exAppointmentId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment' calExpandInstStart='" + calExpStart + "' calExpandInstEnd='" + calExpEnd + "'>"
                + "<query> subject:(" + apptSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1'][2]", "invId", null, out exAppointmentId, 1);

            // Get the exception of recurring meeting
            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + exAppointmentId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + exAppointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:or", "a", organizer, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at[1]", "a", attendee, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:at[2]", "a", attendeeException, null, 1); //2nd Attendee match should be equal to added attendee in exception instance
            TargetAccount.selectSOAP(m1, "//mail:fr", null, exApptContent, null, 1); 

            #endregion
        }
    }
}
