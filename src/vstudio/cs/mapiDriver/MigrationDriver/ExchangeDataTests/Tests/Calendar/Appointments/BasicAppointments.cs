using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Calendar
{
    public class BasicAppointments : BaseTestFixture
    {
        private string DefaultDomain;
        private string Organizer;

        public BasicAppointments()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            Organizer = "zma1";
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Verify a basic appointment is migrated correctly")]
        public void TC1_SimpleAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_SimpleAppointment");

            #region Test Case variables
            string apptSubject = "appt1";
            string apptContent = "Today’s appointment";
            DateTime startTimeLocal = new DateTime(2012, 3, 2, 19, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 2, 19, 30, 0);
            string appointmentVisibility = "PUB"; //public appointment
            string appointmentId = null;
            string messageId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + apptSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", "", null, 1);

            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "tn", "", null, 1);
            
            #endregion

        }

        [Test, Description("Verify a appointment with location is migrated correctly")]
        public void TC2_AppointmentWithLocation()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_AppointmentWithLocation");

            #region Test Case variables
            string apptSubject = "appt21";
            string apptContent = "Content21 60 minutes reminder with Category category104";
            DateTime startTimeLocal = new DateTime(2012, 3, 9, 16, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 9, 16, 30, 0);
            string location = "location21";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);

            #endregion

        }

        [Test, Description("Verify a appointment with category is migrated correctly")]
        public void TC3_AppointmentWithCategory()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_AppointmentWithCategory");

            #region Test Case variables
            string apptSubject = "appt21";
            string apptContent = "Content21 60 minutes reminder with Category category104";
            DateTime startTimeLocal = new DateTime(2012, 3, 9, 16, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 9, 16, 30, 0);
            string category = "category104";
            string appointmentId = null;
            string messageId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + apptSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);

            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "tn", category, null, 1);

            #endregion

        }

        [Test, Description("Verify a private appointment is migrated correctly")]
        public void TC4_PrivateAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_PrivateAppointment");

            #region Test Case variables
            string apptSubject = "appt4";
            string apptContent = "Content4 Private appointment";
            DateTime startTimeLocal = new DateTime(2012, 3, 9, 14, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 9, 15, 0, 0);
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);

            #endregion

        }

        [Test, Description("Verify a all-day appointment is migrated correctly")]
        public void TC5_AllDayAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_AllDayAppointment");

            #region Test Case variables
            string apptSubject = "appt5";
            string apptContent = "Content5 All day appointment";
            string startTime = "20120222";
            string endTime = "20120222";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "allDay", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "F", null, 1);
            
            #endregion

        }
    }
}

