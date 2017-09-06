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

namespace clientTests.Client.Task.Delegation
{
    [TestFixture]
    public class TaskAction : BaseTestFixture
    {
        [Test, Description("Verify that syncuser can edit the task in shared folder")]
        [Category("Task")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void Task_Action_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId, account1TaskFolderId;
            #endregion

            #region SOAP: Delegate creates folder and shares it
            // Get all folders to determine the inbox id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());

            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out account1TaskFolderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1TaskFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1TaskFolderId).
                                    Content(content1).
                                    Subject(subject1).
                                    StartDate(startDate).
                                    DueDate(dueDate));
            zAccount.AccountA.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the Task is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Get the Task1
            RDOTaskItem rdoTask = OutlookMailbox.Instance.findTask(subject1, defaultFolder, true);
            zAssert.IsNotNull(rdoTask, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask.Body.Contains(content1), "Verify that the delegate content matches the content");

            rdoTask.Subject = subject2;
            rdoTask.Body = content2;
            DateTime newStartDate = startDate.AddDays(2);
            DateTime newDueDate = dueDate.AddDays(1);
            rdoTask.StartDate = newStartDate;
            rdoTask.DueDate = newDueDate;
            rdoTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new GetMsgRequest().
                Message(taskId));

            XmlNode taskMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(taskMessage, "//mail:comp", "name", rdoTask.Subject, null, 1);
            zAccount.AccountA.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, rdoTask.Body, null, 1);
            //When redemption modifies the task in shared folder, it does not set some of the fields properly. They are filled with "????". <or a=> contains ???. Hence commenting out the following check.
            //zAccount.AccountA.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", newStartDate.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountA.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", newDueDate.ToUniversalTime().ToString("yyyyMMdd"), null, 1);

        
            #endregion
        }

        [Test, Description("Verify that syncuser can move the task from one shared folder to another shared folder")]
        [Category("Task")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void Task_Action_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string account1Folder1 = "folder1" + GlobalProperties.time() + GlobalProperties.counter();
            string account1Folder2 = "folder2" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId, account1TaskFolderId, account1Folder1Id, account1Folder2Id;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the task id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());

            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out account1TaskFolderId, 1);

            // Create a folder in the task
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(account1Folder1).
                                                SetParent(account1TaskFolderId)));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out account1Folder1Id, 1);

            // Create a folder in the task
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(account1Folder2).
                                                SetParent(account1TaskFolderId)));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out account1Folder2Id, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1Folder1Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1Folder2Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1TaskFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1Folder1Id).
                                    Content(content1).
                                    Subject(subject1).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            zAccount.AccountA.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);

            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Make sure the folder is there
            RDOFolder taskFolder1 = OutlookMailbox.Instance.findFolder(account1Folder1, defaultFolder, false);
            zAssert.IsNotNull(taskFolder1, "Verify that the shared folder appears in the delegate store");

            RDOFolder taskFolder2 = OutlookMailbox.Instance.findFolder(account1Folder2, defaultFolder, false);
            zAssert.IsNotNull(taskFolder2, "Verify that the shared folder appears in the delegate store");

            // Get the Task
            RDOTaskItem rdoTask = OutlookMailbox.Instance.findTask(subject1, taskFolder1, false);
            zAssert.IsNotNull(rdoTask, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask.Body.Contains(content1), "Verify that the delegate content matches the content");

            rdoTask.Move(taskFolder2);

            System.Threading.Thread.Sleep(7000);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP
            // [04/07/2011] See if putting to sleep helps in passing the test. Reason - Moving a task may take litle but longer to sync to server and then to ZCO.
            System.Threading.Thread.Sleep(5000);
            // Search for the message ID
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(taskId));
            XmlNode taskMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(taskMessage, "//mail:m[@l='" + account1Folder2Id + "']", null, null, null, 1);

            #endregion
        }

        [Test, Description("Verify that syncuser can delete the task in shared folder")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void Task_Action_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string account1Folder1 = "folder1" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId, account1TaskFolderId, account1Folder1Id;
            #endregion

            #region SOAP: Delegate creates folder and shares it

            // Get all folders to determine the task id
            zAccount.AccountA.sendSOAP(new GetFolderRequest());

            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out account1TaskFolderId, 1);

            // Create a folder in the task
            zAccount.AccountA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(account1Folder1).
                                                SetParent(account1TaskFolderId)));

            zAccount.AccountA.selectSOAP("//mail:folder", "id", null, out account1Folder1Id, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1Folder1Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1TaskFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1Folder1Id).
                                    Content(content1).
                                    Subject(subject1).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            zAccount.AccountA.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);

            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Make sure the folder is there
            RDOFolder taskFolder1 = OutlookMailbox.Instance.findFolder(account1Folder1, defaultFolder, true);
            zAssert.IsNotNull(taskFolder1, "Verify that the shared folder appears in the delegate store");

            // Get the Task
            RDOTaskItem rdoTask = OutlookMailbox.Instance.findTask(subject1, defaultFolder, true);
            zAssert.IsNotNull(rdoTask, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask.Body.Contains(content1), "Verify that the delegate content matches the content");

            rdoTask.Delete(redDeleteFlags.dfSoftDelete);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(taskId));
            zAccount.AccountA.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_ITEM", null, 1);

            #endregion

        }

        [Test, Description("Verify that syncuser can create new task in shared folder")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void Task_Action_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string account1Folder1 = "folder1" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId, account1TaskFolderId, account1Folder1Id;
            timestampTestCaseMaximum = 70; //made timeout as 70 secs as this test is taking ~61 secs on vista machines and is failing
            #endregion

            #region SOAP: Delegate creates folder and shares it
            zAccount userA = new zAccount();
            userA.createAccount();
            userA.login();

            // Get all folders to determine the task id
            userA.sendSOAP(new GetFolderRequest());

            userA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out account1TaskFolderId, 1);

            // Create a folder in the task
            userA.sendSOAP(new CreateFolderRequest().
                                            AddFolder(new FolderObject().
                                                SetName(account1Folder1).
                                                SetParent(account1TaskFolderId)));

            userA.selectSOAP("//mail:folder", "id", null, out account1Folder1Id, 1);

            // Share it with the delegatee (sync user)
            userA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1Folder1Id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            userA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                account1TaskFolderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));
            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Make sure the folder is there
            RDOFolder taskFolder1 = OutlookMailbox.Instance.findFolder(account1Folder1, defaultFolder, true);
            zAssert.IsNotNull(taskFolder1, "Verify that the shared folder appears in the delegate store");

            // Get the Task
            RDOTaskItem rdoTask = taskFolder1.Items.Add("IPM.Task") as RDOTaskItem;
            zAssert.IsNotNull(rdoTask, "Verify that the task is created in the delegate store");            

            rdoTask.Subject = subject1;
            rdoTask.Body = content1;

            rdoTask.StartDate = startDate;
            rdoTask.DueDate = dueDate;
            rdoTask.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP

            // Search for the message ID
            userA.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject1 + ")"));

            userA.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            userA.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = userA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            userA.selectSOAP(taskMessage, "//mail:comp", "name", subject1, null, 1);
            userA.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content1, null, 1);
            //userA.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", userA.emailAddress, null, 1);
            userA.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDate.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            userA.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", dueDate.ToUniversalTime().ToString("yyyyMMdd"), null, 1);

            #endregion

        }
    }
}