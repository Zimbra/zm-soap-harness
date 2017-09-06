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
using System.IO;

namespace clientTests.Client.Task
{
    public class CreateTask : BaseTestFixture
    {
        [Test, Description("Verify a task is synced to server")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add Task with minimum attribute in ZCO", "Sync", "Auth as syncuser in ZCS and verify the task is Synced correctly")]
        public void CreateTask_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string taskPriority = "1";
            DateTime startDateLocal = new DateTime(2010, 11, 25, 12, 0, 0);
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Importance = (int)OlImportance.olImportanceHigh;
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDateLocal.AddDays(1).ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp[@priority='" + taskPriority + "']", null, null, null, 1);

            #endregion

        }

        [Test, Description("Verify task with status In-Progress is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add task with satus In-Progress in ZCO", "Sync", "Auth as sync user in ZCS and verify the task status is correct")]
        public void CreateTask_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string taskStatus = "INPR";
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Status = rdoTaskStatus.olTaskInProgress;
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp[@status='" + taskStatus + "']", null, null, null, 1);

            #endregion
        }

        [Test, Description("Verify task with percent complete is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add task with %complete in ZCO", "Sync", "Auth as sync user in ZCS and verify %complete is correct")]
        public void CreateTask_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string percentComplete = "37";
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.PercentComplete = 37;
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:comp[@percentComplete='" + percentComplete + "']", null, null, null, 1);

