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

namespace clientTests.Client.Calendar.MeetingRequests.Recurring
{
    [TestFixture]
    public class CreateMeetingRequest_RecurringWeekly : BaseTestFixture
    {
        [Test, Description("Verify a weekly meeting request is synced to ZCO (ZCO is organizer)")]
        [Bug("50026")] //Even though the test case passes, It has an issue. After recurring appointment is created, it tries to send the invite message and fails, resulting in undeliverable message.
        [Category("Calendar")]
        public void CreateMeetingRequest_RecurrenceWeekly_01()
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
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;

            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                                                    Types("appointment").
                                                    Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2))
                                                );

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);


            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:rule", "freq", "WEE", null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify a private weekly meeting request is synced to ZCO (ZCO is organizer)")]
        [Bug("50026")] //Even though the test case passes, It has an issue. After recurring appointment is created, it tries to send the invite message and fails, resulting in undeliverable message.
        [Category("Calendar")]
        public void CreateMeetingRequest_RecurrenceWeekly_02()
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
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.Sensitivity = (int)rdoSensitivity.olPrivate;
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;

            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                                                    Types("appointment").
                                                    Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2))
                                                );

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);


            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:rule", "freq", "WEE", null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            //zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            //zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "class", "PRI", null, 1);
            #endregion

        }
    }
}