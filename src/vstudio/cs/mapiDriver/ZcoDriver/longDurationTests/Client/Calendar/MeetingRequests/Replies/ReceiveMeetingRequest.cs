using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using Redemption;
using System.Xml;

namespace longDurationTests.Client.Calendar.MeetingRequests.Replies
{
    [TestFixture]
    public class ReceiveMeetingRequest : clientTests.BaseTestFixture
    {
        [Test, Description("No error is thrown while accepting a meeting request which has been updated.")]
        [Bug("17809")]
        public void ReceiveMeetingRequest_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentId, uId, messageCallItemId;
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
                                    StartTime(startTimeLocal, TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse/mail:m", "id", null, out uId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            #endregion

            #region Outlook Block
            // Use Outlook to receive the appointment and accept it

            OutlookCommands.Instance.Sync();


            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(messageSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment item exists in the mailbox");

            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppointmentItem);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            // RDO Fixup
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppointmentItem);
            OutlookCommands.Instance.Sync();
            zAccount.AccountA.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject(uId).
                                    Summary(message2Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), TimeZone.CurrentTimeZone))));
            zAccount.AccountA.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            OutlookCommands.Instance.Sync();
            try
            {

                rdoMeetingItem.Send();
            }
            catch (UnauthorizedAccessException e)
            { }
            #endregion

        }
    }
}
