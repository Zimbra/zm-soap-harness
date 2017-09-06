using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapAdmin;
using SoapWebClient;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.AppointmentRequests
{
    [TestFixture]
    public class GetAppointment : BaseTestFixture
    {
        [Test, Description("Verify a simple appointment request is synced to ZCO ")]
        [Category("SMOKE"), Category("Calendar")]
        public void GetAppointment_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion
        }

        [Test, Description("Verify a appointment request with resource=Location is synced")]
        [Category("Calendar")]
        public void GetAppointment_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, resourceId;
            string resource1DisplayName = "location" + GlobalProperties.time() + GlobalProperties.counter();
            string resource1Name = resource1DisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP Block

            //Create the resource/equitment
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateCalendarResourceRequest().
                                   UserName(resource1Name).
                                   UserPassword(GlobalProperties.getProperty("defaultpassword.value")).
                                   DisplayName(resource1DisplayName).
                                   ResourceType("Location"));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource[@name='" + resource1Name + "']", "id", null, out resourceId, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource/admin:a[@n='zimbraCalResType']", null, "Location", null, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    AddResource(resource1Name).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(resource1Name, rdoAppointmentItem.Resources, "Check that the resource is in the meeting request");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

        }

        [Test, Description("Verify a appointment request with resource=Equipment is synced")]
        [Category("Calendar")]
        public void GetAppointment_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, resourceId;
            string resource1DisplayName = "equipment" + GlobalProperties.time() + GlobalProperties.counter();
            string resource1Name = resource1DisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP Block

            //Create the resource/equipment
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateCalendarResourceRequest().
                                   UserName(resource1Name).
                                   UserPassword(GlobalProperties.getProperty("defaultpassword.value")).
                                   DisplayName(resource1DisplayName).
                                   ResourceType("Equipment"));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource[@name='" + resource1Name + "']", "id", null, out resourceId, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource/admin:a[@n='zimbraCalResType']", null, "Equipment", null, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    AddResource(resource1Name).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(resource1Name, rdoAppointmentItem.Resources, "Check that the resource is in the meeting request");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

        }

        [Test, Description("Verify a appointment request with Location is synced")]
        [Category("Calendar")]
        public void GetAppointment_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId;
            string resource1DisplayName = "location" + GlobalProperties.time() + GlobalProperties.counter();
            string resource1Name = resource1DisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    Location(resource1Name).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(resource1Name, rdoAppointmentItem.Location, "Check that the resource is in the meeting request");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

        }

        [Test, Description("Verify a appointment request with reminder is synced")]
        [Category("Calendar")]
        public void GetAppointment_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 

            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();

            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string reminderMinutes = "30";
            string messageCallItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddReminder(reminderMinutes).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            zAssert.AreEqual(30, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            
            #endregion
        }

        [Test, Description("Verify a appointment request with reminder modified is synced")]
        [Category("Calendar")]
        public void GetAppointment_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);

            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 

            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();

            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string reminderMinutes = "30";
            string reminderModified = "45";
            string uId, appointmentId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddReminder(reminderMinutes).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(appointmentId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            zAssert.AreEqual(30, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion

            #region Modify reminder SOAP
            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject(uId).
                                    Summary(message2Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    AddReminder(reminderModified).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out appointmentId, 1);
            #endregion

            #region Sync Outlook and verify 

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message2Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message2Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            zAssert.AreEqual(45, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion

        }

        [Test, Description("Verify a appointment request without reminder is synced")]
        [Category("Calendar")]
        public void GetAppointment_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

        }

        [Test, Description("Verify a appointment request after enabling the reminder is synced")]
        [Category("Calendar")]
        public void GetAppointment_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);

            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 

            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();

            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, uId, appointmentId;
            string message2Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string reminderMinutes = "30";
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(appointmentId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

            #region Enable reminder
            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject(uId).
                                    Summary(message2Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    AddReminder(reminderMinutes).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message2Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message2Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC.ToString(), rdoAppointmentItem.Start.ToUniversalTime().ToString(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1).ToString(), rdoAppointmentItem.End.ToUniversalTime().ToString(), "Check appointment end time");
            zAssert.AreEqual(30, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion

        }

        [Test, Description("Verify a appointment request with reminder removed, is synced")]
        [Category("Calendar")]
        public void GetAppointment_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);

            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();

            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, uId, appointmentId;
            string message2Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string reminderMinutes = "30";
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddReminder(reminderMinutes).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(appointmentId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            zAssert.AreEqual(30, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion

            #region Remove reminder
            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject(uId).
                                    Summary(message2Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message2Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message2Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            zAssert.AreEqual(rdoAppointmentItem.ReminderMinutesBeforeStart, 0, "Reminder is removed");
            #endregion

        }

        [Test, Description("Verify a private appointment request is synced to ZCO ")]
        [Category("Calendar")]
        public void GetAppointment_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    setPrivate().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            zAssert.AreEqual(rdoAppointmentItem.Sensitivity, 2, "Verify that the appointment is private" );
            #endregion

        }

        [Test, Description("Verify a appointment request moved to another calendar folder is synced to ZCO ")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Login as syncuser", "Create a calendar folder", "Create a appointment in default calendar", "In ZCO verify appt exists", "In ZWC move the appointment to another calendar fodler",
            "In ZCO verify appointment is moved")]
        public void GetAppointment_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string calFolderId, account2ParentId, folderId, uId, appointmentId, messageCallItemId;
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetView("appointment").
                                                SetName(folderName).
                                                SetParent(calFolderId))
                                        );

            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folderId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder", "l", null, out account2ParentId, 1);

            // Add a message to the account mailbox

            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(appointmentId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            string rdoAppointmentId = rdoAppointmentItem.EntryID;
            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

            #region Move Appt using SOAP
            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject(uId).
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);


            #endregion

            #region Sync Outlook
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOFolder rFolder = OutlookMailbox.Instance.findFolder(folderName);
            zAssert.IsNotNull(rFolder, "Check that the Folder exists");

            rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject, rFolder, true);

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");
            #endregion

        }

        [Test, Description("Verify a appointment request with reminder set to 'Never' is synced")]
        [Category("Calendar")]
        [Bug("34782")]
        public void GetAppointment_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();

            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(messageSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(messageContent).
                            AddInv(new InvObject().
                                    Summary(messageSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(messageSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(messageSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            zAssert.AreEqual(0, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");

            #endregion
        }

    }
}
