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

using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.AppointmentRequests.Recurring
{
    [TestFixture]
    public class GetRecurringAppointment : BaseTestFixture
    {
        [Test, Description("Verify a daily recurring (interval=1, occurrences=4) appointment request is synced")]
        [Category("SMOKE"), Category("Calendar")]
        public void GetRecurringAppointmentRequest_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "1";
            string recurringOccurrences = "4";
            string recurringFrequency = "DAI";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringOccurrences, null).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursDaily, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.AreEqual(recurrencePattern.Occurrences, Convert.ToInt16(recurringOccurrences), "Recurrence occurrences is same");
            #endregion

        }

        [Test, Description("Verify a daily recurring (every 3days, occurences=4) appointment request is synced")]
        [Category("Calendar")]
        public void GetRecurringAppointmentRequest_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "3";
            string recurringOccurrences = "4";
            string recurringFrequency = "DAI";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringOccurrences, null).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursDaily, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.AreEqual(recurrencePattern.Occurrences, Convert.ToInt16(recurringOccurrences), "Recurrence occurrences is same");
            #endregion
 
        }

        [Test, Description("Verify a daily recurring (no end date, occurs every 5 day) appointment request is synced")]
        [Category("Calendar")]
        public void GetRecurringAppointmentRequest_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "5";
            string recurringFrequency = "DAI";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, null, null).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursDaily, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.IsTrue(recurrencePattern.NoEndDate, "Check that no end date for occurrences exists");
            #endregion

        }

        [Test, Description("Verify a daily recurring(occurs every 2days, ends on a date) appointment request is synced")]
        [Category("Calendar")]
        public void GetRecurringAppointmentRequest_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "2";
            DateTime recurringEndate = new DateTime(2011, 1, 30);
            string recurringFrequency = "DAI";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringEndate, null).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursDaily, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.AreEqual(recurringEndate, recurrencePattern.PatternEndDate, "Check the end date for the recurrence pattern");
            #endregion

        }

        [Test, Description("Verify a daily recurring appointment request occurring every weekday is synced")]
        [Category("Calendar")]
        [BugAttribute("30404")]
        public void GetRecurringAppointmentRequest_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 27, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "1";
            string recurringOccurrences = "10";
            string recurringFrequency = "DAI";
            string recurringDays = "MO,TU,WE,TH,FR";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringOccurrences, recurringDays).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            // Bug summary says "Daily appt occurring every weekday gets converted to a weekly in ZCO" 
            // but as per Sam's comment "since the recurrence patterns are equivalent, we won't fix this." 
            // Hence hard coding the check for recurrence type=olRecursWeekly
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursWeekly, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.AreEqual(recurrencePattern.Occurrences, Convert.ToInt16(recurringOccurrences), "Recurrence occurrences is same");
            #endregion

        }

        [Test, Description("Verify a weekly recurring appointment request occurring every friday is synced")]
        [Category("Calendar")]
        public void GetRecurringAppointmentRequest_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 30, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "1";
            string recurringOccurrences = "4";
            string recurringFrequency = "WEE";
            string recurringDays = "FR";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringOccurrences, recurringDays).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            
            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursWeekly, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.AreEqual(recurrencePattern.Occurrences, Convert.ToInt16(recurringOccurrences), "Recurrence occurrences is same");
            #endregion

        }

        [Test, Description("Verify a weekly recurring appointment request occurring every 2 weeks on monday and tuesday is synced")]
        [Category("SMOKE"), Category("Calendar")]
        public void GetRecurringAppointmentRequest_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 27, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "2";
            string recurringFrequency = "WEE";
            string recurringDays = "MO, TU";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, null, recurringDays).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursWeekly, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.IsTrue(recurrencePattern.NoEndDate, "Check that appointment has not end date");
            #endregion

        }

        [Test, Description("Verify a weekly recurring (occurs every 2 Monday, ends on a given date) appointment request is synced")]
        [Category("Calendar")]
        public void GetRecurringAppointmentRequest_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2017, 01, 02, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "2";
            DateTime recurringEndate = new DateTime(2017, 01, 31);
            string recurringFrequency = "WEE";
            string recurringDays = "MO";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringEndate, recurringDays).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursWeekly, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.AreEqual(recurringEndate, recurrencePattern.PatternEndDate, "Check the end date for the recurrence pattern");
            #endregion

        }

        [Test, Description("Verify a weekly recurring appointment request occurring every 14 days on fridays is synced ")]
        [Bug("44495")]
        [Category("Calendar")]
        public void GetRecurringAppointmentRequest_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalTemp = DateTime.Now.AddDays(2).AddHours(6);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0); 
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, appointmentId;
            string recurringInterval = "14";
            string recurringFrequency = "DAI";
            string recurringDays = "FR";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, null, recurringDays).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddDays(2), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddDays(2), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursDaily, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, Convert.ToInt16(recurringInterval), "Recurrence interval is same");
            zAssert.IsTrue(recurrencePattern.NoEndDate, "Check that appointment has not end date");
            #endregion
        }
    }
}