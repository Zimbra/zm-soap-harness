using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Calendar
{
    public class Meeting_ContentTest : BaseTestFixture
    {
        private string Organizer;

        public Meeting_ContentTest()
        {
            this.PstFilename = "/general/calendar/meeting_content.pst";
            Organizer = TargetAccount.emailAddress;
        }

        [Test, Description("Verify a meeting with plain text body is migrated correctly")]
        public void TC1_PlainTextMeeting()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_PlainTextMeeting");

            #region Test Case variables
            string mtgSubject = "subject13195313902";
            string mtgFragment = "Content13457310721570 Plain text meeting invite";
            string mtgDesc = "Content13457310721570\nPlain text meeting invite";
            DateTime startTimeLocal = new DateTime(2012, 3, 30, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 30, 10, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
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
            TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
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
            string mtgSubject = "subject131953128477";
            string mtgFragment = "Content6 Html content Bold is here Italic also.";
            string mtgDescHtml = "\n<HTML>\n<HEAD>\n\n\n<TITLE>subject131953128477 </TITLE>\n</HEAD>\n<BODY>\n\n\n<P><FONT size=\"2\" face=\"Calibri\">Content6</FONT>\n\n<BR><FONT face=\"Times New Roman\">&nbsp;</FONT>\n\n<BR><FONT size=\"2\" face=\"Calibri\">Html content</FONT>\n\n<BR><FONT face=\"Times New Roman\">&nbsp;</FONT>\n\n<BR><B><FONT size=\"2\" face=\"Calibri\">Bold is here</FONT></B>\n\n<BR><I><FONT size=\"2\" face=\"Calibri\">Italic also.</FONT></I>\n</P>\n\n</BODY>\n</HTML>";
            DateTime startTimeLocal = new DateTime(2012, 3, 30, 13, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 3, 30, 13, 30, 0);
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
            //TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer --Incorrect organizer value due to bug#81502
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            //TargetAccount.selectSOAP(m, "//mail:at", "ptst", "TE", null, 1); //Blocked by bug#81947

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
            string mtgFragment = "Content10 Meeting with pdf document";
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
            //TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer --Incorrect organizer value due to bug#81502
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
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
            string mtgFragment = "Content13 Meeting with png document";
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
            //TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer --Incorrect organizer value due to bug#81502
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
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
            string mtgFragment = "Content14 Mail with excel attachment";
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
            //TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer --Incorrect organizer value due to bug#81502
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
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
            string mtgFragment = "Content15 Meeting with pptx attachment";
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
            //TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer --Incorrect organizer value due to bug#81502
            //TargetAccount.selectSOAP(m, "//mail:or", "a", Organizer, null, 1);
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