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

namespace clientTests.Client.Calendar.MeetingRequests.Recurring.Exceptions
{
    [TestFixture]
    public class MeetingRequest_CreateException : BaseTestFixture
    {
        //[Ignore ("Sending exception to attendee from outlook pending")]
        [Test, Description("Verify exception (startTime Changed) of a weekly recurring meeting is sync from ZCO")]
        [Category("Calendar")]
        public void MeetingRequest_CreateException_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string apptId, exApptId;
            #endregion

            #region Outlook Block using redemption
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the Appointmnet is created correctly");

            rdoAppointmentItem.Subject = apptSubject;
            rdoAppointmentItem.Body = apptContent;

            rdoAppointmentItem.Start = startTimeLocal;
            rdoAppointmentItem.End = startTimeLocal.AddHours(3);
            rdoAppointmentItem.Location = "";
            rdoAppointmentItem.ReminderSet = true;
            rdoAppointmentItem.ReminderMinutesBeforeStart = 30;
            rdoAppointmentItem.BusyStatus = rdoBusyStatus.olBusy;
            rdoAppointmentItem.IsOnlineMeeting = false;
            rdoAppointmentItem.AllDayEvent = false;

            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 4;

            RDORecipient rdoRecipient = rdoAppointmentItem.Recipients.Add(zAccount.AccountA.emailAddress);
            rdoAppointmentItem.Recipients.ResolveAll(null, null);

            rdoAppointmentItem.Send();

            OutlookCommands.Instance.Sync();

            // Create exception
            RDOAppointmentItem exAppointment = recurrencePattern.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            exAppointment.Start = startTimeLocal.AddHours(2);

            exAppointment.Send();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("appointment").CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddMonths(1)).
                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptId, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out exApptId, 1);

            // Get the recurring meeting
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(apptId));

            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + apptId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);

            // Get the exception of recurring meeting
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(exApptId));

            XmlNode appointmentMessageEx = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + exApptId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessageEx, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.AddHours(1).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);

            #endregion

        }
    }
}