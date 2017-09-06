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

namespace longDurationTests.Client.Calendar.MeetingRequests
{

    [TestFixture]
    public class CreateMeetingRequest : clientTests.BaseTestFixture
    {
        [Test, Description("Verify a meeting request sent to a contact group having 10 addresses is synced")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [Bug("31376")]
        [TestSteps("Auth as admin and create 10 accounts", "From ZCO create a contact group and add the 10 acocunts", "From ZCO create a meeting and send to the contact group (distribution list)",
            "In ZCS login from each account and verify the meeting is received")]
        public void CreateMeetingRequest_Organizer_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            int loopCount = 10;
            string distListName = "DLName" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Account Setup

            ArrayList userCollection = new ArrayList();
            zAccount[] accountList = new zAccount[loopCount];
            // Create 10 test accounts
            for (int userCount = 1; userCount <= loopCount; userCount++)
            {
                string accountName = "account" + userCount + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
                zAccount user = new zAccount();
                user.createAccount();
                accountList[userCount - 1] = user;
                userCollection.Add(accountName);
            }

            #endregion

            #region Outlook Block Create Distribution list
            RDODistListItem distlist = OutlookMailbox.Instance.CreateDistList();
            zAssert.IsNotNull(distlist, "Verify the Dist List is created correctly");
            distlist.DLName = distListName;
            foreach (string user in userCollection)
            {
                distlist.AddMember(user);
            }
            distlist.Save();

            #endregion

            #region Create Appointment with DistList in the attendees

            // Create the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the Appointmnet is created correctly");

            rdoAppointmentItem.Subject = apptSubject;
            rdoAppointmentItem.Body = apptContent;

            rdoAppointmentItem.Start = startTimeLocal;
            rdoAppointmentItem.End = startTimeLocal.AddHours(3);

            rdoAppointmentItem.ReminderSet = true;
            rdoAppointmentItem.ReminderMinutesBeforeStart = 30;
            rdoAppointmentItem.BusyStatus = rdoBusyStatus.olBusy;
            rdoAppointmentItem.IsOnlineMeeting = false;
            rdoAppointmentItem.AllDayEvent = false;

            rdoAppointmentItem.To = distListName;
            rdoAppointmentItem.Recipients.ResolveAll(null, null);

            // Send the appointment
            rdoAppointmentItem.Send();  // This step expands the DL to the individual accounts

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            foreach (zAccount account in accountList)
            {
                account.sendSOAP(new SearchRequest().
                    Types("appointment").CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(1)).
                    Query("subject:(" + apptSubject + ")"));

                account.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            }
            #endregion

        }

        [Test, Description("Verify responses of meeting request sent to a contact group having 10 addresses")]
        [Category("Calendar")]
        [Bug("30175")]
        [Bug("31376")]
        [SyncDirection(SyncDirection.BOTH)]
        public void CreateMeetingRequest_Organizer_14()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            int loopCount = 10;
            string distListName = "DLName" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId, messageCompNum;
            #endregion

            #region Account Setup

            ArrayList userCollection = new ArrayList();
            zAccount[] accountList = new zAccount[loopCount];
            // Create 10 test accounts
            for (int userCount = 1; userCount <= loopCount; userCount++)
            {
                string accountName = "account" + userCount + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
                zAccount user = new zAccount();
                user.createAccount();
                accountList[userCount - 1] = user;
                userCollection.Add(accountName);
            }

            #endregion

            #region Outlook Block Create Distribution list
            RDODistListItem distlist = OutlookMailbox.Instance.CreateDistList();
            zAssert.IsNotNull(distlist, "Verify the Dist List is created correctly");
            distlist.DLName = distListName;
            foreach (string user in userCollection)
            {
                distlist.AddMember(user);
            }
            distlist.Save();

            #endregion

            #region Create Appointment with DistList in the attendees

            // Create the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the Appointmnet is created correctly");

            rdoAppointmentItem.Subject = apptSubject;
            rdoAppointmentItem.Body = apptContent;

            rdoAppointmentItem.Start = startTimeLocal;
            rdoAppointmentItem.End = startTimeLocal.AddHours(3);

            rdoAppointmentItem.ReminderSet = true;
            rdoAppointmentItem.ReminderMinutesBeforeStart = 30;
            rdoAppointmentItem.BusyStatus = rdoBusyStatus.olBusy;
            rdoAppointmentItem.IsOnlineMeeting = false;
            rdoAppointmentItem.AllDayEvent = false;

            rdoAppointmentItem.To = distListName;
            rdoAppointmentItem.Recipients.ResolveAll(null, null);

            // Send the appointment
            rdoAppointmentItem.Send();  // This step expands the DL to the individual accounts

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            Dictionary<string, string> userResponse = new Dictionary<string, string>();

            foreach (zAccount account in accountList)
            {
                account.sendSOAP(new SearchRequest().
                    Types("appointment").CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(1)).
                    Query("subject:(" + apptSubject + ")"));

                account.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

                // Get the message
                account.sendSOAP(new GetMsgRequest().Message(messageInvId));

                XmlNode appointmentMessage = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
                // Check all the 10 attendees
                foreach (string recipient in userCollection)
                {
                    account.selectSOAP("//mail:at", "a", recipient, null, 1);
                }
                account.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.emailAddress, null, 1);
                account.selectSOAP(appointmentMessage, "//mail:content", null, apptContent, null, 1);
                account.selectSOAP(appointmentMessage, "//mail:su", null, apptSubject, null, 1);
                account.selectSOAP(appointmentMessage, "//mail:comp", "compNum", null, out messageCompNum, 1);
                account.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
                SoapTest soapTest = new SoapTest();
                zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapTest.toUTC(appointmentMessage, "//mail:m/mail:inv/mail:comp/mail:s"), "Verify that the start time (UTC) is correct");
                zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapTest.toUTC(appointmentMessage, "//mail:m/mail:inv/mail:comp/mail:e"), "Verify that the end time (UTC) is correct");

                string apptStatus = null;
                Random rNumber = new Random();
                int statusCode = rNumber.Next(2, 5);
                //OlResponseStatus can be one of these OlResponseStatus constants.
                //olResponseAccepted (3)
                //olResponseDeclined (4)
                //olResponseNone (0)
                //olResponseNotResponded (5)
                //olResponseOrganized (1)
                //olResponseTentative (2)
                switch (statusCode)
                {
                    case 2:
                        apptStatus = "TENTATIVE";
                        break;
                    case 3:
                        apptStatus = "ACCEPT";
                        break;
                    case 4:
                        apptStatus = "DECLINE";
                        break;
                    default:
                        apptStatus = "ACCEPT";
                        break;

                }
                account.sendSOAP(new AppointmentActionRequest(apptStatus, messageInvId,
                    messageCompNum, zAccount.AccountZCO.emailAddress, apptSubject));
                account.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);

                userResponse.Add(account.emailAddress, statusCode.ToString());

            }
            #endregion

            # region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar store");
            try
            {
                foreach (RDORecipient r in rdoAppt.Recipients)
                {
                    if (!r.Address.Equals(zAccount.AccountZCO.emailAddress))
                    {
                        zAssert.AreEqual(Convert.ToInt16(userResponse[r.Address]), r.MeetingResponseStatus, "Response status of " + r.Address + " matched.");
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