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
    public class TaskAction : BaseTestFixture
    {
        [Test, Description("Verify a task action (op=addTag) is synced to ZCO")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as syncuser in ZCS and add a task", "Sync", "Verify task is present in ZCO",
            "Tag the task in ZCS and Sync", "Verify that task is tagged in ZCO")]
        [BugAttribute("30471")]
        public void TaskAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string taskId, tagId;
            #endregion

            #region Soap Block
            zAccount.AccountZCO.sendSOAP(new CreateTaskRequest().Subject(subject));

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            #endregion

            #region Outlook region
            OutlookCommands.Instance.Sync();
            RDOTaskItem rTask = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTask, "Verify that the task exists");
            #endregion

            #region SOAP Block

            // Add a tag
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);

            // Apply "Tag" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(taskId, ItemActionRequest.ActionOperation.tag, tagId));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();
            rTask = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTask, "Verify that task exists in ZCO");
            zAssert.AreEqual(tagName, rTask.Categories, "Verify that the Task is Tagged");

            #endregion              

        }

        [Test, Description("Verify a task action (op=delete) is synced to ZCO")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as syncuser in ZCS and add a task", "Sync", "Verify task is present in ZCO",
            "Delete (Hard Delete) the task in ZCS and Sync", "Verify that task is deleted in ZCO")]
        [BugAttribute("30471")]
        public void TaskAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string taskId;
            #endregion

            #region Soap Block
            zAccount.AccountZCO.sendSOAP(new CreateTaskRequest().Subject(subject));

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            #endregion

            #region Outlook region
            OutlookCommands.Instance.Sync();
            RDOTaskItem rTask = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTask, "Verify that the task exists");
            #endregion

            #region SOAP Block

            // Apply "Delete" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(taskId, ItemActionRequest.ActionOperation.delete));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();
            rTask = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNull(rTask, "Verify that task is deleted in ZCO");

            #endregion
        }

        [Test, Description("Verify a task action (op=trash) is synced to ZCO")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as syncuser in ZCS and add a task", "Sync", "Verify task is present in ZCO",
            "Delete (Move to Trash) the task in ZCS and Sync", "Verify that task is moved to trash in ZCO")]
        [BugAttribute("30471")]
        public void TaskAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string taskId;
            #endregion

            #region Soap Block
            zAccount.AccountZCO.sendSOAP(new CreateTaskRequest().Subject(subject));

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            #endregion

            #region Outlook region
            OutlookCommands.Instance.Sync();
            RDOTaskItem rTask = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTask, "Verify that the task exists");
            #endregion

            #region SOAP Block

            // Apply "Delete" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().SetAction(taskId, ItemActionRequest.ActionOperation.trash));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region Outlook region
            OutlookCommands.Instance.Sync();
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            rTask = OutlookMailbox.Instance.findTask(subject, trash, true);
            zAssert.IsNotNull(rTask, "Verify that the task exists");
            #endregion
        }

        [Test, Description("Verify a task action (op=move) is synced to ZCO")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as syncuser in ZCS and add a task", "Sync", "Verify task is present in ZCO",
            "Move the task to new folder in ZCS and Sync", "Verify that task is moved to this new folder in ZCO")]
        [BugAttribute("30471")]
        public void TaskAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string taskId, taskFolderId, folderId;
            #endregion

            #region Soap Block
            zAccount.AccountZCO.sendSOAP(new CreateTaskRequest().Subject(subject));

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            #endregion

            #region Outlook region
            OutlookCommands.Instance.Sync();
            RDOTaskItem rTask = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTask, "Verify that the task exists");
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out taskFolderId, 1);

            // Create the subfolder
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().
                                         AddFolder(new FolderObject().
                                         SetParent(taskFolderId).
                                         SetName(folderName)));

            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            // Apply "MOVE" operation to the new message
            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                SetAction(taskId, ItemActionRequest.ActionOperation.move, folderId));

            zAccount.AccountZCO.selectSOAP("//mail:ItemActionResponse", null, null, null, 1);

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOFolder taskFolder = OutlookMailbox.Instance.findFolder(folderName);
            rTask = OutlookMailbox.Instance.findTask(subject, taskFolder, true);
            zAssert.IsNotNull(rTask, "verify that the task is found");
            #endregion

        }

        [Test, Description("Verify a ZCO task action (Tag) is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add a task in ZCO", "Sync", "Auth as syncuser in ZCS and verify task is present in ZCS",
           "Tag the task in ZCO and Sync", "Auth as syncuser in ZCS and verify that task is tagged in ZCS")]
        public void TaskAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDateLocal = new DateTime(2010, 11, 25, 12, 0, 0);
            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string taskId, tagId;
            #endregion

            #region soap
            //create tag in ZCS
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);
            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region soap

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            // verify that there are no items associated with the tag
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("tag:(" + tagName + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse[@more=0]", null, null, null, 1); 

            #endregion

            #region Outlook Block
            rTask.Categories = tagName;
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region soap
            
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:m", "t", tagId, null, 1);

            #endregion
        }

        [Test, Description("Verify a task action (hard delete) is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add a task in ZCO", "Sync", "Auth as syncuser in ZCS and verify task is present in ZCS",
           "Delete (Hard Delete) the task in ZCO and Sync", "Auth as syncuser in ZCS and verify that task is deleted in ZCS")]
        public void TaskAction_06()
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
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region soap

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "id", null, out taskId, 1);

            #endregion

            #region outlook
            rTask = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTask, "Verify that task exists in ZCO");
            rTask.Delete(redDeleteFlags.dfSoftDelete);
            OutlookCommands.Instance.Sync();
            #endregion

            #region soap
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));
            zAccount.AccountZCO.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_MSG", null, 1);

            #endregion
        }

        [Test, Description("Verify a task action (move to trash) is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add a task in ZCO", "Sync", "Auth as syncuser in ZCS and verify task is present in ZCS",
          "Delete (Move to Trash) the task in ZCO and Sync", "Auth as syncuser in ZCS and verify that task is moved to trash in ZCS")]
        public void TaskAction_07()
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
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region soap

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "id", null, out taskId, 1);

            #endregion

            #region Outlook Block
            rTask.Delete(redDeleteFlags.dfMoveToDeletedItems);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("task").
                Query("in:" + GlobalProperties.getProperty("globals.trash") + " subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "l", "3", null, 1);
            #endregion
        }

        [Test, Description("Verify a task action (move to folder) is synced to server")]
        [Category("Task")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add a task in ZCO", "Sync", "Auth as syncuser in ZCS and verify task is present in ZCS",
          "Move the task to new folder in ZCO and Sync", "Auth as syncuser in ZCS and verify that task is moved to this new folder in ZCS")]
        public void TaskAction_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDateLocal = new DateTime(2010, 11, 25, 12, 0, 0);
            string taskId, taskFolderId, folderId;
            #endregion

            #region soap

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.tasks") + "']", "id", null, out taskFolderId, 1);

            // Create the subfolder
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().
                                         AddFolder(new FolderObject().
                                         SetParent(taskFolderId).
                                         SetName(folderName)));

            zAccount.AccountZCO.selectSOAP("//mail:folder", "id", null, out folderId, 1);

            #endregion

            #region Outlook Block
            RDOTaskItem rTask = OutlookMailbox.Instance.CreateTask();
            rTask.Subject = subject;
            rTask.Body = content;
            rTask.StartDate = startDateLocal;
            rTask.DueDate = startDateLocal.AddDays(1);
            rTask.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region soap

            // Search for the task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            #endregion

            #region outlook

            RDOFolder taskFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks); 
            zAssert.IsNotNull(taskFolder, "Check that the task folder exists");

            RDOFolder folder = null;

            //Search for subfolders
            foreach (RDOFolder f in taskFolder.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for folders " + folderName);

                if (f.Name.Equals(folderName))
                {
                    folder = f;
                }
            }

            // move task to subfolder
            zAssert.IsNotNull(rTask.Move(folder), "Check that the message is moved to " + folder.Name);

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "l", folderId, null, 1);
            #endregion
        }

    }
}