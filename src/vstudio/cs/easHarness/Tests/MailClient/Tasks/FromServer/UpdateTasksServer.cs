using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Zimbra.EasHarness.ActiveSync;
using Utilities;
using System.Xml;

namespace Tests.MailClient.Tasks.FromServer
{
    [TestFixture]
    class UpdateTasksServer : Tests.BaseTestFixture
    {
        [Test, Description("Modify a basic task on server - change subject, Content"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Subject, Content, 3. Sync to device, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTaskServer01()
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

            String invId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "invId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is set correctlly");
            String ServerId = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//AirSync:ServerId");

            #endregion

            #region TEST ACTION

            //Modify the Task created - Change Subject, Content
            String newSubject = "NewSubject" + HarnessProperties.getUniqueString();
            String newContent = "NewContent" + HarnessProperties.getUniqueString();

            XmlDocument ModifyTaskResponse = TestAccount.soapSend(
            @"<ModifyTaskRequest xmlns='urn:zimbraMail' id='" + invId + @"'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
                        <comp name='" + newSubject + @"' priority='5' status='NEED' percentComplete='0' class='PUB'>
			                <or a='" + TestAccount.EmailAddress + @"'/>
	    		                </comp>	
	                </inv>	
	                <su>" + newSubject + @"</su>
                    <mp ct='text/plain'>
                        <content>" + newContent + @"</content>
                    </mp>
                </m>
            </ModifyTaskRequest>");

            // Send the SyncRequest
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = taskFolderId;
            syncRequest1.SyncKey = TestAccount.Device.SyncKeys[syncRequest1.CollectionId] as String;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            #endregion

            #region Test Verification

            ZAssert.XmlXpathMatch(Change, "//tasks:Subject", null, newSubject, "Verify Subject field is modified correctlly");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, newContent, "Verify Content field is modified correctlly");
            ZAssert.XmlXpathMatch(Change, "//tasks:Importance", null, "1", "Verify Priority is correct : Normal Importance");
            ZAssert.XmlXpathMatch(Change, "//tasks:Sensitivity", null, "0", "Verify Sensitivity field is correct : Public");
            ZAssert.XmlXpathMatch(Change, "//tasks:Complete", null, "0", "Verify Percent Complete is correct : 0");
            ZAssert.XmlXpathCount(Change, "//tasks:ReminderTime", 0, "Verify the Reminder is not set ");
            ZAssert.XmlXpathMatch(Change, "//tasks:ReminderSet", null, "0", "Verify Reminder flag is set to 0");

            #endregion
        }

