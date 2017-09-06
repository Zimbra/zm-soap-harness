using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Calendar
{
    public class CalendarFolders : BaseTestFixture
    {
        public CalendarFolders()
        {
            this.PstFilename = "/general/calendar/pstimport2_calendar.pst";
        }

        [Test, Description("Import a PST file having calendar folders - 1. SubCalendar1 containing appt/meeting and 2. SubCalendar2 with no appt/meeting")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported appointment",
          "5. Check the presence of calendar folders, SubCalendar1 folder has appt/meeting and SubCalendar2 is empty")]
        public void TC1_CheckCalendarFolders()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_CheckCalendarFolders");

            #region Test Case variables
            string rootCalFolderId = null;
            string calFolder1Id = null;
            string calFolder2Id = null;

            #endregion

            #region SOAP Block

            // Get all folders
            TargetAccount.sendSOAP("<GetFolderRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetFolderResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='Calendar']", "id", null, out rootCalFolderId, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='SubCalendar1']", "l", rootCalFolderId, null, 1); //verify SubCalendar1 is child of Calendar folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='SubCalendar2']", "l", rootCalFolderId, null, 1); //verify SubCalendar2 is child of Calendar folder
            TargetAccount.selectSOAP(m, "//mail:folder[@name='SubCalendar1']", "id", null, out calFolder1Id, 1);
            TargetAccount.selectSOAP(m, "//mail:folder[@name='SubCalendar2']", "id", null, out calFolder2Id, 1);

            //Search SubCalendar1 folder should return two appointments
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query>inid:" + calFolder1Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt[1]", "name", "SubCalendar1_MeetingRequest", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt[2]", "name", "Subcalendar1_appointment1", null, 1);

            //Search SubCalendar2 folder should return no records - Empty folder
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query>inid:" + calFolder2Id + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", null, null, null, 0);

            #endregion
        }

    }
}
