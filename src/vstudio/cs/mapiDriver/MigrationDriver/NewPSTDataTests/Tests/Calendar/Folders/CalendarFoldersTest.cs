using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Calendar.Folders
{
    public class CalendarFoldersTest : BaseTestFixture
    {
        public CalendarFoldersTest()
        {
            this.PstFilename = "/general/calendar/calendar_folder.pst";
        }

        [Test, Description("Verify all calendar folders with correct hierarchy are migrated")]
        public void TC1_CheckCalendarFolders()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_CheckCalendarFolders");

            #region Test Case variables
            string rootFolderId = null;
            string rootCalFolderId = null;
            string calFolder10Id = null;
            string calFolder11Id = null;
            string calFolder12Id = null;
            string calFolder13Id = null;
            string calFolder15Id = null;

            #endregion

            #region SOAP Block

            // Get all calendar folders
            TargetAccount.sendSOAP("<GetFolderRequest xmlns='urn:zimbraMail' view='appointment'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetFolderResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='USER_ROOT']", "id", null, out rootFolderId, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Calendar']", "l", rootFolderId, null, 1); //verify Calendar is child of root folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Calendar']", "id", null, out rootCalFolderId, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder10']", "l", rootCalFolderId, null, 1); //verify Folder10 is child of Calendar folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder10']", "id", null, out calFolder10Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder11']", "l", calFolder10Id, null, 1); //verify Folder11 is child of Folder10 folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder11']", "id", null, out calFolder11Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder13']", "l", calFolder11Id, null, 1); //verify Folder13 is child of Folder11 folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder13']", "id", null, out calFolder13Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder12']", "l", rootCalFolderId, null, 1); //verify Folder12 is child of Calendar folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder12']", "id", null, out calFolder12Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder15']", "l", rootFolderId, null, 1); //verify Folder15 is child of root folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder15']", "id", null, out calFolder15Id, 1);

            #endregion

        }

        [Test, Description("Verify appointments in all calendar folders are migrated")]
        public void TC2_CheckCalendarFolderItems()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_CheckCalendarFolders");

            #region Test Case variables
            string calFolder10Id = null;
            string calFolder11Id = null;
            string calFolder12Id = null;
            string calFolder13Id = null;
            string calFolder15Id = null;

            #endregion

            #region SOAP Block

            // Get all calendar folders
            TargetAccount.sendSOAP("<GetFolderRequest xmlns='urn:zimbraMail' view='appointment'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetFolderResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder10']", "id", null, out calFolder10Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder11']", "id", null, out calFolder11Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder13']", "id", null, out calFolder13Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder12']", "id", null, out calFolder12Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder15']", "id", null, out calFolder15Id, 1);

            //Search Folder10 folder - should return two appointments
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query>inid:" + calFolder10Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt[1]", "name", "meeting3", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt[2]", "name", "appt15", null, 1);

            //Search Folder11 folder - should return 1 appointment
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query>inid:" + calFolder11Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "name", "appt17", null, 1);

            //Search Folder13 folder - should be empty
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query>inid:" + calFolder13Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 0);

            //Search Folder12 folder - should return 1 appointment
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query>inid:" + calFolder12Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "name", "appt18", null, 1);

            //Search Folder15 folder - should return 1 appointment
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query>inid:" + calFolder15Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "name", "appt3", null, 1);

            #endregion

        }

        [Test, Description("Verify a private meeting in Folder10 folder having category is migrated correctly")]
        public void TC3_Folder10_PrivateMtgWithCategory()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_Folder10_PrivateMtgWithCategory");

            #region Test Case variables
            string mtgSubject = "meeting3";
            string mtgContent = "Content3 Reminder – 1hr with private status and category category101";
            DateTime startTimeLocal = new DateTime(2012, 5, 30, 12, 0, 0);
            DateTime endTimeLocal = new DateTime(2012, 5, 30, 12, 30, 0);
            string attendee = "ma2";
            string attendeeRole = "REQ";
            string appointmentVisibility = "PRI"; //private appointment
            string location = "location3";
            string category = "category101";
            string calFolder10Id = null;
            string appointmentId = null;
            string messageId = null;

            #endregion

            #region SOAP Block

            // Get Folder10 id
            TargetAccount.sendSOAP("<GetFolderRequest xmlns='urn:zimbraMail' view='appointment'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetFolderResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Folder10']", "id", null, out calFolder10Id, 1);

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + mtgSubject + ") inid:" + calFolder10Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out messageId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + appointmentId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "isOrg", "1", null, 1); //migrated user is organizer
            TargetAccount.selectSOAP(m, "//mail:or", "a", TargetAccount.emailAddress, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "d", attendee, null, 1);
            TargetAccount.selectSOAP(m, "//mail:at", "role", attendeeRole, null, 1); //attendee role is Required
            TargetAccount.selectSOAP(m, "//mail:comp", "name", mtgSubject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "class", appointmentVisibility, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endTimeLocal.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, mtgContent, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1); //valid location
            TargetAccount.selectSOAP(m, "//mail:comp", "fb", "B", null, 1); //fb status of migrated user
            TargetAccount.selectSOAP(m, "//mail:at", "ptst", "NE", null, 1); //attendee participation status is NE

            TargetAccount.sendSOAP("<GetMsgRequest xmlns='urn:zimbraMail'>" + "<m id='" + messageId + "'/>" + "</GetMsgRequest>");

            m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "tn", category, null, 1); //valid category

            #endregion

        }

        [Test, Description("Verify a calendar folder with a backslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void TC4_FolderWithBackslash()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "calendar\\backslash";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a calendar folder with a forwardslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void TC5_FolderWithForwardslash()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "calendar_forwardslash";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a calendar folder with a asterisk in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void TC6_FolderWithAsterisk()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "calendar*asterisk";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

    }
}
