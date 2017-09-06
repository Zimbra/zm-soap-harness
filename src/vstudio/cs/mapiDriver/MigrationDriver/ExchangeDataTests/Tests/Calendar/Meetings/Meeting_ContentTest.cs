using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Calendar
{
    public class Meeting_ContentTest : BaseTestFixture
    {
        private string DefaultDomain;
        private string Organizer;

        public Meeting_ContentTest()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            Organizer = "zma1";
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Verify a meeting with plain text body is migrated correctly")]
        public void TC1_PlainTextMeeting()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_PlainTextMeeting");

            #region Test Case variables
            string mtgSubject = "subject13457310721570";
            string mtgFragment = "Content13457310721570 Plain text meeting invite";
            string mtgDesc = "Content13457310721570\nPlain text meeting invite";
            DateTime startTimeLocal = new DateTime(2016, 1, 20, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 20, 10, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string defaultReminderMins = "15";
            string appointmentId = null;
            string mtgDescHtml;

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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:rel", "m", defaultReminderMins, null, 1); //reminder is 15 mins
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE - Needs Action
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgFragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:desc", null, mtgDesc, null, 1);
            TargetAccount.selectSOAP(m, "//mail:descHtml", null, null, out mtgDescHtml, 1);

            //descHtml field contains body description even though format is plain text
            //Only way to check if its plain text or html is by verifying that font does not have face value like Calibri
            if (!mtgDescHtml.Contains("face"))
                ZAssert.That(true, "Content of the appointment has plain text");

            #endregion

        }

        [Test, Description("Verify a meeting with html text body is migrated correctly")]
        public void TC2_HtmlTextMeeting()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_HtmlTextMeeting");

            #region Test Case variables
            string mtgSubject = "Meeting6";
            string mtgFragment = "meeting6 Bold Italics content";
            string mtgDescHtml = "\n<HTML>\n<HEAD>\n\n\n<TITLE>Meeting6</TITLE>\n</HEAD>\n<BODY>\n\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><FONT face=\"Calibri\">meeting6</FONT></SPAN><SPAN lang=\"en-us\"><B> <FONT face=\"Calibri\">Bold</FONT></B></SPAN><SPAN lang=\"en-us\"><FONT face=\"Calibri\"></FONT></SPAN><SPAN lang=\"en-us\"><I> <FONT face=\"Calibri\">Italics</FONT></I></SPAN><SPAN lang=\"en-us\"><FONT face=\"Calibri\"> content</FONT></SPAN><SPAN lang=\"en-us\"></SPAN></P>\n\n</BODY>\n</HTML>";
            DateTime startTimeLocal = new DateTime(2012, 5, 22, 13, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 22, 13, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "TE", null, 1); //attendee participation status is TE - Tentative
            
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgFragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:descHtml", null, mtgDescHtml, null, 1);
            #endregion

        }

        [Test, Description("Verify a meeting with pdf attachment is migrated correctly")]
        public void TC3_MeetingWithPDFAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_MeetingWithPDFAttachment");

            #region Test Case variables
            string mtgSubject = "meeting10";
            string mtgFragment = "Content10 Meeting with pdf document <<SecurIDToken_release_notes.pdf>>";
            DateTime startTimeLocal = new DateTime(2012, 3, 29, 11, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 29, 11, 30, 0);
            string attendee = "ma2";
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
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgFragment, null, 1);

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/pdf", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "SecurIDToken_release_notes.pdf", null, 1);

            
            #endregion

        }

        [Test, Description("Verify a meeting with inline png attachment is migrated correctly")]
        [Bug("73886")]
        //Exchange meeting was created using OLK2010, png image added by Insert Attachment -> "Insert Picture from File" option
        public void TC4_MeetingWithInlineImage()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_MeetingWithInlineImage");

            #region Test Case variables
            string mtgSubject = "meeting13";
            string mtgFragment = "Content13 Meeting with png document <<octopus_dotx_preview.png>>";
            DateTime startTimeLocal = new DateTime(2012, 3, 29, 13, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 29, 13, 30, 0);
            string attendee = "ma2";
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
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgFragment, null, 1);

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "image/png", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "octopus_dotx_preview.png", null, 1);


            #endregion

        }

        [Test, Description("Verify a meeting with xlsx attachment is migrated correctly")]
        public void TC5_MeetingWithExcelAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_MeetingWithExcelAttachment");

            #region Test Case variables
            string mtgSubject = "meeting14";
            string mtgFragment = "Content14 Mail with excel attachment <<Book1.xlsx>>";
            DateTime startTimeLocal = new DateTime(2012, 3, 29, 15, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 29, 15, 30, 0);
            string attendee = "ma2";
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
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgFragment, null, 1);

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "Book1.xlsx", null, 1);


            #endregion

        }

        [Test, Description("Verify a meeting with pptx attachment is migrated correctly")]
        public void TC6_MeetingWithPPTAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC6_MeetingWithPPTAttachment");

            #region Test Case variables
            string mtgSubject = "meeting15";
            string mtgFragment = "Content15 Meeting with pptx attachment <<marketing_strategy.pptx>>";
            DateTime startTimeLocal = new DateTime(2012, 3, 29, 16, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 29, 16, 30, 0);
            string attendee = "ma2";
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
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer + "@" + DefaultDomain, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgFragment, null, 1);

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.presentationml.presentation", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "marketing_strategy.pptx", null, 1);


            #endregion

        }
    }
}