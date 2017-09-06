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
    public class CreateMeetingRequest_RecurringDaily : BaseTestFixture
    {
        [Test, Description("Verify a meeting request (recurring daily) is translated to the correct GMT time over Daylight Savings Time transition dates")]
        [Bug("50026")] 
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Send a meeting from ZCO to test account (recurring daily)",
            "Verify the meeting start/end time is correct GMT time before DST transition (the second Sunday in March)")
        ]
        public void CreateMeetingRequest_TimeZones_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 1, 1, 12, 0, 0);
            string apptInvId, apptRidz;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.Duration = 60;

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            //Send the appointment
            //rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region Appointment Instance: Standard Time
            zAccount.AccountA.sendSOAP(
                            new SearchRequest().
                                    Types("appointment").
                                    CalExpandInst(new DateTime(2010, 3, 1, 0, 0, 0), new DateTime(2010, 3, 2, 0, 0, 0)).
                                    Query("subject:(" + apptSubject + ")")
                        );

            XmlNode appt = zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);
            zAccount.AccountA.selectSOAP(appt, "//mail:inst", "ridZ", null, out apptRidz, 1);

            zAssert.AreEqual(
                (new DateTime(2010, 3, 1, 12, 0, 0)).ToUniversalTime(),
                DateTime.ParseExact(apptRidz, "yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture),
                "Verify that the start time (UTC format) is correct");

            #endregion

            #region Appointment Instance: Daylight Savings Time

            zAccount.AccountA.sendSOAP(
                            new SearchRequest().
                                    Types("appointment").
                                    CalExpandInst(new DateTime(2010, 4, 1, 0, 0, 0), new DateTime(2010, 4, 2, 0, 0, 0)).
                                    Query("subject:(" + apptSubject + ")")
                        );

            appt = zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);
            zAccount.AccountA.selectSOAP(appt, "//mail:inst", "ridZ", null, out apptRidz, 1);
            zAssert.AreEqual(
                (new DateTime(2010, 4, 1, 12, 0, 0)).ToUniversalTime(),
                DateTime.ParseExact(apptRidz, "yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture),
                "Verify that the start time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify a meeting request (recurring daily) is translated to the correct GMT time over Standard Time transition dates")]
        [Bug("50026")] 
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Send a meeting from ZCO to test account (recurring daily)",
            "Verify the meeting start/end time is correct GMT time before DST transition (the first Sunday in November)")
        ]
        public void CreateMeetingRequest_TimeZones_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 1, 1, 12, 0, 0);
            string apptInvId, apptRidz;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.Duration = 60;

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            //Send the appointment
            //rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region Test Account verifies the GMT time

            #region Appointment Instance: Standard Time

            zAccount.AccountA.sendSOAP(
                            new SearchRequest().
                                    Types("appointment").
                                    CalExpandInst(new DateTime(2010, 11, 1, 0, 0, 0), new DateTime(2010, 11, 2, 0, 0, 0)).
                                    Query("subject:(" + apptSubject + ")")
                        );

            XmlNode appt = zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);
            zAccount.AccountA.selectSOAP(appt, "//mail:inst", "ridZ", null, out apptRidz, 1);

            zAssert.AreEqual(
                (new DateTime(2010, 11, 1, 12, 0, 0)).ToUniversalTime(),
                DateTime.ParseExact(apptRidz, "yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture),
                "Verify that the start time (UTC format) is correct");

            #endregion

            #region Appointment Instance: Daylight Savings Time

            zAccount.AccountA.sendSOAP(
                            new SearchRequest().
                                    Types("appointment").
                                    CalExpandInst(new DateTime(2010, 11, 29, 0, 0, 0), new DateTime(2010, 11, 30, 0, 0, 0)).
                                    Query("subject:(" + apptSubject + ")")
                        );

            appt = zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);
            zAccount.AccountA.selectSOAP(appt, "//mail:inst", "ridZ", null, out apptRidz, 1);
            zAssert.AreEqual(
                (new DateTime(2010, 11, 29, 12, 0, 0)).ToUniversalTime(),
                DateTime.ParseExact(apptRidz, "yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture),
                "Verify that the start time (UTC format) is correct");

            #endregion

            #endregion

        }

    }
}