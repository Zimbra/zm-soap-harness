using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.MeetingRequests.Replies
{
    [TestFixture]
    public class ReceiveMeetingRequest : BaseTestFixture
    {
        [Test, Description("Verify the invitation to a meeting request (Attendee is ZCO)")]
        [Category("SMOKE")]
        public void ReceiveMeetingRequest_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            #endregion


            #region SOAP Block

            // Add a message to the account mailbox
            DateTime startTimeUTC = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeEST = startTimeUTC.AddHours(-5);  // 2016/12/25 7:00:00 US/Eastern
            string message1subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1content = "content" + GlobalProperties.time() + GlobalProperties.counter();

            zAccount.AccountA.sendSOAP((new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject().
                                    Summary(message1subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeEST.ToString("yyyyMMdd'T'HHmmss"), "(GMT-05.00) Eastern Time (US & Canada)").
                                    EndTime(startTimeEST.AddHours(1).ToString("yyyyMMdd'T'HHmmss"), "(GMT-05.00) Eastern Time (US & Canada)")))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);
            #endregion

            #region Outlook Block
            // Use Outlook to create a draft message and save in the default draft folder

            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1subject, rdoAppointmentItem.Subject, "Check appointment summary");
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

        private string SyncUserRespondsToMeetingRequest(Redemption.rdoMeetingResponse syncUserResponse, string psts)
        {
            #region Test Case variables

            #endregion


            #region SOAP Block


            // Add a message to the account mailbox
            DateTime startTimeUTC = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeEST = startTimeUTC.AddHours(-5);  // 2016/12/25 7:00:00 US/Eastern
            string message1subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentApptId;
            string appointmentCalItemId;
            string appointmentInvId;

            zAccount.AccountA.sendSOAP((new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject().
                                    Summary(message1subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeEST.ToString("yyyyMMdd'T'HHmmss"), "(GMT-05.00) Eastern Time (US & Canada)").
                                    EndTime(startTimeEST.AddHours(1).ToString("yyyyMMdd'T'HHmmss"), "(GMT-05.00) Eastern Time (US & Canada)")))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "apptId", null, out appointmentApptId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out appointmentCalItemId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentInvId, 1);

            #endregion

            #region Outlook Block
            // Use Outlook to receive the appointment and accept it

            OutlookCommands.Instance.Sync();


            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1subject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment item exists in the mailbox");

            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(syncUserResponse, rdoAppointmentItem);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            rdoMeetingItem.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP verification


            // Search for that appointment
            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            Query("subject:(" + message1subject + ")")
                                    );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out appointmentInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(
                                        new GetMsgRequest().
                                                Message(appointmentInvId)
                                            );

            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountZCO.emailAddress + "']", "ptst", psts, null, 1);

            // Organizer verifies that the attendee status is Accepted

            // Auth as the end user
            zAccount.AccountA.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            Query("subject:(" + message1subject + ")")
                                    );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out appointmentInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(
                                                new GetMsgRequest().
                                                        Message(appointmentInvId)
                                            );

            appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:reply[@at='" + zAccount.AccountZCO.emailAddress + "']", "ptst", psts, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountZCO.emailAddress + "']", "ptst", psts, null, 1);

            #endregion

            return message1subject;
        }

        [Test, Description("Accept (olMeetingAccepted) a meeting request (Attendee is ZCO)")]
        [Bug("31485")] 
        [Category("SMOKE")]
        [Notes("Test case is blocked as acceptance mail remains in drafts folder of attendee")]
        public void ReceiveMeetingRequest_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = SyncUserRespondsToMeetingRequest(Redemption.rdoMeetingResponse.olMeetingAccepted, "AC");

            string windowTitle = "Accepted: " + subject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window
        }

        [Test, Description("Tentatively accept (olMeetingAccepted) a meeting request (Attendee is ZCO)")]
        [Bug("31485")] //This test case passes in my laptop [sramarao 08/19/2010]. I am not sure what caused this to pass successfully. The only change I made was in OutlookMailbox.Instance.appointmentRespond(), which I think, should not affect the outcome of this test case. Should keep a watch on automation result before removing the test case from bug in bugzilla.
        [Category("SMOKE")]
        [Notes("Test case is blocked as acceptance mail remains in drafts folder of attendee")]
        public void ReceiveMeetingRequest_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = SyncUserRespondsToMeetingRequest(Redemption.rdoMeetingResponse.olMeetingTentative, "TE");

            string windowTitle = "Tentative: " + subject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window
        }

        [Test, Description("Decline (olMeetingDeclined) a meeting request (Attendee is ZCO)")]
        [Bug ("31485")]
        [Category("SMOKE")]
        [Notes("Test case is blocked as acceptance mail remains in drafts folder of attendee")]
        public void ReceiveMeetingRequest_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables


            #endregion


            #region SOAP Block


            // Add a message to the account mailbox
            DateTime startTimeUTC = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeEST = startTimeUTC.AddHours(-5);  // 2016/12/25 7:00:00 US/Eastern
            string message1subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentApptId;
            string appointmentCalItemId;
            string appointmentInvId;

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, (zAccount.AccountZCO.emailAddress)).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject().
                                    Summary(message1subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeEST.ToString("yyyyMMdd'T'HHmmss"), "(GMT-05.00) Eastern Time (US & Canada)").
                                    EndTime(startTimeEST.AddHours(1).ToString("yyyyMMdd'T'HHmmss"), "(GMT-05.00) Eastern Time (US & Canada)"))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "apptId", null, out appointmentApptId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out appointmentCalItemId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentInvId, 1);
            #endregion

            #region Outlook Block
            // Use Outlook to receive the appointment and accept it

            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1subject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment item exists in the mailbox");

            Redemption.RDOMeetingItem rdoMeetingItem = rdoAppointmentItem.Respond(Redemption.rdoMeetingResponse.olMeetingDeclined, null, null);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            // RDO Fixup
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppointmentItem);


            rdoMeetingItem.Send();

            OutlookCommands.Instance.Sync();


            #endregion

            #region SOAP verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            Query("subject:(" + message1subject + ")")
                                    );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 0);


            // Organizer verifies that the attendee status is Accepted
            zAccount.AccountA.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            Query("subject:(" + message1subject + ")")
                                    );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out appointmentInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(
                                                new GetMsgRequest().
                                                        Message(appointmentInvId)
                                            );

            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:reply[@at='" + zAccount.AccountZCO.emailAddress + "']", "ptst", "DE", null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountZCO.emailAddress + "']", "ptst", "DE", null, 1);
            #endregion
        }

        [Test, Description("Accept (olMeetingAccepted) a meeting request (Attendee is ZCO) and verify that the meeting is present in the calendar")]
        [Bug("15588")]
        public void ReceiveMeetingRequest_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentApptId, appointmentCalItemId, appointmentInvId;
            #endregion


            #region SOAP Block
            // Add a message to the account mailbox
            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(messageSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(messageContent).
                            AddInv(new InvObject().
                                    Summary(messageSubject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "apptId", null, out appointmentApptId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out appointmentCalItemId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentInvId, 1);

            #endregion

            #region Outlook Block
            // Use Outlook to receive the appointment and accept it

            OutlookCommands.Instance.Sync();


            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(messageSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment item exists in the mailbox");

            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppointmentItem);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");
            rdoMeetingItem.Send();

            string windowTitle = "Accepted: " + messageSubject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            RDOAppointmentItem rAppt = OutlookMailbox.Instance.findAppointment(messageSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment item exists in the calendar");

            object value = OutlookCommands.Instance.DisableMeetingRegeneration();
            zAssert.AreEqual(1, value, "DisableMeetingRegeneration is set to 1");
            #endregion

        }

    }
}
