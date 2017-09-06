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

namespace clientTests.Client.Calendar.AppointmentRequests
{
    [TestFixture]
    public class CreateAppointment : BaseTestFixture
    {
        [Test, Description("Verify a appointment request is synced from ZCO")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details such as start time, end time, subject, content")]
        public void CreateAppointment_01()
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

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify an all day appointment request is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a all-day appointment from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check all details of appt and check whether it is all-day.")]
        public void CreateAppointment_02()
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
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = true;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)));
         
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            #endregion

        }

        [Test, Description("Verify an appointment request with attachment is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment having attachement from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appointment. Check whether the apointment has attachment")]
        public void CreateAppointment_03()
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
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.Attachments.Add(filename, rdoAttachmentType.olByValue, 1, "Picture1");
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:mp", "filename", "Picture1.jpg", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:mp", "ct", "image/jpeg", null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion
 
        }

        [Test, Description("Verify a modified appointment is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment from ZCO", "Change the subject and startime", "Login to webclient as syncuser",
            "Verify the appointment is created. Check whether the appt has modified subject and start time.")]
        public void CreateAppointment_04()
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
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

            #region Outlook Block

            //Modify appointment
            //Modify the subject and starttime

            rAppt.Subject = modifiedSubject;
            rAppt.Start = startTimeModified;

            //Send the appointment
            rAppt.Save();

            //Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + modifiedSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", modifiedSubject, null, 1);
            soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeModified.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeModified.AddHours(2).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

        }

        [Test, Description("Verify a canceled appointment is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt", "Delete/Cancel the appt from ZCO", "In ZCS check whether the appt does not exist")]
        public void CreateAppointment_05()
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
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

            #region Delete appointment Outlook
            // Delete the appointment
            rAppt.Delete(true);

            // Send/Receive outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region soap block

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            zAccount.AccountZCO.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_ITEM", null, 1);
            #endregion
        }

        [Test, Description("Verify a appointment request with location is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment with location from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the location exists.")]
        public void CreateAppointment_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string location = "location" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.Location = location;
            // Save the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "loc", location, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

        }

        [Test, Description("Verify a non-allday but duration 24hrs appointment request is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment with duration of 24hrs from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the duration is of 24hrs.")]
        public void CreateAppointment_07()
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
            rAppt.End = startTimeLocal.AddHours(24);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(24).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion
        }

        [Test, Description("Verify a appointment request with resource=Location is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment with location from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the location exists.")]
        public void CreateAppointment_08()
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
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.Location = locationName;
            // Save the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "loc", locationName, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

        }

        [Test, Description("Verify a appointment request with resource=Equipment is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment with resource from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the resource exists.")]
        public void CreateAppointment_09()
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
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.Resources = equipmentName;
            // Save the appointment
            rAppt.Send();
            rAppt.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:at", "d", equipmentName, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

        }

        [Test, Description("Verify a appointment request with reminder is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment with reminder from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the reminder exists.")]
        public void CreateAppointment_10()
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
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = Convert.ToInt16(reminderMinutes);
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rel", "m", reminderMinutes, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

        }

        [Test, Description("Verify modified reminder is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment with reminder from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the reminder exists.", "Modify the reminder in ZCO", "Verify the changed reminder in ZCS")]
        public void CreateAppointment_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string reminderMinutes = "30";
            string reminderModified = "20";
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = Convert.ToInt16(reminderMinutes);
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rel", "m", reminderMinutes, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

            #region Modify reminder
            // Modify the reminder
            rAppt.ReminderMinutesBeforeStart = Convert.ToInt16(reminderModified); ;
            rAppt.Save();

            // Sync outlook with the modified the reminder
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rel", "m", reminderModified, null, 1);
            #endregion

        }

        [Test, Description("Verify a appointment request without reminder is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment without reminder from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the reminder does not exists.")]
        public void CreateAppointment_12()
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

            rAppt.ReminderSet = false;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify a appointment request after enabling reminder is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment without reminder from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the reminder does not exists.",
            "Enable reminder of the appointment", "In ZCS verify reminder is enabled")]
        public void CreateAppointment_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string reminderMinutes = "30";
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = false;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rel", null, null, null, 0);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

            #region Modify reminder
            // Modify the reminder
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = Convert.ToInt16(reminderMinutes); ;
            rAppt.Save();

            // Sync outlook with the modified the reminder
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rel", "m", reminderMinutes, null, 1);
            #endregion

        }

        [Test, Description("Verify a appointment request after removing reminder is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment with reminder from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the reminder exists.",
            "Disable reminder from ZCO of the appointment", "In ZCS verify reminder is disabled")]
        public void CreateAppointment_14()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string reminderMinutes = "30";
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = Convert.ToInt16(reminderMinutes); ;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rel", "m", reminderMinutes, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

            #region Modify reminder
            // Modify the reminder
            rAppt.ReminderSet = false;
            rAppt.Save();

            // Sync outlook with the modified the reminder
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rel", null, null, null, 0);
            #endregion

        }

        [Test, Description("Verify a private appointment request is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a private appointment with reminder from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the appt is private.")]
        public void CreateAppointment_15()
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

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.Sensitivity = (int)rdoSensitivity.olPrivate;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "class", "PRI", null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify a appointment moved to other calendar is synced from ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a calendar folder in ZCO", "Create a appointment in default caelndar in ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt.", "In ZCO move the appt to the calendar folder", "Sync", "In ZWC verify appt is moved")]
        public void CreateAppointment_16()
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
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
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
                                                Query("in:(Calendar/" + folderName + ") " + "subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId2, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId2));
            zAccount.AccountZCO.selectSOAP("//mail:appt", null, null, null, 1);

            #endregion

        }

        [Test, Description("Verify that email messages copied into appointment are not renamed to lsmssp32 after sync")]
        [Category("Calendar")]
        [Bug("52075")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a private appointment with reminder from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details of appt. Check whether the appt is private.")]
        public void CreateAppointment_17()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject1 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, messageInvId;
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(
                                new AddMsgRequest().
                                        AddMessage(new MessageObject().
                                                        SetParent(inboxId).
                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject1 + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body


")));
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse", null, null, null, 1);
            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject1);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.Attachments.Add(rdoMail, rdoAttachmentType.olEmbeddedItem, 1, subject1);
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2))
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:mp", "filename", subject1, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");
            #endregion

        }

        [Test, Description("Verify a appointment request with HTML body content is synced from ZCO to ZWC correctly")]
        [Category("Calendar")]
        [Bug("61957")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a simple appointment from ZCO", "Login to webclient as syncuser",
            "Verify the appointment is created. Check the details such as start time, end time, subject, content")]
        /* Prashant A - Currently, this test does not looks to be 100% automatable, due to below reasons:
         * 1. User creating the appointment should have Compose Mail preference "As HTML" - default is "As Text"
         * 2. GetMsgResponse of the appointment message - does not contains //mail:mp attribute (may have changed since test was originally wrote
         *    thus making verification of presence of html content not possible in ZWC
         * Let us wait for 61957 to get fixed and then can decide if test can be automated or need to write manual testcase
         */
        public void CreateAppointment_18()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string htmlContent = "<HTML><H2><B>The body of this message will appear in HTML</B></H2></HTML>";
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.HTMLBody = htmlContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(1)));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:descHtml", null, htmlContent, null, 1);
            //zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1); once the bug is fixed need to put the correct path.
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        

    }
}
