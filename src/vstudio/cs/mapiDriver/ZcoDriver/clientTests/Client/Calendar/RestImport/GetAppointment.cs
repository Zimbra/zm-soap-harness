using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapAdmin;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;



namespace clientTests.Client.Calendar.RestImport
{
    [TestFixture]
    public class GetAppointment : BaseTestFixture
    {

        [Test, Description("Verify an imported ICS can be synced to ZCO")]
        [Category("Calendar")]
        [Bug("28816")]
        [Ignore("Bug marked as WontFix, so skipping this test")]
        public void RestImport_GetAppointment_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());


            #region Test Case variables


            #endregion



            #region Account Setup

            #endregion



            #region SOAP Block



            // Import an ICS to the mailbox
            //
            // HTTP POST ics01/basic.ics to http://server.com/service/home/~Calendar?fmt=ics
            //
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @"/ics01/basic.ics");
            restClient.DoMethod();

            string apptSummary = "iCalBasic";
            string apptInvID;
            DateTime startTimeUTC = new DateTime(2006, 1, 19, 10, 30, 00);
            DateTime endTimeUTC = new DateTime(2006, 1, 19, 11, 30, 00);

            /*
BEGIN:VCALENDAR
PRODID:iCalBasicProvider
VERSION:2.0
METHOD:PUBLISH
BEGIN:VEVENT
UID:ca4be2ae-6bfa-45cc-a52d-356f133c06aa
ORGANIZER:MAILTO:foo@foo.com
SUMMARY:iCalBasic
DESCRIPTION:iCalBasic.Description
DTSTART:20060119T103000Z
DTEND:20060119T113000Z
LOCATION:iCalBasic.Location
STATUS:CONFIRMED
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
X-MICROSOFT-CDO-INTENDEDSTATUS:BUSY
TRANSP:OPAQUE
DTSTAMP:20050119T120000Z
SEQUENCE:0
END:VEVENT
END:VCALENDAR
             */

            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvID, 1);

            zAccount.AccountZCO.sendSOAP(
                                    new GetMsgRequest().
                                        Message(apptInvID));


            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            #endregion



            #region Outlook Block

            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointment = OutlookMailbox.Instance.findAppointment(apptSummary);

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointment, "Check that the appointment exists in the calendar");

            // Verify the received message data
            zAssert.AreEqual(apptSummary, rdoAppointment.Subject, "Check appointment summary");
            zAssert.AreEqual(startTimeUTC.ToLocalTime(), rdoAppointment.Start, "Check appointment start time");
            zAssert.AreEqual(endTimeUTC.ToLocalTime(), rdoAppointment.End, "Check appointment end time");
            zAssert.AreEqual("iCalBasic.Location", rdoAppointment.Location, "Check appointment location");
            zAssert.That(rdoAppointment.Body.Contains("iCalBasic.Description"), "Check appointment description (" + rdoAppointment.Body + ") contains (iCalBasic.Description)");
            zAssert.AreEqual("foo@foo.com", rdoAppointment.Organizer, "Check appointment organizer");

            #endregion



        }

    }
}
