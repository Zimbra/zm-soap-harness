using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapAdmin;
using System.IO;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.MeetingRequests
{

    [TestFixture]
    public class CreateMeetingRequest : BaseTestFixture
    {
        
        [Test, Description("Verify a meeting request is synced from ZCO (ZCO is organizer)")]
        [Category("SMOKE")]
        public void CreateMeetingRequest_Organizer_01()
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
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

        }
        [Test, Description("Verify a meeting request is synced from ZCO (ZCO is organizer)")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "Send a meeting from ZCO to test account", "Verify the meeting is received and all parameters exists from test account in ZCS")]
        public void CreateMeetingRequest_Organizer_02()
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
            rAppt.End = startTimeLocal.AddHours(3);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountB.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountB.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountB.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountB.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(3).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion
        }
        [Test, Description("Verify an all day meeting request is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "Send a all day meeting from ZCO to test account", "Verify the meeting is received and is a all day meeting from ZCS")]
        public void CreateMeetingRequest_Organizer_03()
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
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = true;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion
        }
        [Test, Description("Verify a non-allday but duratoin 24hrs meeting request is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "From ZCO send a meeting with duration 24 hrs", "Verify the meeting is received and duration is of 24 hrs from ZCS")]
        public void CreateMeetingRequest_Organizer_04()
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
            rAppt.End = startTimeLocal.AddHours(24);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(24).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

        }

        [Test, Description("Verify a modified meeting request is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "From ZCO send a meeting", "Verify the meeting is received to test account in ZCS"
            , "From ZCO modify the subject and start time", "Verify the modified subject and the starttime in ZCS")]
        public void CreateMeetingRequest_Organizer_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeModified = startTimeLocal.AddHours(1);
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
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(3).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

            #region Outlook Block

            //Modify appointment
            //Modify the subject and starttime

            rAppt.Subject = modifiedSubject;
            rAppt.Start = startTimeModified;

            //Send the appointment
            rAppt.Save();
            rAppt.Send();

            //Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + modifiedSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeModified.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(3).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", modifiedSubject, null, 1);
            #endregion

        }

        [Test, Description("Verify deleted meeting request is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "From ZCO send a meeting to test account", "From ZCS verfiy the meeting is received to test account",
            "From ZCO delete the meeting", "Verify the meeting does not exists in ZCS")]
        public void CreateMeetingRequest_Organizer_06()
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
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(3).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

            #region Outlook block
            //Cancel the meeting 
            rAppt.MeetingStatus = rdoMeetingStatus.olMeetingCanceled;

            //Send cancellation mail to attendee
            rAppt.Send();

            //oAppointment.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("appointment").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)).Query("subject:(" + apptSubject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 0);

            #endregion

        }

        [Test, Description("Verify meeting request with attachment synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "From ZCO create a meeting with attachment and send to test account", "From ZCS verify the meeting is received and has attachment")]
        public void CreateMeetingRequest_Organizer_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string filename = GlobalProperties.TestMailRaw + "/photos/Picture1.jpg";
            FileInfo fileinfo = new FileInfo(filename);
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
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.Attachments.Add(filename, rdoAttachmentType.olByValue, 1, "Picture1");
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);


            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(3).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:mp", "filename", "/photos/Picture1.jpg", null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:mp", "ct", "image/jpeg", null, 1);
            #endregion

        }

        [Test, Description("Verify meeting request with location synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "From ZCO send a meeting to test account with location", "From ZCS verify meeting is received and has location")]
        public void CreateMeetingRequest_Organizer_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string apptLocation = "location" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.Location = apptLocation;
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

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "loc", apptLocation, null, 1);
            #endregion
        }

        [Test, Description("Verify meeting request with resource=Location is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as admin and create a test account", "From ZCO send a meeting with resource=location to test account", "From ZCs verify the meeting is received and has location")]
        public void CreateMeetingRequest_Organizer_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string locationDisplayName = "location" + GlobalProperties.time() + GlobalProperties.counter();
            string locationName = locationDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, resourceId;
            #endregion

            #region Account Setup

            //Create the resource/equitment
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateCalendarResourceRequest().
                                   UserName(locationName).
                                   UserPassword(GlobalProperties.getProperty("defaultpassword.value")).
                                   DisplayName(locationDisplayName).
                                   ResourceType("Location"));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource[@name='" + locationName + "']", "id", null, out resourceId, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource/admin:a[@n='zimbraCalResType']", null, "Location", null, 1);

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
            rAppt.Resources = locationName;
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

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "d", locationName, null, 1);
            #endregion

        }

        [Test, Description("Verify meeting request with resource=Equipment is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateMeetingRequest_Organizer_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string eqDisplayName = "equipment" + GlobalProperties.time() + GlobalProperties.counter();
            string equipmentName = eqDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, resourceId;
            #endregion

            #region Account Setup

            //Create the resource/equitment
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateCalendarResourceRequest().
                                   UserName(equipmentName).
                                   UserPassword(GlobalProperties.getProperty("defaultpassword.value")).
                                   DisplayName(eqDisplayName).
                                   ResourceType("Equipment"));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource[@name='" + equipmentName + "']", "id", null, out resourceId, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource/admin:a[@n='zimbraCalResType']", null, "Equipment", null, 1);

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
            rAppt.Resources = equipmentName;
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

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "d", equipmentName, null, 1);
            #endregion

        }

        [Test, Description("Verify private meeting request is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [TestSteps("Auth as admin and create a test account", "From ZCO send a private meeting request to test acccount",
            "From ZCS verify the meeting is received and is private")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateMeetingRequest_Organizer_11()
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
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "class", "PRI", null, 1);
            #endregion

        }

        [Test, Description("Verify a meeting request with reminder is synced from ZCO (ZCO is organizer)")]
        [Category("Calendar")]
        [TestSteps("Auth as admin and create a test account", "From ZCO create a meeting request with reminder and send to test account",
            "From ZCS verify the meeting is received. The reminder should be different than that of organizer as reminder is independent.")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateMeetingRequest_Organizer_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string reminderMinutes = "20";
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
            rAppt.ReminderMinutesBeforeStart = Convert.ToInt16(reminderMinutes);
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

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            //bug 29963, the attendees reminder time is not dependant on Invitees time.
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:rel", "m", "5", null, 1);
            #endregion
        }

        [Test, Description("Verify a meeting moved to other calendar is synced from ZCO and attendee receives no updates")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a calendar folder in ZCO", "Create a meeting with a attendee in default calendar in ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt.", "In ZCO move the appt to the calendar folder", "Sync", "In ZWC verify appt is moved")]
        public void CreateMeetingRequest_Organizer_15()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, messageInvId2;
            #endregion

            #region Outlook Block

            // Create a new appointment
            // Create a calendar folder
            RDOFolder rdoCalendarFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(rdoCalendarFolder, "Check that the calendar folder exists");
            RDOFolder rFolder = rdoCalendarFolder.Folders.Add(folderName, rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(rFolder, "Check that the subfolder is created");

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
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

            #region Move the appt to different folder
            rAppt.Move(rFolder);
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block Verify appt is moved
            //Search the moved appt in new folder
            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                                Types("appointment").
                                                Query("in:(Calendar/" + folderName + ") " + "subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 1);

            #endregion

            #region SOAP Block Verify no notification is received by attendee

            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId2, 1);
            bool matched = false;

            if (messageInvId.Equals(messageInvId2))
            {
                matched = true;
            }
            zAssert.That(matched, "Invite id of the appointment before moving the appointment and after are some. Hence attendee did not receive any updates.");



            #endregion

        }

        [Test, Description("Verify a meeting request sent to a contact is synced to ZWC")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as admin", "Create a domain", "Add a user in that domain", "In ZCO as syncuser create a contact with that username", "Send meeting request to the contact",
            "Login as contact", "Verify meeting request is received", "Verify TO: field contains 'First Last' <email@domain.com>")]
        public void CreateMeetingRequest_Organizer_16()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string firstName = "FirstName" + GlobalProperties.time() + GlobalProperties.counter();
            string lastName = "LastName" + GlobalProperties.time() + GlobalProperties.counter();
            string companyName = "Company" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block
            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            rContact.FirstName = firstName;
            rContact.LastName = lastName;
            rContact.CompanyName = companyName;
            rContact.Email1Address = zAccount.AccountA.emailAddress;
            rContact.FileAs = (rContact.FirstName + " " + rContact.LastName);
            rContact.Save();

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
            rAppt.AllDayEvent = false;
            rAppt.To = rContact.Email1Address;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

        }

        [Test, Description("Verify from field and tracking status when meeting is sent to alias")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Login as admin", "Create a account. Create alias of this account", "From ZCO send meeting invitation to the alias", "Login as the alias and accept the meeting request",
            "Verify the response in ZCO, it should not contain the primary name in from field", "Verify tracking status of the attendee. It should contain alias in attendee list and should not add the primary address as another attendee")]
        public void CreateMeetingRequest_Organizer_17()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string aliasName = "alias" + GlobalProperties.time() + GlobalProperties.counter() + GlobalProperties.getProperty("defaultdomain.name");
            string messageInvId, messageCompNum;
            #endregion

            #region Outlook Block
            zAccount.AccountA.alias = aliasName;
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
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.alias;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountA.sendSOAP(
                                        new SearchRequest().
                                                Types("appointment").
                                                Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);



            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode GetAppointmentResponse = zAccount.AccountA.selectSOAP("//mail:appt", null, null, null, 1);
            zAccount.AccountA.selectSOAP("//mail:comp", "compNum", null, out messageCompNum, 1);

            string appStatus = "ACCEPT";
            zAccount.AccountA.sendSOAP(new AppointmentActionRequest(appStatus, messageInvId,
                   messageCompNum, zAccount.AccountZCO.emailAddress, apptSubject));
            zAccount.AccountA.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);
            #endregion

            # region Outlook Block
            // Verify attendee field contains alias name and the primary email address is not added as another attendee.
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar store");
            try
            {
                foreach (Redemption.RDORecipient r in rdoAppt.Recipients)
                {
                    if (!r.Address.Equals(zAccount.AccountZCO.emailAddress))
                    {
                        zAssert.AreEqual(r.Address, zAccount.AccountA.alias, "Verify attendee consists of account alias and not the primary email address.");
                        //olResponseAccepted (3)
                        zAssert.AreEqual(3, r.MeetingResponseStatus, "Response status of " + r.Address + " matched.");
                        zAssert.IsFalse((r.Address.Equals(zAccount.AccountA.emailAddress)), "Verify attendees does not contains primary email address");
                    }
                }
            }
            catch (System.Exception e)
            {
                // Catch the unknown domain exception
                Console.WriteLine(e.StackTrace);
            }
            #endregion

        }
    }
}