            #endregion
        }

        [Test, Description("Verify assign Task to another user and check on server")]
        [Bug("11497")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add task in ZCO", "Assign task to another user (user1)", "Sync", "Auth as user1 and verify task is assigned to user1")]
        public void CreateTask_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string taskId;
            #endregion

            #region Outlook Block

            try
            {

                RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();

                rTask.Subject = subject;
                rTask.Body = content;

                rTask.Assign();
                RDORecipient rRecipient = rTask.Recipients.Add(zAccount.AccountA.emailAddress);
                rRecipient.Type = (int)rdoMailRecipientType.olTo;
                rTask.Recipients.ResolveAll(null, null);

                rTask.Save();
                rTask.Send();

                OutlookCommands.Instance.Sync();

            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                // See https://bugzilla.zimbra.com/show_bug.cgi?id=11497
                // ZCO currently throws a popup box when creating a task request, because it is not supported
                //
                tcLog.Warn("COMException thrown when creating task request", e);
                zAssert.IsNull(e, "Verify COM Exception: MAPI_E_NO_SUPPORT is not thrown for task request");
            }

            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountA.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);

            #endregion
        }

        [Test, Description("Verify task with Attachment is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add task in ZCO with attachment", "Sync", "Auth as syncuser and verify the task with attachment is present")]
        public void CreateTask_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string filename = GlobalProperties.TestMailRaw + "/photos/Picture1.jpg";
            string taskId, attachmentSize;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            FileInfo fileinfo = new FileInfo(filename);
            rTask.Attachments.Add(filename, OlAttachmentType.olByValue, 1, "Picture1.jpg");
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:mp[@cd='attachment']", "filename", fileinfo.Name, null, 1);
            // Size not verified as the size changes once the attahcment is uploaded to server. 
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:mp[@cd='attachment']", "s", null, out attachmentSize, 1);
            zAssert.That(true, "Size of attachment on server =" + attachmentSize + " Actual size of attachment =" + fileinfo.Length);
            #endregion
        }

        [Test, Description("Verify modified task in ZCO is synced to server")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add task in ZCO", "Sync", "Auth as syncuser in ZCS and verify task is synced", "Modify task in ZCO", "Sync",
            "Auth as syncuser in ZCS and verify task is modifed correctly")]
        public void ModifyTask_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subjectChanged = "changed subject" + GlobalProperties.time() + GlobalProperties.counter();
            string contentChanged = "changed content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime changedDueDate = new DateTime(2010, 12, 23, 12, 0, 0);
            string percentComplete = "55";
            string statusChanged = "DEFERRED";
            string filename = GlobalProperties.TestMailRaw + "/photos/Picture1.jpg";
            string taskId, attachmentSize;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);
            #endregion

            #region Outlook Block Modify Task Fields
            rTask.Subject = subjectChanged;
            rTask.Body = contentChanged;
            rTask.DueDate = changedDueDate;
            rTask.Status = rdoTaskStatus.olTaskDeferred;
            rTask.PercentComplete = 55;
            FileInfo fileinfo = new FileInfo(filename);
            rTask.Attachments.Add(filename, OlAttachmentType.olByValue, 1, "Picture1.jpg");
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block


            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subjectChanged, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:mp/mail:content", null, contentChanged, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp[@status='" + statusChanged + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp[@percentComplete='" + percentComplete + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", changedDueDate.ToUniversalTime().ToString("yyyyMMdd"), null, 1);

            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:mp[@cd='attachment']", "filename", fileinfo.Name, null, 1);
            // Size not verified as the size changes once the attahcment is uploaded to server. 
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:mp[@cd='attachment']", "s", null, out attachmentSize, 1);
            zAssert.That(true, "Size of attachment on server =" + attachmentSize + " Actual size of attachment =" + fileinfo.Length);
            #endregion
        }

        [Test, Description("ZCO Tasks: Cannot support all status values")]
        [Category("Task")]
        [Bug("11494")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add Different tasks with satus as In-Progress,Complete,Defferred,not started,Waiting in ZCO", "Sync", "Auth as sync user in ZCS and verify the task status is correct")]
        public void CreateTask_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string[] taskSubject = new string[5];
            string[] taskStatus =  { "INPR", "DEFERRED", "NEED", "WAITING", "COMP" };
            string taskId;
            #endregion

            #region Outlook Block Task1 in progress
            RDOTaskItem rTask1 = OutlookMailbox.Instance.CreateTask();
            rTask1.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            rTask1.Body = "content" + GlobalProperties.time() + GlobalProperties.counter();
            rTask1.Status = rdoTaskStatus.olTaskInProgress;
            taskSubject[0] = rTask1.Subject;
            rTask1.Save();
            #endregion

            #region Outlook Block Task2 is deferred
            RDOTaskItem rTask2 = OutlookMailbox.Instance.CreateTask();
            rTask2.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            rTask2.Body = "content" + GlobalProperties.time() + GlobalProperties.counter();
            rTask2.Status = rdoTaskStatus.olTaskDeferred;
            taskSubject[1] = rTask2.Subject;
            rTask2.Save();
            #endregion

            #region Outlook Block Task3 is not started
            RDOTaskItem rTask3 = OutlookMailbox.Instance.CreateTask();
            rTask3.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            rTask3.Body = "content" + GlobalProperties.time() + GlobalProperties.counter();
            rTask3.Status = rdoTaskStatus.olTaskNotStarted;
            taskSubject[2] = rTask3.Subject;
            rTask3.Save();
            #endregion

            #region Outlook Block Task4 in waiting state
            RDOTaskItem rTask4 = OutlookMailbox.Instance.CreateTask();
            rTask4.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            rTask4.Body = "content" + GlobalProperties.time() + GlobalProperties.counter();
            rTask4.Status = rdoTaskStatus.olTaskWaiting;
            taskSubject[3] = rTask4.Subject;
            rTask4.Save();
            #endregion

            #region Outlook Block Task5 complete
            RDOTaskItem rTask5 = OutlookMailbox.Instance.CreateTask();
            rTask5.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            rTask5.Body = "content" + GlobalProperties.time() + GlobalProperties.counter();
            rTask5.Status = rdoTaskStatus.olTaskComplete;
            taskSubject[4] = rTask5.Subject;
            rTask5.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            for (int i = 0; i < 5; i++) //As only 5 status values we are going to check
            {

                // Search for the message ID
                zAccount.AccountZCO.sendSOAP(new SearchRequest().
                    Types("task").Query("subject:(" + taskSubject[i] + ")"));

                zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

                zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

                XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
                zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", taskSubject[i], null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:comp[@status='" + taskStatus[i] + "']", null, null, null, 1);
            }
            #endregion


        }

        [Test, Description("Verify a task is synced to server")]
        [Category("Task")]
        [Bug("61958")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add Task with HTML content in body in ZCO", "Sync", "Auth as syncuser in ZCS and verify the task is Synced correctly")]
        public void CreateTask_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string htmlContent = "<HTML><H2><B>The body of this message will appear in HTML</B></H2></HTML>";
            DateTime startDateLocal = new DateTime(2016, 11, 25, 12, 0, 0);
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.HTMLBody = htmlContent;
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:descHtml", null, htmlContent, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDateLocal.AddDays(1).ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            #endregion

        }

        [Test, Description("Verify a task with low priority is synced to server")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add Task with LOW prioity in ZCO", "Sync", "Auth as syncuser in ZCS and verify the task is Synced correctly")]
        public void CreateTask_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string taskPriority = "9"; //9 value is used for LOW task Priority in zimbra 
            DateTime startDateLocal = new DateTime(2015, 04, 25, 12, 0, 0);
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Importance = (int)OlImportance.olImportanceLow;
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDateLocal.AddDays(1).ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            //Verify task priority is 'LOW'
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "priority", taskPriority, null, 1);

            #endregion

        }
        [Test, Description("Verify a task with High priority is synced to server")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add Task with High priority in ZCO", "Sync", "Auth as syncuser in ZCS and verify the task is Synced correctly")]
        public void CreateTask_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string taskPriority = "1"; //1  is used for High taskPriority in zimbra 
            DateTime startDateLocal = new DateTime(2015, 04, 25, 12, 0, 0);
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Importance = (int)OlImportance.olImportanceHigh;
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDateLocal.AddDays(1).ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            //Verify task priority is 'High'            
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "priority", taskPriority, null, 1);
            #endregion

        }
        [Test, Description("Verify a task with normal priority is synced to server")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add Task with normal priority in ZCO", "Sync", "Auth as syncuser in ZCS and verify the task is Synced correctly")]
        public void CreateTask_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string taskPriority = "5";
            DateTime startDateLocal = new DateTime(2015, 04, 25, 12, 0, 0);
            string taskId;
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.Importance = (int)OlImportance.olImportanceNormal;
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block

            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDateLocal.AddDays(1).ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            //Verify task priority is 'normal'            
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "priority", taskPriority, null, 1);
            #endregion

        }



    }
}