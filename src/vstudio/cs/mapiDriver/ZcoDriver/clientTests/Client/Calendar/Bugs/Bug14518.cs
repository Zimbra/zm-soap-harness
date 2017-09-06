using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.Bugs
{
    [TestFixture]
    public class Bug14518 : BaseTestFixture
    {

        [Test, Description("Verify monthly recurring meetings from Google calendar show MIME in the body")]
        [Category("SMOKE")]
        [Category("Calendar")]
        [Bug("14518")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void LmtpMime_01()
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
    }
}
