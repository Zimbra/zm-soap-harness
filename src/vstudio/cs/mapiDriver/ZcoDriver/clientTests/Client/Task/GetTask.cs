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

namespace clientTests.Client.Task
{
  public class GetTask : BaseTestFixture
    {
        [Test, Description("Verify task from ZCS syncs to ZCO")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Auth as syncuser in ZCS and add task",
            "2. ZCO: Sync",
            "3. ZCO: Verify task is synced to ZCO")]
        public void GetTask_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string location = "Location" + GlobalProperties.time() + GlobalProperties.counter();
            string taskPriority = "1";
            string taskStatus = "INPR";
            string percentComplete = "87";
            DateTime startDate = new DateTime(2012, 10, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId;
            #endregion

            #region SOAP Block: Auth as ZCO user in ZCS and add task
            zAccount.AccountZCO.sendSOAP(new CreateTaskRequest().
                                    Subject(subject).
                                    StartDate(startDate).
                                    DueDate(dueDate).
                                    Status(taskStatus).
                                    PercentComplete(percentComplete).
                                    Content(content).
                                    Priority(taskPriority).
                                    Location(location)
                                    );

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            #endregion

            #region Outlook Block: Verify task is synced and the attributes are correct

            OutlookCommands.Instance.Sync();

            RDOTaskItem rTaskItem = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTaskItem, "Verify that task exists in ZCO");
            zAssert.AreEqual(content, rTaskItem.Body.TrimEnd(), "Verify that the Content Matches");
            zAssert.AreEqual(startDate.ToUniversalTime().ToString("yyyyMMdd"), rTaskItem.StartDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the StartDate Matches");
            zAssert.AreEqual(dueDate.ToUniversalTime().ToString("yyyyMMdd"), rTaskItem.DueDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the DueDate Matches");
            zAssert.AreEqual((int)OlImportance.olImportanceHigh, rTaskItem.Importance, "Verify that the Priority Matches");
            zAssert.AreEqual( rdoTaskStatus.olTaskInProgress.ToString(), rTaskItem.Status.ToString(), "Verify that Status matches");
            zAssert.AreEqual(percentComplete, rTaskItem.PercentComplete.ToString(), "Verify that the Percent Complete Matches");

            //zAssert.AreEqual(location, ??, "Verify that the Location Matches");

            #endregion

        }
    }
}
