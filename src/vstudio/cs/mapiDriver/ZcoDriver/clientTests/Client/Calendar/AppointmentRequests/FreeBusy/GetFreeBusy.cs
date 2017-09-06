using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapWebClient;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.AppointmentRequests.FreeBusy
{
    [TestFixture]
    public class GetFreeBusy : BaseTestFixture
    {

        [Test, Description("Verify the Free/Busy status for the Sync User for an appointment (BusyStatus = busy)")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Create a simple appointment from ZCO with BusyStatus = busy",
            "Sync",
            "Send GetFreeBusyRequest to verify appointment time appears as busy")]
        public void GetFreeBusyRequest_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 20, 12, 0, 0);
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP

            string apptStart = (startTimeLocal.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string apptEnd = (startTimeLocal.AddHours(1).ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            zAccount.AccountZCO.sendSOAP(
                            new GetFreeBusyRequest().
                                    Start(startTimeLocal.AddHours(-1).ToUniversalTime()).
                                    End(startTimeLocal.AddHours(2).ToUniversalTime()).
                                    Email(zAccount.AccountZCO.emailAddress)
                        );

            zAccount.AccountZCO.selectSOAP("//mail:b[@s='" + apptStart + "']", "e", apptEnd, null, 1);


            #endregion

        }
    }
}
