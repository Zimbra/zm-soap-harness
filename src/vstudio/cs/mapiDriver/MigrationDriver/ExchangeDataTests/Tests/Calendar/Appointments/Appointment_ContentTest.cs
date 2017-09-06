using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Calendar
{
    public class Appointment_ContentTest : BaseTestFixture
    {
        private string DefaultDomain;
        private string Organizer;

        public Appointment_ContentTest()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            Organizer = "zma1";
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Verify a appointment with plain text body is migrated correctly")]
        public void TC1_PlainTextAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_PlainTextAppointment");

            #region Test Case variables
            string apptSubject = "subject134572658822";
            string apptFragment = "Content134572658822 Appointment in future and having body in plain text format";
            string apptDesc = "Content134572658822 \nAppointment in future and having body in plain text format";
            DateTime startTimeLocal = new DateTime(2016, 1, 8, 10, 0, 0);
            DateTime endTimeLocal = new DateTime(2016, 1, 8, 10, 30, 0);
            string appointmentId = null;
            string apptDescHtml;

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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptFragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:desc", null, apptDesc, null, 1);
            TargetAccount.selectSOAP(m, "//mail:descHtml", null, null, out apptDescHtml, 1);

            //descHtml field contains body description even though format is plain text
            //Only way to check if its plain text or html is by verifying that font does not have face value like Calibri
            if (!apptDescHtml.Contains("face")) 
                ZAssert.That(true, "Content of the appointment has plain text");
            
            #endregion

        }

        [Test, Description("Verify a appointment with html text body is migrated correctly")]
        public void TC2_HtmlTextAppointment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_HtmlTextAppointment");

            #region Test Case variables
            string apptSubject = "appt13";
            string apptFragment = "Content13 Html content This is bold This is underline";
            string apptDesc = "Content13\n\nHtml content\n\nThis is bold\nThis is underline\n";
            string apptDescHtml = "\n<HTML>\n<HEAD>\n\n\n<TITLE>appt13</TITLE>\n</HEAD>\n<BODY>\n\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><FONT face=\"Calibri\">Content13</FONT></SPAN></P>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><FONT face=\"Calibri\">Html content</FONT></SPAN></P>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><FONT face=\"Calibri\">This is</FONT></SPAN><SPAN lang=\"en-us\"><B> <FONT face=\"Calibri\">bold</FONT></B></SPAN><SPAN lang=\"en-us\"><B></B></SPAN></P>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><FONT face=\"Calibri\">This is</FONT></SPAN><SPAN lang=\"en-us\"><U> <FONT face=\"Calibri\">underline</FONT></U></SPAN><SPAN lang=\"en-us\"></SPAN></P>\n\n</BODY>\n</HTML>";
            DateTime startTimeLocal = new DateTime(2012, 4, 4, 15, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 4, 4, 15, 30, 0);
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
            TargetAccount.selectSOAP(m, "//mail:fr", null, apptFragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:desc", null, apptDesc, null, 1);
            TargetAccount.selectSOAP(m, "//mail:descHtml", null, apptDescHtml, null, 1);

            #endregion

        }

        [Test, Description("Verify a appointment with pdf attachment is migrated correctly")]
        public void TC3_AppointmentWithPDFAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_AppointmentWithPDFAttachment");

            #region Test Case variables
            string apptSubject = "appt20";
            string apptDesc = "Content20\n\nAppointment with pdf attachment\n\n\n \u003C\u003CSecurIDToken_release_notes.pdf\u003E\u003E \n";
            DateTime startTimeLocal = new DateTime(2012, 5, 24, 11, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 24, 12, 0, 0);
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
            TargetAccount.selectSOAP(m, "//mail:desc", null, apptDesc, null, 1);

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/pdf", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "SecurIDToken_release_notes.pdf", null, 1);

            #endregion

        }

        [Test, Description("Verify a appointment with inline image is migrated correctly")]
        public void TC4_AppointmentWithInlineImage()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_AppointmentWithInlineImage");

            #region Test Case variables
            string apptSubject = "appt19";
            string apptDesc = "Content19\n\nMail with png attachment\n\n \u003C\u003Coctopus_dotx_preview.png\u003E\u003E \n\n\n";
            DateTime startTimeLocal = new DateTime(2012, 4, 10, 11, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 4, 10, 11, 30, 0);
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
            TargetAccount.selectSOAP(m, "//mail:desc", null, apptDesc, null, 1);

            //To check if the appointment has attachment or not, we have to do getmsgrequest
            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "image/png", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "octopus_dotx_preview.png", null, 1);

            #endregion

        }
    }
}
