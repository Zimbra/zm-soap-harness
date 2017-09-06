using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;


namespace NewPSTDataTests.Calendar
{
    public class ReminderAppointments : BaseTestFixture
    {
        private string Organizer;

        public ReminderAppointments()
        {
            this.PstFilename = "/general/calendar/appt_reminder.pst";
            Organizer = TargetAccount.emailAddress;
        }

        [Test, Description("Verify a pst having appointment with no reminder set is migrated correctly")]
        [Bug("77428")]
        public void TC1_AppointmentWithNoReminder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_AppointmentWithNoReminder");

            #region Test Case variables
            string apptSubject = "subject134572656310";
            string apptContent = "Content134572656310 Appointment in future date and with no reminder set";
            DateTime startTimeLocal = new DateTime(2016, 1, 4, 13, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 4, 13, 30, 0);
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:alarm", null, null, null, 0);

            #endregion

        }

        [Test, Description("Verify a pst having appointment with default reminder set is migrated correctly")]
        public void TC2_AppointmentWithDefaultReminder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_AppointmentWithDefaultReminder");

            #region Test Case variables
            string apptSubject = "subject13457265527";
            string apptContent = "Content13457265527 Appointment in future date and default reminder of 15 mins Showtime is Busy Importance is normal";
            DateTime startTimeLocal = new DateTime(2016, 1, 4, 11, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 4, 12, 0, 0);
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);

            #endregion

        }

        [Test, Description("Verify a pst having appointment with some reminder set is migrated correctly")]
        public void TC3_AppointmentWithReminderSet()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_AppointmentWithReminderSet");

            #region Test Case variables
            string apptSubject = "subject13457265364";
            string apptContent = "Content13457265364 Appointment in future date Reminder is 30 mins";
            DateTime startTimeLocal = new DateTime(2016, 1, 4, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 4, 10, 30, 0);
            string reminderMins = "30";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", reminderMins, null, 1);

            #endregion

        }

        [Test, Description("Verify a pst having all-day appointment with no reminder set is migrated correctly")]
        [Bug("77428")]
        public void TC4_AllDayAppointmentWithNoReminder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_AllDayAppointmentWithNoReminder");

            #region Test Case variables
            string apptSubject = "subject134572660428";
            string apptContent = "Content134572660428 All-day Appointment in future date No reminder set";
            string startTime = "20160111";
            string endTime = "20160111";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "allDay", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "F", null, 1);
            TargetAccount.selectSOAP(m, "//mail:alarm", null, null, null, 0);

            #endregion

        }

        [Test, Description("Verify a pst having all-day appointment with no reminder set is migrated correctly")]
        public void TC5_AllDayAppointmentWithDefaultReminder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_AllDayAppointmentWithDefaultReminder");

            #region Test Case variables
            string apptSubject = "subject134572660830";
            string apptContent = "Content134572660830 All-day Appointment in future date Default reminder set Show as Busy";
            string startTime = "20160112";
            string endTime = "20160112";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "allDay", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);

            #endregion

        }

        [Test, Description("Verify a pst having all-day appointment with some reminder set is migrated correctly")]
        public void TC6_AllDayAppointmentWithReminderSet()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC6_AllDayAppointmentWithReminderSet");

            #region Test Case variables
            string apptSubject = "subject134572661232";
            string apptContent = "Content134572661232 All-day Appointment in future date Reminder set as 2 days Show as Out Of Office";
            string startTime = "20160113";
            string endTime = "20160113";
            string reminderMins = "2880";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "allDay", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "O", null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", reminderMins, null, 1);

            #endregion

        }
    }
}
