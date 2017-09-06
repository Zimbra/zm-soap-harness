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
    class DeleteTasks_Dumpster : Tests.BaseTestFixture
    {
        [SetUp]
        public void BeforeTest()
        {
            XmlDocument ModifyAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                "<ModifyAccountRequest xmlns='urn:zimbraAdmin'>"
                + "<id xmlns=''>" + TestAccount.ZimbraId + "</id>"
                + "<a n='zimbraDumpsterEnabled'>TRUE</a>"
                + "</ModifyAccountRequest>");

            XmlNode response = ZimbraAdminAccount.GlobalAdmin.soapSelect(ModifyAccountResponse, "//admin:ModifyAccountResponse");

        }

        [Test, Description("Delete task on device and sync to server"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Delete the task from device, 3. Verify the task is present in Dumpster")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void DeleteTask_Dumpster01()
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
                    <ServerId>" + taskId + @"</ServerId>
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

            XmlNode task = TestAccount.soapSelect(SearchResponse, "//mail:task");
            ZAssert.IsNull(task, "Verify the task is not present on Server");

            // Server validation: Search deleted task is in Dumpster folder
            XmlDocument SearchResponse1 = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' inDumpster='1' types='task'>
                <query>-in:/Junk</query>
            </SearchRequest>");

            task = TestAccount.soapSelect(SearchResponse1, "//mail:task[@id='" + taskId + "']");
            ZAssert.IsNotNull(task, "Verify the task is present in Dumpster");

            #endregion
        }

        [Test, Description("Delete task on device and recover from Dumpster"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Delete the task from device, 3. Verify the task is present in Dumpster, 4. Recover deleted task from Dumpster to Tasks folder, 5. Server validation: Verify the task is present in Task folder, 6. Device validation: Verify the task is present in Task folder on device")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void DeleteTask_Dumpster02()
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
                    <ServerId>" + taskId + @"</ServerId>
                </Delete>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");
            
            //Search for the task on server
            XmlDocument SearchResponse = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
	    	    <query>subject:(" + subject + @")</query>
            </SearchRequest>");

            XmlNode task = TestAccount.soapSelect(SearchResponse, "//mail:task");
            ZAssert.IsNull(task, "Verify the task is not present on Server");

            // Server validation: Search deleted task is in Dumpster folder
            XmlDocument SearchResponse1 = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' inDumpster='1' types='task'>
                <query>-in:/Junk</query>
            </SearchRequest>");

            task = TestAccount.soapSelect(SearchResponse1, "//mail:task[@id='" + taskId + "']");
            ZAssert.IsNotNull(task, "Verify the task is present in Dumpster");

            //Recover deleted task from Dumpster to Tasks folder
            TestAccount.soapSend(
            @"<ItemActionRequest xmlns='urn:zimbraMail'>
                <action id='" + taskId + @"' op='recover' l='"+taskFolderId+@"'/>
            </ItemActionRequest>");

            #endregion

            #region TEST VERIFICATION

            // Server validation: Search task in recovered in Tasks folder
            XmlDocument SearchResponse2 = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
		        <query>subject:(" + subject + @")</query>
		    </SearchRequest>");

            task = TestAccount.soapSelect(SearchResponse2, "//mail:task");
            ZAssert.IsNotNull(task, "Verify the task is present in Tasks folder");

            // Device validation: Send the SyncRequest - Tasks folder, should get Add for the task
            ZSyncRequest syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest2.CollectionId = taskFolderId;
            syncRequest2.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse2, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse2.XmlElement, "//AirSync:Add", "//tasks:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the task gets recovered and synced on the device");

            #endregion
        }

    }
}
