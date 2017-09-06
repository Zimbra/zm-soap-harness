using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Calendar
{
    public class FreeBusyAppointments : BaseTestFixture
    {
        private string Organizer;

        public FreeBusyAppointments()
        {
            this.PstFilename = "/general/calendar/appt_fb.pst";
            Organizer = TargetAccount.emailAddress;
        }

        [Test, Description("Verify a pst having appointment created with showtime as Busy is migrated correctly")]
        public void TC1_AppointmentWithBusyFB()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_AppointmentWithBusyFB");

            #region Test Case variables
            string apptSubject = "subject13457265364";
            string apptContent = "Content13457265364 Appointment in future date Reminder is 30 mins";
            DateTime startTimeLocal = new DateTime(2016, 1, 4, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 4, 10, 30, 0);
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
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1);

            #endregion

        }

        [Test, Description("Verify a pst having appointment created with showtime as Free is migrated correctly")]
        public void TC2_AppointmentWithFreeFB()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_AppointmentWithFreeFB");

            #region Test Case variables
            string apptSubject = "subject134572656713";
            string apptContent = "Content134572656713 Appointment in future with Show time as Free";
            DateTime startTimeLocal = new DateTime(2016, 1, 5, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 5, 10, 30, 0);
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
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "F", null, 1);

            #endregion

        }

        [Test, Description("Verify a pst having appointment created with showtime as Tentative is migrated correctly")]
        public void TC3_AppointmentWithTentativeFB()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_AppointmentWithTentativeFB");

            #region Test Case variables
            string apptSubject = "subject134572657316";
            string apptContent = "Content134572657316 Appointment in future with Show time as Tentative";
            DateTime startTimeLocal = new DateTime(2016, 1, 6, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 6, 10, 30, 0);
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
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "T", null, 1);

            #endregion

        }

        [Test, Description("Verify a pst having appointment created with showtime as Tentative is migrated correctly")]
        public void TC4_AppointmentWithOOOFB()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_AppointmentWithOOOFB");

            #region Test Case variables
            string apptSubject = "subject134572658019";
            string apptContent = "Content134572658019 Appointment in future with Show time as Out Of Office";
            DateTime startTimeLocal = new DateTime(2016, 1, 7, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 7, 10, 30, 0);
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
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "O", null, 1);

            #endregion

        }

    }
}
