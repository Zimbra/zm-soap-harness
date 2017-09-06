using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapAdmin;
using SoapWebClient;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.AppointmentRequests.Delegation
{
    [TestFixture]
    public class GetAppointment : BaseTestFixture
    {
        [Test, Description("Verify that ZCO can open another user's calendar when grantee-type=domain")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        //This test is failing with error: Failed to open other users mailbox.  Response code: 2147746063 (8004010f). Debugged a lot, but with no success. We have to verify this test scenario manually
        [Ignore("Native.dll issue to mount other user's mailbox")]
        [TestSteps("Auth as admin and create a domain and a test account having the new domain.", "From ZCS add a calendar and a appointment in it, from test account", "Share the calendar folder with the default domain", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox")]
        public void CrossDomain_OpenCalendar_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string domainName = "domain" + GlobalProperties.time() + GlobalProperties.counter() + "." + "com";
            string accountName = "account" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId, domainId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateDomainRequest().DomainName(domainName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:CreateDomainResponse/admin:domain", "id", null, out domainId, 1);
            zAccount account1 = new zAccount(accountName, domainName);
            account1.createAccount();
            account1.login();

            // Get all folders to determine the inbox id
            account1.sendSOAP(new GetFolderRequest());
            account1.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            account1.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            account1.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            account1.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            account1.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Add a appointment in the new calendar folder

            account1.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, account1.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(account1.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            account1.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            //We will not get other domain user account in the GAL, so adding other domain user account as ZCO contact and then would be searching that user in Contacts folder  
            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = accountName;
            rContact.Email1Address = account1.emailAddress;
            rContact.Save();


            // Sync any changes
            OutlookCommands.Instance.Sync();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailboxD(account1); //calls OpenMailboxD() implemented for opening other user's mailbox by searching in Contacts folder

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            #endregion

        }

        [Test, Description("Verify that ZCO can open another user's calendar")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account", "Share the calendar folder with syncuser", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox")]
        public void OpenCalendar_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            #endregion

        }

        [Test, Description("Verify that ZCO can open another user's calendar when grantee-type=group")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create 5 test account. Create a DL having these 5 accounts and syncuser.", "From ZCS add a calendar and a appointment in it, from test account", "Share the calendar folder with the DL", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox")]
        public void OpenCalendar_Basic_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId, dlId;
            int loopCount = 5;
            string distlistName = "distList" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region Account Setup

            ArrayList distlist = new ArrayList();

            // Create 10 test accounts
            for (int userCount = 1; userCount <= loopCount; userCount++)
            {
                string accountName = "account" + userCount + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                    UserName(accountName).
                    UserPassword(GlobalProperties.getProperty("defaultpassword.value")));

                distlist.Add(accountName);
            }
            distlist.RemoveAt(0); // Removed first user from array as this user would be granter
            distlist.Add(zAccount.AccountZCO.emailAddress);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateDistributionListRequest().ListName(distlistName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:CreateDistributionListResponse/admin:dl", "id", null, out dlId, 1);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddDistListMemberRequest().AddMembers(dlId, distlist));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddDistributionListMemberResponse", null, null, null, 1);
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                distlistName,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                distlistName,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            #endregion

        }

        [Test, Description("Verify that ZCO can open another user's calendar when grantee-type=cos")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a cos and a test account having the new cos.", "From ZCS add a calendar and a appointment in it, from test account", "Share the calendar folder with the default COS", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox")]
        public void OpenCalendar_Basic_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId, cosId;
            string cosName = "cos" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Account Setup
            // Create COS

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.CreateCosRequest().CosName(cosName));

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:CreateCosResponse/admin:cos", "name", cosName, null, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:CreateCosResponse/admin:cos", "id", null, out cosId, 1);

            // Create account1
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new ModifyAccountRequest().SetAccountId(zAccount.AccountA.zimbraId).ModifyAttribute("zimbraCOSId", cosId));

            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            #endregion

        }

      
        [Test, Description("Verify READ (r) rights in ZCO on another user's calendar")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account", "Share the calendar folder with syncuser with read rights", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox. syncuesr can only view it and cannot modify it.")]
        public void OpenCalendar_Basic_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data can be read
            UnauthorizedAccessException unauthorizedAccessException = null;
            try
            {
                zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
                zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to read subject, content");

            // Verify appt data cannot be modified.
            // Try to save the appointment. As REVIWER rights it should throw permission denied exception.
            unauthorizedAccessException = null;
            try
            {
                rdoAppt.Subject = "newSubject";
                rdoAppt.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNotNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is thrown when trying to modify subject");

            // Try to insert - should fail
            unauthorizedAccessException = null;
            try
            {
                RDOAppointmentItem rdoNewApptItem = defaultFolder.Items.Add("IPM.Appointment") as RDOAppointmentItem;

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNotNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is thrown when trying to insert new appointment");

            // Try to delete - should fail
            unauthorizedAccessException = null;
            try
            {
                rdoAppt.Delete(true); // 2 == hard delete
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNotNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is thrown when trying to delete the appointment");

            #endregion

        }

        [Test, Description("Verify AUTHOR (rw) rights in ZCO on another user's calendar")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Ignore("21-Mar-11 At present Zimbra does not support Author permission.")]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account",
            "Share the calendar folder with syncuser with author rights", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox.",
            "Verify suject can be modified", "Verify another appt cannot be inserted in shared calendar")]
        public void OpenCalendar_Basic_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAuthor)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAuthor)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data can be read
            UnauthorizedAccessException unauthorizedAccessException = null;
            try
            {
                zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
                zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to read subject, content");


            // Verify appt data cannot be modified.
            // Try to save the appointment. As AUTHOR rights it should allow syncuser to modify subject.
            // Try to modify - should succeed
            unauthorizedAccessException = null;
            try
            {

                rdoAppt.Subject = "newSubject" + GlobalProperties.time() + GlobalProperties.counter();
                rdoAppt.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying modify the subject with AUTHOR rights");


            // Try to insert - should fail
            unauthorizedAccessException = null;
            try
            {
                RDOAppointmentItem rdoNewApptItem = defaultFolder.Items.Add("IPM.Appointment") as RDOAppointmentItem;

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNotNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is thrown when trying to insert new appointment");

            // Try to work flow - should fail
            System.Runtime.InteropServices.COMException comException = null;
            try
            {

                RDOMeetingItem response = rdoAppt.Respond(rdoMeetingResponse.olMeetingAccepted, null, null);
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                comException = e;
            }
            zAssert.IsNotNull(comException, "Verify COMException is thrown when trying to respond to appointment");


            // Try to delete - should fail
            unauthorizedAccessException = null;
            try
            {
                rdoAppt.Delete(2); // 2 == hard delete
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNotNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is thrown when trying to delete the appointment");

            #endregion

        }

        [Test, Description("Verify Admin (rwidx) rights in ZCO on another user's calendar")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        //[Ignore("RDO does not allow to create appt in shared cal with EDITOR rights. Whereas you can create, delete appts from Outlook UI. Also, we no longer support Editor permission.")]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account",
            "Share the calendar folder with syncuser with admin rights", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox.",
            "Verify subject can be modified of appt, add appointment in shared calendar.", "Verify delete operation cannot be performed in shared calendar")]
        public void OpenCalendar_Basic_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data can be read
            UnauthorizedAccessException unauthorizedAccessException = null;
            try
            {
                zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
                zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to read subject, content");

            unauthorizedAccessException = null;
            try
            {

                rdoAppt.Subject = "newSubject" + GlobalProperties.time() + GlobalProperties.counter();
                rdoAppt.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying modify the subject with admin rights");


            // Try to insert appt - should allow with rwid rights
            unauthorizedAccessException = null;
            RDOAppointmentItem rdoNewApptItem = null;
            try
            {
                rdoNewApptItem = defaultFolder.Items.Add("IPM.Appointment") as RDOAppointmentItem;
                zAssert.IsNotNull(rdoNewApptItem, "Verify the Appointmnet is created correctly");

                rdoNewApptItem.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
                rdoNewApptItem.Body = "content" + GlobalProperties.time() + GlobalProperties.counter();

                DateTime startTimeLocalNew = new DateTime(2016, 10, 25, 12, 0, 0);
                rdoNewApptItem.Start = startTimeLocalNew;
                rdoNewApptItem.End = startTimeLocalNew.AddHours(3);

                rdoNewApptItem.ReminderSet = true;
                rdoNewApptItem.ReminderMinutesBeforeStart = 30;
                rdoNewApptItem.BusyStatus = Redemption.rdoBusyStatus.olBusy;
                rdoNewApptItem.IsOnlineMeeting = false;
                rdoNewApptItem.AllDayEvent = false;

                rdoNewApptItem.Save(); // RDO does not allow to create item in shared calendar with Editor rights. User can create/delete from UI.
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to adding a new appointment");

            // Verify items cannot be deleted from shared calendar.
            unauthorizedAccessException = null;
            try
            {
                rdoNewApptItem.Delete(true); // RDO does not allow to delete item in shared calendar with Editor rights. User can create/delete from UI.
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnAuthorizedAccessException is NOT thrown when trying to delete a appt");

            // Try to work flow - should fail
            System.Runtime.InteropServices.COMException comException = null;
            try
            {

                RDOMeetingItem response = rdoAppt.Respond(rdoMeetingResponse.olMeetingAccepted, null, null);
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                comException = e;
            }
            zAssert.IsNotNull(comException, "Verify COMException is thrown when trying to respond to appointment");

            #endregion
        }

        [Test, Description("Verify MANAGER/DELEGATE (rwidx) rights in ZCO on another user's calendar")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account",
            "From ZCS add a calendar and a appointment in it, from test account",
            "Share the calendar folder with syncuser with manager rights",
            "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account",
            "Verify that appointment exists in the mounted mailbox.",
            "Verify subject can be modified, appointment can be added/deleted in shared calendar.",
            "Verify syncuser can act on items i.e accept appt in shared calendar.")]
        public void OpenCalendar_Basic_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message2Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            zAccount.AccountB.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message2Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message2Content).
                            AddInv(new InvObject().
                                    Summary(message2Subject).
                                    AddAttendee(zAccount.AccountA.emailAddress).
                                    AddOrganizer(zAccount.AccountB.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountB.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);


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

            // Add a appointment in the new calendar folder
             startTimeLocal = new DateTime(2011, 12, 25, 12, 0, 0);
             startTimeUTC = startTimeLocal.ToUniversalTime();

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, defaultFolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data can be read
            UnauthorizedAccessException unauthorizedAccessException = null;
            try
            {
                zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
                zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to read subject, content");

            unauthorizedAccessException = null;
            try
            {

                rdoAppt.Subject = "newSubject" + GlobalProperties.time() + GlobalProperties.counter();
                rdoAppt.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying modify the subject with AUTHOR rights");


            // Try to insert appt - should allow with rwid rights
            unauthorizedAccessException = null;
            RDOAppointmentItem rdoNewApptItem = null;
            try
            {
                rdoNewApptItem = defaultFolder.Items.Add("IPM.Appointment") as RDOAppointmentItem;
                zAssert.IsNotNull(rdoNewApptItem, "Verify the Appointmnet is created correctly");

                rdoNewApptItem.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
                rdoNewApptItem.Body = "content" + GlobalProperties.time() + GlobalProperties.counter();

                DateTime startTimeLocalNew = new DateTime(2016, 10, 25, 12, 0, 0);
                rdoNewApptItem.Start = startTimeLocalNew;
                rdoNewApptItem.End = startTimeLocalNew.AddHours(3);

                rdoNewApptItem.ReminderSet = true;
                rdoNewApptItem.ReminderMinutesBeforeStart = 30;
                rdoNewApptItem.BusyStatus = Redemption.rdoBusyStatus.olBusy;
                rdoNewApptItem.IsOnlineMeeting = false;
                rdoNewApptItem.AllDayEvent = false;

                rdoNewApptItem.Save(); 
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to adding a new appointment");

            unauthorizedAccessException = null;
            try
            {
                rdoNewApptItem.Delete(true);
            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnAuthorizedAccessException is NOT thrown when trying to delete a appt");

            Redemption.RDOAppointmentItem rdoActOnAppt = OutlookMailbox.Instance.findAppointment(message2Subject, defaultFolder, true);
            zAssert.IsNotNull(rdoActOnAppt, "Verify that the shared appointment exists in the delegate store");

            Redemption.RDOMeetingItem rdoMeetingItem = OutlookMailbox.Instance.appointmentRespond(rdoMeetingResponse.olMeetingAccepted, rdoActOnAppt);
            zAssert.IsNotNull(rdoMeetingItem, "Verify the meeting response is created correctly");
            OutlookMailbox.Instance.ConvertMeetingResponse(ref rdoMeetingItem, ref rdoActOnAppt) ;
            rdoMeetingItem.Send();

            string windowTitle = "Accepted: " + message2Subject + " - Meeting Response  ";
            
            NativeWIN32.CloseWindow("rctrl_renwnd32", windowTitle); //Closing the Meeting update window
            
            OutlookCommands.Instance.Sync();

            #endregion
 
        }

        [Test, Description("Verify whether grantee with manager permission can cancel meeting occurences.")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("32357")]
        //[Ignore("21-Mar-11 At present Zimbra does not support Editor permission.")]
        [TestSteps("Auth as admin and create 2 test account", "From ZCS as account2 send a recurring meeting to account3",
            "Share the calendar folder from account2 with syncuser with manager rights", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox.",
            "Open a instance and verify that the instance can be canceled.")]
        public void OpenCalendar_Basic_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId;
            string recurringInterval = "1";
            string recurringOccurrences = "4";
            string recurringFrequency = "DAI";
            #endregion

            #region SOAP: Delegate creates folder and shares it

            zAccount.AccountB.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountA.emailAddress).
                                    AddOrganizer(zAccount.AccountB.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringOccurrences, null).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountB.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);


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

            // Sync any changes
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            
            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");


            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, defaultFolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data can be read
            UnauthorizedAccessException unauthorizedAccessException = null;
            try
            {
                zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
                zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to read appointment");

            // Try to work flow - should fail
            unauthorizedAccessException = null;
            try
            {
                RDORecurrencePattern rRecurrence = rdoAppt.GetRecurrencePattern();
                RDOAppointmentItem exRdoAppt = rRecurrence.GetOccurence(startTimeLocal) as RDOAppointmentItem;
                exRdoAppt.MeetingStatus = rdoMeetingStatus.olMeetingCanceled;

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify unauthorizedAccessException is not thrown when trying to respond to appointment");

            #endregion

        }

        [Test, Description("Verify whether grantee with admin permission can delete meeting occurences.")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("32358")]
        //[Ignore("21-Mar-11 At present Zimbra does not support Editor permission.")]
        [TestSteps("Auth as admin and create 2 test account", "From ZCS as account3 send a recurring meeting to account2",
            "Share the calendar folder from account2 with syncuser with editor rights", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox.",
            "Open a instance and verify that the instance cannot be deleted.")]
        public void OpenCalendar_Basic_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId;
            string recurringInterval = "1";
            string recurringOccurrences = "4";
            string recurringFrequency = "DAI";
            #endregion

            #region SOAP: Delegate creates folder and shares it

            zAccount.AccountB.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(zAccount.AccountA.emailAddress).
                                    AddOrganizer(zAccount.AccountB.emailAddress).
                                    AddRecurrence(recurringFrequency, recurringInterval, recurringOccurrences, null).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountB.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);


            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
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

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, defaultFolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data can be read
            UnauthorizedAccessException unauthorizedAccessException = null;
            try
            {
                zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
                zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }
            zAssert.IsNull(unauthorizedAccessException, "Verify UnauthorizedAccessException is NOT thrown when trying to read appointment");

            // Try to work flow - should fail
            unauthorizedAccessException = null;
            try
            {
                RDORecurrencePattern rRecurrence = rdoAppt.GetRecurrencePattern();
                RDOAppointmentItem exRdoAppt = rRecurrence.GetOccurence(startTimeLocal) as RDOAppointmentItem;
                exRdoAppt.Delete(true);

            }
            catch (UnauthorizedAccessException e)
            {
                unauthorizedAccessException = e;
            }

            zAssert.IsNull(unauthorizedAccessException, "Verify unauthorizedAccessException is not thrown when trying to respond to appointment");
            

            #endregion

        }

        [Test, Description("Verify that ZCO can open another user's calendar shared with all the three rights")]
        [Category("Calendar")]
        [Bug("48139")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account", "Share the calendar folder with syncuser", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox")]
        public void OpenCalendar_Basic_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocalTemp1 = DateTime.Now.AddDays(7).AddHours(4);
            DateTime startTimeLocal1 = new DateTime(startTimeLocalTemp1.Year, startTimeLocalTemp1.Month, startTimeLocalTemp1.Day, startTimeLocalTemp1.Hour, 0, 0); 
            DateTime startTimeUTC1 = startTimeLocal1.ToUniversalTime();
            DateTime startTimeLocalTemp2 = DateTime.Now.AddDays(8).AddHours(4);
            DateTime startTimeLocal2 = new DateTime(startTimeLocalTemp2.Year, startTimeLocalTemp2.Month, startTimeLocalTemp2.Day, startTimeLocalTemp2.Hour, 0, 0); 
            DateTime startTimeUTC2 = startTimeLocal2.ToUniversalTime();
            DateTime startTimeLocalTemp3 = DateTime.Now.AddDays(9).AddHours(4);
            DateTime startTimeLocal3 = new DateTime(startTimeLocalTemp3.Year, startTimeLocalTemp3.Month, startTimeLocalTemp3.Day, startTimeLocalTemp3.Hour, 0, 0); 
            DateTime startTimeUTC3 = startTimeLocal3.ToUniversalTime();
            string subject1 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folder1Name = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folder2Name = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content3 = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folder3Name = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string message1CallItemId, message2CallItemId, message3CallItemId, calendarFolderId, folder1Id, folder2Id, folder3Id;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folder1Name).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folder1Id, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folder2Name).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folder2Id, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folder3Name).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folder3Id, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folder1Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folder2Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoDelegate)
                                        );
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folder3Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folder1Id).
                            Subject(subject1).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content1).
                            AddInv(new InvObject().
                                    Summary(subject1).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal1, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal1.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out message1CallItemId, 1);

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folder2Id).
                            Subject(subject2).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content2).
                            AddInv(new InvObject().
                                    Summary(subject2).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal2, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal2.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out message2CallItemId, 1);

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folder3Id).
                Subject(subject3).
                AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                BodyTextPlain(content3).
                AddInv(new InvObject().
                        Summary(subject3).
                        AddOrganizer(zAccount.AccountA.emailAddress).
                        StartTime(startTimeLocal3, System.TimeZone.CurrentTimeZone).
                        EndTime(startTimeLocal3.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out message3CallItemId, 1);
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

            RDOFolder rfolder1 = OutlookMailbox.Instance.findFolder(folder1Name, defaultFolder, true);
            zAssert.IsNotNull(rfolder1, "Verify that the shared folder appears in the delegate store");

            RDOFolder rfolder2 = OutlookMailbox.Instance.findFolder(folder2Name, defaultFolder, true);
            zAssert.IsNotNull(rfolder2, "Verify that the shared folder appears in the delegate store");

            RDOFolder rfolder3 = OutlookMailbox.Instance.findFolder(folder3Name, defaultFolder, true);
            zAssert.IsNotNull(rfolder3, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt1 = OutlookMailbox.Instance.findAppointment(subject1, rfolder1, true);
            zAssert.IsNotNull(rdoAppt1, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(subject1, rdoAppt1.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt1.Body.Contains(content1), "Verify the delegate appt content matches the expected " + subject1);

            // Get the appointment
            RDOAppointmentItem rdoAppt2 = OutlookMailbox.Instance.findAppointment(subject2, rfolder2, true);
            zAssert.IsNotNull(rdoAppt2, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(subject2, rdoAppt2.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt2.Body.Contains(content2), "Verify the delegate appt content matches the expected " + subject2);

            // Get the appointment
            RDOAppointmentItem rdoAppt3 = OutlookMailbox.Instance.findAppointment(subject3, rfolder3, true);
            zAssert.IsNotNull(rdoAppt3, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(subject3, rdoAppt3.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt3.Body.Contains(content3), "Verify the delegate appt content matches the expected " + subject3);
            #endregion

        }

        [Test, Description("Verify that tagged appointments show in secondary stores")]
        [Category("Calendar")]
        [Bug("33920")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void OpenCalendar_Basic_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeTemp = DateTime.Now.AddDays(2);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0);
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId, appointmentId, tagId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(messageSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(messageContent).
                            AddInv(new InvObject().
                                    Summary(messageSubject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out appointmentId, 1);
            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(messageSubject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.IsTrue(rdoAppt.Body.Contains(messageContent), "Verify the delegate appt content matches the expected " + messageContent);

            #endregion

            #region SOAP block to tag the appointment
            // Add a tag
            zAccount.AccountA.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountA.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountA.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Apply the tag to the appointment
            zAccount.AccountA.sendSOAP(new ItemActionRequest().SetAction(appointmentId, ItemActionRequest.ActionOperation.tag,tagId));
            zAccount.AccountA.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);
            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            // Sync any changes
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            rdoAppt = OutlookMailbox.Instance.findAppointment(messageSubject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.IsTrue(rdoAppt.Body.Contains(messageContent), "Verify the delegate appt content matches the expected " + messageContent);

            #endregion


        }

        [Test, Description("Verify that shared calendar's tag is synced from ZWC to ZCO")]
        [Bug("30523")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account", "Tag the appointment", "Share the calendar folder with syncuser", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox and the appointment is tagged")]
        public void OpenCalendar_Basic_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId,tagId;
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

            // Add a tag
            zAccount.AccountA.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountA.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountA.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Apply the tag to the appointment
            zAccount.AccountA.sendSOAP(new ItemActionRequest().SetAction(messageCallItemId, ItemActionRequest.ActionOperation.tag, tagId));
            zAccount.AccountA.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);
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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(message1Subject, rdoAppt.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains(message1Content), "Verify the delegate appt content matches the expected " + message1Content);

            if (rdoAppt.Categories == null)
            {
                tcLog.Error("Appointment did not have any tag/category");
            }
            else
            {
                ArrayList categoryList = new ArrayList();
                foreach (string s in rdoAppt.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                    
                }
                
                zAssert.Contains(tagName, categoryList, "Shared folder's Tag is correctly synced in ZCO");
            }
            #endregion

        }



    


        [Test, Description("Verify that shared calendar's tag is synced from ZCO to ZWC")]
        [Bug("30523")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account", "Tag the appointment", "Share the calendar folder with syncuser", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox and the appointment is tagged")]
        public void OpenCalendar_Basic_14()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "calendar" + GlobalProperties.time() + GlobalProperties.counter();
            string messageCallItemId, calendarFolderId, folderId, tagId, messageInvId;
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)
                                        ));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCallItemId, 1);

           
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

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");

            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(message1Subject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");
            //RDOCategory category = new RDOCategory();
            
            //category.Name = tagName;
            //category.Color = rdoCategoryColor.olCategoryColorBlue;

            rdoAppt.Categories = rdoAppt.Categories + ";" + tagName;
            rdoAppt.Save();
            OutlookCommands.Instance.Sync();
            #endregion
            #region "SOAP block"
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + message1Subject + ")")
                                                );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);

            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", message1Subject, null, 1);
            zAccount.AccountA.selectSOAP("//mail:m", "t", null,out tagId, 1);
            #endregion
        }
    }
}