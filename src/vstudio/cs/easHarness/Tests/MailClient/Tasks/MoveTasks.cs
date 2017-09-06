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
    class MoveTasks : Tests.BaseTestFixture
    {
        [Test, Description("Move task from Task folder to Task sub-folder on Device and sync to server"),
        Property("TestSteps", "1. Create a folder on server, 2. Create a new task in the Task folder, 3. Move task from Task folder to Task sub-folder on device, 4. Sync to server, 5. Verify the task Is Moved correctly")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void MoveTasks01()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String folderName = "newFolder" + HarnessProperties.getUniqueString();

            //Create a folder on server and sync to device
            XmlDocument CreateFolderResponse = TestAccount.soapSend(
            @"<CreateFolderRequest xmlns='urn:zimbraMail'>
	            <folder l='" + taskFolderId + @"' name='" + folderName + @"' view='task'/>
            </CreateFolderRequest>");

            String FolderId = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderSync xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
            "</FolderSync>");
            
            ZAssert.IsNotNull(response, "Verify the new sub-folder is synced to device");

            //Send the Sync request for new sub-folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
            @"<?xml version='1.0' encoding='utf-8'?>
            <Sync xmlns='AirSync'>
            <Collections>
                <Collection>
                    <SyncKey>0</SyncKey>
                    <CollectionId>" + FolderId + @"</CollectionId>
                    <GetChanges/>
                    <Options>
                        <FilterType>2</FilterType>
                        <MIMETruncation>1</MIMETruncation>
                        <MIMESupport>0</MIMESupport>
                            <BodyPreference xmlns='AirSyncBase'>
                                <Type>1</Type>
                                <TruncationSize>500</TruncationSize>
                            </BodyPreference>
                    </Options>
                </Collection>
            </Collections>
            </Sync>");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            //Create a new task in the Task folder
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='5' status='NEED' percentComplete='0' class='PRI'>
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

            // Send the SyncRequest
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = taskFolderId;
            syncRequest1.SyncKey = TestAccount.Device.SyncKeys[syncRequest1.CollectionId] as String;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");
            
            #endregion

            #region TEST ACTION

            //Move the task from Task folder to Task sub-folder
            ZResponse moveResponse = TestClient.sendRequest(TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<Moves xmlns='Move'>" +
                "<Move>" +
                    "<SrcMsgId>" + taskId + @"</SrcMsgId>" +
                    "<SrcFldId>" + taskFolderId + @"</SrcFldId>" +
                    "<DstFldId>" + FolderId + @"</DstFldId>" +
                "</Move>" +
            "</Moves>");

            ZAssert.IsNotNull(moveResponse, "Verify the MoveItems response was received");
            
            //Validate Move Response
            ZAssert.XmlXpathMatch(moveResponse.XmlElement, "//Move:Status", null, "3", "Verify that Move response status is 3 i.e. Success flag for Move action");
            
            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Task, should get Delete for the task
            ZSyncRequest syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest2.CollectionId = taskFolderId;
            ZSyncResponse syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse2, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse2.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + taskId + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            // Device validation: Send the SyncRequest - Task sub-folder, should get Add for the task
            ZSyncRequest syncRequest3 = new ZSyncRequest(TestAccount);
            syncRequest3.CollectionId = FolderId;
            ZSyncResponse syncResponse3 = TestClient.sendRequest(syncRequest3) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse3, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse3.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + taskId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Server validation: Search moved task in Task folder
            XmlDocument SearchResponse = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
			    <query>subject:(" + subject + @") + in:tasks</query>
            </SearchRequest>");

            XmlNode task = TestAccount.soapSelect(SearchResponse, "//mail:task");
            ZAssert.IsNull(task, "Verify the task is not present in Task folder");

            // Server validation: Search moved task in sub-folder
            SearchResponse = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
		        <query>subject:(" + subject + @") + in:tasks/" + folderName + @"</query>
	        </SearchRequest>");

            task = TestAccount.soapSelect(SearchResponse, "//mail:task");
            ZAssert.IsNotNull(task, "Verify the task is present in sub-folder folder");

            #endregion
        }

        [Test, Description("Move task from Task sub-folder to Task folder on Device and sync to server"),
        Property("TestSteps", "1. Create a folder on server, 2. Create a new task in the Task folder, 3. Move task from Task sub-folder to Task folder on device, 4. Sync to server, 5. Verify the task Is Moved correctly")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void MoveTasks02()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            String folderName = "newFolder" + HarnessProperties.getUniqueString();

            //Create a folder on server and sync to device
            XmlDocument CreateFolderResponse = TestAccount.soapSend(
            @"<CreateFolderRequest xmlns='urn:zimbraMail'>
	            <folder l='" + taskFolderId + @"' name='" + folderName + @"' view='task'/>
            </CreateFolderRequest>");

            String FolderId = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<FolderSync xmlns='FolderHierarchy'>" +
                "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
            "</FolderSync>");

            ZAssert.IsNotNull(response, "Verify the new sub-folder is synced to device");

            //Send the Sync request for new sub-folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
            @"<?xml version='1.0' encoding='utf-8'?>
            <Sync xmlns='AirSync'>
            <Collections>
                <Collection>
                    <SyncKey>0</SyncKey>
                    <CollectionId>" + FolderId + @"</CollectionId>
                    <GetChanges/>
                    <Options>
                        <FilterType>2</FilterType>
                        <MIMETruncation>1</MIMETruncation>
                        <MIMESupport>0</MIMESupport>
                            <BodyPreference xmlns='AirSyncBase'>
                                <Type>1</Type>
                                <TruncationSize>500</TruncationSize>
                            </BodyPreference>
                    </Options>
                </Collection>
            </Collections>
            </Sync>");

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            //Create a new task in the Task folder
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + FolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='5' status='NEED' percentComplete='0' class='PRI'>
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

            // Send the SyncRequest
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = FolderId;
            syncRequest1.SyncKey = TestAccount.Device.SyncKeys[syncRequest1.CollectionId] as String;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region TEST ACTION

            //Move the task from Task sub-folder to Task folder
            ZResponse moveResponse = TestClient.sendRequest(TestAccount,
            "<?xml version='1.0' encoding='utf-8'?>" +
            "<Moves xmlns='Move'>" +
                "<Move>" +
                    "<SrcMsgId>" + taskId + @"</SrcMsgId>" +
                    "<SrcFldId>" + FolderId + @"</SrcFldId>" +
                    "<DstFldId>" + taskFolderId + @"</DstFldId>" +
                "</Move>" +
            "</Moves>");

            ZAssert.IsNotNull(moveResponse, "Verify the MoveItems response was received");

            //Validate Move Response
            ZAssert.XmlXpathMatch(moveResponse.XmlElement, "//Move:Status", null, "3", "Verify that Move response status is 3 i.e. Success flag for Move action");

            #endregion

            #region TEST VERIFICATION

            // Device validation: Send the SyncRequest - Task sub-folder, should get Delete for the task
            ZSyncRequest syncRequest2 = new ZSyncRequest(TestAccount);
            syncRequest2.CollectionId = FolderId;
            ZSyncResponse syncResponse2 = TestClient.sendRequest(syncRequest2) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse2, "Verify the Sync response was received");

            XmlElement Delete = ZSyncResponse.getMatchingElement(syncResponse2.XmlElement, "//AirSync:Delete", "//AirSync:ServerId[text() = '" + taskId + "']");
            ZAssert.IsNotNull(Delete, "Verify the Delete was returned in the Sync Response");

            // Device validation: Send the SyncRequest - Task folder, should get Add for the task
            ZSyncRequest syncRequest3 = new ZSyncRequest(TestAccount);
            syncRequest3.CollectionId = taskFolderId;
            ZSyncResponse syncResponse3 = TestClient.sendRequest(syncRequest3) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse3, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse3.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + taskId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Server validation: Search moved task in Task sub-folder
            XmlDocument SearchResponse = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				<query>subject:(" + subject + @") + in:tasks/" + folderName + @"</query>
            </SearchRequest>");

            XmlNode task = TestAccount.soapSelect(SearchResponse, "//mail:task");
            ZAssert.IsNull(task, "Verify the task is not present in Task sub-folder");

            // Server validation: Search moved task in Task folder
            SearchResponse = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
		        <query>subject:(" + subject + @") + in:tasks</query>
	        </SearchRequest>");

            task = TestAccount.soapSelect(SearchResponse, "//mail:task");
            ZAssert.IsNotNull(task, "Verify the message is present in Task folder");

            #endregion
        }
    }
}
