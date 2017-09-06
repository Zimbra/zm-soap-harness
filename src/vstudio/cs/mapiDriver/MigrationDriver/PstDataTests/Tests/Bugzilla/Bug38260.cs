using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug38260 : BaseTestFixture
    {
        public Bug38260()
        {

            this.PstFilename = "/Bugzilla/Reminder.pst";

        }

        [Test, Description("Verify that reminders are imported.")]
        [TestSteps(
            "1. Create a new domain and a user in it.",
            "2. use the PST Import tool to import the PST file.",
            "3. Verify that reminders of appointment are imported.")]
        public void Bug38260_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug38260_01");

            #region Testcase variables
            string subject = "With Reminder";
            string from = "user17@testdomain.com";
            string apptId = null;
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='appointment' calExpandInstStart='1451042215000' calExpandInstEnd='1453720615000'>"
                + "<query>subject:(" + subject + ")</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id" , null, out apptId, 1);

            TargetAccount.sendSOAP(
                "<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + apptId + "'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt/mail:inv", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:alarm", "action", "DISPLAY", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:alarm/mail:trigger/mail:rel", "h", "1", null, 1);
        }

    }
}