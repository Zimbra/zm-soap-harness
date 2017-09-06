using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapAdmin;
using System.IO;
using Soap;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.MeetingRequests.TimeZones
{
    [TestFixture]
    public class CreateMeetingRequest : BaseTestFixture
    {
        [Test, Description("Verify a meeting request is translated to the correct GMT time (standard time)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Send a meeting from ZCO to test account (on December 25)",
            "Verify the meeting start/end time is the correct GMT time for ZCO user",
            "Verify the meeting start/end time is correct GMT time for test account")
        ]
        public void CreateMeetingRequest_TimeZones_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, apptInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region Sync User verifies the GMT time

            zAccount.AccountZCO.sendSOAP(
                            new SearchRequest().
                                    Types("appointment").
                                    Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out apptInvId, 1);
            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(apptInvId));
            SoapTest soapTest = new SoapTest();
            
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + apptInvId + "']", null, null, null, 1);
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(3).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

        }

        [Test, Description("Verify a meeting request is translated to the correct GMT time (daylight savings time)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Send a meeting from ZCO to test account (on June 1, 2016)",
            "Verify the meeting start/end time is the correct GMT time for ZCO user",
            "Verify the meeting start/end time is correct GMT time for test account")
        ]
        public void CreateMeetingRequest_TimeZones_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 6, 1, 12, 0, 0);
            string messageInvId, apptInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region Sync User verifies the GMT time

            zAccount.AccountZCO.sendSOAP(
                            new SearchRequest().
                                    Types("appointment").
                                    Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out apptInvId, 1);
            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(apptInvId));
            SoapTest soapTest = new SoapTest();

            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + apptInvId + "']", null, null, null, 1);
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(3).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

        }
    }
}
