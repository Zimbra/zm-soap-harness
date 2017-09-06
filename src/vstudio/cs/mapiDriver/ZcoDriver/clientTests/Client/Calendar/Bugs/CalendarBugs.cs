using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using System.Collections.ObjectModel;
using SoapAdmin;
using Soap;
using System.IO;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;
using System.Text.RegularExpressions;

namespace clientTests.Client.Calendar.Bugs
{
    [TestFixture]
    public class CalendarBugs : BaseTestFixture
    {
        [Test, Description("32636: Incorrect end date sent when ZCO creates a recurring all-day appointment")]
        [Category("Calendar")]
        [Bug("32636")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void Bug32636()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 10, 27, 0, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            //rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = false;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = true;
            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 5;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "DAI", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            //zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            //zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:e", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);

            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), soapStartUTC.ToString("yyyyMMdd"), "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), soapEndUTC.ToString("yyyyMMdd"), "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify local failure on calendar conversion")]
        [Bug("31653")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug31653()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "ZCO-Dev/Support weekly meeting";
            #endregion

            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.ZimbraQARoot + @"\data\TestMailRaw\Bug31653\mimeMsg.txt";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(apptSubject);
            zAssert.IsNotNull(rdoMail, "Verify the message appears in the inbox");

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment appears in the calendar");
            #endregion

        }

        [Test, Description("Bug 32967: Verify PARSE_ERROR for calendar attachment from yahoo-inc.com")]
        [Category("Calendar")]
        [Bug("32967")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug32967()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "UKL Maintenance -Properties: Review Schedule and confirm readiness";
            #endregion

            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.ZimbraQARoot + @"\data\TestMailRaw\Bugs\32967";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook Block. Sync the invitation.  Enable reminders.  Delta sync.  Check for server failure.

            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists");

            rdoAppt.ReminderSet = true;
            rdoAppt.Save();

            OutlookCommands.Instance.Sync();

            // Let the harness check for server failures in the tear down function

            #endregion

        }

        [Test, Description("Bug 6801: Accepting reccuring appointments from Trash throws 'You cannot respond to a meeting without an organizer'")]
        [Category("Calendar")]
        [TestSteps(
            "Create a meeting from ZWC and invite syncuser",
            "From syncuser delete the invite",
            "Go to trash folder and accept the invite",
            "Verify invite is sent and recived by organizer")]
        [Bug("6801")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug6801()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, messageInvId, apptInvId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out messageInvId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region OUTLOOK
            OutlookCommands.Instance.Sync();

            RDOMail rMail = OutlookMailbox.Instance.findMessage(message1Subject);
            zAssert.IsNotNull(rMail, "Verify meeting request mail is received");

            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            rMail.Move(trash);
            RDOAppointmentItem tAppt = OutlookMailbox.Instance.findAppointment(message1Subject);
            zAssert.IsNotNull(tAppt, "Verify appointment is deleted and exists in trash folder");

            System.Exception orgNotFoundException = null;
            try
            {
                RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, tAppt);
                zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");
                
                // RDO Fixup
                OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref tAppt);
                rdoMeetingItem.Send();

                OutlookCommands.Instance.Sync();

                string windowTitle = "Accepted: " + message1Subject + " - Meeting Response  ";

                NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window
            }
            catch (System.Exception e)
            {
                orgNotFoundException = e;
            }
            zAssert.IsNull(orgNotFoundException, "Verify that accepting meeting from trash does not throw any exception");
            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(5000);
            #endregion

