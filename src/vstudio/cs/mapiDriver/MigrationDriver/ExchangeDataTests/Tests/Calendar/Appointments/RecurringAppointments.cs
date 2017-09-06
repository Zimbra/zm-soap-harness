using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Calendar
{
    public class RecurringAppointments : BaseTestFixture
    {
        private string DefaultDomain;
        private string Organizer;

        public RecurringAppointments()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            Organizer = "zma1";
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Verify a daily recurring appointment having no end date recurrence pattern is migrated correctly")]
        public void TC1_RecAppt_Daily_WithNoEndDatePattern()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_RecAppt_Daily_WithNoEndDatePattern");

            #region Test Case variables

            string apptSubject = "appt6";
            string apptContent = "Content6 Recurring daily – no end date";
            DateTime startTimeLocal = new DateTime(2012, 3, 12, 8, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 12, 8, 30, 0);
            string frequency = "DAI";
            string interval = "1";
            string defaultReminderMins = "15";
            string location = "location6";
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1); 
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);
            
            #endregion

        }

        [Test, Description("Verify a daily recurring appointment having 5 occurrences recurrence pattern is migrated correctly")]
        public void TC2_RecAppt_Daily_With5OccurrencesPattern()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_RecAppt_Daily_With5OccurrencesPattern");

            #region Test Case variables

            string apptSubject = "appt7";
            string apptContent = "Content7 Recurring daily – 5 occurence";
            DateTime startTimeLocal = new DateTime(2012, 3, 5, 9, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 5, 9, 30, 0);
            string frequency = "DAI";
            string occurrences = "5";
            string interval = "1";
            string defaultReminderMins = "15";
            string location = "location7";
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);
            
            #endregion

        }

        [Test, Description("Verify a weekly recurring appointment having end by date recurrence pattern is migrated correctly")]
        public void TC3_RecAppt_Weekly_WithEndByDatePattern()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_RecAppt_Weekly_WithEndByDatePattern");

            #region Test Case variables

            string apptSubject = "app8";
            string apptContent = "Content8 Recurring - end by date – 5/7/2012";
            DateTime startTimeLocal = new DateTime(2012, 3, 5, 8, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 5, 8, 30, 0);
            DateTime seriesEndDate = new DateTime(2012, 5, 7, 23, 59, 59); //Its observed that, series end date time in recurring appointment is set to 11:59:59 pm of the end by date
            string frequency = "WEE";
            string interval = "1";
            string day = "MO";
            string defaultReminderMins = "15";
            string location = "location8";
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:byday/mail:wkday", "day", day, null, 1);

            SoapTest soapTest = new SoapTest();
            DateTime soapUTCEndDate = soapTest.toUTC(m, "//mail:until");

            ZAssert.AreEqual(seriesEndDate.ToUniversalTime(), soapUTCEndDate, "Verify that the series end date (UTC format) is correct");
            
            #endregion

        }

        [Test, Description("Verify a monthly recurring appointment occuring on fixed month date and having end by date recurrence pattern is migrated correctly")]
        public void TC4_RecAppt_Monthly_FixedDate()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_RecAppt_Monthly_FixedDate");

            #region Test Case variables

            string apptSubject = "appt14";
            string apptContent = "Content11 Appointment with no location and monthly recurrence end by 11/7/2012";
            DateTime startTimeLocal = new DateTime(2012, 5, 7, 14, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 7, 14, 30, 0);
            DateTime seriesEndDate = new DateTime(2012, 11, 7, 23, 59, 59); //Its observed that, series end date time in recurring appointment is set to 11:59:59 pm of the end by date
            string frequency = "MON";
            string occurenceDay = "7";
            string interval = "1";
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", "", null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonthday", "modaylist", occurenceDay, null, 1); //which day of month

            SoapTest soapTest = new SoapTest();
            DateTime soapUTCEndDate = soapTest.toUTC(m, "//mail:until");

            ZAssert.AreEqual(seriesEndDate.ToUniversalTime(), soapUTCEndDate, "Verify that the series end date (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify a monthly recurring appointment occuring on fixed week day and having 3 occurrences is migrated correctly")]
        public void TC5_RecAppt_Monthly_FixedWeekDay()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_RecAppt_Monthly_FixedWeekDay");

            #region Test Case variables

            string apptSubject = "appt13457265364";
            string apptContent = "Content13457265364 Monthly recurring meeting, occurs every other month on 2nd wednesday of month and 3 occurrences";
            DateTime startTimeLocal = new DateTime(2012, 5, 9, 15, 30, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 9, 16, 30, 0);
            string frequency = "MON";
            string occurenceDay = "WE";
            string weekNumber = "2";
            string occurrences = "3";
            string interval = "2";
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", "", null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:byday/mail:wkday", "ordwk", weekNumber, null, 1); //which week of month
            TargetAccount.selectSOAP(m, "//mail:rule/mail:byday/mail:wkday", "day", occurenceDay, null, 1); //which day of week

            #endregion

        }

        [Test, Description("Verify a yearly recurring appointment occuring on fixed month date and having 3 occurrences is migrated correctly")]
        public void TC6_RecAppt_Yearly_FixedDate()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC6_RecAppt_Yearly_FixedDate");

            #region Test Case variables

            string apptSubject = "appt12";
            string apptContent = "Content12 Yearly appointment for 3 years";
            DateTime startTimeLocal = new DateTime(2012, 5, 11, 15, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 11, 15, 30, 0);
            string frequency = "YEA";
            string monthDay = "11";
            string monthNumber = "5";
            string occurrences = "3";
            string interval = "1";
            string defaultReminderMins = "15";
            string location = "location12";
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonthday", "modaylist", monthDay, null, 1); //which day of month
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonth", "molist", monthNumber, null, 1); //which month

            #endregion

        }

        [Test, Description("Verify a yearly recurring appointment occuring on fixed week-month day and having 2 occurrences is migrated correctly")]
        public void TC7_RecAppt_Yearly_FixedWeekMonthDay()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC7_RecAppt_Yearly_FixedWeekMonthDay");

            #region Test Case variables

            string apptSubject = "appt22";
            string apptContent = "Content22 Reccurs yearly - 2 occurrences, every 3rd friday of may month";
            DateTime startTimeLocal = new DateTime(2012, 5, 18, 17, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 18, 18, 0, 0);
            string frequency = "YEA";
            string weekDay = "FR";
            string monthNumber = "5";
            string weekNumber = "3";
            string occurrences = "2";
            string interval = "1";
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:byday/mail:wkday", "day", weekDay, null, 1); //which day of week
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonth", "molist", monthNumber, null, 1); //which month
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bysetpos", "poslist", weekNumber, null, 1); //which week of month

            #endregion

        }

        [Test, Description("Verify a weekly recurring appointment having category is migrated correctly")]
        public void TC8_RecAppt_Weekly_HavingCategory()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC8_RecAppt_Weekly_HavingCategory");

            #region Test Case variables

            string apptSubject = "app8";
            DateTime startTimeLocal = new DateTime(2012, 3, 5, 8, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 5, 8, 30, 0);
            string frequency = "WEE";
            string interval = "1";
            string day = "MO";
            string category = "Red Category";
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
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series start time
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToString("yyyyMMdd'T'HHmmss"), null, 1); //series end time
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:byday/mail:wkday", "day", day, null, 1);
            TargetAccount.selectSOAP(m, "//mail:appt", "tn", category, null, 1);

            #endregion

        }
    }
}