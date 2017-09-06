using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Tasks.FromServer.Itemized
{
    [TestFixture]
    public class GetItemizedTask : Tests.BaseTestFixture
    {

        [Test, Description("Sync tasks in itemized mode to the device"),
        Property("TestSteps", "1. Create 3 tasks on server, 2. Sync all 3 tasks to device, 3. Send the SyncRequest again with old Sync key, this causes Server to start itemized mode (Response returns only 1 item, MoreAvailable returned and new synckey), 4. Repeat above step 2 times. Verify all items are returned, 5. Verify the details of each task item")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]     
        public void GetItemizedTask01()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");

            #region Task1
            // Add a task to the mailbox
            String subject1 = "subject" + HarnessProperties.getUniqueString();
            String content1 = "content" + HarnessProperties.getUniqueString();
            
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
                @"<CreateTaskRequest xmlns='urn:zimbraMail'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject1 + @"' allDay='1' priority='5' status='NEED' percentComplete='0'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject1 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content1 + @"</content>
                        </mp>
                    </m>     
                </CreateTaskRequest>");

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            #endregion

            #region Task2
            // Add a task to the mailbox
            String subject2 = "subject" + HarnessProperties.getUniqueString();
            String content2 = "content" + HarnessProperties.getUniqueString();

            CreateTaskResponse = TestAccount.soapSend(
                @"<CreateTaskRequest xmlns='urn:zimbraMail'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject2 + @"' allDay='1' priority='5' status='NEED' percentComplete='0'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject2 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content2 + @"</content>
                        </mp>
                    </m>     
                </CreateTaskRequest>");

            String taskId2 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            #endregion

            #region Task3
            // Add a task to the mailbox
            String subject3 = "subject" + HarnessProperties.getUniqueString();
            String content3 = "content" + HarnessProperties.getUniqueString();

            CreateTaskResponse = TestAccount.soapSend(
                @"<CreateTaskRequest xmlns='urn:zimbraMail'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject3 + @"' allDay='1' priority='5' status='NEED' percentComplete='0'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject3 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content3 + @"</content>
                        </mp>
                    </m>     
                </CreateTaskRequest>");

            String taskId3 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            #endregion

            #endregion

            #region TEST ACTION AND VERIFICATION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            String SyncKey1 = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + SyncKey1);
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 3, "Verify that Sync response returns 3 items");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[1]//AirSync:ServerId", null, taskId1, "Verify that 1st Add record has info of 1st task");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[2]//AirSync:ServerId", null, taskId2, "Verify that 2nd Add record has info of 2nd task");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[3]//AirSync:ServerId", null, taskId3, "Verify that 3rd Add record has info of 3rd task");

            // Send the SyncRequest again with old Sync key, this causes Server to start itemized mode
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = SyncKey1;
            logger.Debug("Value of SyncKey:" + SyncKey1);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns only 1 item, MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, taskId1, "Verify that Add record has info of 1st task");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject ", null, subject1, "Verify Subject field is correct - same as 1st task");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 1, "Verify that Sync response returns MoreAvailable tag");

            // Send the SyncRequest again with new Sync key
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns second item, MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, taskId2, "Verify that Add record has info of 2nd task");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject ", null, subject2, "Verify Subject field is correct - same as 2nd task");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 1, "Verify that Sync response returns MoreAvailable tag");

            // Send the SyncRequest again with new Sync key
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns third item, No MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, taskId3, "Verify that Add record has info of 3rd task");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject ", null, subject3, "Verify Subject field is correct - same as 3rd task");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 0, "Verify that Sync response does not returns MoreAvailable tag");

            // Send the SyncRequest again with new Sync key
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns no items
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 0, "Verify that Sync response returns no items");

            #endregion
           
        }
    }
}



