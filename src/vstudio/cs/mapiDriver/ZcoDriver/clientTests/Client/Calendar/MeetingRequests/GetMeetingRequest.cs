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

namespace clientTests.Client.Calendar.MeetingRequests
{
    [TestFixture]
    public class GetMeetingRequest : BaseTestFixture
    {
        [Test, Description("Verify a meeting request is synced to ZCO")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS as test acc send meeting to syncuser", "From ZCO verify the meeting is received")]
        public void GetMeetingRequest_Organizer_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");

            #endregion

        }

        [Test, Description("Verify a meeting request with resource=Location is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account and a resource=location", "From ZCS as test account send meeting to syncuser", "From ZCO verify the meeting is recevied and has resource")]
        public void GetMeetingRequest_Organizer_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string resource1DisplayName = "location1" + GlobalProperties.time() + GlobalProperties.counter();
            string resource1Name = resource1DisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string messageCallItemId, resourceId;
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

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).AddResource(resource1Name).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(resource1Name, rdoAppointmentItem.Resources, "Check that the resource is in the meeting request");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");


            #endregion

        }

        [Test, Description("Verify a meeting request with resource=Equipment is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account and a resource=equipment", "From ZCS as test account send meeting to syncuser", "From ZCO verify the meeting is recevied and has resource")]
        public void GetMeetingRequest_Organizer_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string resource1DisplayName = "location1" + GlobalProperties.time() + GlobalProperties.counter();
            string resource1Name = resource1DisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string messageCallItemId, resourceId;
            #endregion

            #region Account Setup

            //Create the resource/equipment
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateCalendarResourceRequest().
                                   UserName(resource1Name).
                                   UserPassword(GlobalProperties.getProperty("defaultpassword.value")).
                                   DisplayName(resource1DisplayName).
                                   ResourceType("Equipment"));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource[@name='" + resource1Name + "']", "id", null, out resourceId, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource/admin:a[@n='zimbraCalResType']", null, "Equipment", null, 1);

            #endregion

            #region SOAP Block

            // Add a message to the account mailbox

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddResource(resource1Name).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");
            zAssert.AreEqual(resource1Name, rdoAppointmentItem.Resources, "Check that the resource is in the meeting request");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");

            #endregion

        }

        [Test, Description("Verify a meeting request with location is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS as test account send meeting to syncuser having location", "From ZCO verify the meeting is recevied and has location")]
        public void GetMeetingRequest_Organizer_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string location1Name = "location" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP block
            // Add a message to the account mailbox
            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    Location(location1Name).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(location1Name, rdoAppointmentItem.Location, "Check that the location is in the meeting request");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");

            #endregion

        }

        [Test, Description("Verify a meeting request with reminder is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("29963")]
        [TestSteps("Auth as admin and create a test account", "From ZCS as test account send a meeting with reminder to syncuser",
            "From ZCO verify the meeting is received and has reminder (Reminder should be different)")]
        public void GetMeetingRequest_Organizer_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string reminderMinutes = "30";
            #endregion

            #region SOAP Block
            // Add a message to the account mailbox

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddReminder(reminderMinutes).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            //bug 29963, the attendees reminder time is not dependant on Invitees time.
            zAssert.AreEqual(5, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion
        }

        [Test, Description("Verify a meeting request with reminder modified is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS as syncuser send a meeting to test acc", "From ZCS modify the reminder", "From ZCO as syncuser verify that reminder has modified value")]
        public void GetMeetingRequest_Organizer_06()
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
            string uId, appointmentId, messageCallItemId;
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddReminder(reminderMinutes).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "apptId", null, out uId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountA.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject(uId).
                                    Summary(message2Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    AddReminder(reminderModified).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountA.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message2Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message2Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            //bug 29963, the attendees reminder time is not dependant on Invitees time.
            zAssert.AreEqual(5, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion
        }

        [Test, Description("Verify a meeting request without reminder is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS as syncuser send a meeting without reminder", "From ZCO as syncuser verify the reminder does not exists in meeting")]
        public void GetMeetingRequest_Organizer_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountA.emailAddress).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

        }

        [Test, Description("Verify a meeting request after enabling reminder is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin user and create a test account", "From ZCS send a meeting to test account", "Enable the reminder from ZCS", "From ZCO as syncuser verify the reminder is enabled")]
        public void GetMeetingRequest_Organizer_08()
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
            string uId, appointmentId, messageCallItemId;
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "apptId", null, out uId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountA.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject(uId).
                                    Summary(message2Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    AddReminder(reminderMinutes).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountA.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message2Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message2Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            //bug 29963, the attendees reminder time is not dependant on Invitees time.
            zAssert.AreEqual(5, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion

        }

        [Test, Description("Verify a meeting request after removing the reminder is synced to ZCO")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCO send a meeting with reminder to test account", "Remove the reminder", "From ZCO verify the reminder is removed")]
        public void GetMeetingRequest_Organizer_09()
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
            string uId, appointmentId, messageCallItemId;
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddReminder(reminderMinutes).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "apptId", null, out uId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountA.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject(uId).
                                    Summary(message2Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountA.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message2Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message2Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            //bug 29963, the attendees reminder time is not dependant on Invitees time.
            zAssert.IsTrue(rdoAppointmentItem.ReminderSet, "Reminder is set");
            zAssert.AreEqual(5, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");
            #endregion

        }

        [Test, Description("Verify a private meeting request is synced to ZCO")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin user and create a test acc", "From ZCs as test account send a private meeting to syncuser", "From ZCO verify the meeting is private")]
        public void GetMeetingRequest_Organizer_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    setPrivate().
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion
        }

        [Test, Description("Verify a meeting request moved to another calendar folder is synced to ZCO ")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Login as account2", "Create a calendar folder", "Create a meeting with syncuser as attendee in default calendar", "In ZCO verify appt exists", "In ZWC move the appointment to another calendar fodler",
            "In ZCO verify no update is received")]
        public void GetMeetingRequest_Organizer_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string account2FolderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string account2CalendarFolderId, account2ParentId, account2FolderId, uId, appointmentId, messageCallItemId;
            #endregion

            #region SOAP Block

            zAccount.AccountB.sendSOAP(new GetFolderRequest());
            zAccount.AccountB.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out account2CalendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountB.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetView("appointment").
                                                SetName(account2FolderName).
                                                SetParent(account2CalendarFolderId))
                                        );

            zAccount.AccountB.selectSOAP("//mail:folder", "id", null, out account2FolderId, 1);
            zAccount.AccountB.selectSOAP("//mail:folder", "l", null, out account2ParentId, 1);

            // Add a message to the account mailbox

            zAccount.AccountB.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountB.emailAddress).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountB.selectSOAP("//mail:CreateAppointmentResponse", "apptId", null, out uId, 1);
            zAccount.AccountB.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountB.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountB.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");
            string rdoAppointmentId = rdoAppointmentItem.EntryID;
            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion

            #region Move Appt using SOAP
            zAccount.AccountB.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().SetParent(account2ParentId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject(uId).
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountB.emailAddress).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountB.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);


            #endregion

            #region Sync Outlook
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");
            zAssert.AreEqual(rdoAppointmentId, rdoAppointmentItem.EntryID, "IDs are same hence no update is received");
            #endregion
        }

        [Test, Description("Verify a meeting request send to a contact group is synced to ZCS. Verify the response of syncuser.")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Login as account2", "Create a contact group with 10 user, one of them is syncuser.", "Create a meeting and send to the DL",
            "In ZCO verify appt request is received", "Respond to the meeting (Accept)", "In ZCS verify response is received")]
        public void GetMeetingRequest_Organizer_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            int loopCount = 9;
            string dlName = "DLName" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentId, messageCallItemId;
            #endregion

            #region Account Setup
            ArrayList oUserCollection = new ArrayList();
            zAccount account1 = new zAccount();
          
            // Create 9 account for DL
            zAccount[] dlAccount = new zAccount[loopCount];
            for (int userCount = 0; userCount < loopCount; userCount++)
            {
                dlAccount[userCount] = new zAccount();
                oUserCollection.Add(dlAccount[userCount].emailAddress);

            }
            #endregion

            #region SOAP Create Dist List

            string dlmembers = null;

            for (int j = 0; j < loopCount; j++)
            {
                dlmembers = dlmembers + (dlAccount[j].emailAddress + ",");
            }
            dlmembers = dlmembers + zAccount.AccountZCO.emailAddress;

            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                                        AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", dlmembers).
                                            AddContactAttribute("type", "group")));

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region SOAP Send meeting to DL
            // Addresses in DL does not expand as in AJAX client

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Outlook Accept the meeting
            OutlookCommands.Instance.Sync();
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar");
            zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the subject of the meeting");

            RDOMeetingItem rMeeting = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppt);
            rMeeting.To = zAccount.AccountA.emailAddress;
            rMeeting.Recipients.ResolveAll(null, null);
            rMeeting.Send();

            OutlookCommands.Instance.Sync();

            string windowTitle = "Accepted: " + message1Subject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            #endregion
        }

        [Test, Description("Verify a meeting request sent to a contact is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Login as admin", "Create a domain", "Add a user account2 in that domain", "In ZCS as account2 create a contact of syncuser", "Send meeting request to the contact",
            "Login as syncuser from ZCO", "Verify meeting request is received", "Verify TO: field contains 'First Last' <email@domain.com>")]
        public void GetMeetingRequest_Organizer_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstName = "Firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastName = "Lastname" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string contactId, appointmentId, messageCallItemId;
            #endregion

            #region SOAP Create contact and send meeting

            // Create contact of syncuser
            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                AddContactAttribute("firstName", firstName).
                AddContactAttribute("lastName", lastName).
                AddContactAttribute("email", zAccount.AccountZCO.emailAddress)));

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn/mail:a[@n='email']", null, null, out contactId, 1);

            // Send meeting to the contact

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, contactId).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddAttendee(contactId).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            // The recipient list contains both the organizer and attendee
            // Require that at least the attenee is in the list
            bool found = false;

            foreach (RDORecipient rdoRecipients in rdoAppointmentItem.Recipients)
            {
                if (rdoRecipients.Address.Equals(zAccount.AccountZCO.emailAddress))
                {
                    found = true; // the attendee is in the recipient list
                }
            }
            zAssert.IsTrue(found, "Check that the attendee is in the recipient list");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            #endregion
        }

        [Test, Description("sending a meeting request to a dlList whose one of the member is ZCO user.")]
        [Category("Calendar")]
        [Bug("6778")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account and a resource=location", "From ZCS as test account send meeting to syncuser", "From ZCO verify the meeting is recevied and has resource")]
        public void GetMeetingRequest_Organizer_14()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string distlistName = "distList" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentId, dlId, messageId;
            #endregion

            #region SOAP block to create distribution list with one contact
            ArrayList distlist = new ArrayList();
            distlist.Add(zAccount.AccountZCO.emailAddress);
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateDistributionListRequest().ListName(distlistName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:CreateDistributionListResponse/admin:dl", "id", null, out dlId, 1);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddDistListMemberRequest().AddMembers(dlId, distlist));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddDistributionListMemberResponse", null, null, null, 1);
            #endregion

            #region SOAP Send meeting to DL
            // Addresses in DL does not expand as in AJAX client

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(messageSubject).
                            AddAddress(MessageObject.AddressType.To, distlistName).
                            BodyTextPlain(messageContent).
                            AddInv(new InvObject().
                                    Summary(messageSubject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddAttendee(distlistName).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            #endregion

            #region Outlook Accept the meeting
            OutlookCommands.Instance.Sync();
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(messageSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar");
            zAssert.IsTrue(rdoAppt.Body.Contains(messageContent), "Verify the subject of the meeting");

            RDOMeetingItem rMeeting = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppt);
            rMeeting.To = zAccount.AccountA.emailAddress;
            rMeeting.Recipients.ResolveAll(null, null);
            rMeeting.Send();
            OutlookCommands.Instance.Sync();

            string windowTitle = "Accepted: " + messageSubject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            #endregion
        }
    }
}