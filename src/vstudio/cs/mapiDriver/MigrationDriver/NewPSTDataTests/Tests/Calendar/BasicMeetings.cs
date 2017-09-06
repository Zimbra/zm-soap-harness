using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Calendar
{
    public class BasicMeetings : BaseTestFixture
    {
        private string Organizer;

        public BasicMeetings()
        {
            this.PstFilename = "/general/calendar/meeting_basic.pst";
            Organizer = TargetAccount.emailAddress;
        }

        [Test, Description("Verify a basic meeting (no location, category and no response from attendee) is migrated correctly")]
        public void TC1_SimpleMeeting()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_SimpleAppointment");

            #region Test Case variables
            string mtgSubject = "subject13457265172";
            string mtgContent = "Content13457265172 Simple meeting request, ma2 does not responds Meeting does not have location";
            DateTime startTimeLocal = new DateTime(2016, 1, 19, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 19, 11, 0, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string defaultReminderMins = "15";
            string appointmentVisibility = "PUB"; //public appointment
            string appointmentId = null;
            string messageId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + mtgSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1); //reminder is 15 mins
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", "", null, 1); //no location
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE - Needs Action

            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "tn", "", null, 1); //no category

            #endregion

        }

        [Test, Description("Verify a meeting having location is migrated correctly")]
        public void TC2_MeetingWithLocation()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_MeetingWithLocation");

            #region Test Case variables
            string mtgSubject = "subject13457311761604";
            string mtgContent = "Content13457311761604 Meeting has location";
            DateTime startTimeLocal = new DateTime(2016, 1, 19, 12, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 19, 12, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string defaultReminderMins = "15";
            string location = "location13457311761604";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1); //reminder is 15 mins
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); //valid location
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE

            #endregion

        }

        [Test, Description("Verify a meeting having category is migrated correctly")]
        public void TC3_MeetingWithCategory()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_MeetingWithCategory");

            #region Test Case variables
            string mtgSubject = "subject13583290012";
            string mtgContent = "Content8 Meeting with High importance and Category category103";
            DateTime startTimeLocal = new DateTime(2016, 1, 21, 15, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 21, 15, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string category = "category103";
            string appointmentId = null;
            string messageId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + mtgSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            //TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer --Incorrect organizer value due to bug#81502
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE

            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "tn", category, null, 1); //valid category

            #endregion

        }

        [Test, Description("Verify a meeting with attendee accepting invite is migrated correctly")]
        [Bug("81947")]
        public void TC4_MeetingAttendeeAccepts()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_MeetingAttendeeAccepts");

            #region Test Case variables
            string mtgSubject = "subject13457311411592";
            string mtgContent = "Content13457311411592 ma2 accepts the meeting request";
            DateTime startTimeLocal = new DateTime(2016, 1, 19, 13, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 19, 13, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string defaultReminderMins = "15";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1); //reminder is 15 mins
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "AC", null, 1); //attendee participation status is AC - Accepted

            #endregion

        }

        [Test, Description("Verify a meeting with attendee declining invite is migrated correctly")]
        [Bug("81947")]
        public void TC5_MeetingAttendeeDeclines()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_MeetingAttendeeDeclines");

            #region Test Case variables
            string mtgSubject = "subject13457310971576";
            string mtgContent = "Content13457310971576 ma2 declines the meeting request";
            DateTime startTimeLocal = new DateTime(2016, 1, 19, 14, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 19, 14, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string defaultReminderMins = "15";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1); //reminder is 15 mins
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "DE", null, 1); //attendee participation status is DE - Declines

            #endregion

        }

        [Test, Description("Verify a meeting with attendee tentatively accepting invite is migrated correctly")]
        [Bug("81947")]
        public void TC6_MeetingAttendeeTentative()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC6_MeetingAttendeeTentative");

            #region Test Case variables
            string mtgSubject = "subject13457310841574";
            string mtgContent = "Content13457310841574 ma2 tentatively accepts the meeting request";
            DateTime startTimeLocal = new DateTime(2016, 1, 19, 15, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 19, 15, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string defaultReminderMins = "15";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1); //reminder is 15 mins
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "TE", null, 1); //attendee participation status is TE - Tentative accept

            #endregion

        }

        [Test, Description("Verify a meeting with multiple attendees responding with different participation statuses is migrated correctly")]
        public void TC7_MeetingMultipleAttendees()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC7_MeetingMultipleAttendees");

            #region Test Case variables
            string mtgSubject = "subject13457310841573";
            string mtgContent = "Content13457310841573 ma2 accepts, ma3 optional and tentatively accepts, ma4 declines";
            DateTime startTimeLocal = new DateTime(2016, 1, 19, 16, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 19, 16, 30, 0);
            string attendee1 = "ma2";
            string attendee2 = "ma3";
            string attendee3 = "ma4";
            string attendee1Role = "REQ";
            string attendee2Role = "OPT";
            string attendee3Role = "REQ";
            string defaultReminderMins = "15";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1); //reminder is 15 mins
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            //TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee1 + "']", "ptst", "AC", null, 1); //Blocked by bug#81947
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee1 + "']", "role", attendee1Role, null, 1); //attendee1 role is Required
            //TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee2 + "']", "ptst", "TE", null, 1); //Blocked by bug#81947
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee2 + "']", "role", attendee2Role, null, 1); //attendee2 role is Optional
            //TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee3 + "']", "ptst", "DE", null, 1); //Blocked by bug#81947
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee3 + "']", "role", attendee3Role, null, 1); //attendee3 role is Required

            #endregion

        }

        [Test, Description("Verify a all day meeting is migrated correctly")]
        public void TC8_AllDayMeeting()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC8_AllDayMeeting");

            #region Test Case variables
            //string mtgSubject = "Meeting2";
            string mtgSubject = "subject13583290175";
            string mtgContent = "Contentt2 All day meeting – reminder 1 hr Ma2 – tentative Ma3 - decline";
            string startTime = "20160125";
            string endTime = "20160125";
            string attendee1 = "ma2";
            string attendee1Role = "REQ";
            string attendee2 = "ma3";
            string attendee2Role = "REQ";
            string appointmentVisibility = "PUB"; //public appointment
            string location = "location2";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);

            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTime, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "allDay", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "F", null, 1);
            //TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee1 + "']", "ptst", "TE", null, 1); //Blocked by bug#81947
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee1 + "']", "role", attendee1Role, null, 1); //attendee role is Required
            //TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee2 + "']", "ptst", "DE", null, 1); //Blocked by bug#81947
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee2 + "']", "role", attendee2Role, null, 1); //attendee role is Required


            #endregion

        }

        [Test, Description("Verify a meeting with resources (equipment and location) is migrated correctly")]
        public void TC9_MeetingHavingResources()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC9_MeetingHavingResources");

            #region Test Case variables
            string mtgSubject = "subject13583290328";
            string mtgContent = "Content18 Resources - Equipment1 and Room1 Required attendee - ma2";
            DateTime startTimeLocal = new DateTime(2016, 1, 26, 11, 30, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 26, 12, 0, 0);
            string attendee1 = "ma2";
            string resource1 = "Equipment1";
            string resource2 = "Room1";
            string attendee1Role = "REQ";
            string resource1Role = "REQ"; 
            string resource2Role = "NON"; //Non participant role
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
            //TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer --Incorrect organizer value due to bug#81502
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee1 + "']", "ptst", "NE", null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + attendee1 + "']", "role", attendee1Role, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + resource1 + "']", "ptst", "NE", null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + resource1 + "']", "role", resource1Role, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + resource2 + "']", "ptst", "NE", null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + resource2 + "']", "role", resource2Role, null, 1);

            #endregion

        }

    }
}
