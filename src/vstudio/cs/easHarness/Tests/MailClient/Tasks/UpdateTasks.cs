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
    class UpdateTasks : Tests.BaseTestFixture
    {
        [Test, Description("Update a basic task from device - change subject, Content and sync to server"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Subject, Content, 3. Sync to device, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTask01()
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

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new task
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//tasks:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            #endregion

            #region TEST ACTION

            String newSubject = "NewSubject" + HarnessProperties.getUniqueString();
            String newContent = "NewContent" + HarnessProperties.getUniqueString();

            // Modify the appointment
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:EstimatedDataSize>7</AirSyncBase:EstimatedDataSize>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + newContent + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + newSubject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>1</POOMTASKS:Importance>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>0</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderSet>0</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:task", 0, "Verify the search returns no tasks with old subject");

            XmlDocument SearchResponse1 = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + newSubject + @")</query>
                </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse1, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
		            <m id='" + invId + @"' html='1'/>
			    </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", newSubject, "Verify the task subject is updated correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, newContent, "Verify the task content is updated correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "0", "Verify the Priority is Normal");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the Sensitivity is set correctly i.e. PUB:Public");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:alarm", 0, "Verify the Reminder is set not set");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:s", 0, "Verify the Start date is not set");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:e", 0, "Verify the Due date is not set");

            #endregion
        }

        [Test, Description("Update a task from device - change Content, Reminder, Privacy, Priority and sync to server"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Content, Reminder, Privacy, Priority from device, 3. Sync to server, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTask02()
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

            /// Add a task to the mailbox            
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

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new task
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//tasks:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            #endregion

            #region TEST ACTION

            String newContent = "NewContent" + HarnessProperties.getUniqueString();
            DateTime newReminder = timestamp.AddDays(3);

            // Modify the task, change Content, Reminder, Privacy: Public to Private, Priority: Normal to High
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks'>
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + newContent + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
						<POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>2</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDate.ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDate.ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>2</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + newReminder.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
		            <m id='" + invId + @"' html='1'/>
			    </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, newContent, "Verify the task content is updated correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "1", "Verify the Priority is updated from Normal to High");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the Sensitivity is updated correctly i.e. PRI:Private");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", newReminder.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is updated correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:s", "d", StartDate.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the Start Date is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:e", "d", DueDate.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the End Date is set Correctly");

            #endregion
        }

        [Test, Description("Update a task from device - change Privacy, Importance, Due date and sync to server"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Privacy, Importance, Due date from device, 3. Sync to server, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTask03()
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

            /// Add a task to the mailbox            
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

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new task
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//tasks:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            #endregion

            #region TEST ACTION

            DateTime newDueDate = timestamp.AddDays(7);

            // Modify the appointment, change Privacy from Private to Public, Importance from High to Low and Due date
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks'>
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
						<POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>0</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDate.ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + newDueDate.ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + newDueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>0</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + Reminder.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
		            <m id='" + invId + @"' html='1'/>
			    </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "9", "Verify the Priority is updated from High to Low");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e. NEED : Not Started");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the Sensitivity is updated correctly i.e. PUB : Public");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", Reminder.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:s", "d", StartDate.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the Start Date is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:e", "d", newDueDate.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the End Date is updated correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the PercentComplete is correct i.e. 0");

            #endregion
        }

        [Test, Description("Update a task from device - change Subject, Content, Priority, Mark as Complete and sync to server"),
        Property("Bug", 107272), 
        Property("TestSteps", "1. Add a task to the mailbox, 2. Modify the Task created - Change Subject, Content, Priority, Mark as Complete from device, 3. Sync to server, 4. Verify the task is modified correctly")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void UpdateTask04()
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

            /// Add a task to the mailbox            
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='9' status='NEED' percentComplete='0' class='PRI'>
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

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new task
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//tasks:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            #endregion

            #region TEST ACTION

            String newSubject = "NewSubject" + HarnessProperties.getUniqueString();
            String newContent = "NewContent" + HarnessProperties.getUniqueString();

            // Modify the appointment, change Subject, Content, Priority: Low to Normal, Complete: 0 to 1
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks'>
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + newContent + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
						<POOMTASKS:Subject>" + newSubject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>1</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDate.ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDate.ToUniversalTime().ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Complete>1</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>2</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + newSubject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(
                @"<GetMsgRequest xmlns='urn:zimbraMail'>
		            <m id='" + invId + @"' html='1'/>
			    </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", newSubject, "Verify the task subject is updated correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, newContent, "Verify the task content is updated correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "0", "Verify the Priority is updated from Low to Normal");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "COMP", "Verify the Status is updated from NEED to COMP : Not Started to Complete");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the Sensitivity is set correctly i.e. PRI : Private");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", Reminder.ToString(@"yyyyMMdd\T100000\Z"), "Verify the Reminder is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:s", "d", StartDate.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the Start Date is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:e", "d", DueDate.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the End Date is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "100", "Verify the PercentComplete is updated correctly i.e. 100");

            #endregion
        }
    }
}
