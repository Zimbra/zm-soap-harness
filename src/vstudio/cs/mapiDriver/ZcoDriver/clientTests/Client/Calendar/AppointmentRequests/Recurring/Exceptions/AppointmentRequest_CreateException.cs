using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapAdmin;
using Soap;
using System.IO;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.AppointmentRequests.Recurring.Exceptions
{
    [TestFixture]
    public class AppointmentRequest_CreateException : BaseTestFixture
    {
        [Test, Description("Verify exception (startTime Changed) of a weekly recurring appointment is sync from ZCO")]
        [Category("SMOKE"), Category("Calendar")]
        public void AppointmentRequest_CreateException_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, messageExInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            //Create exception of first instance by giving start time
            RDOAppointmentItem exAppointment = recurrencePattern.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            exAppointment.Start = startTimeLocal.AddHours(2);

            // save the appointment
            exAppointment.Save();
            
            // Sync and Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out messageExInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "WEE", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            // Get the exception of recurring meeting
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageExInvId));

            XmlNode appointmentMessageEx = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageExInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:desc", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:comp", "name", apptSubject, null, 1);

            DateTime soapExceptIDUTC = soapTest.toUTC(appointmentMessageEx, "//mail:exceptId");
            DateTime soapStartUTCEx = soapTest.toUTC(appointmentMessageEx, "//mail:s");
            DateTime soapEndUTCEx = soapTest.toUTC(appointmentMessageEx, "//mail:e");

            zAssert.AreEqual(startTimeLocal.ToUniversalTime().ToString(), soapExceptIDUTC.ToString(), "Verify that the start time of exception (UTC format) is correct");
            zAssert.AreEqual(exAppointment.Start.ToUniversalTime().ToString(), soapStartUTCEx.ToString(), "Verify that the start time (UTC format) is correct");
            zAssert.AreEqual(exAppointment.Start.AddHours(1).ToUniversalTime().ToString(), soapEndUTCEx.ToString(), "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify exception (subject changed) of a weekly recurring appointment is sync from ZCO")]
        [Category("Calendar")]
        public void AppointmentRequest_CreateException_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string newSubject = "newSubject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, messageExInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            //Create exception of first instance by giving start time
            RDOAppointmentItem exAppointment = recurrencePattern.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            exAppointment.Subject = newSubject;

            // save the appointment
            exAppointment.Save();

            // Sync and Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out messageExInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "WEE", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            // Get the exception of recurring meeting
            // Verify all fields including the changed subject
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageExInvId));

            XmlNode appointmentMessageEx = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageExInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:desc", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:comp", "name", newSubject, null, 1);
            #endregion
        }

        [Test, Description("Verify exception (content changed) of a weekly recurring appointment is sync from ZCO")]
        [Category("Calendar")]
        public void AppointmentRequest_CreateException_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string newContent = "newContent" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, messageExInvId;

            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            //Create exception of first instance by giving start time
            RDOAppointmentItem exAppointment = recurrencePattern.GetOccurence(startTimeLocal.AddDays(7)) as RDOAppointmentItem;
            exAppointment.Body = newContent;

            // save the appointment
            exAppointment.Save();

            // Sync and Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(8)));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out messageExInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "WEE", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            // Get the exception of recurring meeting
            // Verify all fields including the changed subject
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageExInvId));

            XmlNode appointmentMessageEx = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageExInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:desc", null, newContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:comp", "name", apptSubject, null, 1);
            #endregion
 
        }

        [Test, Description("Verify exception (instance deleted) of a weekly recurring appointment is sync from ZCO")]
        [Category("SMOKE"), Category("Calendar")]
        public void AppointmentRequest_CreateException_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            //Create exception of first instance by giving start time
            RDOAppointmentItem exAppointment = recurrencePattern.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            exAppointment.Delete(true);

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(+5), startTimeLocal.AddDays(+9)));
            // Verify that exception is created. Only three instances should be present.
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", null, null, null, 3);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:desc", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "WEE", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify exception (reminder changed) of a weekly recurring appointment is sync from ZCO")]
        [Category("Calendar")]
        [BugAttribute("30178")]
        public void AppointmentRequest_CreateException_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string reminderMinutes = "20";
            string reminderModified = "30";
            string messageInvId, messageExInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = Convert.ToInt16(reminderMinutes);

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            //Create exception of first instance by giving start time
            RDOAppointmentItem exAppointment = recurrencePattern.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            exAppointment.ReminderMinutesBeforeStart = Convert.ToInt16(reminderModified);
            // save the appointment
            exAppointment.Save();

            // Sync and Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out messageExInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "WEE", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:inv/mail:comp/mail:alarm/mail:trigger/mail:rel[@related='START']", "m", reminderMinutes, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            // Get the exception of recurring meeting
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageExInvId));

            XmlNode appointmentMessageEx = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageExInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:desc", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:inv/mail:comp/mail:alarm/mail:trigger/mail:rel[@related='START']", "m", reminderModified, null, 1);

            #endregion
 
        }

        [Test, Description("Verify exception (adding different attachment) of a weekly recurring appointment is sync from ZCO")]
        [Category("Calendar")]
        [Bug("45724")]
        public void AppointmentRequest_CreateException_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string newContent1 = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string newContent2 = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageEx1InvId, messageEx2InvId;
            string file1 = GlobalProperties.TestMailRaw + "/photos/Picture1.jpg";
            string file2 = GlobalProperties.TestMailRaw + "/photos/Picture2.png";
            string file3 = GlobalProperties.TestMailRaw + "/photos/Picture3.jpg";
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);
            rAppt.Attachments.Add(file1, rdoAttachmentType.olByValue, 1, "Picture1.jpg");
            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            //Create exception of first instance by attaching a different file
            RDOAppointmentItem exAppointment1 = recurrencePattern.GetOccurence(startTimeLocal.AddDays(7)) as RDOAppointmentItem;
            exAppointment1.Body = newContent1;
            exAppointment1.Attachments.Add(file2, rdoAttachmentType.olByValue, 1, "Picture2.png");

            // save the appointment
            exAppointment1.Save();

            //Create exception of second instance by attaching a different file
            RDOAppointmentItem exAppointment2 = recurrencePattern.GetOccurence(startTimeLocal.AddDays(14)) as RDOAppointmentItem;
            exAppointment2.Body = newContent2;
            exAppointment2.Attachments.Add(file3, rdoAttachmentType.olByValue, 1, "Picture3.jpg");

            // save the appointment
            exAppointment2.Save();
            // Sync and Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(4), startTimeLocal.AddDays(11)));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out messageEx1InvId, 1);

            // Get the exception of recurring meeting
            // Verify all fields including the changed attachment
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageEx1InvId));

            XmlNode appointmentMessageEx = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageEx1InvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:desc", null, newContent1, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:mp", "filename", "Picture2.png", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:mp", "ct", "image/png", null, 1);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(11), startTimeLocal.AddDays(18)));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out messageEx2InvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageEx2InvId));
            appointmentMessageEx = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageEx2InvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:desc", null, newContent2, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:mp", "filename", "Picture3.jpg", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:mp", "ct", "image/jpeg", null, 1);

            #endregion

        }

    }
}