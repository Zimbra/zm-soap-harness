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
    public class GetTask : BaseTestFixture
    {
        [Test, Description("Verify ZCO can open other users task folder")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add task", "Share the task folder with syncuser", "Sync", "Open the shared task folder in ZCO",
            "Verify the shared task folder can be mounted and task is visible")]
        public void OpenTask_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
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
                                                FolderActionRequest.rightsZcoReviewer));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1TaskFolderId).
                                    Content(content).
                                    Subject(subject).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            zAccount.AccountA.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);

            #endregion

            #region ZCO

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the Task is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Get the Task
            RDOTaskItem rdoTask = OutlookMailbox.Instance.findTask(subject, defaultFolder, true);
            zAssert.IsNotNull(rdoTask, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask.Body.Contains(content), "Verify that the delegate content matches the content");

            #endregion
        }

        [Test, Description("Verify ZCO can not delete/edit/insert/move tasks when shared as readonly (r) (rights=rightsZcoReviewer)")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add task", "Share the task folder with syncuser", "Sync", "Verify ZCO can not delete/edit/insert/move tasks from shared task folder")]
        public void OpenTask_Basic_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string account1TaskFolderId;
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
                                                FolderActionRequest.rightsZcoReviewer));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1TaskFolderId).
                                    Content(content1).
                                    Subject(subject1).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1TaskFolderId).
                                    Content(content2).
                                    Subject(subject2).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            #endregion

            #region Outlook Block 
            RDOTaskItem zcoTask = OutlookMailbox.Instance.CreateTask();
            zcoTask.Subject = subject3;
            zcoTask.StartDate = startDate;
            zcoTask.DueDate = dueDate;
            zcoTask.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the Task is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Get the Task1
            RDOTaskItem rdoTask1 = OutlookMailbox.Instance.findTask(subject1, defaultFolder, true);
            zAssert.IsNotNull(rdoTask1, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask1.Body.Contains(content1), "Verify that the delegate content matches the content");

            // Get the Task2
            RDOTaskItem rdoTask2 = OutlookMailbox.Instance.findTask(subject2, defaultFolder, true);
            zAssert.IsNotNull(rdoTask2, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask2.Body.Contains(content2), "Verify that the delegate content matches the content");

            #endregion

            #region verification

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                zcoTask.CopyTo(defaultFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to copy the task to shared folder");

            //Insert
            u = null;
            try
            {
                RDOTaskItem newTask = defaultFolder.Items.Add("IPM.Task") as RDOTaskItem;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to create new task in shared folder");

            //Edit
            u = null;
            try
            {
                rdoTask1.Subject = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoTask1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to edit task from shared folder");

            //Move
            u = null;
            try
            {
                RDOFolder tasks = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
                rdoTask1.Move(tasks);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to move task from shared folder");

            //Delete
            u = null;
            try
            {
                rdoTask2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to delete task from shared folder");

            #endregion            
        }

        [Test, Description("Verify ZCO can not delete/insert/move tasks when shared as readonly (rw) (rights=rightsZcodelegate)")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auht as user1 in ZCS and add task", "Share the task folder with syncuser", "Sync", "Verify ZCO can delete/insert/move tasks from shared task folder")]
        public void OpenTask_Basic_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string account1TaskFolderId;
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
                                                FolderActionRequest.rightsZcoDelegate));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1TaskFolderId).
                                    Content(content1).
                                    Subject(subject1).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1TaskFolderId).
                                    Content(content2).
                                    Subject(subject2).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            #endregion

            #region Outlook Block
            RDOTaskItem zcoTask = OutlookMailbox.Instance.CreateTask();
            zcoTask.Subject = subject3;
            zcoTask.StartDate = startDate;
            zcoTask.DueDate = dueDate;
            zcoTask.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the Task is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Get the Task1
            RDOTaskItem rdoTask1 = OutlookMailbox.Instance.findTask(subject1, defaultFolder, true);
            zAssert.IsNotNull(rdoTask1, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask1.Body.Contains(content1), "Verify that the delegate content matches the content");

            // Get the Task2
            RDOTaskItem rdoTask2 = OutlookMailbox.Instance.findTask(subject2, defaultFolder, true);
            zAssert.IsNotNull(rdoTask2, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask2.Body.Contains(content2), "Verify that the delegate content matches the content");

            #endregion

            #region verification

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                zcoTask.CopyTo(defaultFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to copy the task to shared folder");

            //Insert
            u = null;
            try
            {
                RDOTaskItem newTask = defaultFolder.Items.Add("IPM.Task") as RDOTaskItem;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to create new task in shared folder");

            //Edit
            u = null;
            try
            {
                rdoTask1.Subject = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoTask1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that task can be edited in shared folder");

            //Move
            u = null;
            try
            {
                RDOFolder tasks = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
                rdoTask1.Move(tasks);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to move task from shared folder");

            //Delete
            u = null;
            try
            {
                rdoTask2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to delete task from shared folder");

            #endregion
        }

        [Test, Description("Verify ZCO delete/edit/insert/move is allowed tasks when shared as readonly (rwid) (rights=rightsZcoAdministrator)")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auht as user1 in ZCS and add task", "Share the task folder with syncuser", "Sync", "Verify ZCO can delete/edit/insert/move tasks from shared task folder")]
        public void OpenTask_Basic_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string account1TaskFolderId;
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

            zAccount.AccountA.sendSOAP(new CreateTaskRequest().
                                    SetParent(account1TaskFolderId).
                                    Content(content2).
                                    Subject(subject2).
                                    StartDate(startDate).
                                    DueDate(dueDate));

            #endregion

            #region Outlook Block
            RDOTaskItem zcoTask = OutlookMailbox.Instance.CreateTask();
            zcoTask.Subject = subject3;
            zcoTask.StartDate = startDate;
            zcoTask.DueDate = dueDate;
            zcoTask.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);

            // Make sure the Task is there
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");

            // Make sure the folder is there
            RDOFolder defaultFolder = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(defaultFolder, "Verify that the shared folder appears in the delegate store");

            // Get the Task1
            RDOTaskItem rdoTask1 = OutlookMailbox.Instance.findTask(subject1, defaultFolder, true);
            zAssert.IsNotNull(rdoTask1, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask1.Body.Contains(content1), "Verify that the delegate content matches the content");

            // Get the Task2
            RDOTaskItem rdoTask2 = OutlookMailbox.Instance.findTask(subject2, defaultFolder, true);
            zAssert.IsNotNull(rdoTask2, "Verify that the shared task exists in the delegate store");
            zAssert.IsNotNull(rdoTask2.Body.Contains(content2), "Verify that the delegate content matches the content");

            #endregion

            #region verification

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                zcoTask.CopyTo(defaultFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to copy the task to shared folder");

            //Insert
            u = null;
            try
            {
                RDOTaskItem newTask = defaultFolder.Items.Add("IPM.Task") as RDOTaskItem;
                newTask.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to create new task in shared folder");

            //Edit
            u = null;
            try
            {
                rdoTask1.Subject = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoTask1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that task can be edited in shared folder");

            //Move
            u = null;
            try
            {
                RDOFolder tasks = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
                rdoTask1.Move(tasks);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to move task from shared folder");

            //Delete
            u = null;
            try
            {
                rdoTask2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to delete task from shared folder");

            #endregion

        }
    }
}