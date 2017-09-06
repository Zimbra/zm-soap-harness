using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Xml;
using Soap;
using Redemption;
using SoapWebClient;
using SyncHarness;
using Microsoft.Office.Interop.Outlook;
using System.Text.RegularExpressions;

namespace clientTests.Client.Task.Recurring
{
    public class RecurringTask : BaseTestFixture
    {
        [Test, Description("Verify recurring daily task is synced to server")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add a daily recurring task in ZCO", "Sync", "Verify task is present in ZCS and recurrence pattern is correct")]
        public void RecurringTask_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDateLocal = new DateTime(2010, 11, 25, 12, 0, 0);
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.StartDate = rTask.DueDate = startDateLocal;
            RDORecurrencePattern taskRecurrencePattern = rTask.GetRecurrencePattern();
            taskRecurrencePattern.Occurrences = 5;
            taskRecurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block 
            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:rule", "freq", "DAI", null, 1); // Zimbra Daily Recurrence = DAI
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:count", "num", Convert.ToString(taskRecurrencePattern.Occurrences), null, 1);

            #endregion

        }

        [Test, Description("verify recurring weekly task(every 2 weeks) with Exception is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add a weekly recurring task in ZCO", "Sync", "Auith as syncuser and verify task is present in ZCS and recurrence pattern is correct",
            "Create an exception in ZCO and sync", "Auth as sync user and verify the exception is synced correctly to ZCS")]
        //[Ignore("Exception to recurring Task not supported in ZCS")]
        public void RecurringTask_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDateLocal = new DateTime(2010, 11, 25, 12, 0, 0);
            string taskId;
            #endregion

            #region Outlook Block

            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;

            rTask.DueDate = rTask.StartDate = startDateLocal;
            rTask.Save();

            RDORecurrencePattern recurrencePattern = rTask.GetRecurrencePattern();
            recurrencePattern.PatternStartDate = startDateLocal;
            recurrencePattern.Occurrences = 6;
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursWeekly;
            recurrencePattern.Interval = 2;

            rTask.Save();
            OutlookCommands.Instance.Sync();

            RDOTaskItem rTaskItem = OutlookMailbox.Instance.findTask(subject);
            RDOTaskItem exTaskItem = (RDOTaskItem)rTaskItem.GetRecurrencePattern().GetOccurence(1);
            exTaskItem.DueDate = exTaskItem.StartDate = exTaskItem.StartDate.AddDays(1); //move instance ahead by 1 day

            exTaskItem.Save();
            rTask.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region Soap Block

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                CalExpandInst(startDateLocal.AddDays(-1), startDateLocal.AddMonths(4)).
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);
            //soapTest.select(soapResponseEnvelope, "//mail:SearchResponse/mail:task/mail:inst[@ex='1']", "invId", null, "taskex.invId", 1);
            //soapTest.select(soapResponseEnvelope, "//mail:inst", "s", (exTaskItem.StartDate - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString(), null, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:rule", "freq", "WEE", null, 1); // Zimbra Weekly Recurrence = WEE
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:count", "num", Convert.ToString(recurrencePattern.Occurrences), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:interval", "ival", Convert.ToString(recurrencePattern.Interval), null, 1);

            #endregion

        }
    }
}
