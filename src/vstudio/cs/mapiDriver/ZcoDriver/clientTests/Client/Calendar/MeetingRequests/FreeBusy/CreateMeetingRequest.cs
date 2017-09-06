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

namespace clientTests.Client.Calendar.MeetingRequests.FreeBusy
{

    [TestFixture]
    public class CreateMeetingRequest : BaseTestFixture
    {
        [Test, Description("Verify the Free/Busy status of an attendee to a metting request (attendee is free)")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Sync user creates a new meeting request by inviting user1",
            "Before saving the meeting request, check free/busy status of user1")]
        public void CreateMeetingRequests_FreeBusy_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            #endregion

            #region Outlook Block

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();

            rdoAppointmentItem.Subject = apptSubject;
            rdoAppointmentItem.Body = apptContent;
            rdoAppointmentItem.Location = "";
            rdoAppointmentItem.Start = startTimeLocal;
            rdoAppointmentItem.End = startTimeLocal.AddHours(2);
            RDORecipient rdoRecipient = rdoAppointmentItem.Recipients.Add(zAccount.AccountA.emailAddress);
            rdoRecipient.Resolve(null, null);

            string freeBusyString = rdoRecipient.FreeBusy(startTimeLocal.AddDays(-1), 30, true);

            zAssert.IsNotNull(freeBusyString, "Verify the free busy was returned");

            rdoAppointmentItem.Save();
            OutlookCommands.Instance.Sync();

            #endregion

        }

        [Test, Description("Verify the Free/Busy status of multiple attendees to a metting request (attendee is free)")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Sync user creates a new meeting request by inviting user1",
            "Before saving the meeting request, check free/busy status of user1")]
        public void CreateMeetingRequests_FreeBusy_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            // Create 5 recipients
            const int numRecipients = 5;
            zAccount[] accounts = new zAccount[numRecipients];
            for (int i = 0; i < numRecipients; i++)
            {
                accounts[i] = new zAccount();
            }

            #endregion

            #region Account Setup
            #endregion

            #region Outlook Block

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();

            rdoAppointmentItem.Subject = apptSubject;
            rdoAppointmentItem.Body = apptContent;
            rdoAppointmentItem.Location = "";
            rdoAppointmentItem.Start = startTimeLocal;
            rdoAppointmentItem.End = startTimeLocal.AddHours(2);

            for (int i = 0; i < numRecipients; i++)
            {

                RDORecipient rdoRecipient = rdoAppointmentItem.Recipients.Add(accounts[i].emailAddress);
                zAssert.IsNotNull(rdoRecipient, "Verify the recipient was added correctly");

                rdoRecipient.Resolve(null, null);

                string freeBusyString = rdoRecipient.FreeBusy(startTimeLocal.AddDays(-1), 30, true);

                zAssert.IsNotNull(freeBusyString, "Verify the free busy was returned");

            }

            rdoAppointmentItem.Save();
            OutlookCommands.Instance.Sync();

            #endregion

        }

    }
}