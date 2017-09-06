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
    public class GetPrivateAppointment : BaseTestFixture
    {
        [Test, Description("Verify that ZCO can open another user's calendar and read the private meeting")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a private appointment in it, from test account", "Share the calendar folder with syncuser with enabling rights to view private meetings", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that syncuser can read/access the private appointment ")]
        public void OpenCalendar_PrivateAppts_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, calendarFolderId, folderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());

            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                calendarFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewerPrivate)
                                        );
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewerPrivate)
                                        );

            // Add a appointment in the new calendar folder

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().SetParent(folderId).
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    setPrivate().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            // Sync any changes
            OutlookCommands.Instance.Sync();

            // Sync the GAL so that the address is now in the GAL.
            // To mount a mailbox, the delegate account must be in the GAL first
            
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultCalFolder =  mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultCalFolder, "Verify that the shared folder appears in the delegate store");

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultCalFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder appears in the delegate store");
            // Get the appointment
            RDOAppointmentItem rdoAppt = OutlookMailbox.Instance.findAppointment(apptSubject, rfolder, true);
            zAssert.IsNotNull(rdoAppt, "Verify that the shared appointment exists in the delegate store");

            // Verify the appt data
            zAssert.AreEqual(apptSubject, rdoAppt.Subject, "Verify the delegate appt subject matches");
            zAssert.IsTrue(rdoAppt.Body.Contains(apptContent), "Verify the delegate appt content matches the expected " + apptContent);
            zAssert.IsTrue(rdoAppt.Sensitivity.Equals(2), "Verify the delegate appt is private");

            #endregion

        }

        [Test, Description("Verify that ZCO can open another user's calendar and cannot view the private meeting")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a private appointment in it, from test account", "Share the calendar folder with syncuser", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that syncuser CANNOT read/access the private appointment ")]
        public void OpenCalendar_PrivateAppts_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal = new DateTime(2016, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            string messageCalItemId, calendarFolderId, folderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());

            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", "id", null, out calendarFolderId, 1);

            // Create a folder in the calendar
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(folderName).
                                                SetParent(calendarFolderId)));

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
                            Subject(apptSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(apptContent).
                            AddInv(new InvObject().
                                    setPrivate().
                                    Summary(apptSubject).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", "calItemId", null, out messageCalItemId, 1);

            #endregion

            #region ZCO: sync GAL, open message store, sync, verify shared folder and message in it.

            // Sync any changes
            OutlookCommands.Instance.Sync();

            // Sync the GAL so that the address is now in the GAL.
            // To mount a mailbox, the delegate account must be in the GAL first

            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the mountpoint is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultCalFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(defaultCalFolder, "Verify that the shared calendar folder appears in the delegate store");

            RDOFolder rfolder = OutlookMailbox.Instance.findFolder(folderName, defaultCalFolder, true);
            zAssert.IsNotNull(rfolder, "Verify that the shared folder inside the calendar folder appears in the delegate store");
            // Get the appointment
            zAssert.IsNull(OutlookMailbox.Instance.findAppointment(apptSubject, rfolder, true), "Verify that the shared appointment is not found in the delegate store");

            #endregion

        }
    }
}