            #region SOAP
            // Search for that appointment
            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            Query("subject:(" + message1Subject + ")")
                                    );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));

            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + apptInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountZCO.emailAddress + "']", "ptst", "AC", null, 1);

            // Organizer verifies that the attendee status is Accepted
            // Search for that appointment
            zAccount.AccountA.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            Query("subject:(" + message1Subject + ")")
                                    );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(apptInvId));

            appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + apptInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountZCO.emailAddress + "']", "ptst", "AC", null, 1);
            #endregion

        }

        [Test, Description("Bug 7623: Meetings disappear when request is accepted")]
        [Category("Calendar")]
        [TestSteps(
            "Log in as user A and send a meeting request to user B.",
            "Log in as user B from outlook.",
            "Check the calendar.  The meeting will be listed on it.",
            "Accept the meeting request.  The meeting will disappear from the calendar.")]
        [Bug("7623")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug7623()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, messageInvId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out messageInvId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region OUTLOOK
            // Accept the meeting and verify that meeting does not disappear
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppointmentItem);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            // RDO Fixup
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppointmentItem);

            rdoMeetingItem.Send();

            OutlookCommands.Instance.Sync();

            // Verify meeting has not disappeared after accepting
            RDOAppointmentItem rdoApptAfterAccept = OutlookMailbox.Instance.findAppointment(message1Subject);
            zAssert.IsNotNull(rdoApptAfterAccept, "Verify appointment does not disappear.");

            string windowTitle = "Accepted: " + message1Subject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            #endregion

        }

        [Test, Description("Bug7672: Outlook All day appointment spans 2 days in web mail.")]
        [Category("Calendar")]
        [Bug("7672")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Click on New to create a new appointment.",
                    "Enter subject and check the check box of all day appointment.",
                    "Click Save and Close.",
                    "Do Send/Receive.",
                    "Login to web mail client.",
                    "Check the newly created all day appointment spans for only 1 day and can be edited.")]
        public void Bug7672()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string newSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string newContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId, uId, messageCalItemId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 30;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = true;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));

            XmlNode GetAppointmentResponse = zAccount.AccountZCO.selectSOAP("//mail:appt", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(GetAppointmentResponse, "//mail:appt/mail:inv/mail:comp", "uid", null, out uId, 1);

            // Check that meeting does not span for 2 days 
            zAccount.AccountZCO.selectSOAP(GetAppointmentResponse, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(GetAppointmentResponse, "//mail:e", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            //Verify appointment can be modified

            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(messageInvId, "0").
                 AddMessage(new MessageObject().
                            Subject(newSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(newContent).
                            AddInv(new InvObject(uId).
                                    setAllDay().
                                    Summary(newSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal.ToString("yyyyMMdd")).
                                    EndTime(startTimeLocal.ToString("yyyyMMdd")))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            #endregion

        }

        [Test, Description("Bug7677: corrupt timezone definition cause zco to crash")]
        [Category("Calendar")]
        [Bug("7677")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Import the attached .ics file in outlook",
                    "sync",
                    "Verify outlook does not crash.",
                    "Verify appointment exists on server")]
        public void Bug7677()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "CF B-day '65";
            string filename = GlobalProperties.TestMailRaw + "/Bugs/7677/CF_B-day_65.ics";

            DateTime startTimeUTC = new DateTime(1965, 9, 30, 00, 00, 00);
            DateTime endTimeUTC = new DateTime(1965, 10, 01, 00, 00, 00);
            #endregion

            #region Outlook Block Import the ics file

            // Create the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the Appointmnet is created correctly");

            rdoAppointmentItem.Import(filename, Microsoft.Office.Interop.Outlook.OlSaveAsType.olMSG);
            rdoAppointmentItem.Save();
            OutlookCommands.Instance.Sync();

            //Verify appointment is imported 
            RDOAppointmentItem importAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(importAppt, "Verify appointment exists in calendar");
            zAssert.IsTrue(importAppt.Subject.Equals(apptSubject), "Verify subject of the meeting");

            RDOFolder inbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOFolder localFailures = OutlookMailbox.Instance.findFolder("Local Failures", inbox.Parent, true);

            //
            // A local failure may be placed in the local "Inbox" and the local "Local Failures" folders as the appointment 
            // contains corrupt time zone. Mark them as read so that BaseTestFixture do not fail.

            List<RDOMail> rdoMail = OutlookMailbox.Instance.findMessages("Local Failure Notice", inbox, true);
            zAssert.IsNotNull(rdoMail, "Verify the Local Failure Notice is generated in the inbox folder");
            foreach (RDOMail mail in rdoMail)
            {
                mail.UnRead = false;
                mail.Save();

            }
            
            
            rdoMail = OutlookMailbox.Instance.findMessages("Local Failure Notice", localFailures, false);
            zAssert.IsNotNull(rdoMail, "Verify the Local Failure Notice is generated in the Local Failures folder");
            foreach (RDOMail mail in rdoMail)
            {
                mail.UnRead = false;
                mail.Save();

            }
            #endregion

            #region SOAP Block
            
            // As per comment in the bug, the appointment does not appear in the ZWC. That means its not getting synced to the server. 
            // Hence,commenting out following code which checks for the appointment in server.

            //Verify imported appointment is synced to server
            //zAccount.AccountZCO.sendSOAP(
            //                        new SearchRequest().
            //                            Types("appointment").
            //                            CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddYears(1).AddDays(1)).
            //                            Query(apptSubject));

            //zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            //zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            //zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            #endregion

        }

        [Test, Description("Bug7833: Outlook crash after replying to a webex ics invitation")]
        [Category("Calendar")]
        [Bug("7833")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Modify the ics file to change the role and organizer to test users",
                    "Import the attached .ics file in ZCS",
                    "sync",
                    "Accept the meeting in outlook",
                    "Verify appointment is accepted")]
        public void Bug7833()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string readIcsFile = GlobalProperties.TestMailRaw + "/Bugs/7833/webexMeet.ics";
            string icsFile = "/Bugs/7833/webexMeet" + GlobalProperties.time() + GlobalProperties.counter() + ".ics";
            string writeIcsFile = GlobalProperties.TestMailRaw + icsFile;
            string apptSummary = "PSPL and Zimbra QA Weekly";
            DateTime startTimeUTC = new DateTime(2008, 11, 24, 20, 30, 00);
            DateTime endTimeUTC = new DateTime(2008, 11, 24, 22, 30, 00);
            string apptInvId;
            #endregion

            #region Modify ICS file
            //Modify the ics to be injected as original consists name of zimbra employees
            TextReader rIcs = new StreamReader(readIcsFile);
            TextWriter wIcs = new StreamWriter(writeIcsFile);

            string rLine;
            while ((rLine = rIcs.ReadLine()) != null)
            {
                if (rLine.Contains("ORGANIZERNAME"))
                {
                    rLine = rLine.Replace("ORGANIZERNAME", zAccount.AccountA.emailAddress);
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

            // Auth as the end user
            restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @icsFile);
            restClient.DoMethod();

            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

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

            string windowTitle = "Accepted: " + apptSummary + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            #endregion

            #region SOAP Verify status at organizer
            // Organizer verifies that the attendee status is Accepted
            // Search for that appointment
            zAccount.AccountA.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(6)).
                                            Query(apptSummary)
                                    );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(apptInvId));

            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + apptInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountA.emailAddress + "']", null , null, null, 1);
            #endregion

        }

        [Test, Description("Bug12134: Duplicate appointments when unchecking 'Reminder' option")]
        [Category("Calendar")]
        [Bug("12134")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Added calendar entry to Outlook",
                   "Opened calendar entry in Outlook and disabled 'reminder' checkbox.",
                   "Opened Zimbra web interface, viewed calendar, and pressed 'refresh'",
                   "Switched back to Outlook and pressed F9 (refresh.)",
                   "At this point, I could see one calendar entry in the Zimbra web interface,and duplicate calendar entries in Outlook.")]
        public void Bug12134()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 08, 25, 12, 0, 0);
            string reminderMinutes = "20";
            string messageInvId;
            #endregion

            #region Outlook Block
            // Use Outlook to create a draft message and save in the default draft folder

            // Create the new appointment
            RDOFolder rdoCalendarFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(rdoCalendarFolder, "Check that the calendar folder exists");

            // Create the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the Appointmnet is created correctly");

            rdoAppointmentItem.Subject = apptSubject;
            rdoAppointmentItem.Body = apptContent;

            rdoAppointmentItem.Start = startTimeLocal;
            rdoAppointmentItem.End = startTimeLocal.AddHours(3);

            rdoAppointmentItem.ReminderSet = true;
            rdoAppointmentItem.ReminderMinutesBeforeStart = Convert.ToInt16(reminderMinutes);
            rdoAppointmentItem.BusyStatus = Redemption.rdoBusyStatus.olBusy;
            rdoAppointmentItem.IsOnlineMeeting = false;
            rdoAppointmentItem.AllDayEvent = false;

            rdoAppointmentItem.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            // Remove the reminder
            rdoAppointmentItem.ReminderSet = false;
            rdoAppointmentItem.Save();

            // Sync outlook with reminder set
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                                Types("appointment").
                                                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);


            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode GetAppointmentResponse = zAccount.AccountZCO.selectSOAP("//mail:appt", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(GetAppointmentResponse, "//mail:inv/mail:comp/mail:alarm/mail:trigger/mail:rel[@related='START']", null, null, null, 0);
            #endregion

            #region Outlook
            //Verify that disabling reminder and opening event in ZWC has not created duplicate events
            OutlookCommands.Instance.Sync();

            // RDOAppointmentItem rAppt = redemption.findRDOAppointment((string)p.GlobalProperties["message2.subject"]);
            // zAssert.IsNotNull(rAppt, "Verify appointment exists in calendar");

            int count = 0;
            foreach (RDOAppointmentItem rAppt in rdoCalendarFolder.Items)
            {
                if (rAppt.Subject.Equals(apptSubject))
                {
                    count++;
                }

            }
            //Verify that appointment count equals 1
            zAssert.IsTrue(count.Equals(1), "Verify only one appointment is present in the calenar");

            #endregion
        }

        [Test, Description("Bug13585: Outlook crash after replying to a webex ics invitation")]
        [Category("Calendar")]
        [Bug("13585")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Import the attached .ics file in ZCS",
                    "sync",
                    "Accept the meeting in outlook",
                    "Verify content does not contain mime")]
        public void Bug13585()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string readIcsFile = GlobalProperties.TestMailRaw + "/Bugs/13585/13585.ics";
            string icsFile = "/Bugs/13585/13585" + GlobalProperties.time() + GlobalProperties.counter() + ".ics";
            string writeIcsFile = GlobalProperties.TestMailRaw + icsFile;
            string apptSubject = "bug 13585";
            string apptContent = "testmeeting";
            string appt1Content = "X-Zimbra-";
            DateTime startTimeUTC = new DateTime(2007, 01, 15, 11, 00, 00);
            DateTime endTimeUTC = new DateTime(2008, 11, 24, 12, 00, 00);
            string apptInvId;
            #endregion

            #region Modify ICS file
            //Modify the ics to be injected as original consists name of zimbra employees
            TextReader rIcs = new StreamReader(readIcsFile);
            TextWriter wIcs = new StreamWriter(writeIcsFile);

            string rLine;
            while ((rLine = rIcs.ReadLine()) != null)
            {
                if (rLine.Contains("ORGANIZERNAME"))
                {
                    rLine = rLine.Replace("ORGANIZERNAME", zAccount.AccountA.emailAddress);
                }
                if (rLine.Contains("ATTENDEENAME"))
                {
                    rLine = rLine.Replace("ATTENDEENAME", zAccount.AccountZCO.emailAddress);
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            FileInfo injectIcs = new FileInfo(writeIcsFile);
            zAssert.IsTrue(injectIcs.Exists, "Verify modified .ics file exists");
            #endregion

            #region SOAP Inject the ICS

            // Import an ICS to the mailbox
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @icsFile);
            restClient.DoMethod();

            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSubject));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));


            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            // Remove the modified ics file
            injectIcs.Delete();
            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppointmentItem);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            // RDO Fixup
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppointmentItem);

            rdoMeetingItem.Send();

            OutlookCommands.Instance.Sync();

            string windowTitle = "Accepted: " + apptSubject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            //Verify no mime in the content
            zAssert.IsTrue(rdoAppointmentItem.Body.Contains(apptContent), "Verify body contains the expected content");
            zAssert.IsFalse(rdoAppointmentItem.Body.StartsWith(appt1Content), "Verify body starts with expected content and does not contain mime i.e starts with 'X-Zimbra-'");

            #endregion
        }

        [Test, Description("Bug 14060: Cannot Forward Appointments from Outlook Calendar")]
        [Category("Calendar")]
        [TestSteps(
            "Open an appointment on Outlook Calendar",
            "Click on the 'Forward' button from the toolbar.(from field user should be from GAL, else message bounces back)",
            "A new window will open with all invitees in the 'To' field",
            "Remove all attendees",
            "Add a new attendee. ",
            "Message should be sent and on behalf should be shown in from field.")]
        [Bug("14060")]
        [Ignore("Cannot forward appointment as appointment using redemption. So automated steps from comment #1 of bug in MailBugs.cs")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug14060()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region OUTLOOK

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountA.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.IsTrue(rdoAppointmentItem.Body.Contains(message1Content), "Verify body of the appointment");

            //Forward the meeting 
  
            RDOMail rMail = rdoAppointmentItem.Forward() as RDOMail;
            zAssert.IsNotNull(rMail, "Verify ");
            rMail.To = zAccount.AccountB.emailAddress;
            rMail.Recipients.ResolveAll(null, null);

            rMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion
        }

        [Test, Description("Bug 16974: Error message too vague when exceeding message size")]
        [Category("Calendar")]
        [TestSteps(
            "1. From admin console change the 'Maximum message size' to 2000kb",
            "2. Configure outlook for any user, say test1",
            "3. Sent a message from test1 to another user with an attachment more than 200KB (200K size set as max mta msg size)",
            "4. After the send/receive is done the message attached with the bug is sent from System Administrator to test1.")]
        [Bug("16974")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug16974()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            //Modify Default Upload Size to 200Kb.
            const int Modified_Upload_Size = 204800;
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string uploadSize;
            #endregion

            #region Login using Admin and Change the default Upload Size Setting.

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.GetConfigRequest().GetAttributeValue(ConfigAttributes.zimbraMtaMaxMessageSize));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:GetConfigResponse/admin:a[@n='zimbraMtaMaxMessageSize']", null, null, out uploadSize, 1);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                                                                  ModifyAttribute(ConfigAttributes.zimbraMtaMaxMessageSize, Modified_Upload_Size.ToString()));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);

            #endregion

            try
            {

                #region Outlook Send meeting with attachment
                // Create the new appointment
                // Create a new appointment
                RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
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
                // Save and Send the appointment
                rAppt.Save();

                string filename = GlobalProperties.TestMailRaw + "/Bugs/16974/text.txt";
                FileInfo fileinfo = new FileInfo(filename);

                rAppt.Attachments.Add(filename, OlAttachmentType.olByValue, 1, "text");

                rAppt.To = zAccount.AccountA.emailAddress;
                rAppt.Recipients.ResolveAll(null, null);

                foreach (RDORecipient r in rAppt.Recipients)
                {
                    r.Type = (int)OlMeetingRecipientType.olRequired;
                }

                // Send the appointment
                rAppt.Send();

                // Close outlook
                OutlookCommands.Instance.Sync();

                //Wait for server to return error message
                System.Threading.Thread.Sleep(5000);

                //Resync outlook
                OutlookCommands.Instance.Sync();
                #endregion

                #region Outlook Verify Failure message
                string failedSubject = "Undeliverable: " + apptSubject;
                string failedContent = "File Upload Fault. Please contact your system administrator regarding maximum message and attachment sizes";

                string[] folderNames = { "Server Failures", "Inbox" };
                foreach (string folderName in folderNames)
                {
                   tcLog.Debug("Check for conflicts in " + folderName);

                    RDOFolder conflictsFolder = OutlookMailbox.Instance.findFolder(folderName);
                    if (conflictsFolder != null)
                    {
                        foreach (Redemption.RDOMail m in conflictsFolder.Items)
                        {
                            if (m.UnRead)       // Only unred items need to be processed
                            {
                                tcLog.Error(folderName + ": " + m.Body);
                                m.UnRead = false;           // Mark it read so it won't be processed again
                                if (m.Subject.Equals(failedSubject))
                                {
                                    // Verify the failure message contains expected failure message
                                    zAssert.IsTrue(m.Body.Contains(failedContent), "Verify body contains expected failure message");
                                }
                            }
                        }
                    }
                }

                #endregion
            }

            finally
            {
                #region Setting default upload size
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().ModifyAttribute(ConfigAttributes.zimbraMtaMaxMessageSize, uploadSize));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);
                #endregion
            }

        }

        [Test, Description("Bug 5669: Appt. modified through web mail not reflected in outlook.")]
        [Category("Calendar")]
        [TestSteps(
            "1. Open outlook client.",
            "2. Click on New to create a non recurring appointment giving only subject location and notes.",
            "3. Login to DHTML client",
            "4. Open the appointment change the timing of the appointment.",
            "5. Open Outlook client.",
            "6. Open the modified appointment.",
            "Expected Result: Appointment should show the new start and end time.")]
        [Bug("5669")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug5669()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime newStartTimeLocal = new DateTime(2010, 07, 25, 12, 0, 0);
            string messageInvId, uId, messageCalItemId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);

            //Modify the start time
            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(messageInvId, "0").
                 AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccountAdmin.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject(uId).
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(newStartTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(newStartTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(newStartTimeLocal, rdoAppointmentItem.Start, "Check appointment start time");
            zAssert.AreEqual(newStartTimeLocal.AddHours(1), rdoAppointmentItem.End, "Check appointment end time");
            #endregion

        }

        [Test, Description("Bug 9321: recurring appointments created with a start date in the past jump time on the web client")]
        [Category("Calendar")]
        [TestSteps(
            "1. Open outlook client.",
            "2. Create a recurring appointment that occurs in past",
            "3. Login to DHTML client",
            "4. Open the appointment and verify start and end time.")]
        [Bug("9321")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug9321()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2011, 3, 10, 14, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 5;

            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "DAI", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Bug9831: Outlook crash if TZ info missing")]
        [Category("Calendar")]
        [Bug("9831")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Import the attached .ics file with no timezone info in ZCS",
                    "sync",
                    "Verify meeting exists in ZCO")]
        public void Bug9831()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            string icsFile = GlobalProperties.TestMailRaw + "/Bugs/9831/Without_TZInfo.ics";
            string apptSummary = "Without_TimeZoneInfo";
            string apptContent = "TestAppointment";
            DateTime startTimeUTC = new DateTime(2008, 12, 02, 6, 00, 00);
            DateTime endTimeUTC = new DateTime(2008, 12, 02, 7, 00, 00);
            string apptInvId;
            #endregion

            #region SOAP Inject the ICS

            // Import an ICS to the mailbox
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @"/Bugs/9831/Without_TZInfo.ics");
            restClient.DoMethod();

            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            // Verify subject and content of meeting
            zAssert.IsTrue(rdoAppointmentItem.Subject.Equals(apptSummary), "Verify subject of the injected appointment.");
            zAssert.IsTrue(rdoAppointmentItem.Body.Contains(apptContent), "Verify content of the injected appointment.");

            #endregion
        }

        [Test, Description("Bug15200: Alias not hidden in GAL")]
        [Category("Calendar")]
        [Bug("15200")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Create a account and add 2 alias for the same.",
                    "Sync GAL in ZCO",
                    "Verify that while searching aliases are not returned")]
        public void Bug15200()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string alias1 = "account1Alias1" + GlobalProperties.time() + GlobalProperties.counter();
            string alias2 = "account1Alias2" + GlobalProperties.time() + GlobalProperties.counter();
            zAccount.AccountA.alias = alias1;
            zAccount.AccountA.alias = alias2;
            #endregion

            #region Outlook Sync GAL and verify no alias is present
            //Sync outlook
            OutlookCommands.Instance.Sync();
            //Sync GAL
            OutlookCommands.Instance.SyncGAL();

            // Verify that aliases of account are not shown when GAL is searched
            zAssert.IsFalse(OutlookMailbox.Instance.getGalAddressList().ToString().Contains(alias1), "Verify account alias is not listed in GAL");
            zAssert.IsFalse(OutlookMailbox.Instance.getGalAddressList().ToString().Contains(alias2), "Verify account alias is not listed in GAL");

            #endregion

        }

        [Test, Description("Status not changing in Tracking tab in Outlook while using ZCO")]
        [Category("Calendar")]
        [Bug("29645")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Create a Test Account and a Resource=location(AutoAcceptDecline=TRUE)", "From Syncuser account send a meeting to test accounts and Resource.", "Sync", "Checked that Resource shows status as accepted in ZCO ")]
        public void Bug29645()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string locationDisplayName = "location" + GlobalProperties.time() + GlobalProperties.counter();
            string locationName = locationDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId, resourceId, messageCalItemId;
            #endregion

            #region Account Setup

            //Create the resource/equitment
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateCalendarResourceRequest().
                                   UserName(locationName).
                                   UserPassword(GlobalProperties.getProperty("defaultpassword.value")).
                                   DisplayName(locationDisplayName).
                                   ResourceType("Location"));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource[@name='" + locationName + "']", "id", null, out resourceId, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:calresource/admin:a[@n='zimbraCalResType']", null, "Location", null, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddAttendee(zAccount.AccountA.emailAddress).
                                    AddResource(locationName).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            #endregion

            #region SOAP Block to Verify Appoinment is in User Calendar.

            OutlookCommands.Instance.Sync();

            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                                Types("appointment").
                                                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);

            #endregion

            #region Outlook Block to check appointment in Outlook too.

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            OutlookCommands.Instance.Sync();
            #endregion

            #region Verify that Resourse has Accepted the Appointment

            OutlookCommands.Instance.Sync();
            int meetingResponseAccept = 2;
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar store");
            try
            {
                foreach (Redemption.RDORecipient r in rdoAppt.Recipients)
                {
                    if ((!r.Address.Equals(zAccount.AccountZCO.emailAddress)) && (r.Address.Equals(locationName)))
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

       

        [Test, Description("Appointment shows on Zimbra server, but not on ZCO")]
        [Category("Calendar")]
        [Bug("19893")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Modify the ics file to change the attendee and organizer to test users",
                    "Import the attached .ics file in ZCS",
                    "sync",
                    "Verify that the Appointment is Synced Correctly to Outlook")]
        public void Bug19893()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string readIcsFile = GlobalProperties.TestMailRaw + "/Bugs/19893/bug19893.ics";
            string icsFile = "/Bugs/19893/bug19893" + GlobalProperties.time() + GlobalProperties.counter() + ".ics";
            string writeIcsFile = GlobalProperties.TestMailRaw + icsFile;
            string apptSummary = "Staff Meeting";
            DateTime startTimeUTC = new DateTime(2007, 08, 07, 07, 00, 00);
            DateTime endTimeUTC = new DateTime(2007, 08, 14, 07, 30, 00);
            DateTime apptstartTimeUTC = new DateTime(2007, 03, 12, 13, 00, 00);
            DateTime apptendTimeUTC = new DateTime(2007, 03, 12, 14, 30, 00);
            string apptInvId;
            #endregion

            #region Modify ICS file
            //Modify the ics to be injected as original consists name of zimbra employees
            TextReader rIcs = new StreamReader(readIcsFile);
            TextWriter wIcs = new StreamWriter(writeIcsFile);

            string rLine;
            while ((rLine = rIcs.ReadLine()) != null)
            {
                if (rLine.Contains("ORGANISERNAME"))
                {
                    rLine = rLine.Replace("ORGANISERNAME", zAccount.AccountZCO.emailAddress);
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            FileInfo injectIcs = new FileInfo(writeIcsFile);
            zAssert.IsTrue(injectIcs.Exists, "Verify modified .ics file exists");
            #endregion

            #region SOAP Inject the ICS
           // Import an ICS to the syncuser mailbox 
            RestClient restClient = new RestClient("POST");
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

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            //Delete the modified ics file
            injectIcs.Delete();

            #endregion

            #region Outlook Sync

            OutlookCommands.Instance.Sync();

            #endregion

            #region Check whether appointment synced correctly.

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            // Verify subject and content of meeting
            zAssert.IsTrue(rdoAppointmentItem.Subject.Equals(apptSummary), "Verify subject of the injected appointment.");
            //zAssert.IsTrue(rdoAppointmentItem.Body.Contains(apptContent), "Verify content of the injected appointment.");
            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(apptstartTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(apptendTimeUTC, rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");

            #endregion

        }

        [Test, Description("Bug19374: Outlook 2007 shows invitee as meeting organizer")]
        [Category("Calendar")]
        [Bug("19374")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Import the attached .ics file in ZCS",
                    "sync",
                    "Verify meeting exists in ZCO")]
        public void Bug19374()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string icsFile = GlobalProperties.TestMailRaw + "/Bugs/19374/CCF_Eng_All.ics";
            string apptSummary = "All hands";
            DateTime startTimeUTC = new DateTime(2008, 01, 15, 16, 00, 00);
            DateTime endTimeUTC = new DateTime(2008, 01, 15, 17, 30, 00);
            string apptInvId;
            #endregion

            #region SOAP Inject the ICS

            // Import an ICS to the mailbox
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @"/Bugs/19374/CCF_Eng_All.ics");
            restClient.DoMethod();
            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            // Verify subject and content of meeting
            zAssert.IsTrue(rdoAppointmentItem.Subject.Equals(apptSummary), "Verify subject of the injected appointment.");
            // commenting out extra check. The ics file does not contain body. Hence following check failed. This check is not part of this test case goal. so removing it.
           // zAssert.IsTrue(rdoAppointmentItem.Body.Contains(apptContent), "Verify body of the injected appointment.");

            //Verify that attendees name is not shown as organizer
            zAssert.IsTrue(rdoAppointmentItem.Organizer.Contains("Yousef T Parvizi"), "Verify the organizer of the injected ics");

            #endregion
 
        }

        [Test, Description("Bug 19763:Appointments with embedded message attachments dont sync to the server correctly")]
        [Category("Calendar")]
        [Bug("19763")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Save any message in outlook as an embedded message file.",
                    "Create an appointment in outlook",
                     "Add the message file created above as an attachment.",
                     "Sync")]
        public void Bug19763()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            string filename = GlobalProperties.TestMailRaw + "/Bugs/19763/test.msg";
            FileInfo fileinfo = new FileInfo(filename);

            rAppt.Attachments.Add(filename, OlAttachmentType.olByValue, 1, "test");
            // Save the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion
 
        }

        [Test, Description("Bug17352: Appointment shows on Zimbra server, but not on ZCO")]
        [Category("Calendar")]
        [Bug("17352")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Ignore("Bug works fine if executed manually but fails when ran through automation")]
        [TestSteps("1. User1 delegates calendar control to User2 with 'Manager Rights'",
                    "2. User2 sends a meeting request in Outlook to several attendees from User1's calendar",
                    "3. Attendees receive email, and accept invitation, but the attendee status is not updated in the meeting information.")]
        public void Bug17352()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalNew = new DateTime(2010, 10, 25, 12, 0, 0);
            string calendarFolderId, apptInvId, apptCompNum, apptOrganizer;
            #endregion

            #region SOAP: Delegate shares calendar folder

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());

            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoDelegate)
                                        );

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");


            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Try to insert appt - should allow with rwid rights
            UnauthorizedAccessException unauthorizedAccessException = null;
            RDOAppointmentItem rdoNewApptItem = null;

            try
            {
                rdoNewApptItem = OutlookMailbox.Instance.CreateAppointment();
                zAssert.IsNotNull(rdoNewApptItem, "Verify the Appointmnet is created correctly");

                rdoNewApptItem.Subject = apptSubject;
                rdoNewApptItem.Body = apptContent;
                rdoNewApptItem.Location = "";
                rdoNewApptItem.Start = startTimeLocalNew;
                rdoNewApptItem.End = startTimeLocalNew.AddHours(3);

                rdoNewApptItem.ReminderSet = true;
                rdoNewApptItem.ReminderMinutesBeforeStart = 30;
                rdoNewApptItem.BusyStatus = Redemption.rdoBusyStatus.olBusy;
                rdoNewApptItem.IsOnlineMeeting = false;
                rdoNewApptItem.AllDayEvent = false;

                rdoNewApptItem.To = zAccount.AccountB.emailAddress;
                rdoNewApptItem.Recipients.ResolveAll(null, null);

                foreach (RDORecipient r in rdoNewApptItem.Recipients)
                {
                    r.Type = (int)OlMeetingRecipientType.olRequired;
                }

                // Send the appointment
                rdoNewApptItem.Send();
                OutlookCommands.Instance.Sync();

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to add a new appointment");

            #endregion

            #region SOAP Accept the meeting

            //Search for appointment
            zAccount.AccountB.sendSOAP(
                                        new SearchRequest().
                                                Types("appointment").
                                                CalExpandInst(startTimeLocalNew.AddDays(-1), startTimeLocalNew.AddDays(1)).
                                                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out apptCompNum, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out apptOrganizer, 1);

            zAccount.AccountB.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "ACCEPT",
                                                        apptInvId,
                                                        apptCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        apptSubject));
            zAccount.AccountB.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);

            #endregion

            #region Outlook Verify attendee status

            OutlookCommands.Instance.Sync();
            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            zAssert.AreEqual(apptSubject, rdoAppt.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains(apptContent), "Verify the delegate appt content matches the expected.");

            foreach (RDORecipient r in rdoAppt.Recipients)
            {
                if (r.Address.Equals(zAccount.AccountB.emailAddress))
                {
                    //olResponseAccepted (3)
                    zAssert.AreEqual(3, r.MeetingResponseStatus, "Response status of " + r.Address + " matched.");
                }
            }
            #endregion

        }

        [Test, Description("Bug:10207 Accepting an all-day appointment from ZCO changes the free/busy setting from free to busy")]
        [Category("Calendar")]
        [Bug("10207")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("login to web client as account", "send all day meeting request from account to SyncUser", "login to outlook as SyncUser", "Sync the mailbox, file->work offline",
                   "note the all day appt in the calendar has fb=free", "open the mtg request and accept it", "note the all day appointment has fb=busy")]
        public void Bug10207()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            ReadOnlyCollection<string> timeZones = zTimeZoneInfo.GetZimbraTimeZones();

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddMonths(1).AddDays(6).AddHours(10);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();

            string apptInvId, messageCalItemId;
            #endregion

            #region SOAP: test account sends meeting request to sync user

            
            string timeZone = zTimeZoneInfo.ConvertTZIntoZimbraFormat(TimeZoneInfo.Local.DisplayName);

            // Add a message to the account mailbox
            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, timeZone).
                                    EndTime(startTimeLocal.AddHours(1), timeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            System.Threading.Thread.Sleep(6000);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(2)).
                                        Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));

            #endregion

            #region Outlook Work Offline
            OutlookCommands.Instance.SetWorkOffline(true);

            #endregion

            try
            {

                #region Verify that SyncUser Shows Free/Busy=free

                OutlookCommands.Instance.Sync();

                //Free Busy Verification is not possible on Outlook side so commeting out this free busy part checking code.

                /*
                RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
                zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar store");

                try
                {
                    foreach (RDORecipient r in rdoAppt.Recipients)
                   {
                        if ((r.Address.Equals(zAccount.AccountZCO.emailAddress)))
                       {
                            string freeBusyString = r.FreeBusy(startTimeLocal.AddDays(-1),30, true);
                            zAssert.IsNotNull(freeBusyString, "Verify the free busy was returned");
                        }
                    }
                }
                catch (System.Exception e)
                {
                     //Catch the unknown domain exception
                    Console.WriteLine(e.StackTrace);
                }
                
                 */

                string apptStart = (startTimeLocal.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
                string apptEnd = (startTimeLocal.AddHours(1).ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

                zAccount.AccountZCO.sendSOAP(
                            new GetFreeBusyRequest().
                                    Start(startTimeLocal.AddDays(-2)).
                                    End(startTimeLocal.AddDays(2)).Id(zAccount.AccountZCO.zimbraId));

                zAccount.AccountZCO.selectSOAP("//mail:t[@s='" + apptStart + "']", "e", apptEnd, null, 1);

                #endregion

                #region Accept the Meeting

                OutlookCommands.Instance.Sync();

                RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
                zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar store");

                RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppt);
                zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

                // RDO Fixup
                OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppt);

                rdoMeetingItem.Send();

                OutlookCommands.Instance.Sync();
                #endregion

                #region Verify that SyncUser Shows Free/Busy = Busy

                //Free Busy Verification is not possible on Outlook side so commeting out this free busy part checking code.

                OutlookCommands.Instance.Sync();

                /*
                rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
                zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the calendar store");

                try
                {
                    foreach (Redemption.RDORecipient r in rdoAppt.Recipients)
                    {
                        if ((r.Address.Equals(zAccount.AccountZCO.emailAddress)))
                        {
                            string freeBusyString = r.FreeBusy(startTimeLocal.AddDays(-1), 30, true);
                            zAssert.IsNotNull(freeBusyString, "Verify the free busy was returned");
                        }
                    }
                }
                catch (System.Exception e)
                {
                    // Catch the unknown domain exception
                    Console.WriteLine(e.StackTrace);
                }
                 */

                zAccount.AccountZCO.sendSOAP(
                               new GetFreeBusyRequest().
                                       Start(startTimeLocal.AddDays(-2)).
                                       End(startTimeLocal.AddDays(2)).
                                       Id(zAccount.AccountZCO.zimbraId));

                zAccount.AccountZCO.selectSOAP("//mail:b[@s='" + apptStart + "']", "e", apptEnd, null, 1);

                string windowTitle = "Accepted: " + apptSubject + " - Meeting Response  ";

                NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

                #endregion

            }
            
            //Added finally code bcoz if test fails for any reason, Outlook will never be set online
            finally
            {
                #region Outlook Work Offline
                OutlookCommands.Instance.SetWorkOffline(true);

                #endregion
            }

        }

        [Test, Description("Bug 25894:Meetings updated with ZWC cause appt summary to show in Outlook")]
        [Category("Calendar")]
        [Bug("25894")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("1. Create an appointment with ZCO, make sure there's an attendee",
                    "2. Modify it with ZWC",
                    "3. Open the organizers mailbox with zco and inspect the appointment",
                    "Actual: appointment notes and appointment summary is in the body")]
        public void Bug25894()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId, uId, messageCallItemId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            //XmlNode GetAppointmentResponse = zAccount.AccountZCO.selectSOAP("//mail:appt", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp", "uid", null, out uId, 1);

            //Modify the start time
            DateTime newStartTimeLocal = new DateTime(2010, 07, 25, 12, 0, 0);
            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(messageInvId, "0").
                 AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject(uId).
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(newStartTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(newStartTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that appointment exists in calendar");

            // Verify that content does not contain summary 
            zAssert.IsFalse(rdoAppt.Body.Contains(apptSubject), "Verify that body does not contain summary of appointment");
            #endregion

        }

        [Test, Description("Bug27326:Verify exception (content changed) of a weekly recurring appointment is sync from ZCO")]
        [Bug("27326")]
        [TestSteps("Create a recurring appointment with some content.",
                    "Modify it",
                    "In ZCS open any instance",
                    "Verify instance contains the content")]
        [Category("Calendar")]
        public void Bug27326()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string newContent = "NewContent" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 10, 27, 12, 0, 0);
            string messageInvId, messageExInvId;
            #endregion

            #region Outlook Block

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.CreateAppointment();
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the Appointmnet is created correctly");

            rdoAppointmentItem.Subject = apptSubject;
            rdoAppointmentItem.Body = apptContent;

            rdoAppointmentItem.Start = startTimeLocal;
            rdoAppointmentItem.End = startTimeLocal.AddHours(3);
            rdoAppointmentItem.AllDayEvent = false;
            rdoAppointmentItem.ReminderSet = false;
            rdoAppointmentItem.ReminderMinutesBeforeStart = 30;
            rdoAppointmentItem.BusyStatus = rdoBusyStatus.olBusy;
            rdoAppointmentItem.IsOnlineMeeting = false;

            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 5;

            rdoAppointmentItem.Save();

            // Sync and Close outlook
            OutlookCommands.Instance.Sync();
            //Create exception of first instance by giving start time
            RDOAppointmentItem exAppointment = recurrencePattern.GetOccurence(1) as RDOAppointmentItem;
            exAppointment.Body = newContent;

            // save the appointment
            exAppointment.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").
                CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(6)).
                Query("subject:(" + apptSubject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst[@ex='1']", "invId", null, out messageExInvId, 1);

            // Get the recurring meeting
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));

            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:desc", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "DAI", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");

            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");
            zAssert.AreEqual(startTimeLocal.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            // Get the exception of recurring meeting
            // Verify that instance body is not blank.
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageExInvId));

            XmlNode appointmentMessageEx = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageExInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:fr", null, newContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:desc", null, newContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessageEx, "//mail:comp", "name", apptSubject, null, 1);


            #endregion
 
        }

        [Test, Description("Bug 29378: Accepting an appointment from ZCO removes meeting notes")]
        [Category("Calendar")]
        [TestSteps(
            "1. User1 uses ZWC to create a simple meeting and invites user2.  Enter some notes.",
            "2. User2 uses ZWC to view the newly added meeting.  The notes are there. ",
            "3. User2 uses ZCO to accept the appointment.  Click on the Accept button from the email view.  ZCO sends a SetAppointmentRequest with empty body and wipes out the notes.",
            "4. ZCO still shows the notes, and it is now out of sync with server.",
            "5. View the appointment again from ZWC.  The text is gone.")]
        [Bug("29378")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug29378()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 07, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string appointmentId, messageCalItemId;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region OUTLOOK
            // Accept the meeting and verify that meeting does not disappear
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppointmentItem);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            // RDO Fixup
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppointmentItem);

            rdoMeetingItem.Send();

            OutlookCommands.Instance.Sync();

            // Verify meeting notes are present
            RDOAppointmentItem rdoApptAfterAccept = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoApptAfterAccept.Body.Contains(apptContent), "Verify appointment body is not null.");

            #endregion

            #region SOAP Block

            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(appointmentId));
            XmlNode GetAppointmentResponse = zAccount.AccountA.selectSOAP("//mail:appt", null, null, null, 1);
            zAccount.AccountA.selectSOAP(GetAppointmentResponse, "//mail:appt/mail:inv/mail:comp/mail:desc", null, apptContent, null, 1);
            #endregion

            string windowTitle = "Accepted: " + apptSubject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window
        }

        [Test, Description("Bug30282: Better error handling for mime conversion failures")]
        [Category("Calendar")]
        [Bug("30282")]
        [TestSteps("Inject the mime.",
                    "Sync",
                    "A local failure indicating the mime message is malformed and the mime message as an attachment")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug30282()
        {
            #region Test Case variables
            string messageSubject = "Updated: TEST";
            string failedSubject = "Local Failure Notice";
            string failedContent = "mime to mapi conversion returned partial completion";
            string failedContent2 = "Body of this item maybe corrupted.";
            #endregion

            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.ZimbraQARoot + @"\data\TestMailRaw\Bugs\30282";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook Block. Verify MIME contents
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(messageSubject);
            zAssert.IsNotNull(rdoMail, "Verify that the injected mail item exists.");

            zAssert.IsTrue(rdoMail.Subject.Contains(messageSubject), "Verify the mail subject matches");

            #endregion

            #region Outlook Verify Failure message

            string[] folderNames = { "Local Failures", "Inbox" };
            foreach (string folderName in folderNames)
            {
                tcLog.Debug("Check for conflicts in " + folderName);

                RDOFolder conflictsFolder = OutlookMailbox.Instance.findFolder(folderName);
                if (conflictsFolder != null)
                {
                    foreach (Redemption.RDOMail m in conflictsFolder.Items)
                    {
                        if (m.UnRead)       // Only unread items need to be processed
                        {
                            tcLog.Error(folderName + ": " + m.Body);
                            m.UnRead = false;           // Mark it read so it won't be processed again
                            if (m.Subject.Equals(failedSubject))
                            {
                                // Verify the failure message contains expected failure message
                                zAssert.IsTrue(m.Body.Contains(failedContent), "Verify body contains expected failure message");
                                zAssert.IsTrue(m.Body.Contains(failedContent2), "Verify body contains expected failure message");
                            }
                        }
                    }
                }
            }

            #endregion
 
        }

        [Test, Description("Bug 21731: Support tracking data on exceptions to recurring appts")]
        [Category("Calendar")]
        [TestSteps(
            "User2 creates a recurring daily meeting, inviting User3",
            "User3 accepts the series",
            "User3 declines one instance",
            "User2 reads the decline messages now in the Inbox. Status of that instance should be updated.")]
        [Bug("21731")]
        [SyncDirection(SyncDirection.TOZCO)]
        //This test case fails because of bug #50026.
        public void Bug21731()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeTemp = DateTime.Now.AddDays(3);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            string messageInvId, instanceRidz, messageCompNum, messageOrganizer, startTime, timeZone;
            #endregion

            #region Outlook Block

            // Create the new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();

            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Sensitivity = (int)rdoSensitivity.olPrivate;

            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 5;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            rAppt.Save();
            // Send the appointment
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            // Search for the message ID and accept the appointment
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").
                CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(7)).
                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", "ridZ", null, out instanceRidz, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out messageCompNum, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out messageOrganizer, 1);

            zAccount.AccountA.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "ACCEPT",
                                                        messageInvId,
                                                        messageCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        apptSubject));
            zAccount.AccountA.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);

            // Get the exception of recurring meeting and decline the instance
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId).RecurrenceId(instanceRidz));

            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "d", null, out startTime, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "tz", null, out timeZone, 1);

            //Decline an instance
            zAccount.AccountA.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "DECLINE",
                                                        messageInvId,
                                                        messageCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        apptSubject).
                                                        ExceptionId(startTime, timeZone));
            zAccount.AccountA.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);

            #endregion

            #region Outlook Block
            //Verify that tracking data of declined instance is updated
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that appointment exists in calendar");

            RDORecurrencePattern rdoRecurrence = rdoAppt.GetRecurrencePattern();
            RDOAppointmentItem rdoException = rdoRecurrence.GetOccurence(startTimeLocal) as RDOAppointmentItem;

            foreach (RDORecipient r in rdoException.Recipients)
            {
                if (r.Address.Equals(zAccount.AccountA.emailAddress))
                {
                    //olResponseDeclined (4)
                    zAssert.AreEqual(4, r.MeetingResponseStatus, "Response status of " + r.Address + " matched.");
                }
            }


            #endregion
        }

        [Test, Description("Bug 21848: No way to set rsvp attr of comp")]
        [Category("Calendar")]
        [TestSteps(
            "user2 creates a recurring weekly meeting, inviting User3",
            "user3 accepts the series",
            "user2 reads the accept message (doesn't really matter)",
            "user2 changes the time on one instance and sends an update to user3",
            "user3 declines (or responds any way he wants)",
            "The response is not sent")]
        [Bug("21848")] [Bug("50026")]
        [SyncDirection(SyncDirection.TOZCO)]
        //This test case fails because of bug #50026.
        public void Bug21848()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddDays(3);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageInvId, instanceRidz, messageCompNum, messageOrganizer, startTime, timezone;
            #endregion

            #region Outlook Block

            // Create the new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Sensitivity = (int)rdoSensitivity.olPrivate;

            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 5;

            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);

            // Send the appointment
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            // Search for the message ID and accept the appointment
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").
                Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-2), startTimeLocal.AddDays(7)));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", "ridZ", null, out instanceRidz, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out messageCompNum, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out messageOrganizer, 1);

            zAccount.AccountA.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "ACCEPT",
                                                        messageInvId,
                                                        messageCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        apptSubject));
            zAccount.AccountA.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);

            #endregion

            #region Outlook Block
            //Modify time of the first instance
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem exAppt = recurrencePattern.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            exAppt.Start = startTimeLocal.AddHours(2);
            exAppt.End = startTimeLocal.AddHours(3);
            exAppt.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block Decline the modified instance
            // Get the exception of recurring meeting and decline the instance
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId).
                                    RecurrenceId(instanceRidz));

            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "d", null, out startTime, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "tz", null, out timezone, 1);

            //Decline an instance
            zAccount.AccountA.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "DECLINE",
                                                        messageInvId,
                                                        messageCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        apptSubject).
                                                        ExceptionId(startTime, timezone));
            zAccount.AccountA.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);
            #endregion

            #region Outlook Block
            // Verify that declined message is received.
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage("Decline: " + apptSubject);
            zAssert.IsNotNull(rdoMail, "Verify that the injected mail item exists.");

            zAssert.IsTrue(rdoMail.Body.Contains("DECLINE: " + apptSubject), "Verify the mail subject matches");

            #endregion
 
        }

        [Test, Description("Bug 23746: Appointments fail to convert when exception skips over a later occurrence")]
        [Category("Calendar")]
        [TestSteps(
            "1) In ZWC, create a recurring appt, say every 3 days",
            "2) In ZWC, move one of the occurrences past a following one",
            "3) In ZCO, sync.  ZCO display will not change -- we will be out of sync.",
            "appt conversion failed message will appear in the ZCO log.")]
        [Bug("23746")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug23746()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageInvId, instanceRidz, messageCompNum, messageOrganizer, startTime, timezone, uId, instanceCalItemId;
            string recurringInterval = "1";
            string recurringOccurrences = "4";
            string recurringFrequency = "DAI";
            #endregion

            #region SOAP
            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringOccurrences, null).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);
            #endregion

            #region Sync Outlook
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            // Search for the message ID and accept the appointment
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").
                CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(6)).
                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", "ridZ", null, out instanceRidz, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out messageCompNum, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out messageOrganizer, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId).
                                    RecurrenceId(instanceRidz));

            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "d", null, out startTime, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "tz", null, out timezone, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp", "uid", null, out uId, 1);

            //Modify the start time of first instance and change to past a following event
            DateTime newStartTimeLocal = new DateTime(2010, 12, 31, 12, 0, 0);
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentExceptionRequest(messageInvId, "0").
                 AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject(uId).
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(newStartTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(newStartTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))).ExceptionId(startTime, timezone));
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentExceptionResponse", "calItemId", null, out instanceCalItemId, 1);

            #endregion

            #region Outlook Block
            // Verify exception created past the following occurence exists

            OutlookCommands.Instance.Sync();

            //Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that appointment exists in calendar");

            //Get the occurence that is moved from the recurrence pattern
            RDORecurrencePattern rdoRecurrence = rdoAppt.GetRecurrencePattern();
            RDOAppointmentItem rdoException = rdoRecurrence.GetOccurence(newStartTimeLocal) as RDOAppointmentItem;

            zAssert.IsNotNull(rdoException, "Verify that the exception created past the following instance exits.");

            //Verify start and end time
            zAssert.AreEqual(newStartTimeLocal, rdoException.Start, "Check exception start time");
            zAssert.AreEqual(newStartTimeLocal.AddHours(1), rdoException.End, "Check exception start time");

            #endregion

        }

        [Test, Description("Bug 30712: Update of recurring meeting's end date not reflected in organizer's calendar")]
        [Category("Calendar")]
        [TestSteps(
            "Create a recurring meeting.  Set the end date to a particular date.",
            "At a later time, change the end date to one week later.",
            "Send the update",
            "The revised meeting is not in the calendar; the old one is.  The attendees have the proper meeting.")]
        [Bug("30712")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug30712()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId;
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

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 5;

            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                                    Types("appointment").
                                                    Query("subject:(" + apptSubject + ")")
                                                );

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);


            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:rule", "freq", "DAI", null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

            #region Outlook Block
            //Modify the end date to one week later
            OutlookCommands.Instance.Sync();
            string recurringOccurrences = "9";

            recurrencePattern.Occurrences = Convert.ToInt16(recurringOccurrences);
            recurrencePattern.Interval = 1;

            rAppt.Save();
            rAppt.Send();
            OutlookCommands.Instance.Sync();

            // Verify the revised meeting is there in the calendar

            zAssert.AreEqual(apptContent, rAppt.Body.Trim(), "Check appointment body");
            zAssert.AreEqual(apptSubject, rAppt.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rAppt.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(startTimeLocal, rAppt.Start, "Check appointment start time");
            zAssert.AreEqual(startTimeLocal.AddHours(1), rAppt.End, "Check appointment start time");

            RDORecurrencePattern recurrence = rAppt.GetRecurrencePattern();
            int olInterval = recurrence.Interval;
            int olOccurrences = recurrence.Occurrences;

            zAssert.AreEqual("1", Convert.ToString(olInterval), "Check the interval of recurring appointment");
            zAssert.AreEqual(recurringOccurrences, Convert.ToString(olOccurrences), "Check the number of occurrences");
            zAssert.AreEqual("olRecursDaily", Convert.ToString(recurrence.RecurrenceType), "Check recurrence type");

            #endregion

        }

        [Test, Description("Bug 32992: Changing reminder time of an appointment changes status to tentative")]
        [Category("Calendar")]
        [TestSteps(
            "UserA creates appointment and invites UserB",
            "UserB accepts appointment",
            "Both user's appointment displays as accepted (Not bold)",
            "UserA changes reminder of appointment")]
        [Bug("32992")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Ignore("Modifying the reminder at attendees end from script gives 'mail.MUST_BE_ORGANIZER' error. Some value is getting changed of the appt which gives this error.")]
        public void Bug32992()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string reminderModified = "20";
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string messageInvId, instanceRidz, messageCompNum, messageOrganizer, uId, apptStartTime, apptEndTime, messageCalItemId, accountStatus, accountModifiedStatus;
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
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the message ID and accept the appointment
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").
                CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(6)).
                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", "ridZ", null, out instanceRidz, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out messageCompNum, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out messageOrganizer, 1);

            zAccount.AccountA.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "ACCEPT",
                                                        messageInvId,
                                                        messageCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        apptSubject));
            zAccount.AccountA.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);

            #endregion

            #region SOAP Block
            //Verify that status is accepted at attendees end
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId).
                                    RecurrenceId(instanceRidz));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP("//mail:at[@a='" + zAccount.AccountA.emailAddress + "']", "ptst", "AC", out accountStatus, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:m/mail:inv/mail:comp", "uid", null, out uId, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:m/mail:inv/mail:comp/mail:s", "d", null, out apptStartTime, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:m/mail:inv/mail:comp/mail:e", "d", null, out apptEndTime, 1);

            #endregion

            #region SOAP Change the reminder

            //Modify the start time
            zAccount.AccountA.sendSOAP(new ModifyAppointmentRequest(messageInvId, "0").
                 AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject(uId).
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    AddAttendee(zAccount.AccountA.emailAddress).
                                    AddReminder(reminderModified).
                                    StartTime(apptStartTime).
                                    EndTime(apptEndTime))));
            zAccount.AccountA.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region SOAP Verify status not chagned after modifying reminder
            //Verify that status is accepted at attendees end
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));

            appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountA.emailAddress + "']", "ptst", null, out accountModifiedStatus, 1);

            //Verify that status of meeting after changing reminder and before are same
            zAssert.AreEqual(accountStatus, accountModifiedStatus, "Verify that appointment status should remain accepted if remidner is modified");

            #endregion

        }

        [Test, Description("Bug33009: Meeting Response Shows Wrong Sender in outlook")]
        [Category("Calendar")]
        [Bug("33009")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1.UserC shares calendar with UserA",
                    "2. UserA creates an appointment in UserC’s calendar and invites UserB",
                    "3. UserB accepts the appointment using the web client",
                    "4. UserA receives the response from UserB in Outlook but the sender is shown as UserA (Not-expected)")]
        public void Bug33009()
        {
            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalNew = new DateTime(2010, 12, 25, 12, 0, 0);
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId, instanceRidz, messageCompNum, messageOrganizer, messageInvId;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("calendar")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                parentFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder defaultCalendar = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultCalendar, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");
            RDOFolder rFolder = OutlookMailbox.Instance.findFolder(account1folderName, defaultCalendar, true);
            UnauthorizedAccessException unauthorizedAccessException = null;

            // Insert appt
            RDOAppointmentItem rdoNewApptItem = null;
            try
            {
                rdoNewApptItem = rFolder.Items.Add("IPM.Appointment") as RDOAppointmentItem;
                zAssert.IsNotNull(rdoNewApptItem, "Verify the Appointmnet is created correctly");

                rdoNewApptItem.Subject = apptSubject;
                rdoNewApptItem.Body = apptContent;
                rdoNewApptItem.Location = "";
                rdoNewApptItem.Start = startTimeLocalNew;
                rdoNewApptItem.End = startTimeLocalNew.AddHours(3);

                rdoNewApptItem.ReminderSet = true;
                rdoNewApptItem.ReminderMinutesBeforeStart = 30;
                rdoNewApptItem.BusyStatus = Redemption.rdoBusyStatus.olBusy;
                rdoNewApptItem.IsOnlineMeeting = false;
                rdoNewApptItem.AllDayEvent = false;

                rdoNewApptItem.To = zAccount.AccountB.emailAddress;
                rdoNewApptItem.Recipients.ResolveAll(null, null);

                rdoNewApptItem.Send();
                OutlookCommands.Instance.Sync();

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is not thrown when adding a new appointment");

            #endregion

            #region SOAP Verify meeting is not sent to account3 even after exception

            //Search for appointment
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("appointment").
                CalExpandInst(startTimeLocalNew.AddDays(-1), startTimeLocalNew.AddDays(6)).
                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", "ridZ", null, out instanceRidz, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out messageCompNum, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out messageOrganizer, 1);

            zAccount.AccountB.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "ACCEPT",
                                                        messageInvId,
                                                        messageCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        apptSubject));
            zAccount.AccountB.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);
            #endregion

            #region Outlook Verify from field of acceptance mail
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(apptSubject);
            zAssert.IsNotNull(rdoMail, "Verify the message appears in the inbox");

            // Verify syncuser is not shown in the from field. Reproducible only on outlook 2007.
            zAssert.IsFalse(rdoMail.Sender.Address.Contains(zAccount.AccountZCO.emailAddress), "Verify that sender does not contain syncusers email id");
            #endregion
        }

        [Test, Description("Bug33285: Duplicate appointments can be created")]
        [Category("Calendar")]
        [Bug("33285")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Create an appointment with no attendees and not recurring",
                   "Save Appointment and Sync",
                   "Open Appointment and Wait for 5 minutes",
                   "Appointment should not get duplicate on server as well as in ZCO")]
        public void Bug33285()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 08, 25, 12, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

            #region Outlook

            OutlookCommands.Instance.Sync();
            RDOFolder rdoCalendarFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            int count = 0;
            foreach (RDOAppointmentItem rApptItem in rdoCalendarFolder.Items)
            {
                if (rApptItem.Subject.Equals(apptSubject))
                {
                    count++;
                }

            }
            //Verify that appointment count equals 1

            zAssert.IsTrue(count.Equals(1), "Verify only one appointment is present in the calenar. The actual count is: " + count);

            #endregion
 
        }

        [Test, Description("Bug32422: meeting status for series changed to tentative when delegate adds an exception")]
        [Category("Calendar")]
        [Bug("32422")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Person A has read/write access to Person B’s calendar.",
                    "2. Person A proposes a recurring meeting on Person B’s calendar and invites herself (Person A) to the meeting.",
                    "3. A box pops up asking Person A if she would like to update her own calendar. She replies Yes.",
                    "4. The meeting shows up on her own calendar as accepted and she does not get a meeting proposal.",
                    "5. Person A changes a later occurrence of the meeting.  She gets a meeting proposal for the edited occurrence and sends an acceptance.",
                    "6. On Person A’s calendar the edited occurrence shows up as accepted and all other occurrences show up as tentative.",
                    "Note: Through automation the dialog asking for yes no does not pop up. Hence just checking for invitation mail.")]
        public void Bug32422()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalNew = new DateTime(2010, 12, 25, 12, 0, 0);
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("calendar")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                parentFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder defaultCalendar = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultCalendar, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");
            RDOFolder rFolder = OutlookMailbox.Instance.findFolder(account1folderName, defaultCalendar, true);
            UnauthorizedAccessException unauthorizedAccessException = null;

            // Insert appt
            RDOAppointmentItem rdoNewApptItem = null;
            try
            {
                rdoNewApptItem = rFolder.Items.Add("IPM.Appointment") as RDOAppointmentItem;
                zAssert.IsNotNull(rdoNewApptItem, "Verify the Appointmnet is created correctly");

                rdoNewApptItem.Subject = apptSubject;
                rdoNewApptItem.Body = apptContent;
                rdoNewApptItem.Location = "";
                rdoNewApptItem.Start = startTimeLocalNew;
                rdoNewApptItem.End = startTimeLocalNew.AddHours(3);

                rdoNewApptItem.ReminderSet = true;
                rdoNewApptItem.ReminderMinutesBeforeStart = 30;
                rdoNewApptItem.BusyStatus = Redemption.rdoBusyStatus.olBusy;
                rdoNewApptItem.IsOnlineMeeting = false;
                rdoNewApptItem.AllDayEvent = false;

                RDORecurrencePattern recurrencePattern = rdoNewApptItem.GetRecurrencePattern();
                recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
                recurrencePattern.Interval = 1;
                recurrencePattern.Occurrences = 5;

                rdoNewApptItem.To = zAccount.AccountZCO.emailAddress;
                rdoNewApptItem.Recipients.ResolveAll(null, null);

                rdoNewApptItem.Send();
                OutlookCommands.Instance.Sync();

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is not thrown when adding a new appointment");

            #endregion

            #region Outlook Verify meeting invitation mail is received to self
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(apptSubject);
            zAssert.IsNotNull(rdoMail, "Verify the message appears in the inbox");

            // Verify subject and content 
            zAssert.AreEqual(apptSubject, rdoMail.Subject, "Verify subject of invitation mail is matched");


            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment appears in the calendar");
            #endregion

        }

        [Test, Description("Bug11306: Cannot Update calandar if updated by someone given manager permission in Outlook")]
        [Category("Calendar")]
        [Bug("11306")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. User 1 shares and gives manager permissions to user 2",
                    "2. User 1 creates appointment on calendar and invites users",
                    "3. User 2 (Outlook user) updates calendar and changes time on appointment",
                    "4. User 2 sends updated notification to all users",
                    "5. User 3 gets notification, but no Accept button in notification if changed by user 2 in Outlook",
                    "6. User1 gets above error if accessing event through Zimbra")]
        //[Ignore ("The updated appointment notification is getting stuck in the outbox, cannot check if user 3 got notification. Hence commenting it out")]
        public void Bug11306()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalNew = new DateTime(2010, 12, 25, 12, 0, 0);
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, instanceRidz, messageCompNum, messageOrganizer, messageInvId, messageCalItemId, messageId, name;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                parentFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountB.emailAddress).AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddAttendee(zAccount.AccountB.emailAddress).AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocalNew, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocalNew.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);
            #endregion

            #region Outlook Modify the start time
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder defaultCalendar = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultCalendar, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOAppointmentItem rdoNewApptItem = OutlookMailbox.Instance.findAppointment(apptSubject, defaultCalendar, true);
            zAssert.IsNotNull(rdoNewApptItem, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");
            rdoNewApptItem.Start = startTimeLocalNew.AddHours(2);
            rdoNewApptItem.End = startTimeLocalNew.AddHours(3);
         

            //rdoNewApptItem.Send(); // here the updated appt notice is not sent to the AccountB. it sits in outbox. Now sure why.
            // Since Redemption does not send the appointment update notification from outbox, the following method is a temporary fix to convet the appointment to OOM and send the notification.
            OutlookMailbox.Instance.updateAppointment(rdoNewApptItem);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Verify modified meeting can be accepted
            //Search for appointment
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("appointment").
                CalExpandInst(startTimeLocalNew.AddDays(-1), startTimeLocalNew.AddDays(6)).
                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", "ridZ", null, out instanceRidz, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out messageCompNum, 1);
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out messageOrganizer, 1);

            zAccount.AccountB.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "ACCEPT",
                                                        messageInvId,
                                                        messageCompNum,
                                                        zAccount.AccountA.emailAddress,
                                                        apptSubject));
            zAccount.AccountB.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);
            #endregion

            #region SOAP Verify accept mail is received

            // We need to verify that the accept mail is recieved. however we should check it in accountA's mail box and not in zco user's mailbox in outlook. 
            // zco user will not recieve the acceptance mail as the appointment is in accountA's calendar.


            zAccount.AccountA.sendSOAP(@"<SearchRequest types='message' xmlns='urn:zimbraMail' calExpandInstStart='" + (startTimeLocalNew.AddMonths(-2) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString() + @"' calExpandInstEnd= '" + (startTimeLocalNew.AddMonths(2) - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString() + @"'>
                                              <query xmlns=''> subject:" + apptSubject + @" in:" + GlobalProperties.getProperty("globals.inbox") + @"</query>
                                            </SearchRequest>");
            // Check accept mail is received

            
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m",  "id", null, out messageId, 1);


            // Since the ACCEPT is in response to the original mail (as updated appt notification mail is stuck in the outbox in olk), 
            // We cannot check the subject or the updated timing of the mail. Hence commenting out the following code.
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // the subject should be Accept:updated:{subject}. However, since the update notification does not goto through (from zco).
            // the Soap request finds the original appt and accepts it. Hence the subject will contain only "Accept" and no "updated" string.
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", null, out name, 1);
            zAssert.IsTrue(Regex.IsMatch(name, "Accept: (Updated: )?" + apptSubject), "Verify that updated meeting name matches"); //used Regex to compare name since the Soap name value is different for Outlook 2003 and 2010
            
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:comp/mail:s");
            zAssert.AreEqual(startTimeLocalNew.AddHours(2).ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:comp/mail:e");
            zAssert.AreEqual(startTimeLocalNew.AddHours(3).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            // Verify subject and content 
           // zAssert.AreEqual("Accept: " + "Updated: " + apptSubject, rdoMail.Subject, "Verify subject of invitation mail is matched");
            #endregion

        }

        [Test, Description("Bug 29285: can't cancel a single instance of a recurring meeting in Outlook 2007")]
        [Category("Calendar")]
        [TestSteps(
            "Open occurrence of a meeting and cancel the meeting",
            "Delete the occurrence and send cancellation",
            "Save Changes and Send Update",
            "Appointment disappears",
            "Then open another occurrence and Cancel the meeting",
            "Delete the occurrence Send Cancellation",
            "This time, don't save the changes the appointment disappears")]
        [Bug("29285")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug29285()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
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

            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Interval = 1;
            recurrencePattern.Occurrences = 5;

            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region Outlook Block
            //Modify time of the first instance
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem exAppt = recurrencePattern.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            exAppt.Delete(true);
            rAppt.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region Outlook Block
            // Verify that appointment has not disappeared
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that appointment exists in calendar");

            RDORecurrencePattern rdoRecurrence = rdoAppt.GetRecurrencePattern();
            zAssert.AreEqual(rdoRecurrence.Occurrences, recurrencePattern.Occurrences, "Verify number of occurrences are same.");
            #endregion

            #region Outlook Delete another instance but dont save

            exAppt = recurrencePattern.GetOccurence(startTimeLocal.AddDays(1)) as RDOAppointmentItem;
            exAppt.Delete(true);

            OutlookCommands.Instance.Sync();
            #endregion

            #region Outlook Verify first instance does not reappear
            OutlookCommands.Instance.Sync();

            rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that appointment exists in calendar");

            rdoRecurrence = rdoAppt.GetRecurrencePattern();
            zAssert.AreEqual(rdoRecurrence.Occurrences, recurrencePattern.Occurrences, "Verify number of occurrences are same.");

            // Verify that the first instance deleted does no reappear
            RDOAppointmentItem rdoException = rdoRecurrence.GetOccurence(startTimeLocal) as RDOAppointmentItem;
            zAssert.IsNull(rdoException, "Verify that first instance deleted does not reappear.");
            #endregion

        }

        [Test, Description("Bug17129: Grantee with editor rights can send meeting request")]
        [Category("Calendar")]
        [Bug("17129, 33704")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Ignore("21-Mar-11 At present Zimbra does not support both Author and Editor permissions.")]
        [TestSteps("1. user2 gives user3 editor rights to his calendar",
                    "2. user3 mounts user2's calendar and syncs",
                    "3. user3 creates a meeting request in user2's calendar and invites user4",
                    "4. user3 gets the error message saying he does not have permission",
                    "5. The meeting request is still sent to user4",
                    "NOTE: Meeting can still be sent with editor rights through automation. Manually doing it does not allow the same as 'Send' button is disabled. Hence checking the behavior with Author rights")]
        public void Bug17129()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalNew = new DateTime(2010, 10, 25, 12, 0, 0);
            string calendarFolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());

            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAuthor)
                                        );

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            // Sync any changes
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");


            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Verify the appt data can be read
            UnauthorizedAccessException unauthorizedAccessException = null;

            // Try to insert appt - should not allow with rwid rights
            try
            {
                RDOAppointmentItem rdoNewApptItem = defaultFolder.Items.Add("IPM.Appointment") as RDOAppointmentItem;
                zAssert.IsNotNull(rdoNewApptItem, "Verify the Appointmnet is created correctly");

                rdoNewApptItem.Subject = apptSubject;
                rdoNewApptItem.Body = apptContent;
                rdoNewApptItem.Location = "";
                rdoNewApptItem.Start = startTimeLocalNew;
                rdoNewApptItem.End = startTimeLocalNew.AddHours(3);

                rdoNewApptItem.ReminderSet = true;
                rdoNewApptItem.ReminderMinutesBeforeStart = 30;
                rdoNewApptItem.BusyStatus = Redemption.rdoBusyStatus.olBusy;
                rdoNewApptItem.IsOnlineMeeting = false;
                rdoNewApptItem.AllDayEvent = false;

                rdoNewApptItem.To = zAccount.AccountB.emailAddress;
                rdoNewApptItem.Recipients.ResolveAll(null, null);

                foreach (RDORecipient r in rdoNewApptItem.Recipients)
                {
                    r.Type = (int)OlMeetingRecipientType.olRequired;
                }
                rdoNewApptItem.Save();
                rdoNewApptItem.Send();
                OutlookCommands.Instance.Sync();
                tcLog.Debug("saved appointment");

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNotNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is thrown when trying to add a new appointment");

            #endregion

            #region SOAP Verify meeting is not sent to account3 even after exception

            // Verify that meeting request is not sent after unauthorized exception

            zAccount.AccountB.sendSOAP(
                                        new SearchRequest().
                                                Types("appointment").
                                                CalExpandInst(startTimeLocalNew.AddDays(-1), startTimeLocalNew.AddDays(1)).
                                                Query("subject:(" + apptSubject + ")"));

            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 0);

            #endregion

        }

        [Test, Description("Bug17749: Can't open shared calendars Outlook")]
        [Category("Calendar")]
        [Bug("17749")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Attempt to mount a store of user who has not shared anything.",
                    "2. Syncuser should not get any error.")]
        public void Bug17749()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region ZCO: sync GAL, open message store, sync, verify error is not thrown if nothing shared.

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            zAccount userA = new zAccount();
            userA.createAccount();
            userA.login();

            System.Runtime.InteropServices.COMException u = null;
            try
            {
                RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);

                // Make sure the mountpoint is there
                zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify UnauthorizedAccessException is NOT thrown when trying to add a new appointment");
            try
            {
                // Make sure the folders are not present
                RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);
                RDOFolder calendarFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
                zAssert.IsNull(calendarFolder, "Verify that the shared calendar folder does not appears in the delegate store");

                RDOFolder inboxFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
                zAssert.IsNull(inboxFolder, "Verify that the shared inbox folder does not appears in the delegate store");

                RDOFolder contactsFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
                zAssert.IsNull(contactsFolder, "Verify that the shared contact folder does not appears in the delegate store");
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify UnauthorizedAccessException is thrown when trying to access the folders that were not shared");

            #endregion
        }

        private static readonly string DialogButtonLabelDismissAll = "Dismiss &All";
        private static readonly string DialogButtonLabelSnooze = "&Snooze";

        [Test, Description("Bug16925: snoozing reminders does not work")]
        [Category("Calendar")]
        [Bug("16925")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Create an appointment that happens in 11 minutes from now",
                    "2. set the reminder to 15 minutes before",
                    "3. save the item & notice reminder comes up right away",
                    "4. snooze changing the reminder to 5 minutes before. On every subsequent sync, the item causes the alarm to fire.")]
        public void Bug16925()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = DateTime.Now.AddMinutes(15);
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
                    CalendarBugs.DialogButtonLabelDismissAll,
                    NativeWIN32.TitleComparison.Contains);

            }

            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;

            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

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
                    CalendarBugs.DialogButtonLabelSnooze,
                    NativeWIN32.TitleComparison.Contains),
                0,
                "Verify that the button was clicked");


            // Make sure the dialog box doesn't come back after outlook sync
            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(1000);

            zAssert.IsFalse(
                NativeWIN32.WindowVisible(
                    "reminder",
                    0,
                    NativeWIN32.TitleComparison.Contains),
                "Verify the reminder dialog does not return");

            // Sync outlook with reminder initially not set

            #endregion
 
        }

        [Test, Description("Verify monthly recurring meetings from Google calendar show MIME in the body")]
        [Category("Calendar")]
        [Bug("14518")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug14518()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "Bug14518";
            #endregion

            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.ZimbraQARoot + @"\data\TestMailRaw\Bugs\14518";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook Block. Verify MIME contents
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            zAssert.AreEqual(apptSubject, rdoAppt.Subject, "Verify the appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains("Bug14518"), "Verify the appt content matches the expected.");
            zAssert.AreEqual("Zimbra Campus", rdoAppt.Location, "Verify the appointment location");

            RDORecurrencePattern recurrence = rdoAppt.GetRecurrencePattern();
            int rdoInterval = recurrence.DayOfMonth;
            string recurrenceType = Convert.ToString(recurrence.RecurrenceType);

            zAssert.AreEqual("olRecursMonthly", recurrenceType, "Verify the recurrence type of appointment");
            zAssert.AreEqual("22", Convert.ToString(rdoInterval), "Verify the interval of recurrence");

            foreach (Redemption.RDORecipient r in rdoAppt.Recipients)
            {
                if (!(r.Address.Equals("zimbra.tester@gmail.com")))
                {
                    zAssert.IsTrue(r.Address.Equals("matt@zimbra.com"), "Verify the attendee of the appointment");
                }
            }

            #endregion

        }

        [Test, Description("Bug32627: Calendar name in outlook not change")]
        [Category("Calendar")]
        [Bug("32627")]
        [Ignore("Temperorily marking it as ignore as causing automation suite to fail")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Create an appointment that happens in 11 minutes from now",
                    "2. set the reminder to 15 minutes before",
                    "3. save the item & notice reminder comes up right away",
                    "4. snooze changing the reminder to 5 minutes before. On every subsequent sync, the item causes the alarm to fire.")]
        public void Bug32627()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            string firstName = "First" + GlobalProperties.time() + GlobalProperties.counter();
            string lastName = "Last" + GlobalProperties.time() + GlobalProperties.counter();
            string displayName = firstName + " " + lastName;
            string newFirstName = "NewFirst" + GlobalProperties.time() + GlobalProperties.counter();
            string newLastName = "NewLast" + GlobalProperties.time() + GlobalProperties.counter();
            string newDisplayName = newFirstName + " " + newLastName;
            string calFolderId;
            #endregion

            #region Account Setup

            // Set the test account First,Last name
            zAccountAdmin.GlobalAdminAccount.sendSOAP(
                                        new SoapAdmin.ModifyAccountRequest().
                                                SetAccountId(zAccount.AccountA.zimbraId).
                                                ModifyAttribute("displayname", displayName));


            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);

            #endregion

            #region SOAP: Delegate shares calendar folder

            // Auth as the delegate
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calFolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoDelegate)
                                        );

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Verify the store name
            RDOStores stores = OutlookRedemption.Instance.rdoSession.Stores;
            zAssert.IsNotNull(stores, "Verify the default store exists");

            foreach (RDOStore store in stores)
            {
                if (!(store.Default))
                {
                    zAssert.IsTrue(store.Name.Trim().Contains(firstName), "Verify the store name " + store.Name + " contains the user's first name " + firstName);
                    zAssert.IsTrue(store.Name.Trim().Contains(lastName), "Verify the store name " + store.Name + " contains the user's last name " + lastName);
                }
            }
            #endregion

            #region SOAP Modify Display name

            // Set the test account First,Last name
            zAccountAdmin.GlobalAdminAccount.sendSOAP(
                                        new SoapAdmin.ModifyAccountRequest().
                                                SetAccountId(zAccount.AccountA.zimbraId).
                                                ModifyAttribute("displayname", newDisplayName));

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Verify the store name
            RDOStores renamedStores = OutlookRedemption.Instance.rdoSession.Stores;
            zAssert.IsNotNull(renamedStores, "Verify the default store exists");

            foreach (RDOStore renamedStore in renamedStores)
            {
                if (!(renamedStore.Default))
                {
                    zAssert.IsTrue(renamedStore.Name.Trim().Contains(newFirstName), "Verify the store name " + renamedStore.Name + " contains the user's first name " + newFirstName);
                    zAssert.IsTrue(renamedStore.Name.Trim().Contains(newLastName), "Verify the store name " + renamedStore.Name + " contains the user's last name " + newLastName);
                }
            }

            #endregion
 
        }

        [Test, Description("Bug22867: Exceptions to recurring appointment may not be honored")]
        [Category("Calendar")]
        [Bug("22867")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Import the attached ICS to a zimbra account",
                    "2. Sync it to outlook using ZCO",
                    "Expect: Appointment to have exceptions")]
        public void Bug22867()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string readIcsFile = GlobalProperties.TestMailRaw + "/Bugs/22867/crose.ics";
            string apptSummary = "Chris";
            DateTime startTimeUTC = new DateTime(2008, 12, 23, 14, 30, 00);
            DateTime endTimeUTC = new DateTime(2008, 12, 23, 15, 00, 00);
            string apptInvId;
            #endregion

            #region SOAP Inject the ICS

            // Import an ICS to the account1 mailbox 
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @"/Bugs/22867/crose.ics");
            restClient.DoMethod();

            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            zAssert.IsTrue(rdoAppointmentItem.IsRecurring, "Verify that appointment item is recurring");

            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            RDOExceptions rdoException = recurrencePattern.Exceptions;

            zAssert.AreEqual(21, rdoException.Count, "Verify recurring meeting has exceptions.");


            #endregion
 
        }

        [Test, Description("Bug24433: Appointment dissapppear in outlook")]
        [Category("Calendar")]
        [Bug("24433")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1 . User A share his calendar with user B",
                    "2 . User B open A's calendar. Appointments are visibles.",
                    "3 . User B look his mails.",
                    "4 . User B look at A's calendar again, and all appointments disappeared.")]
        public void Bug24433()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string readIcsFile = GlobalProperties.TestMailRaw + "/Bugs/24433/Calendar.ics";
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appt1Summary = "UD-Fordham";
            string appt2Summary = "prep for Coffey";
            string appt1InvId, appt2InvId, calFolderId;
            #endregion

            #region SOAP Inject the ICS

            // Import an ICS to the account1 mailbox 
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountA;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @"/Bugs/24433/Calendar.ics");
            restClient.DoMethod();

            //Added sleep of 4 seconds, because searchrequest was failing - may be server becomes busy after rest import
            System.Threading.Thread.Sleep(4000);

            zAccount.AccountA.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        Query(appt1Summary));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out appt1InvId, 1);

            zAccount.AccountA.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        Query(appt2Summary));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out appt2InvId, 1);

            #endregion

            #region SOAP Share the calendar
            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calFolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            #endregion

            #region SOAP Add message

            zAccount.AccountZCO.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(messageSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(messageContent)));

            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder calendar = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(calendar, "Verify that the calendar folder in the store appears in the ZCO mailbox after adding it");

            // Verify appointment in shared calendar are accessible
            RDOAppointmentItem rdoAppt1 = OutlookMailbox.Instance.findAppointment(appt1Summary, calendar, true);
            zAssert.IsNotNull(rdoAppt1, "Verify that the shared appointment exists in the delegate store");

            zAssert.AreEqual(appt1Summary, rdoAppt1.Subject, "Verify the delegate appt subject matches");

            Redemption.RDOAppointmentItem rdoAppt2 = OutlookMailbox.Instance.findAppointment(appt2Summary, calendar, true);
            zAssert.IsNotNull(rdoAppt2, "Verify that the shared appointment exists in the delegate store");

            zAssert.AreEqual(appt2Summary, rdoAppt2.Subject, "Verify the delegate appt subject matches");
            #endregion

            #region OUTLOOK Switch to mail app
            //Switch the app to mail by reading a mail item.
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(messageSubject);
            zAssert.IsNotNull(rdoMail, "Verify the mail exists.");

            zAssert.AreEqual(messageSubject, rdoMail.Subject, "Verify the mail subject is matched.");
            zAssert.IsTrue(rdoMail.Body.Contains(messageContent), String.Format("Verify the initial draft body ({0}) contains the expected ({1})", rdoMail.Body, messageContent));
            #endregion

            #region OUTLOOK Go back to calendar and verify items can be read
            // Verify appointment in shared calendar are accessible
            RDOAppointmentItem rAppointment1 = OutlookMailbox.Instance.findAppointment(appt1Summary, calendar, true);
            zAssert.IsNotNull(rAppointment1, "Verify that the shared appointment exists in the delegate store");

            zAssert.AreEqual(appt1Summary, rAppointment1.Subject, "Verify the delegate appt subject matches");

            Redemption.RDOAppointmentItem rAppointment2 = OutlookMailbox.Instance.findAppointment(appt2Summary, calendar, true);
            zAssert.IsNotNull(rAppointment2, "Verify that the shared appointment exists in the delegate store");

            zAssert.AreEqual(appt2Summary, rAppointment2.Subject, "Verify the delegate appt subject matches");
            #endregion
        }

        [Test, Description("Bug33299: when subscribing to calendars in outlook 2003 and 2007 private events are not seen")]
        [Category("Calendar")]
        [Bug("33299")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1 . User A has private appointments and he share his calendar with user B w/o private rights",
                    "2 . User B open A's calendar.",
                    "3 . User B should not see private appts")]
        public void Bug33299()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string message1Subject = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Subject = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Content = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string calFolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calFolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    setPrivate().
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject().
                                    Summary(message2Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal.AddHours(3), System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(4), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);
            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultFolder, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            // According to bug fix, private appointment is seen in delegate's account. However, the subject should be empty and the appointment is locked
            // Verify private appointment cannot be searched. findAppointment() returns null when appointment do not match with message1Subject ( in this case, the appointment's subject is empty).
            // However, there is no way for us to check if the appointment is locked or not.
            RDOAppointmentItem rdoApptPrivate = OutlookMailbox.Instance.findAppointment(message1Subject, defaultFolder, true);
            zAssert.IsNull(rdoApptPrivate, "Verify that the shared private appointment cannot be searched in the delegate store");

            
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message2Subject, defaultFolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            
            #endregion

        }

        [Test, Description("Bug 18583: Appointment data overwritten with task data")]
        [Category("Calendar"), Category("Task")]
        [Bug("18583"), Bug("19892")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. SOAP: SyncUser creates an Appointment",
            "2. ZCO: Sync User crates a Task but does not sync to ZCS",
            "3. SOAP: SyncUser modifies the previously created appointment.",
            "4. ZCO: SyncUser sync the changes to/from ZCS",
            "5. Verify the Appointment & task for correct contents")]
        public void Bug_18583()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string reminderMinutes = "20";

            //DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime apptStartTimeLocal = new DateTime(2016, 10, 25, 12, 0, 0); 
            DateTime startDate = apptStartTimeLocal;
                        
            string taskPriority = "1";
            string calItemId, uId, appointmentId, taskId;
            #endregion

            #region SOAP Block: Create an Appointment
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    setPrivate().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(apptStartTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(apptStartTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out calItemId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(appointmentId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);
            #endregion

            #region Outlook Block: Create a Task but DO NOT sync to ZCS

            // Sync Outlook
            OutlookCommands.Instance.Sync();

            // Create an OUTLOOK Task Item
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Importance = (int)OlImportance.olImportanceHigh;
            rTask.StartDate = startDate;
            rTask.DueDate = startDate.AddDays(1);
            rTask.Save();

            #endregion

            #region SOAP Block: Modify the Appointment previously created

            // Modify the Appointment, Add Reminder
            zAccount.AccountZCO.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            BodyTextHTML(apptContent).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            AddInv(new InvObject(uId).
                                    setPrivate().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(apptStartTimeLocal, System.TimeZone.CurrentTimeZone).
                                    AddReminder(reminderMinutes).
                                    EndTime(apptStartTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out calItemId, 1);

            #endregion

            #region Outlook Block: Sync the changes to/from ZCS

            OutlookCommands.Instance.Sync();
            #endregion

            #region Verify the TASK for correct contents
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDate.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDate.AddDays(1).ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp[@priority='" + taskPriority + "']", null, null, null, 1);

            #endregion

            #region Verify the APPOINTMENT for correct contents
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(20, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");

            #endregion

        }

        [Test, Description("Bug 19892: Appointment not being properly synced")]
        [Category("Calendar"), Category("Task")]
        [Bug("18583"), Bug("19892")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCO: Sync User crates a Task but does not sync to ZCS",
            "2. SOAP: SyncUser creates an Appointment",
            "3. ZCO: SyncUser sync the changes to/from ZCS",
            "4. Verify the Appointment & task for correct contents")]
        public void Bug_19892()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();

            //DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime apptStartTimeLocal = new DateTime(2016, 10, 25, 12, 0, 0); 
            DateTime startDate = apptStartTimeLocal;

            
            string taskPriority = "1";
            string calItemId, uId, appointmentId, taskId;
            #endregion

            #region Outlook Block: Create a Task but DO NOT sync to ZCS

            // Sync Outlook
            OutlookCommands.Instance.Sync();

            // Create an OUTLOOK Task Item
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Importance = (int)OlImportance.olImportanceHigh;
            rTask.StartDate = startDate;
            rTask.DueDate = startDate.AddDays(1);
            rTask.Save();

            #endregion

            #region SOAP Block: Create an Appointment
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    setPrivate().
                                    Summary(apptSubject).
                                    AddReminder("20").
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(apptStartTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(apptStartTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out calItemId, 1);
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(appointmentId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);
            #endregion

            #region Outlook Block: Sync the changes to/from ZCS
            OutlookCommands.Instance.Sync();
            #endregion

            #region Verify the TASK for correct contents
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDate.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDate.AddDays(1).ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp[@priority='" + taskPriority + "']", null, null, null, 1);

            #endregion

            #region Verify the APPOINTMENT for correct contents
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");
            zAssert.AreEqual(20, rdoAppointmentItem.ReminderMinutesBeforeStart, "Minutes before the meeting are same");

            #endregion

        }

        [Test, Description("Bug26794: Conflict resolution broken for attendee status")]
        [Category("Calendar")]
        [TestSteps(
            "1. User1 sends an invitation (single occurring, subject: NewBug) to User2",
            "2. User2 opens calendar on ZWC - Appointment appears correctly",
            "3. User2 opens calendar on ZCO.  Set to 'Work Offline' - Appointment appears correctly",
            "4. In ZWC, click accept.  In ZCO, click tentative.  (Order is important)",
            "- In ZCO, sync - In ZWC, appointment is shown as tentative - In ZCO, appointment is shown as tentative",
            "- In ZCO, conflicts folder has a message (You made a change to another copy of this item ...)",
            "5. In ZCO, accept the conflict (Right click -> Replace the exiting item with this version)",
            "- In ZWC, appointment is shown as tentative",
            "- In ZCO, appointment is shown as accepted")]
        [Bug("26794")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void Bug26794()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, apptInvId, apptCompNum, apptOrganizer;
            #endregion

            #region SOAP Block

            // Add a message to the account mailbox

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1Subject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(message1Subject, rdoAppointmentItem.Subject, "Check appointment summary");
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

            #region SOAP Accept the meeting from ZWC

            //Search for appointment
            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                                Types("appointment").
                                                CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(1)).
                                                Query("subject:(" + message1Subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "compNum", null, out apptCompNum, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:or", "a", null, out apptOrganizer, 1);

            zAccount.AccountZCO.sendSOAP(
                                        new AppointmentActionRequest(
                                                        "ACCEPT",
                                                        apptInvId,
                                                        apptCompNum,
                                                        zAccount.AccountZCO.emailAddress,
                                                        message1Subject));
            zAccount.AccountZCO.selectSOAP("//mail:SendInviteReplyResponse", null, null, null, 1);

            #endregion

            #region Outlook Tentative appt from ZCO
            RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingTentative, rdoAppointmentItem);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");

            // RDO Fixup
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoAppointmentItem);
            rdoMeetingItem.Send();

            OutlookCommands.Instance.Sync();

            string windowTitle = "Accepted: " + message1Subject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            #endregion

            #region SOAP Check appt status
            // Search for that appointment
            zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            Query("subject:(" + message1Subject + ")")
                                    );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));

            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + apptInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:at[@a='" + zAccount.AccountZCO.emailAddress + "']", "ptst", "TE", null, 1);
            #endregion

            #region Outlook Verify item exists in conflict folder
            string[] folderNames = { "Conflicts" };
            foreach (string folderName in folderNames)
            {
                tcLog.Debug("Check for conflicts in " + folderName);

                RDOFolder conflictsFolder = OutlookMailbox.Instance.findFolder(folderName);
                if (conflictsFolder != null)
                {
                    foreach (RDOMail m in conflictsFolder.Items)
                    {

                        tcLog.Error(folderName + ": " + m.Body);
                        if (m.UnRead)       // Only unred items need to be processed
                        {
                            m.UnRead = false;           // Mark it read so it won't be processed again
                        }
                        zAssert.AreEqual(message1Subject, m.Subject, "Verify body contains expected failure message");

                    }
                }
            }
            #endregion

        }

        [Test, Description("Bug9203: Outlook crashes after calendar import")]
        [Category("Calendar")]
        [Bug("9203")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Import the attached .ics file containing more than 100 events in ZCS",
                    "sync",
                    "Verify appointment exists.")]
        public void Bug9203()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string icsFile = GlobalProperties.TestMailRaw + "/Bugs/9203/Calendar.ics";
            const int Modified_Upload_Size = 52428800;
            string uploadSize, apptInvId;
            string appt1Summary = "Hardware requirement for Pune";
            string appt2Summary = "All Hands meeting";
            string appt3Summary = "Yahoo Presentation";
            string appt4Summary = "Q1 2008 All Hands Meeting  ";
            DateTime startTimeUTC = new DateTime(2007, 08, 30, 10, 30, 00);
            DateTime endTimeUTC = new DateTime(2007, 08, 30, 11, 00, 00);
            timestampTestCaseMaximum = 90;
            #endregion

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.GetConfigRequest().GetAttributeValue(ConfigAttributes.zimbraFileUploadMaxSize));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:GetConfigResponse/admin:a[@n='zimbraFileUploadMaxSize']", null, null, out uploadSize, 1);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                                                                  ModifyAttribute(ConfigAttributes.zimbraFileUploadMaxSize, Modified_Upload_Size.ToString()));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);

            #region SOAP Inject the ICS
            try
            {
                // Import an ICS to the account1 mailbox 
                RestClient restClient = new RestClient("POST");
                restClient.account = zAccount.AccountZCO;
                restClient.setUrlFoldername("Calendar");
                restClient.setUrlQuery("fmt", "ics");
                restClient.setPostData(GlobalProperties.TestMailRaw + @"/Bugs/9203/Calendar.ics");
                restClient.DoMethod();

                //Verify import succeeded by searching for one appointment.
                zAccount.AccountZCO.sendSOAP(
                                        new SearchRequest().
                                            Types("appointment").
                                            CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                            Query(appt1Summary));

                zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

                zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
                zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);


            #endregion

                #region Outlook
                OutlookCommands.Instance.Sync();

                // Search for few appointments after import and verify they exists.

                RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(appt1Summary);
                zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");
                zAssert.AreEqual(appt1Summary, rdoAppointmentItem.Subject, "Verify appointment subject is matched");

                RDOAppointmentItem rdoAppointmentItem2 = OutlookMailbox.Instance.findAppointment(appt2Summary);
                zAssert.IsNotNull(rdoAppointmentItem2, "Verify appointment exists.");
                zAssert.AreEqual(appt2Summary, rdoAppointmentItem2.Subject, "Verify appointment subject is matched");

                RDOAppointmentItem rdoAppointmentItem3 = OutlookMailbox.Instance.findAppointment(appt3Summary);
                zAssert.IsNotNull(rdoAppointmentItem3, "Verify appointment exists.");
                zAssert.AreEqual(appt3Summary, rdoAppointmentItem3.Subject, "Verify appointment subject is matched");

                RDOAppointmentItem rdoAppointmentItem4 = OutlookMailbox.Instance.findAppointment(appt4Summary);
                zAssert.IsNotNull(rdoAppointmentItem4, "Verify appointment exists.");
                zAssert.AreEqual(appt4Summary, rdoAppointmentItem4.Subject, "Verify appointment subject is matched");
            }


            finally
            {

                #region Setting default upload size

                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                                                                    ModifyAttribute(ConfigAttributes.zimbraFileUploadMaxSize, uploadSize));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);
                #endregion

            }

                #endregion
 
        }

        [Test, Description("Bug51496: display name with parentheses not properly shown in outlook/zco")]
        [Category("Calendar")]
        [Bug("51496")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Create an account with display name containing parentheses",
                   "2. Share the calendar with ZCO Sync user",
                   "3. ZCO - mount the share",
                   "4. Verify that, Calendar view shows the delegate store (account) name with parentheses")]
        public void Bug51496()
        {
            #region Test Case variables
            string account1Email = zAccount.AccountB.emailAddress;
            string account1Name = zAccount.AccountB.displayName;
            string account1ID = zAccount.AccountB.zimbraId;
            string account1NameWithParentheses = account1Name + " (Test Bug51496)";
            string account1StoreName = "Zimbra - " + account1NameWithParentheses;
            timestampTestCaseMaximum = 60;
            
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId;
            #endregion

            #region SOAP Block to modify the display name to contain parentheses
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new ModifyAccountRequest().SetAccountId(account1ID).ModifyAttribute("displayname", account1NameWithParentheses));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
            zAccount.AccountB.sendSOAP(new GetFolderRequest());
            zAccount.AccountB.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountB.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("calendar")));
            zAccount.AccountB.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                parentFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Share it with the delegatee (sync user)
            zAccount.AccountB.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );
            #endregion

            #region ZCO: sync GAL, open message store, sync, verify the mounted share name and the shared folder
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountB);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            zAssert.AreEqual(mountpoint.Name, account1StoreName, "Verify that delegate account name value is correct (contains parentheses)");

            RDOFolder defaultCalendar = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultCalendar, "Verify that the Calendar folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder rFolder = OutlookMailbox.Instance.findFolder(account1folderName, defaultCalendar, true);
            zAssert.IsNotNull(rFolder, "Verify that Calendar sub-folder in the store appears in the ZCO mailbox after adding it");
            
            #endregion

            #region SOAP Block to revert the display name to original value
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new ModifyAccountRequest().SetAccountId(account1ID).ModifyAttribute("displayname", account1Name));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);
            #endregion
        }

        [Test, Description("Bug48182: ZCO should support EXDATE")]
        [Category("Calendar")]
        [Bug("48182")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Import .ics file having ExDate (deleted exception)",
                   "2. Verify Soap response",
                   "3. Verify in ZCO - appointment series and deleted occurence details")]
        public void Bug48182()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string icsFile = GlobalProperties.TestMailRaw + "/Bugs/48182/Bug48182.ics";
            string apptInvId;
            DateTime startTimeUTC = new DateTime(2011, 04, 23, 00, 00, 00); //Universal date time for the recurring series start time in .ics file
            DateTime endTimeUTC = new DateTime(2011, 05, 21, 00, 00, 00); //Universal date time for the recurring series end time in .ics file
            string apptSummary = "Check ExDate";
            #endregion

            // Import an ICS to the syncuser mailbox 
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(@icsFile);
            restClient.DoMethod();    
            
            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), endTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            // Verify that exception is created. Only four instances should be present.
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", null, null, null, 4);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:recur/mail:exclude/mail:dates/mail:dtval/mail:s", "d", "20110429T170000", null, 1); //check the excluded occurence date is correct

            #region Outlook
            OutlookCommands.Instance.Sync();
          
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.StartUTC, "Check appointment series start time");
            zAssert.AreEqual(startTimeUTC.AddMinutes(30), rdoAppointmentItem.EndUTC, "Check appointment series end time");
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursWeekly, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, 1, "Recurrence interval is same");
            zAssert.AreEqual(recurrencePattern.Occurrences, 5, "Recurrence occurrences is same");
            RDOException recurrenceException = recurrencePattern.Exceptions.Item(1);
            zAssert.IsTrue(recurrenceException.Deleted, "Verify that exception occurence is of type deleted"); //Check that exception occurence is excluded
            
            #endregion

        }

        [Test, Description("Bug19111: Meeting invitation shows as not current when it is")]
        [Category("Calendar")]
        [Bug("19111")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. user1 creates a recurring meeting in ZWC, inviting user2 (zco user) ",
                   "2. user1 updates the whole series",
                   "3. user1 updates an instance",
                   "4. In ZCO login as user2, and check that updated instance appears correctly (i.e. no 'Not Current' error")]
        public void Bug19111()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddDays(2);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, 8, 0, 0);
            DateTime newstartTimeLocalSeries = startTimeLocal.AddHours(2);
            DateTime newstartTimeUTCSeries = newstartTimeLocalSeries.ToUniversalTime();
            DateTime newstartTimeLocalOccurence = startTimeLocal.AddHours(4);
            DateTime newstartTimeUTCOccurence = newstartTimeLocalOccurence.ToUniversalTime();
            string message1subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentId, uId, messageInvId, instanceRidz, startTime, timezone, instanceCalItemId;
            #endregion

            #region SOAP Block - Create recurring appointment series
            zAccount.AccountA.sendSOAP((new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject().
                                    Summary(message1subject).AddRecurrence("DAI", "1", "2").
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone)))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(appointmentId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "uid", null, out uId, 1);
            #endregion  

            #region Modify SOAP (update the series)
            zAccount.AccountA.sendSOAP(new ModifyAppointmentRequest(appointmentId, "0").
                 AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject(uId).
                            Summary(message1subject).
                            AddRecurrence("DAI", "1", "2").
                            AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(newstartTimeLocalSeries, System.TimeZone.CurrentTimeZone).
                                    EndTime(newstartTimeLocalSeries.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:ModifyAppointmentResponse", "calItemId", null, out appointmentId, 1);
            #endregion

            #region Modify SOAP (update the instance - first occurrence)
            //search appointment and get the ridZ value for first occurrence
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").
                CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(5)).
                Query("subject:(" + message1subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt/mail:inst", "ridZ", null, out instanceRidz, 1);

            //Get message details of first occurrence
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId).RecurrenceId(instanceRidz));

            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "d", null, out startTime, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp/mail:s", "tz", null, out timezone, 1);
            zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m/mail:inv/mail:comp", "uid", null, out uId, 1);

            //Create appointment exception for firts occurrence - Modify the start and end time
            zAccount.AccountA.sendSOAP(new CreateAppointmentExceptionRequest(messageInvId, "0").
                 AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject(uId).
                                    Summary(message1subject).AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(newstartTimeLocalOccurence, System.TimeZone.CurrentTimeZone).
                                    EndTime(newstartTimeLocalOccurence.AddHours(1), System.TimeZone.CurrentTimeZone))).ExceptionId(startTime, timezone));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentExceptionResponse", "calItemId", null, out instanceCalItemId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1subject);
            zAssert.AreEqual(newstartTimeUTCSeries, rdoAppointmentItem.StartUTC, "Check that appointment series start time is correct");
            zAssert.AreEqual(newstartTimeUTCSeries.AddHours(1), rdoAppointmentItem.EndUTC, "Check that appointment series end time is correct");
            
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            RDOAppointmentItem exAppointment1 = recurrencePattern.GetOccurence(1) as RDOAppointmentItem;
            zAssert.AreEqual(newstartTimeUTCOccurence, exAppointment1.StartUTC, "Check that excepted (1st) occurrence start time is correct");
            zAssert.AreEqual(newstartTimeUTCOccurence.AddHours(1), exAppointment1.EndUTC, "Check that excepted (1st) occurrence end time is correct");

            RDOAppointmentItem exAppointment2 = recurrencePattern.GetOccurence(2) as RDOAppointmentItem;
            zAssert.AreEqual(newstartTimeUTCSeries.AddDays(1), exAppointment2.StartUTC, "Check that non-excepted (2nd) occurrence start time is correct");
            zAssert.AreEqual(newstartTimeUTCSeries.AddDays(1).AddHours(1), exAppointment2.EndUTC, "Check that non-excepted (2nd) occurrence end time is correct");          
            #endregion
                      
        }

        [Test, Description("Bug21950: punctuation characters disappear")]
        [Category("Calendar")]
        [Bug("21950")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. user1 creates meeting request inviting zco user with content having punctuation characters (international characters)",
                   "2. zco user - check meeting request mail content",
                   "3. zco user - check calendar meeting instance content")]
        public void Bug21950()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            string message1subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1content = "This is mêêting rêqüêst ÜÜÖÖÄÄ §§ using international characters";
            string appointmentId;
            #endregion

            #region SOAP Block - Create meeting request
            zAccount.AccountA.sendSOAP((new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject().
                                    Summary(message1subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone)))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(message1subject);
            zAssert.IsNotNull(rdoMail, "Invite mail exists in the ZCO account");
            zAssert.AreEqual(message1content+"\r\n", rdoMail.Body, "Check that meeting request mail body has the correct content i.e. ZCO supports international characterset"); //\r\n gets appended to the rdoMail body, so added the same in comparison of content
            
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1subject);
            zAssert.IsNotNull(rdoAppointmentItem, "Meeting item exists in ZCO account calendar");
            zAssert.AreEqual(message1content, rdoAppointmentItem.Body, "Check that meeting item has the correct content i.e. ZCO supports international characterset");
            #endregion

        }

        [Test, Description("Bug23238: forwarding an appt from internal user to internal user does not work")]
        [Category("Calendar")]
        [Bug("23238")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. user1 creates meeting request inviting zco user",
                   "2. zco user forwards the request to user3 (user3 belongs to same domain)",
                   "3. verify that appointment gets forwarded to user3 - check the invite request in user3's account")]
        public void Bug23238()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddHours(3);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            string message1subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Id;
            #endregion

            #region SOAP Block - Create meeting request
            zAccount.AccountA.sendSOAP((new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject().
                                    Summary(message1subject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone)))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, null, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(message1subject);
            zAssert.IsNotNull(rdoMail, "Invite mail exists in the ZCO account");

            RDOMail forwardMail = OutlookMailbox.Instance.mailReply(rdoMail, OutlookMailbox.mailReplyType.forward);              
            zAssert.IsNotNull(forwardMail, "Verify that the reply mail object is created");
            
            forwardMail.To = zAccount.AccountB.emailAddress;
            forwardMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region AccountB Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + message1subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(message2Id));

            // Verifications
            XmlNode m2 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message2Id + "']", null, null, null, 1);

            // Check that the message has FORWARDED status set 
            zAccount.AccountB.selectSOAP(m2, "//mail:m", "f", "u", null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(m2, "//mail:su", null, message1subject, null, 1);

            // Verify the "FROM"/"TO" field
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='f']", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(m2, "//mail:e[@t='t']", "a", zAccount.AccountB.emailAddress, null, 1);
            #endregion

        }

        [Test, Description("Bug26901: On sync, some recurring appts can change to non recurring")]
        [Category("Calendar")]
        [Bug("26901")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. ZWC - create recurring series meeting (daily for 5 occurrences)",
                   "2. ZWC - cancel first instance",
                   "3. ZCO - Organizer sync and check that meeting series type is recurring, first instance is removed from the calendar and other instances are shown correctly")]
        public void Bug26901()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddDays(2);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string appointmentId, uId, rev, ms, comp, d, u, timezone;
            #endregion

            #region SOAP Block - Create recurring appointment series
            zAccount.AccountZCO.sendSOAP((new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1content).
                            AddInv(new InvObject().
                                    Summary(message1subject).AddRecurrence("DAI", "1", "5").
                                    AddAttendee(zAccount.AccountA.emailAddress).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone)))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(appointmentId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + appointmentId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp", "uid", null, out uId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m", "rev", null, out rev, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m", "ms", null, out ms, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp", "compNum", null, out comp, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp/mail:s", "d", null, out d, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp/mail:s", "u", null, out u, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp/mail:s", "tz", null, out timezone, 1);
            #endregion

            #region SOAP Cancel first occurence
            zAccount.AccountZCO.sendSOAP(@"<CancelAppointmentRequest xmlns='urn:zimbraMail' ms='" + ms + @"' rev='" + rev + @"' id='" + appointmentId + @"' comp='" + comp + @"' s='" + u + @"'><inst xmlns='\' d='" + d + @"' tz='" + timezone + @"'/><m xmlns=''><e a='" + zAccount.AccountZCO.emailAddress + @"' p='" + zAccount.AccountZCO.displayName + @"' t='t'/><su>Cancelled: " + message1subject + @"</su><mp ct='multipart/alternative'><mp ct='text/plain'><content>This meeting is cancelled</content></mp></mp></m></CancelAppointmentRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CancelAppointmentResponse", null, null, null, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(message1subject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify that appointment is synced in ZCO");
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.StartUTC, "Check that appointment series start time is correct");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.EndUTC, "Check that appointment series end time is correct");

            //Verify that appointment type is still recurring
            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();
            zAssert.AreEqual(recurrencePattern.RecurrenceType, rdoRecurrenceType.olRecursDaily, "Recurrence type is same");
            zAssert.AreEqual(recurrencePattern.Interval, 1, "Recurrence interval is same");
            zAssert.AreEqual(recurrencePattern.Occurrences, 5, "Recurrence occurrences is same");

            //Verify that cancelled (first) occurrence is removed from the calendar
            RDOAppointmentItem exAppointment1 = recurrencePattern.GetOccurence(1) as RDOAppointmentItem;
            zAssert.IsNull(exAppointment1, "Verify the first instance of meeting series is cancelled");

            //Verify that other occurrences exist on the calendar
            RDOAppointmentItem exAppointment2 = recurrencePattern.GetOccurence(2) as RDOAppointmentItem;
            zAssert.AreEqual(startTimeUTC.AddDays(1), exAppointment2.StartUTC, "Check that 2nd occurrence start time is correct");
            zAssert.AreEqual(startTimeUTC.AddDays(1).AddHours(1), exAppointment2.EndUTC, "Check that 2nd occurrence end time is correct");
            #endregion

        }

        [Test, Description("Bug29277: Meeting disappears from shared calendar when delegatee is invited")]
        [Category("Calendar")]
        [Bug("29277")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. User1 (ZWC) shares calendar with User2 (OLK 2003/XP)",
                   "2. User2 opens User1's mailbox.  Syncs.",
                   "3. User1 creates a new meeting request.  Adds User2 as an attendee",
                   "4. User2 receives the invite and accepts",
                   "5. In User2's view, Meeting shows in User2's Calendar.  Meeting disappears from User1's Calendar")]
        public void Bug29277()
        {
            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddDays(1);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("calendar")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                parentFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );
            #endregion

            #region ZCO: sync GAL, open message store, sync, verify the mounted share name and the shared folder
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            RDOFolder sharedCalendar = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(sharedCalendar, "Verify that the Calendar folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder rFolder = OutlookMailbox.Instance.findFolder(account1folderName, sharedCalendar, false);
            zAssert.IsNotNull(rFolder, "Verify that Calendar sub-folder in the store appears in the ZCO mailbox after adding it");

            #endregion

            #region Send meeting request from Account A to ZCO
            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content).
                            AddInv(new InvObject().
                                    Summary(subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, null, 1);

            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(subject);
            zAssert.IsNotNull(rdoAppt, "Verify that the appointment exists in the attendee's calendar");
            zAssert.AreEqual(startTimeUTC, rdoAppt.StartUTC, "Verify that meeting start time is correct");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppt.EndUTC, "Verify that meeting end time is correct");

            RDOMeetingItem rMeeting = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoAppt);
            rMeeting.To = zAccount.AccountA.emailAddress;
            rMeeting.Recipients.ResolveAll(null, null);
            rMeeting.Send();

            string windowTitle = "Accepted: " + subject + " - Meeting Response  ";

            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window

            #region Check the appointment on Organizer's calendar
            //Organizer's calendar
            RDOAppointmentItem rdoOrganizerAppt = OutlookMailbox.Instance.findAppointment(subject, rFolder, false);
            zAssert.IsNotNull(rdoOrganizerAppt, "Verify that the appointment exists in the Organizer's (shared) calendar");
            zAssert.AreEqual(startTimeUTC, rdoOrganizerAppt.StartUTC, "Verify that meeting start time is correct");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoOrganizerAppt.EndUTC, "Verify that meeting end time is correct");

            #endregion

            #endregion
        }

        [Test, Description("Bug48147: RDATE in ics prevents syncing all but first instance of recurring appt")]
        [Category("Calendar")]
        [Bug("48147")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1. Import .ics file having RDate ",
                  "2. ZCO Sync -> Verify all instances of appointment series are synced properly")]
        public void Bug48147()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string icsFile = GlobalProperties.TestMailRaw + "/Bugs/48147/Bug48147.ics";
            DateTime startTimeUTC = new DateTime(2011, 05, 09, 00, 00, 00); //Universal date time for the recurring series start time in .ics file
            DateTime endTimeUTC = new DateTime(2011, 05, 24, 00, 00, 00); //Universal date time for the recurring series end time in .ics file
            string apptSummary = "Bug48147";
            #endregion

            #region Import ICS file having RDATE to ZCO user account
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(@icsFile);
            restClient.DoMethod();

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), endTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, null, 1);
            #endregion

            #region Outlook
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSummary);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify appointment exists.");

            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.StartUTC, "Check appointment series start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.EndUTC, "Check appointment series end time");

            RDORecurrencePattern recurrencePattern = rdoAppointmentItem.GetRecurrencePattern();

            //Verify that all three instances are synced properly
            RDOAppointmentItem exAppointment1 = recurrencePattern.GetOccurence(1) as RDOAppointmentItem;
            zAssert.IsNotNull(exAppointment1, "First instance synced correctly");
            
            RDOAppointmentItem exAppointment2 = recurrencePattern.GetOccurence(2) as RDOAppointmentItem;
            zAssert.IsNotNull(exAppointment2, "Second instance synced correctly");
            
            RDOAppointmentItem exAppointment3 = recurrencePattern.GetOccurence(3) as RDOAppointmentItem;
            zAssert.IsNotNull(exAppointment3, "Third instance synced correctly");
            
            #endregion

        }

        [Test, Description("Bug57450: OL2010: Appointment HTML not synced to server")]
        [Category("Calendar")]
        [Bug("57450")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("1. Create an appointment having html content in the body",
                  "2. ZCO Sync, Verify Soap response for the appointment request -> HTML content should get synced in ZCS")]
        /* [10-May-2011] Please note that this issue was reported only for Outlook 2010 and is fixed in IronMaiden release. At present (Helix 7.1.1 release), this testcase should work fine for OLK 2003 and 2007, but would fail for OLK 2010 */
        public void Bug57450()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddDays(1);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string contentHtml = "<html><body>This line contains <b>Bold</b> and <i>italic</i> text.</body></html>";
            string contentPlain = "This line contains Bold and italic text.";
            string messageInvId;
            #endregion

            #region Outlook
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.Subject = subject;
            rAppt.HTMLBody = contentHtml;
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);
            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.BodyFormat = 2; //2 corresponds to HTML body format
            rAppt.Save();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            // Search for the Appointment message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message details
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            zAccount.AccountZCO.selectSOAP("//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:fr", null, contentPlain, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:descHtml", null, contentHtml, null, 1); //In case of OLK 2010, descHtml field was not present in GetMsgResponse and GetAppointmentResponse         
            #endregion

        }

        [Test, Description("Bug58406: Email address corrupted and organizer can't do any action on appointment after adding attendees at start of attendees field")]
        [Category("Calendar")]
        [Bug("58406")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("1. ZCO user creates meeting invite, inviting userA",
                  "2. ZCO user modifies the meeting, adds user B - send update only to userB",
                  "3. userB - Soap verification of meeting invite mail/appointment, Check attendees - should have both the users",
                  "4. Verify that, userA email address is not corrupted")]
        /* Note: Due to Bug#60874 [Outlook2003 : Meeting Invite does not have existing attendee when Updates sent only to new attendee], this test would fail on Outlook 2003
         * Also, please note that Redemption setting RDOAppointmenntItem.ForeceUpdateToAllAttendees to false is not supported, please refer comment below
         */
        public void Bug58406()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            string messageInvId;
            #endregion

            #region Outlook: Create meeting request inviting userA

            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);
            rAppt.ReminderSet = false;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            rAppt.Save();
            rAppt.Send();

            OutlookCommands.Instance.Sync();

            #endregion 

            #region SOAP Verification
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(1)));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:at", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);

            #endregion

            #region Outlook: Add userB to the above meeting request and send update only to userB
            
            rAppt.Recipients.Add(zAccount.AccountB.emailAddress);
            /* As of now, in this testcase we are not verifying the behavior when update is sent only to added attendee
             * This is because, ForeceUpdateToAllAttendees property not supported in 5.1.
             * As per Outlook Redemption tech forum post, http://tech.groups.yahoo.com/group/Outlook-Redemption/message/4942 the feature would be supported in 5.2 release, uncomment the below line when we move to 5.2 redemption
            **/
            //rAppt.ForceUpdateToAllAttendees = false;  
            rAppt.Save();
            rAppt.Send();
            
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Verification: Check the appointment has both users in invitees
            
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")").CalExpandInst(startTimeLocal.AddDays(-1), startTimeLocal.AddDays(1)));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage1 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage1, "//mail:at[1]", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage1, "//mail:at[2]", "a", zAccount.AccountB.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage1, "//mail:or", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage1, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountB.selectSOAP(appointmentMessage1, "//mail:comp", "name", "Updated: " + apptSubject, null, 1);

            #endregion


        }
    }
}