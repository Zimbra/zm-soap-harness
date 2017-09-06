using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;


namespace PstDataTests.Calendar
{
    public class AppointmentTests : BaseTestFixture
    {
        public AppointmentTests()
        {
            this.PstFilename = "/general/calendar/pstimport2_calendar.pst";           
        }

        [Test, Description("Import a PST file having simple appoinment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported appointment",
            "5. Check the appointment content: organizer, subject, body, start/end dates, reminder")]
        public void TC1_SimpleAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_SimpleAppointment");

            #region Test Case variables

            string apptSubject = "Simple Appointment";
            string apptContent = "Simple Appointment. Occurs on 3rd September 10 am to 10:30 am. Reminder – default – 15 mins.";
            DateTime startTimeLocal = new DateTime(2016, 1, 3, 20, 30, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 3, 21, 00, 0);
            string defaultReminderMins = "15"; //Reminder by default is 15 mins in Outlook-Exchange source user account 
            string appointmentVisibility = "PUB"; //public appointment
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport2@exchange2010.lab", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);

            #endregion
        }

        [Test, Description("Import a PST file having appoinment with reminder set")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported appointment",
            "5. Check the appointment content: organizer, subject, body, start/end dates, reminder")]
        public void TC2_AppointmentWithReminder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_AppointmentWithReminder");

            #region Test Case variables

            string apptSubject = "Appointment with reminder";
            string apptContent = "This appointment has reminder set to 1 hr. Occurs on 3rd September 11 am to 11:30 am.";
            DateTime startTimeLocal = new DateTime(2016, 1, 3, 21, 30, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 3, 22, 0, 0);
            string reminderHr = "1"; //Reminder is set to 1 hr in source user account's appointment
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport2@exchange2010.lab", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "h", reminderHr, null, 1);

            #endregion
        }

        [Test, Description("Import a PST file having private appoinment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported appointment",
            "5. Check the appointment content: organizer, subject, body, start/end dates, private flag, reminder")]
        public void TC3_PrivateAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_PrivateAppointment");

            #region Test Case variables

            string apptSubject = "Private Appointment";
            string apptContent = "Private Appointment. Occurs on 3rd September 12 pm to 12:30 pm.";
            DateTime startTimeLocal = new DateTime(2016, 1, 3, 22, 30, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 3, 23, 0, 0);
            string defaultReminderMins = "15"; 
            string appointmentVisibility = "PRI"; //private appointment
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport2@exchange2010.lab", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);          

            #endregion
        }

        [Test, Description("Import a PST file having all day appoinment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported appointment",
            "5. Check the appointment content: organizer, subject, body, start/end dates, reminder, all day flag")]
        public void TC4_AllDayAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_AllDayAppointment");

            #region Test Case variables

            string apptSubject = "All day appointment";
            string apptContent = "All day appointment on 4th Sep 2012. Reminder is 18 hrs.";
            string startTime = "20160105";
            string endTime = "20160105";
            string reminderHr = "18";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport2@exchange2010.lab", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "h", reminderHr, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "allDay", "1", null, 1);

            #endregion
        }

        [Test, Description("Import a PST file having appoinment containing attachment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported appointment",
            "5. Check the appointment content: organizer, subject, body, start/end dates, reminder")]
        public void TC5_AppointmentWithAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_AppointmentWithAttachment");

            #region Test Case variables

            string apptSubject = "Appointment with attachment";
            string apptContent = "This appointment has text attachment. Occurs on 3rd Sep 1 pm to 1:30 pm.";
            DateTime startTimeLocal = new DateTime(2016, 1, 3, 23, 30, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 4, 0, 0, 0);
            string defaultReminderMins = "15"; 
            string appointmentId = null;
            string appointmentInvId = null;
            string messageId = null;

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
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport2@exchange2010.lab", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:inv", "id", null, out appointmentInvId, 1);

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            messageId = appointmentId + "-" + appointmentInvId;
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:mp[@cd='attachment']", "filename", "pstinfo.txt", null, 1);
            
            #endregion
        }
    }
}
