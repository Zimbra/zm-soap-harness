using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Calendar
{
    public class MeetingTests : BaseTestFixture
    {
        public MeetingTests()
        {
            this.PstFilename = "/general/calendar/pstimport2_calendar.pst";
        }

        [Test, Description("Import a PST file having simple meeting request with pst user as organizer and attendee had not responded")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, attendee, subject, body, start/end dates, reminder")]
        public void TC1_SimpleMeeting_PSTUserAsOrganizer()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_SimpleMeeting_PSTUserAsOrganizer");

            #region Test Case variables

            string apptSubject = "Meeting_me_as_organizer";
            string apptContent = "Simple meeting request Occurs on 5th Sep 2010 10 am to 10:30 am Reminder 30 mins";
            string organizer = "pstimport2@exchange2010.lab";
            string attendee = "pstimport1@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2016, 1, 5, 20, 30, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 5, 21, 0, 0);
            string reminderMins = "30"; 
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "a", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", reminderMins, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of pstuser
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE

            #endregion
        }

        [Test, Description("Import a PST file having simple meeting request with pst user as attendee and not responded to meeting")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, attendee, subject, body, start/end dates, reminder")]
        public void TC2_Meeting_PSTUserAsAttendee()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_Meeting_PSTUserAsAttendee");

            #region Test Case variables

            string apptSubject = "Meeting_me_as_attendee1";
            string apptContent = "Simple meeting request - pstimport2 as attendee Occurs on 5th Sep 2010 11 am to 11:30 am";
            string organizer = "pstimport1@exchange2010.lab";
            string attendee = "pstimport2@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2012, 9, 4, 22, 30, 0);
            DateTime endTimeLocal = new DateTime(2012, 9, 4, 23, 0, 0);
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
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "T", null, 1); //fb status of pstuser
            //TargetAccount.selectSOAP(m, "mail:at", "ptst", "NE", null, 1); //attendee participation status is NE

            #endregion
        }

        [Test, Description("Import a PST file having simple meeting request with pst user as attendee and accepted meeting")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, attendee, subject, body, start/end dates, reminder")]
        public void TC3_Meeting_PSTUserAsAttendeeAccepts()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_Meeting_PSTUserAsAttendeeAccepts");

            #region Test Case variables

            string apptSubject = "Meeting_me_as_attendee_accept";
            string apptContent = "user2 accepts this meeting request Occurs on 5th Sep 2010 12 pm to 12:30 pm";
            string organizer = "pstimport1@exchange2010.lab";
            string attendee = "pstimport2@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2012, 9, 4, 23, 30, 0);
            DateTime endTimeLocal = new DateTime(2012, 9, 5, 0, 0, 0);
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
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of pstuser
            //TargetAccount.selectSOAP(m, "mail:at", "ptst", "AC", null, 1); //attendee participation status is AC

            #endregion
        }

        [Test, Description("Import a PST file having simple meeting request with pst user as attendee and tentatively accepted meeting")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, attendee, subject, body, start/end dates, reminder")]
        public void TC4_Meeting_PSTUserAsAttendeeTentativelyAccepts()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_Meeting_PSTUserAsAttendeeTentativelyAccepts");

            #region Test Case variables

            string apptSubject = "Meeting_me_as_attendee_tentative";
            string apptContent = "pstimport2 tentatively accepts this meeting request Occurs on 5th Sep 2010 1 pm to 1:30 pm";
            string organizer = "pstimport1@exchange2010.lab";
            string attendee = "pstimport2@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2012, 9, 5, 0, 30, 0);
            DateTime endTimeLocal = new DateTime(2012, 9, 5, 1, 0, 0);
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
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "T", null, 1); //fb status of pstuser
            //TargetAccount.selectSOAP(m, "mail:at", "ptst", "NE", null, 1); //attendee participation status is TE          

            #endregion
        }

        [Test, Description("Import a PST file having meeting request with pst user as organizer and required/optional attendees n resources")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported meeting",
            "5. Check the appointment content: organizer, required/optional attendees, resources, subject, body, start/end dates, reminder")]
        public void TC5_Meeting_HasOptionalAttendeeAndResources()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_Meeting_HasOptionalAttendeeAndResources");

            #region Test Case variables

            string apptSubject = "Meeting_has_optionalAttendee_resources";
            string organizer = "pstimport2@exchange2010.lab";
            string attendeeReq = "pstimport1@exchange2010.lab";
            string attendeeOpt = "pstimport3@exchange2010.lab";
            string location = "location_confroom@exchange2010.lab";
            string equipment = "equipment_projector@exchange2010.lab";
            DateTime startTimeLocal = new DateTime(2016, 1, 6, 1, 30, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 6, 2, 0, 0);
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
            TargetAccount.selectSOAP(m, "//mail:at[@role='REQ']", "a", attendeeReq, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@role='OPT']", "a", attendeeOpt, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@a='" + location + "']", "role", "NON", null, 1);
            TargetAccount.selectSOAP(m, "//mail:at[@a='" + equipment + "']", "role", "NON", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", apptSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            
            #endregion
        }

    }
}
