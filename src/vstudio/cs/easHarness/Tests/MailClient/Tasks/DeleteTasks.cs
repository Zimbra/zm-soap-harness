using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Tasks
{
    [TestFixture]
    class DeleteTasks : Tests.BaseTestFixture
    {
        [Test, Description("Delete task on device and sync to server"),
        Property("TestSteps", "1. Add a task to the mailbox and sync to device, 2. Delete the task from device, 3. Sync to server and verify the task is deleted")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void DeleteTask01()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            // Add a task to the mailbox
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail' xmlns:AirSyncBase='AirSyncBase'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject + @"' priority='9' status='NEED' percentComplete='0' class='PUB'>
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
            String invId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:task", "invId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify the task is added to the device");
            
            #endregion

            #region TEST ACTION

            //Delete the task from device
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount,
            @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.tasks.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.tasks.id") + @"</CollectionId>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Options>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>32768</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Delete>
                    <ServerId>" + taskId +@"</ServerId>
                </Delete>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");
            
            #endregion

            #region TEST VERIFICATION

            //Search for the task on server
            XmlDocument SearchResponse = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				<query>subject:(" + subject + @")</query>
            </SearchRequest>");

            XmlNode m = TestAccount.soapSelect(SearchResponse, "//mail:task");
            ZAssert.IsNull(m, "Verify the message is not present on Server");
            
            #endregion
        }

    }
}