        [Test, Description("Modify a task on server - change Content, Reminder, Privacy, Priority"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Content, Reminder, Privacy, Priority, 3. Sync to device, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTaskServer02()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(5);
            DateTime Reminder = timestamp.AddDays(4);

            // Add a task to the mailbox            
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='5' status='NEED' percentComplete='0' class='PUB'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <alarm action='DISPLAY'>
					            <trigger>
						            <abs d='" + Reminder.ToString(@"yyyyMMdd\T100000\Z") + @"'/>
					            </trigger>
				            </alarm>
			            </comp>	
		            </inv>	
		            <su>" + subject + @"</su>
		            <mp ct='text/plain'>
			            <content>" + content + @"</content>
		            </mp>
	            </m>
            </CreateTaskRequest>");

            String invId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "invId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is set correctlly");
            String ServerId = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//AirSync:ServerId");

            #endregion

            #region TEST ACTION

            //Modify the task, change Content, Reminder, Privacy: Public to Private, Priority: Normal to High
            String newContent = "NewContent" + HarnessProperties.getUniqueString();
            DateTime newReminder = timestamp.AddDays(3);

            XmlDocument ModifyTaskResponse = TestAccount.soapSend(
            @"<ModifyTaskRequest xmlns='urn:zimbraMail' id='" + invId + @"'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='1' status='NEED' percentComplete='0' class='PRI'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <alarm action='DISPLAY'>
					            <trigger>
						            <abs d='" + newReminder.ToString(@"yyyyMMdd\T080000\Z") + @"'/>
					            </trigger>
				            </alarm>
			            </comp>	
		            </inv>	
		            <su>" + subject + @"</su>
		            <mp ct='text/plain'>
		                <content>" + newContent + @"</content>
	                </mp>
	            </m>
            </ModifyTaskRequest>");

            // Send the SyncRequest
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = taskFolderId;
            syncRequest1.SyncKey = TestAccount.Device.SyncKeys[syncRequest1.CollectionId] as String;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            #endregion

            #region Test Verification

            ZAssert.XmlXpathMatch(Change, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, newContent, "Verify Content field is modified correctlly");
            ZAssert.XmlXpathMatch(Change, "//tasks:Importance", null, "2", "Verify Priority is modified correctly : Normal to High Importance");
            ZAssert.XmlXpathMatch(Change, "//tasks:Sensitivity", null, "2", "Verify Sensitivity field is modified correctly : Public to Private");
            ZAssert.XmlXpathMatch(Change, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(Change, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(Change, "//tasks:ReminderTime", null, newReminder.ToString(@"yyyy-MM-dd\T08:00:00.000\Z"), "Verify Reminder field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0 for Not Complete");
            ZAssert.XmlXpathMatch(Change, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");

            #endregion
        }

        [Test, Description("Modify a task on server - change Privacy, Importance, Due date"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Privacy, Importance, Due date, 3. Sync to device, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTaskServer03()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(5);
            DateTime Reminder = timestamp.AddDays(4);

            // Add a task to the mailbox            
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='1' status='NEED' percentComplete='0' class='PRI'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <alarm action='DISPLAY'>
					            <trigger>
						            <abs d='" + Reminder.ToString(@"yyyyMMdd\T100000\Z") + @"'/>
					            </trigger>
				            </alarm>
			            </comp>	
		            </inv>	
		            <su>" + subject + @"</su>
		            <mp ct='text/plain'>
			            <content>" + content + @"</content>
		            </mp>
	            </m>
            </CreateTaskRequest>");

            String invId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "invId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is set correctlly");
            String ServerId = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//AirSync:ServerId");

            #endregion

            #region TEST ACTION

            //Modify the task, change Privacy from Private to Public, Importance from High to Low and Due date
            DateTime newDueDate = timestamp.AddDays(7);

            XmlDocument ModifyTaskResponse = TestAccount.soapSend(
            @"<ModifyTaskRequest xmlns='urn:zimbraMail' id='" + invId + @"'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='9' status='NEED' percentComplete='100' class='PUB'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + newDueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <alarm action='DISPLAY'>
					            <trigger>
						            <abs d='" + Reminder.ToString(@"yyyyMMdd\T080000\Z") + @"'/>
					            </trigger>
				            </alarm>
			            </comp>	
		            </inv>	
		            <su>" + subject + @"</su>
		            <mp ct='text/plain'>
		                <content>" + content + @"</content>
	                </mp>
	            </m>
            </ModifyTaskRequest>");

            // Send the SyncRequest
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = taskFolderId;
            syncRequest1.SyncKey = TestAccount.Device.SyncKeys[syncRequest1.CollectionId] as String;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            #endregion

            #region Test Verification

            ZAssert.XmlXpathMatch(Change, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(Change, "//tasks:Importance", null, "0", "Verify Priority is modified correctly : High to Low Importance");
            ZAssert.XmlXpathMatch(Change, "//tasks:Sensitivity", null, "0", "Verify Sensitivity field is modified correctly : Private to Public");
            ZAssert.XmlXpathMatch(Change, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is set correctly");
            ZAssert.XmlXpathMatch(Change, "//tasks:DueDate", null, newDueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T08:00:00.000\Z"), "Verify Reminder field is set correctly");
            ZAssert.XmlXpathMatch(Change, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0 for Not Complete");
            ZAssert.XmlXpathMatch(Change, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");

            #endregion
        }

        [Test, Description("Modify a task on server - change Subject, Content, Priority, Mark as Complete"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Subject, Content, Priority, Mark as Complete, 3. Sync to device, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTaskServer04()
        {
            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(5);

            // Add a task to the mailbox            
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='9' status='NEED' percentComplete='0' class='PUB'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
			            </comp>	
		            </inv>	
		            <su>" + subject + @"</su>
		            <mp ct='text/plain'>
			            <content>" + content + @"</content>
    		        </mp>
	            </m>
            </CreateTaskRequest>");

            String invId = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "invId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is set correctlly");
            String ServerId = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//AirSync:ServerId");

            #endregion

            #region TEST ACTION

            //Modify the task, change Subject, Content, Priority: Low to Normal, Status: Not Started to Complete
            String newSubject = "NewSubject" + HarnessProperties.getUniqueString();
            String newContent = "NewContent" + HarnessProperties.getUniqueString();

            XmlDocument ModifyTaskResponse = TestAccount.soapSend(
            @"<ModifyTaskRequest xmlns='urn:zimbraMail' id='" + invId + @"'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + newSubject + @"' priority='5' status='COMP' percentComplete='100' class='PUB'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/>
				            <or a='" + TestAccount.EmailAddress + @"'/>
			            </comp>	
		            </inv>	
		            <su>" + newSubject + @"</su>
		            <mp ct='text/plain'>
		                <content>" + newContent + @"</content>
	                </mp>
	            </m>
            </ModifyTaskRequest>");

            // Send the SyncRequest
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = taskFolderId;
            syncRequest1.SyncKey = TestAccount.Device.SyncKeys[syncRequest1.CollectionId] as String;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + ServerId + "']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            #endregion

            #region Test Verification

            ZAssert.XmlXpathMatch(Change, "//tasks:Subject", null, newSubject, "Verify Subject field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//AirSyncBase:Body//AirSyncBase:Data", null, newContent, "Verify Content field is modified correctly");
            ZAssert.XmlXpathMatch(Change, "//tasks:Importance", null, "1", "Verify Priority is modified correctly : Low to Normal Importance");
            ZAssert.XmlXpathMatch(Change, "//tasks:Sensitivity", null, "0", "Verify Sensitivity field is set correctly i.e. 0 : Public ");
            ZAssert.XmlXpathMatch(Change, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is set correctly");
            ZAssert.XmlXpathMatch(Change, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is set correctly");
            ZAssert.XmlXpathCount(Change, "//tasks:ReminderTime", 0, "Verify the Reminder is not set ");
            ZAssert.XmlXpathMatch(Change, "//tasks:Complete", null, "1", "Verify Complete field is correct : 1 for Complete");
            ZAssert.XmlXpathMatch(Change, "//tasks:ReminderSet", null, "0", "Verify Reminder flag is set to 0");

            #endregion
        }
    }
}
