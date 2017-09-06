using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using Soap;
using System.IO;
using SoapAdmin;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace restartTests.Client.Calendar.Bugs
{
    public class CalendarBugs : clientTests.BaseTestFixture
    {
        [Test, Description("Can't accept appointments using ZCO")]
        [Category("Calendar")]
        [Bug("18188")]
        [Ignore("Need to fix OutlookProcess.StopOutlookApp() - use ExecTestFixture")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Modify the ics file to change the attendee and organizer to test users",
                    "Import the attached .ics file in ZCS",
                    "sync",
                    "Accept the meeting in outlook",
                    "Verify appointment is accepted")]
        public void Bug18188()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string readIcsFile = GlobalProperties.TestMailRaw + "/Bugs/18188/webmail_widas_de.ics";
            string icsFile = "/Bugs/18188/webmail_widas.de" + GlobalProperties.time() + GlobalProperties.counter() + ".ics";
            string writeIcsFile = GlobalProperties.TestMailRaw + icsFile;
            string apptSummary = "webmail vidas de meeting";
            DateTime startTimeUTC = new DateTime(2007, 08, 07, 07, 00, 00);
            DateTime endTimeUTC = new DateTime(2007, 08, 07, 07, 30, 00);
            string apptInvId;
            #endregion

            #region Modify ICS file
            //Modify the ics to be injected as original consists name of zimbra employees
            TextReader rIcs = new StreamReader(readIcsFile);
            TextWriter wIcs = new StreamWriter(writeIcsFile);

            string rLine;
            while ((rLine = rIcs.ReadLine()) != null)
            {
                if (rLine.Contains("MYORGANISERNAME"))
                {
                    rLine = rLine.Replace("MYORGANISERNAME", zAccount.AccountA.emailAddress);
                }
                if (rLine.Contains("MYATTENDEENAME"))
                {
                    rLine = rLine.Replace("MYATTENDEENAME", zAccount.AccountZCO.emailAddress);
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            FileInfo injectIcs = new FileInfo(writeIcsFile);
            zAssert.IsTrue(injectIcs.Exists, "Verify modified .ics file exists");
            #endregion

            #region SOAP Inject the ICS

            // Import an ICS to the account1 mailbox 

            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountA;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @icsFile);
            restClient.DoMethod();

            zAccount.AccountA.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);


            // Import an ICS to the syncuser mailbox 
            restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @icsFile);
            restClient.DoMethod();
            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            //Delete the modified ics file
            injectIcs.Delete();

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppointmentItem); 
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            // RDO Fixup
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppointmentItem);

            rdoMeetingItem.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region Shutdown ZCO

            OutlookProcess.Instance.StopApplication("Kill Outlook");
            #endregion

            #region Start ZCO
            OutlookProfile profile = new OutlookProfile(zAccount.AccountA);
            OutlookProcess.Instance.StartApplication(profile);
            tcLog.Debug("Initialized the account1 user");

            #endregion

            #region Verification on Syncuser side.
            int meetingResponseAccept = 2;
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar store");
            try
            {
                foreach (RDORecipient r in rdoAppt.Recipients)
                {
                    if (!r.Address.Equals(zAccount.AccountA.emailAddress))
                    {
                        zAssert.AreEqual(meetingResponseAccept, r.MeetingResponseStatus, "Response status of " + r.Address + " matched.");
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
