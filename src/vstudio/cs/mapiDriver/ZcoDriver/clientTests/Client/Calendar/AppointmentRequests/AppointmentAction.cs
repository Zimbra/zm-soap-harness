using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapAdmin;
using Soap;
using System.IO;
using SoapWebClient;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.AppointmentRequests
{
    [TestFixture]
    public class AppointmentAction : BaseTestFixture
    {
        [Test, Description("Verify changes to appointment (op=tag in ZCO) is synced")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as sync user", "Create a tag in ZCS", "Sync", "Create a appt in ZCO", "Tag the appointment and sync", "Verify appt is tagged in ZCS")]
        public void AppointmentAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, tagId;
            #endregion

            #region SOAP
            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

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
            rAppt.Categories = tagName;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            // next soap search some time does not find the appointment (in zqa-073) even though it is present. Mostly because time between sync and search is too short. So added sleep for 2 seconds.
            System.Threading.Thread.Sleep(2000);
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
            zAccount.AccountZCO.selectSOAP("//mail:m", "t", tagId, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

        }

        [Test, Description("Verify changes to appointment (op=untag in ZCO) is synced")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Auth as sync user", "Create a tag in ZCS", "Sync", "Create a appt in ZCO. Tag the appointment and sync", "Verify appt is tagged in ZCS",
            "Untag the appointment from ZCO. Sync", "Verify appointment is tagged on ZCS")]
        public void AppointmentAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, tagId;
            #endregion

            #region SOAP
            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

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
            rAppt.Categories = tagName;
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
            zAccount.AccountZCO.selectSOAP("//mail:m", "t", tagId, null, 1);
            SoapTest soapTest = new SoapTest();
            DateTime soapStartUTC = soapTest.toUTC(appointmentMessage, "//mail:s");
            zAssert.AreEqual(startTimeLocal.ToUniversalTime(), soapStartUTC, "Verify that the start time (UTC format) is correct");

            DateTime soapEndUTC = soapTest.toUTC(appointmentMessage, "//mail:e");
            zAssert.AreEqual(startTimeLocal.AddHours(1).ToUniversalTime(), soapEndUTC, "Verify that the end time (UTC format) is correct");

            #endregion

            #region Outlook Block
            // Untag the appointment
            rAppt.Categories = null;
            rAppt.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:fr", null, apptContent, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:comp", "name", apptSubject, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m/mail:t", null, null, null, 0);
            #endregion
            
        }

        [Test, Description("Verify changes to appointment (op=tag on ZCS) is synced")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as sync user", "Create a tag in ZCS", "Create a appt in ZCS", "Tag the appointment", "Sync", "Verify appt is tagged in ZCO")]
        public void AppointmentAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, tagId, appointmentId;
            #endregion

            #region SOAP
            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            // Apply the tag to the appointment
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(appointmentId, ItemActionRequest.ActionOperation.tag,tagId));
            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            if (rdoAppointmentItem.Categories == null)
            {
                tcLog.Error("Check that there are no categories on the contact");
            }
            else
            {
                ArrayList categoryList = new ArrayList();
                foreach (string s in rdoAppointmentItem.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.Contains(tagName, categoryList, "Checked that the appointment with Tag in ZWC synced correctly in ZCO");
            }
            #endregion

        }

        [Test, Description("Verify changes to appointment (op=untag on ZCS) is synced to ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as sync user", "Create a tag in ZCS", "Create a appt in ZCS", "Tag the appointment", "Sync", "Verify appt is tagged in ZCO",
            "Untag the appt in ZCS", "sync and check whether appt is untagged in ZCO")]
        public void AppointmentAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, tagId, appointmentId;
            #endregion

            #region SOAP
            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            // Apply the tag to the appointment
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(appointmentId, ItemActionRequest.ActionOperation.tag, tagId));
            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            if (rdoAppointmentItem.Categories == null)
            {
                tcLog.Error("Check that there are no categories on the contact");
            }
            else
            {
                ArrayList categoryList = new ArrayList();
                foreach (string s in rdoAppointmentItem.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.Contains(tagName, categoryList, "Checked that the Contact with Tag in ZWC synced correctly in ZCO");
            }
            #endregion

            #region SOAP block

            // Untag the tagged appointment
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(appointmentId, ItemActionRequest.ActionOperation.untag, tagId));

            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");
            zAssert.IsNull(rdoAppointmentItem.Categories, "Checked that the Tag is removed from the appointmentin ZCO");
            #endregion

        }

        [Test, Description("Verify appointment tagged in ZCO and untagged in ZCS reflects in ZCO")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Auth as sync user", "Create a tag in ZCS", "Sync", "Create a appt in ZCO", "Tag the appointment and sync", "Untag the appt in ZCS",
            "Verify appt is untagged in ZCO")]
        public void AppointmentAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, tagId;
            #endregion

            #region SOAP
            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

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
            rAppt.Categories = tagName;
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP block

            // Untag the tagged appointment
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(messageInvId, ItemActionRequest.ActionOperation.untag, tagId));

            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");
            zAssert.IsNull(rdoAppointmentItem.Categories, "Checked that the Tag is removed from the appointmentin ZCO");
            #endregion

        }

        [Test, Description("Verify appointment tagged in ZCS and untagged in ZCO reflects in ZCS")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Auth as sync user", "Create a tag in ZCS", "Create a appt in ZCO", "Tag the appointment", "Sync", "Untag the appt in ZCO",
            "Verify appt is untagged in ZCS")]
        public void AppointmentAction_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, tagId, appointmentId, messageInvId;
            #endregion

            #region SOAP
            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            // Apply the tag to the appointment
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(appointmentId, ItemActionRequest.ActionOperation.tag, tagId));
            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");

            zAssert.AreEqual(apptSubject, rdoAppointmentItem.Subject, "Check appointment summary");
            zAssert.AreEqual(zAccount.AccountZCO.emailAddress, rdoAppointmentItem.Organizer, "Check the appointment organizer");

            // Normalize to UTC so that the PC's timezone does not affect the test
            zAssert.AreEqual(startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime(), "Check appointment start time");
            zAssert.AreEqual(startTimeUTC.AddHours(1), rdoAppointmentItem.End.ToUniversalTime(), "Check appointment end time");
            if (rdoAppointmentItem.Categories == null)
            {
                tcLog.Error("Check that there are no categories on the contact");
            }
            else
            {
                ArrayList categoryList = new ArrayList();
                foreach (string s in rdoAppointmentItem.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.Contains(tagName, categoryList, "Checked that the Contact with Tag in ZWC synced correctly in ZCO");
            }
            #endregion

            #region Outlook Block
            // Untag the appointment
            rdoAppointmentItem.Categories = null;
            rdoAppointmentItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                                );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m/mail:t", null, null, null, 0);
            #endregion

        }

        [Test, Description("Verify appointment Deleted in ZCO reflects in ZCS")]
        [Category("Calendar")]
        [Bug("17402")]
        [SyncDirection(SyncDirection.BOTH)]
        public void AppointmentAction_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocalTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeLocalTemp.Year, startTimeLocalTemp.Month, startTimeLocalTemp.Day, startTimeLocalTemp.Hour, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
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
            // Save and Send the appointment
            rAppt.Save();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP block, verify that the appointment created is synced correctly
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);
            #endregion

            #region Sync Outlook

            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(apptSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");
            rdoAppointmentItem.Delete(true);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block, verify that the appointment is deleted
            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            zAccount.AccountZCO.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_ITEM", null, 1);
            #endregion

        }

        [Test, Description("Verify that for a server vs local edit, server change is applied in case the local change is only an alarm one ")]
        [Category("Calendar")]
        [Bug("29134")]
        [SyncDirection(SyncDirection.BOTH)]
        public void AppointmentAction_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string newSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string newContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            string messageInvId, startTime, endTime;
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
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:s","d", null, out startTime,1);
            zAccount.AccountZCO.selectSOAP(appointmentMessage, "//mail:e", "d", null, out endTime, 1);
            zAccount.AccountZCO.sendSOAP(@"<ModifyAppointmentRequest xmlns='urn:zimbraMail' id='" + messageInvId + @"' comp='0'>
                                             <m>
                                            <inv method='REQUEST' type='event' fb='B' transp='O' status='CONF' allDay='0' name='" + newSubject + @"'>
                                            <s d='"+ startTime +@"'/> 
                                            <e d='" + endTime + @"' /> 
                                            <or a='"+ zAccount.AccountZCO.emailAddress +@"'/> 
                                            </inv>
                                            <mp content-type='text/plain'>
                                                <content>'"+ newContent + @"'</content> 
                                            </mp>
                                            <su>'" + newSubject + @"'</su> 
                                            </m>
                                            </ModifyAppointmentRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:ModifyAppointmentResponse", null, null, null, 1);
            #endregion

            #region outlook block to modify reminder and then sync
            rAppt.ReminderMinutesBeforeStart = 25;
            rAppt.Save();
            #endregion 

            #region Outlook block to veify that server changes are not thrown
            OutlookCommands.Instance.Sync();
            // Find the new appointment
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(newSubject) as RDOAppointmentItem;

            // Validate the appointment
            zAssert.IsNotNull(rdoAppointmentItem, "Check that appointed exists in the calendar");
            //zAssert.AreEqual(rdoAppointmentItem.Body, newContent, "Body matches");

            zAssert.AreEqual(rdoAppointmentItem.ReminderMinutesBeforeStart, 0, "Reminder is set back to original");
            #endregion
        }

    }
}