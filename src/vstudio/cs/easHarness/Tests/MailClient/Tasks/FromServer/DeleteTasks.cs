using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Tasks.FromServer
{
    [TestFixture]
    class DeleteTasks : Tests.BaseTestFixture
    {
        [Test, Description("Soft delete task - Delete (move to trash) a task on the server. Sync to device"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Delete the task(Soft delete), 3. Sync to device, 4. Verify the task got deleted from Task folder")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L0")]
        public void DeleteTasks01()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String trashid = HarnessProperties.getString("folder.trash.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            // Add a task to the mailbox
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail' xmlns:AirSyncBase='AirSyncBase'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject + @"' priority='5' status='NEED' percentComplete='0' class='PUB'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
            </CreateTaskRequest>");

            String taskId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");
            String invId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "invId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify the task is added to the device");

            #endregion

            #region TEST ACTION

            TestAccount.soapSend(@"<CancelTaskRequest xmlns='urn:zimbraMail' id='" + invId + @"' comp='0'/>");

            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Task folder, should get Delete for the task
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = taskFolderId;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + taskId + "']");
            ZAssert.IsNotNull(Delete, "Verify the task got deleted from Task folder");

            #endregion

        }

        [Test, Description("Hard delete task - Delete (Delete from trash) a task on the server. Sync to device"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Delete the task(Hard delete), 3. Sync to device, 4. Verify the task got deleted from Task folder")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void DeleteTasks02()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String trashid = HarnessProperties.getString("folder.trash.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            // Add a task to the mailbox
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail' xmlns:AirSyncBase='AirSyncBase'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject + @"' priority='5' status='NEED' percentComplete='0' class='PUB'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
            </CreateTaskRequest>");

            String taskId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");
            String invId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "invId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify the task is added to the device");

            #endregion

            #region TEST ACTION

            //Move the task to trash
            TestAccount.soapSend(@"<CancelTaskRequest xmlns='urn:zimbraMail' id='" + invId + @"' comp='0'/>");
            
            //Delete task from Trash folder
            TestAccount.soapSend(
            @"<ItemActionRequest xmlns='urn:zimbraMail'>
                <action id='" + taskId + @"' op='delete'/>
            </ItemActionRequest>");
            
            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Task folder, should get Delete for the task
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = taskFolderId;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + taskId + "']");
            ZAssert.IsNotNull(Delete, "Verify the task got deleted from Task folder");

            #endregion

        }
    }
}
