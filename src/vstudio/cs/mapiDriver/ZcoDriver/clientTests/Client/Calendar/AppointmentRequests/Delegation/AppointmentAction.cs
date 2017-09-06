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
    public class AppointmentAction : BaseTestFixture
    {
        [Test, Description("Verify that shared calendar's tag is synced from ZCO to ZWC")]
        [Bug("30523")]
        [Category("SMOKE"), Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as admin and create a test account", "From ZCS add a calendar and a appointment in it, from test account", "Tag the appointment", "Share the calendar folder with syncuser", "Sync",
            "Run MountIt.exe to mount the shared mailbox of test account", "Verify that appointment exists in the mounted mailbox and the appointment is tagged")]
        public void AppointmentAction_01()
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
            OutlookCommands.Instance.Sync(/*mountpoint*/);
            #endregion
            #region "SOAP block"
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + message1Subject + ")")
                                                );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageInvId, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageInvId + "']", null, null, null, 1);

            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:comp", "name", message1Subject, null, 1);
            zAccount.AccountA.selectSOAP("//mail:m", "t", null, out tagId, 1);
            #endregion
        }
    }
}
