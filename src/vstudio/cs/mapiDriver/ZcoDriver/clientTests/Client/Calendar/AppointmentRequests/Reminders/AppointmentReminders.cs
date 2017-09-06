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

namespace clientTests.Client.Calendar.AppointmentRequests.Reminders
{
    public class AppointmentReminders : BaseTestFixture 
    {

        // FYI ... Reminder dialog box button labels
        private static readonly string DialogButtonLabelDismiss = "&Dismiss";
        private static readonly string DialogButtonLabelDismissAll = "Dismiss &All";
        
        [Test, Description("Verify the remidner popup appears.")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.NOSYNC)]
        [TestSteps(
            "ZCO: Create an appointment that happens with a reminder that is due",
            "ZCO: wait for the reminder popup.",
            "ZCO: dismiss the reminder")]
        public void CreateAppointment_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = DateTime.Now.AddMinutes(10);
            #endregion

            #region Test Case Setup

            // Make sure no reminder boxes are already up
            
            while (NativeWIN32.WindowVisible(
                    "reminder",
                    0,
                    NativeWIN32.TitleComparison.Contains))
            {
                NativeWIN32.ProcessDialogBoxByButtonLabel(
                   "reminder",
                   AppointmentReminders.DialogButtonLabelDismissAll,
                   NativeWIN32.TitleComparison.Contains);
            }
            

            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 20;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            // Make sure the dialog box is shown
            zAssert.IsTrue(
                NativeWIN32.WindowVisible(
                    "reminder",
                    NativeWIN32.DefaultWindowWaitTime,
                    NativeWIN32.TitleComparison.Contains),
                "Verify the reminder dialog exists");

            // Close the reminder by clicking dimiss
            
            zAssert.Greater(
                NativeWIN32.ProcessDialogBoxByButtonLabel(
                    "reminder",
                    AppointmentReminders.DialogButtonLabelDismiss,
                    NativeWIN32.TitleComparison.Contains),
                0,
                "Verify that the button was clicked");
           
            // Make sure the dialog box doesn't come back
            System.Threading.Thread.Sleep(10000);
            zAssert.IsFalse(
                NativeWIN32.WindowVisible(
                    "reminder",
                    0,
                    NativeWIN32.TitleComparison.Contains),
                "Verify the reminder dialog does not return");

            // Sync outlook with reminder initially not set
            OutlookCommands.Instance.Sync();

            // Verify the object reminder is not enabled
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment item is found");

            zAssert.IsFalse(rdoAppointmentItem.ReminderSet, "Verify the appointment reminder is not set");

            #endregion

        }

        [Test, Description("Verify a appointment request after enabling reminder is synced from ZCO")]
        [Category("Calendar")]
        [Bug("5957")]
        [SyncDirection(SyncDirection.NOSYNC)]
        [TestSteps(
            // http://bugzilla.zimbra.com/show_bug.cgi?id=5957#c4
            "in outlook create an appointment that happens soon or in the past and make sure that it has a reminder.",
            "when it is saved, the reminder should come up right away.  just close the window (do not dismiss)",
            "sync.  when the sync is done, the reminder window will come up again (dunno why)...now dismiss it",
            "sync.  when the sync finishes, you will have a duplicate appt.  There should only be one.")]
        public void CreateAppointment_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = DateTime.Now.AddMinutes(10);
            #endregion

            #region Outlook Block
            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 20;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            // Close the dialog box
            zAssert.IsTrue(NativeWIN32.WindowVisible("reminder", NativeWIN32.DefaultWindowWaitTime, NativeWIN32.TitleComparison.Contains), "Verify the reminder dialog exists");
            NativeWIN32.ProcessDialogBoxByCommand("reminder", NativeWIN32.DialogBoxSysCommandParams.SC_CLOSE, NativeWIN32.TitleComparison.Contains);
            zAssert.IsFalse(NativeWIN32.WindowVisible("reminder", 5, NativeWIN32.TitleComparison.Contains), "Verify the reminder dialog exits");

            // Sync outlook with reminder initially not set
            OutlookCommands.Instance.Sync();

            // Sometimes, the dialog box reappears.  Close it again.
            if (NativeWIN32.WindowVisible("reminder", NativeWIN32.DefaultWindowWaitTime, NativeWIN32.TitleComparison.Contains))
            {
                NativeWIN32.ProcessDialogBoxByCommand("reminder", NativeWIN32.DialogBoxSysCommandParams.SC_CLOSE, NativeWIN32.TitleComparison.Contains);
            }

            // Verify that only one instance exists
            RDOFolder calendarFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);

            int count = 0;
            foreach (RDOAppointmentItem a in calendarFolder.Items)
            {
                if (a.Subject.Equals(apptSubject))
                {
                   tcLog.Debug("Found one instance of " + a.Subject);
                    count++;
                }
            }
            zAssert.AreEqual(1, count, "Verify that only one instance of the appointment exists");

            #endregion


        }

        [Test, Description("Verify that Dismiss All removes reminders from the meeting.")]
        [Category("SMOKE"), Category("Calendar")]
        [Bug("47442")]
        [SyncDirection(SyncDirection.NOSYNC)]
        [TestSteps(
            "ZCO: Create an appointment that happens with a reminder that is due",
            "ZCO: wait for the reminder popup.",
            "ZCO: click on Dismiss All")]
        public void CreateAppointment_14()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = DateTime.Now.AddMinutes(30);
            #endregion

            #region Test Case Setup

            // Make sure no reminder boxes are already up
            while (NativeWIN32.WindowVisible(
                    "reminder",
                    0,
                    NativeWIN32.TitleComparison.Contains))
            {

                NativeWIN32.ProcessDialogBoxByButtonLabel(
                    "reminder",
                    AppointmentReminders.DialogButtonLabelDismiss,
                    NativeWIN32.TitleComparison.Contains);

            }

            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(3);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 35;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            // Make sure the dialog box is shown
            zAssert.IsTrue(
                NativeWIN32.WindowVisible(
                    "reminder",
                    NativeWIN32.DefaultWindowWaitTime,
                    NativeWIN32.TitleComparison.Contains),
                "Verify the reminder dialog exists");

            // Close the reminder by clicking dimiss
            zAssert.Greater(
                NativeWIN32.ProcessDialogBoxByButtonLabel(
                    "reminder",
                    AppointmentReminders.DialogButtonLabelDismissAll,
                    NativeWIN32.TitleComparison.Contains),
                0,
                "Verify that the button was clicked");


            // Make sure the dialog box doesn't come back
            System.Threading.Thread.Sleep(10000);
            zAssert.IsFalse(
                NativeWIN32.WindowVisible(
                    "reminder",
                    0,
                    NativeWIN32.TitleComparison.Contains),
                "Verify the reminder dialog does not return");

            // Sync outlook with reminder initially not set
            OutlookCommands.Instance.Sync();

            // Verify the object reminder is not enabled
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment item is found");

            zAssert.IsFalse(rdoAppointmentItem.ReminderSet, "Verify the appointment reminder is not set");

            #endregion

        }
    }
}