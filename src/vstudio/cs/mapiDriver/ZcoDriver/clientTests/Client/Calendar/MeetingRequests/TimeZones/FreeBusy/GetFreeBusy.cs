using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.MeetingRequests.TimeZones.FreeBusy
{
    [TestFixture]
    public class GetFreeBusy : BaseTestFixture
    {

        [Test, Description("Verify the Free/Busy status is set for an appointment with BusyStatus = Busy")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Create a simple appointment from ZCO",
            "Sync",
            "Send GetFreeBusyRequest to verify appointment time appears as busy")]
        public void GetFreeBusyRequest_TimeZone_01()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            #endregion
            #region Create account
            // We cannot use AccountA as we have many test cases which creates appointment on Dec 12th in AccountA.
            // Because of this, the test case fails during automation run as getFreeBusy returns both <b> and <t> attribute. 
            // Since there are so many appointments getting creates for same duration, one of them sets <b> another <t> and there is no way to know which account has set <b> and <t>. This information is not return by GetFreeBuy.
            // we can change the appointment date. However, this will not gaurantee that same problem won't happen again in future. So creating a new account.
            zAccount userA = new zAccount();
            userA.createAccount();
            userA.login();
            #endregion
            
            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = userA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP

            string apptStart = (startTimeLocal.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string apptEnd = (startTimeLocal.AddHours(1).ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            userA.sendSOAP(
                            new GetFreeBusyRequest().
                                    Start(startTimeLocal.AddHours(-1).ToUniversalTime()).
                                    End(startTimeLocal.AddHours(2).ToUniversalTime()).
                                    Email(userA.emailAddress)
                        );

            userA.selectSOAP("//mail:t[@s='" + apptStart + "']", "e", apptEnd, null, 1);

            #endregion

        }
    }
}