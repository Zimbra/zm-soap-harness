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

namespace clientTests.Client.Task.Bugs
{
    public class TaskBugs : BaseTestFixture
    {
        [Test, Description("Bug 18484: ZCO sync duplicates tasks")]
        [Category("Task")]
        [Bug("18484")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Add a daily recurring task in ZCO", "Sync", "Verify task is present in ZCS and recurrence pattern is correct", "Modify the task to change the recurance to 4", "Sync", "Verify the task sync correctly in ZWC")]
        public void TaskBugs_18484()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDateLocal = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
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

            #region Soap Block

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
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:count", "num", "5", null, 1);

            #endregion

            #region Outlook Block: Modify the task to change Taskstatus to COMPLETED

            OutlookCommands.Instance.Sync();

            taskRecurrencePattern.Occurrences = 4;
            taskRecurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            rTask.Save();

            OutlookCommands.Instance.Sync();

            #endregion

            #region Verify the Task is been updated on ZWC side and Task is not duplicated.

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:s", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:e", "d", startDateLocal.ToUniversalTime().ToString("yyyyMMdd"), null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:rule", "freq", "DAI", null, 1); // Zimbra Daily Recurrence = DAI
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:count", "num", "4", null, 1);

            #endregion
        }

        [Test, Description("Bug 17613: Tasks don't sync with FILE --> IMPORT")]
        [Category("Task")]
        [Bug("17613")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: File -> Import a PST file with a few tasks",
            "2. ZCO: Verify that the TASK items are imported from the PST to the Sync User's Profile",
            "3. ZCO: Sync",
            "4. SOAP: Verify that the TASK items are synced to the ZCS")]
        //[Ignore("AddPstStore seems to hang intermittently.  Need to resolve this issue!")]
        public void TaskBugs_17613()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "TaskBugs17613_Subject";
            string content = "TaskBugs17613_Content";
            DateTime startDateLocal = new DateTime(2010, 11, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId;
            string PSTFileName;
            // Original PST File
            string PSTPath = GlobalProperties.TestMailRaw + "/pst/";
            string OriginalPSTFile = "bugPST17613.pst";
            string OriginalPSTPath = PSTPath + OriginalPSTFile;
            FileInfo fi;

            #endregion

            #region Delete Old PST files created by this test

            string[] PSTFiles = Directory.GetFiles(PSTPath);

            foreach (string fname in PSTFiles)
            {
                PSTFileName = Path.GetFileName(fname);

                if (PSTFileName.StartsWith(OriginalPSTFile) && !PSTFileName.Equals(OriginalPSTFile))
                {
                    fi = new FileInfo(PSTPath + PSTFileName);
                    fi.Delete();
                }
            }

            #endregion

            FileInfo originalPST = new FileInfo(OriginalPSTPath);         
            zAssert.IsTrue(originalPST.Exists, "Verify the original PST file exists");
            originalPST.IsReadOnly = false;

            #region Create the Temporary PST File

            FileInfo tmpPST = originalPST.CopyTo(originalPST.FullName + GlobalProperties.time() + GlobalProperties.counter() + ".pst");
            zAssert.IsTrue(tmpPST.Exists, "Verify the temporary PST file is created");

            #endregion

            #region Outlook Block: Get the default TASK Folder in ZCO

            RDOFolder rTaskFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(rTaskFolder, "Verify that the default Task Folder in ZCO exists");

            #endregion

            #region Outlook Block: Import the PST File (Add the PST Store)

            RDOPstStore rPSTStore;
            RDOSession Session = new RDOSession(); //Earlier, we were getting RPC_E_FAULT on AddPSTStore using OutlookRedemption.Instance.rdoSession object, so created new RDOSession and used Logon() to log to the current outlook application MAPI
            Session.Logon(null, null, false, false, false, false);

            try
            {
                RDOStores rStores = Session.Stores;
                rPSTStore = rStores.AddPSTStore(tmpPST.FullName, null, null);
                zAssert.IsNotNull(rPSTStore, "Verify that the PST store is added correctly");
            }
            catch (HarnessException e)
            {
                throw new HarnessException("Exception is thrown while sharing opening data file", e);
            }

            RDOFolder pstTaskFolder = rPSTStore.GetDefaultFolder(rdoDefaultFolders.olFolderTasks);
            zAssert.IsNotNull(pstTaskFolder, "Verify that the PST store has a Task Folder");

            #endregion

            #region Outlook Block: Copy the Task Item from the PST Store to the ZCO Store

            OutlookCommands.Instance.Sync();

            // Find the Task in the PST Store
            RDOTaskItem pstTask = OutlookMailbox.Instance.findTask(subject, pstTaskFolder, true);
            zAssert.IsNotNull(pstTask, "Verify that the Task exists in the PST Store");

            // Move the Tasl Item from the PST Store to the ZCO Store
            pstTask.Move(rTaskFolder);

            // Find the Task in the ZCO Store
            RDOTaskItem zcoTask = OutlookMailbox.Instance.findTask(pstTask.Subject, rTaskFolder, true);
            zAssert.IsNotNull(zcoTask, "Verify that the Task exists in the ZCO Store");
            zAssert.AreEqual(subject, zcoTask.Subject, "Verify that the Subject matches");
            zAssert.AreEqual(content, zcoTask.Body.TrimEnd(), "Verify that the Content matches");

            // Mark the Task as flagged
            zcoTask.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            zcoTask.Save();

            OutlookCommands.Instance.Sync();

            #endregion

            #region Clean up the RDOSession created for this test
            Session = null;
            #endregion

            #region SOAP Block: Verify that the Imported Task syncs to the ZCS
            // Search for the Task ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("task").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            // Get the Task Item
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));

            // Verification
            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp", "name", subject,null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:desc", null, content, null, 1);
            zAccount.AccountZCO.selectSOAP(taskMessage, "//mail:comp/mail:or", "a", zAccount.AccountZCO.emailAddress, null, 1);

            #endregion

        }
    }
}