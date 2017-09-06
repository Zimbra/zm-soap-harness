using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Calendar
{
    public class AppointmentExceptions : BaseTestFixture
    {
        private string Organizer;

        public AppointmentExceptions()
        {
            this.PstFilename = "/general/calendar/appt_exceptions.pst";
            Organizer = TargetAccount.emailAddress;
        }

        [Test, Description("Verify a pst having daily recurring appointment with 2nd occurrence as exception (appointment time and content modified) is migrated correctly")]
        public void TC1_RecAppt_Daily_2ndInstanceTimeContentModified()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_RecAppt_Daily_2ndInstanceTimeContentModified");

            #region Test Case variables

            string apptSubject = "appt9";
            string apptContent = "Content9 Recurring – ends after 3 occurrence";
            string exApptContent = "Content9 Recurring – ends after 3 occurrence Exception to recurring appointment. Timing changed to 3pm – 3.30pm";
            DateTime startTimeLocal = new DateTime(2012, 3, 12, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 12, 10, 30, 0);
            DateTime exStartTimeLocal = new DateTime(2012, 3, 13, 15, 0, 0);
            DateTime exEndTimeLocal = new DateTime(2012, 3, 13, 15, 30, 0);
            string calExpStart = (startTimeLocal.AddDays(-1) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string calExpEnd = (startTimeLocal.AddDays(4) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string frequency = "DAI";
            string occurrences = "3";
            string interval = "1";
            string defaultReminderMins = "15";
            string location = "location9";
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
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out exAppointmentId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1); --Incoorect organizer value due to bug#81502
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
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
            //TargetAccount.selectSOAP(m1, "//mail:or", "a", Organizer, null, 1); --Incoorect organizer value due to bug#81502
            TargetAccount.selectSOAP(m1, "//mail:s", "d", exStartTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:e", "d", exEndTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:fr", null, exApptContent, null, 1); 

            #endregion

        }

        [Test, Description("Verify a pst having weekly recurring appointment with 1st occurrence as exception (appointment duration and content modified) is migrated correctly")]
        public void TC2_RecAppt_Weekly_1stInstanceDurationContentModified()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_RecAppt_Weekly_1stInstanceDurationContentModified");

            #region Test Case variables

            string apptSubject = "appt10";
            string apptContent = "Content10 Recurring weekly. Reminder 30mins.";
            string exApptContent = "Content10 Recurring weekly. Exception. Meeting time is now 1 hr.";
            DateTime startTimeLocal = new DateTime(2012, 3, 19, 12, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 19, 12, 30, 0);
            DateTime exStartTimeLocal = new DateTime(2012, 3, 19, 12, 0, 0);
            DateTime exEndTimeLocal = new DateTime(2012, 3, 19, 13, 0, 0);
            string calExpStart = (startTimeLocal.AddDays(-1) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string calExpEnd = (startTimeLocal.AddDays(2) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string frequency = "WEE";
            string occurrences = "17";
            string weekDay = "MO";
            string interval = "1";
            string reminderMins = "30";
            string location = "location10";
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
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out exAppointmentId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1); --Incoorect organizer value due to bug#81502
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", reminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:byday/mail:wkday", "day", weekDay, null, 1);

            // Get the exception of recurring meeting
            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + exAppointmentId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + exAppointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:s", "d", exStartTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:e", "d", exEndTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m1, "//mail:fr", null, exApptContent, null, 1);

            #endregion

        }

    }

}
