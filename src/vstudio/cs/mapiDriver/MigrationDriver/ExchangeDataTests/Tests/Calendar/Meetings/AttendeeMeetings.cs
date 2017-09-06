using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Calendar
{
    public class AttendeeMeetings : BaseTestFixture
    {
        private string DefaultDomain;
        private string Attendee;

        public AttendeeMeetings()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            Attendee = "ma1";
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Verify a meeting where migrated user is attendee and not responded is migrated correctly")]
        public void TC1_AttendeeMeeting_NoAction()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_AttendeeMeeting_NoAction");

            #region Test Case variables
            string mtgSubject = "meeting13353701964";
            string mtgContent = "Content11 Meeting sent from ma2 to ma1";
            DateTime startTimeLocal = new DateTime(2012, 5, 21, 8, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 21, 8, 30, 0);
            string organizer = "ma2";
            string location = "location11";
            string attendeeRole = "REQ";
            string appointmentVisibility = "PUB"; //public appointment
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
            TargetAccount.selectSOAP(m, "//mail:at", "d", Attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);        
            TargetAccount.selectSOAP(m, "//mail:comp", "rsvp", "1", null, 1); //attendee needs to send response
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); //no location
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "T", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE - Needs Action

            #endregion

        }

        [Test, Description("Verify a meeting where migrated user is attendee and accepted invite is migrated correctly")]
        [Bug("77735")]
        public void TC2_AttendeeMeeting_Accept()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_AttendeeMeeting_Accept");

            #region Test Case variables
            string mtgSubject = "meeting16";
            string mtgContent = "Content16 Meeting with .doc attachment \u003C\u003CMigrationTool CommandLine Interface.docx\u003E\u003E";
            DateTime startTimeLocal = new DateTime(2012, 5, 24, 13, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 24, 13, 30, 0);
            string organizer = "ma2";
            string attendeeRole = "REQ";
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
            TargetAccount.selectSOAP(m, "//mail:or", "d", organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", Attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "rsvp", "1", null, 1); //attendee needs to send response
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "AC", null, 1); //attendee participation status is AC - Accept

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "MigrationTool  CommandLine Interface.docx", null, 1);

            #endregion

        }

        [Test, Description("Verify a meeting where migrated user is attendee and tentatively accepted invite is migrated correctly")]
        [Bug("77735")]
        public void TC3_AttendeeMeeting_TentativeAccept()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_AttendeeMeeting_TentativeAccept");

            #region Test Case variables
            string mtgSubject = "meeting17";
            string mtgContent = "ma1 - required attendee ma3 - optional attendee ma1 would tentatively accept the meeting";
            DateTime startTimeLocal = new DateTime(2012, 11, 1, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 11, 1, 10, 30, 0);
            string organizer = "ma2";
            string attendeeRole = "REQ";
            string optAttendee = "ma3";
            string optAttendeeRole = "OPT";
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
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "rsvp", "1", null, 1); //attendee needs to send response
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "T", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + Attendee + "']", "ptst", "TE", null, 1); //tentaively accept
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + Attendee + "']", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + optAttendee + "']", "ptst", "NE", null, 1); //needs action
            TargetAccount.selectSOAP(m, "//mail:at[@d='" + optAttendee + "']", "role", optAttendeeRole, null, 1); //attendee role is Optional
            
            #endregion

        }

    }
}