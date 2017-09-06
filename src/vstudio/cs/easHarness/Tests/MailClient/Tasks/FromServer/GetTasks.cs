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
    public class GetTasks : Tests.BaseTestFixture
    {
        public String getDayOfWeek(String WeekDay)
        {
            if (WeekDay == "Sunday")
                return "1";
            else if (WeekDay == "Monday")
                return "2";
            else if (WeekDay == "Tuesday")
                return "4";
            else if (WeekDay == "Wednesday")
                return "8";
            else if (WeekDay == "Thursday")
                return "16";
            else if (WeekDay == "Friday")
                return "32";
            else if (WeekDay == "Saturday")
                return "64";
            else
                return "0";
        }

        [Test, Description("Sync task with subject, content and normal importance to the device"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L0")]
        public void GetTask01()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            #endregion

            #region TEST ACTION

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

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "1", "Verify Priority is correct : Normal Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "0", "Verify Sensitivity field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//tasks:ReminderTime", 0, "Verify the Reminder is not set ");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "0", "Verify Reminder flag is set to 0");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//tasks:StartDate", 0, "Verify Start Date field is not returned");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//tasks:DueDate", 0, "Verify Due Date field is is not returned");

            #endregion

        }

        [Test, Description("Sync task with subject, due date, low importance to the device"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L0")]
        public void GetTask02()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(5);
            DateTime Reminder = timestamp.AddDays(4);

            #endregion

            #region TEST ACTION

            // Add a task to the mailbox            
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	                <m l='" + taskFolderId + @"'>
		                <inv>
			                <comp name='" + subject + @"' priority='9' status='NEED' percentComplete='0'>
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
			                <content></content>
		                </mp>
	                </m>
            </CreateTaskRequest>");

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
            
            #endregion
            
            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "0", "Verify Priority field is correct : Low Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSyncBase:Body", 0, "Verify the Content is empty ");
            
            #endregion
            
        }

        [Test, Description("Sync recurring daily task with end date, high importance, with reminder, without privacy to the device"),
        Property("TestSteps", "1. Add a task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L0")]
        public void GetTask03()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime Reminder = timestamp.AddDays(1);
            DateTime EndDate = timestamp.AddDays(5);

            #endregion

            #region TEST ACTION
            // Add a task to the mailbox

            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='1' status='NEED' percentComplete='0' class='PUB'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <recur>
					            <add>
						            <rule freq='DAI'>
							            <until d='" + EndDate.ToString(@"yyyyMMdd") + @"'/> 
							            <interval ival='1'/>
						            </rule>
					            </add>
				            </recur>
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

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "2", "Verify Priority field is correct : High Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "0", "Verify the Privacy field is correct : 0 for Public");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");
            
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Type", null, "0", "Verify the frequency field is correct : 0 for Daily");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Interval", null, "1", "Verify the task recurs after every 1 Day interval");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Regenerate", null, "0", "Verify the task does not regenerate");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:DeadOccur", null, "0", "Verify the DeadOccur field is correct");
            
            String endDate = EndDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String startDate = StartDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easEndDate = ZAssert.XmlXpathValue(syncResponse.XmlElement,"//tasks:Recurrence//tasks:Until");
            String easStartDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Start");
            
            ZAssert.AreEqual(easEndDate.Substring(0, 10), endDate.Substring(0, 10), "Verify that End Date of recurring task is correct");    
            ZAssert.AreEqual(easStartDate.Substring(0, 10), startDate.Substring(0, 10), "Verify that Start Date of recurring task is correct");

            #endregion

        }

        [Test, Description("Sync recurring weekly task with end date, low importance, without reminder, with privacy to the device"),
        Property("TestSteps", "1. Add a recurring task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTask04()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(15);
            DateTime EndDate = timestamp.AddDays(15);

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            #endregion

            #region TEST ACTION
            // Add a task to the mailbox

            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + taskFolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='9' status='NEED' percentComplete='0' class='PRI'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <recur>
					            <add>
						            <rule freq='WEE'>
							            <until d='" + EndDate.ToString(@"yyyyMMdd") + @"'/> 
							            <interval ival='1'/>
                                        <byday>
                                            <wkday day='" + soapDayOfWeek + @"' />
                                        </byday>
						            </rule>
					            </add>
				            </recur>
			            </comp>	
		            </inv>	
		            <su>" + subject + @"</su>
		            <mp ct='text/plain'>
			            <content>" + content + @"</content>
		            </mp>
	            </m>
            </CreateTaskRequest>");

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "0", "Verify Priority field is correct : High Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//tasks:ReminderTime", 0, "Verify the Reminder is not set ");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "0", "Verify Reminder flag is set to 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "2", "Verify the Privacy field is correct : 2 for Private");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Type", null, "1", "Verify the frequency field is correct : 1 for Weekly");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Interval", null, "1", "Verify the task recurs after every 1 Week interval");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:DayOfWeek", null, easDayOfWeek, "Verify that task recurs on correct weekday");
            
            String endDate = EndDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String startDate = StartDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easEndDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Until");
            String easStartDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Start");

            ZAssert.AreEqual(easEndDate.Substring(0, 10), endDate.Substring(0, 10), "Verify that End Date of recurring task is correct");
            ZAssert.AreEqual(easStartDate.Substring(0, 10), startDate.Substring(0, 10), "Verify that Start Date of recurring task is correct");

            #endregion

        }

        [Test, Description("Sync recurring every 2 weeks task with end date, normal importance, with reminder, with privacy to the device"),
        Property("TestSteps", "1. Add a recurring task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTask05()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime EndDate = timestamp.AddMonths(2);
            DateTime Reminder = timestamp.AddDays(1);

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            #endregion

            #region TEST ACTION
            // Add a task to the mailbox

            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
                    <m l='" + taskFolderId + @"'>
                        <inv>
                            <comp name='" + subject + @"' priority='5' status='NEED' percentComplete='0' class='PRI'>
                                <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                                <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <recur>
                                    <add>
                                        <rule freq='WEE'>
                                            <until d='" + EndDate.ToString(@"yyyyMMdd") + @"'/>
                                            <interval ival='2'/>
                                            <byday>
                                                <wkday day='" + soapDayOfWeek + @"' />
                                            </byday>
                                        </rule>
                                    </add>
                                </recur>
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

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "1", "Verify Priority field is correct : Normal Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "2", "Verify the Privacy field is correct : 2 for Private");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");
           
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Type", null, "1", "Verify the frequency field is correct : 1 for Weekly");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Interval", null, "2", "Verify the task recurs after every 2 Week interval");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:DayOfWeek", null, easDayOfWeek, "Verify that task recurs on correct weekday");
            
            String endDate = EndDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String startDate = StartDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easEndDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Until");
            String easStartDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Start");

            ZAssert.AreEqual(easEndDate.Substring(0, 10), endDate.Substring(0, 10), "Verify that End Date of recurring task is correct");
            ZAssert.AreEqual(easStartDate.Substring(0, 10), startDate.Substring(0, 10), "Verify that Start Date of recurring task is correct");

            #endregion

        }

        [Test, Description("Sync recurring monthly task with certain number of occurences, normal importance, with reminder, with privacy in non default folder to the device"),
        Property("TestSteps", "1. Add a recurring task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTask06()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            int Count = 10;

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime Reminder = timestamp.AddDays(1);

            String dayOfMonth = timestamp.Day.ToString();
            String folderName = "newFolder" + HarnessProperties.getUniqueString();

            #endregion

            // Create a sub-folder in Task and add a new task in it
            #region TEST ACTION

            //Create a folder on server and sync to device
            XmlDocument CreateFolderResponse = TestAccount.soapSend(
            @"<CreateFolderRequest xmlns='urn:zimbraMail'>
	            <folder l='" + taskFolderId + @"' name='" + folderName + @"' view='task'/>
            </CreateFolderRequest>");

            String FolderId = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the new sub-folder is synced to device");

            //Send the Sync request for new sub-folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;

            //Create a new task in the Task sub-folder
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + FolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='5' status='NEED' percentComplete='0' class='PRI'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <recur>
					            <add>
						            <rule freq='MON'>
							            <count num='" + Count.ToString() + @"'/>
							            <interval ival='1'/>
                                        <bymonthday modaylist='" + dayOfMonth + @"' />
						            </rule>
					            </add>
				            </recur>
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

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = FolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "1", "Verify Priority field is correct : Normal Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "2", "Verify the Privacy field is correct : 2 for Private");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Type", null, "2", "Verify the frequency field is correct : 2 for Monthly");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Interval", null, "1", "Verify the task recurs after every 1 Month interval");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:DayOfMonth", null, dayOfMonth, "Verify that task recurs on correct monthday");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Occurrences", null, Count.ToString(), "Verify that task recurs for correct number of ocureances");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Until", 0, " Verify that the Recurrence end date is not returned");
            
            String easFolderId = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//AirSync:CollectionId");
            String startDate = StartDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easStartDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Start");

            ZAssert.AreEqual(easFolderId, FolderId, "Verify the task is created in Task sub-folder");         
            ZAssert.AreEqual(easStartDate.Substring(0, 10), startDate.Substring(0, 10), "Verify that Start Date of recurring task is correct");
           
            #endregion

        }

        [Test, Description("Sync recurring yearly task with no end date, low importance, with reminder, without privacy in non default folder to the device"),
        Property("TestSteps", "1. Add a recurring task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTask07()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime Reminder = timestamp.AddDays(1);
            
            String dayOfMonth = timestamp.Day.ToString();
            String month = timestamp.Month.ToString();
            String folderName = "newFolder" + HarnessProperties.getUniqueString();

            #endregion

            // Create a sub-folder in Task and add a new task in it
            #region TEST ACTION

            //Create a folder on server and sync to device
            XmlDocument CreateFolderResponse = TestAccount.soapSend(
            @"<CreateFolderRequest xmlns='urn:zimbraMail'>
	            <folder l='" + taskFolderId + @"' name='" + folderName + @"' view='task'/>
            </CreateFolderRequest>");

            String FolderId = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the new sub-folder is synced to device");

            //Send the Sync request for new sub-folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;

            //Create a new task in the Task sub-folder
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + FolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='9' status='NEED' percentComplete='0' class='PUB'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <recur>
					            <add>
						            <rule freq='YEA'> 
							            <interval ival='1'/>
                                        <bymonthday modaylist='" + dayOfMonth + @"' />
                                        <bymonth molist='" + month + @"' />
						            </rule>
					            </add>
				            </recur>
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

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = FolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "0", "Verify Priority field is correct : Low Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "0", "Verify the Privacy field is correct : 0 for Public");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");
            
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Type", null, "5", "Verify the frequency field is correct : 5 for Yearly");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Interval", null, "1", "Verify the task recurs after every 1 Month interval");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:DayOfMonth", null, dayOfMonth, "Verify that task recurs on correct monthday");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:MonthOfYear", null, month, "Verify that tasks recurs on correct month");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Until", 0, "Verify that recurrence pattern does not have Until info");

            String startDate = StartDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easStartDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Start");
            String easFolderId = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//AirSync:CollectionId");

            ZAssert.AreEqual(easStartDate.Substring(0, 10), startDate.Substring(0, 10), "Verify that Start Date of recurring task is correct");
            ZAssert.AreEqual(easFolderId, FolderId, "Verify the task is created in Task sub-folder");

            #endregion

        }

        [Test, Description("Sync recurring daily task with no end date, high importance, with reminder, without privacy in non default folder to the device"),
        Property("TestSteps", "1. Add a recurring task to the mailbox, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTask08()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime Reminder = timestamp.AddDays(1);

            String folderName = "newFolder" + HarnessProperties.getUniqueString();

            #endregion

            // Create a sub-folder in Task and add a new task in it
            #region TEST ACTION

            //Create a folder on server and sync to device
            XmlDocument CreateFolderResponse = TestAccount.soapSend(
            @"<CreateFolderRequest xmlns='urn:zimbraMail'>
	            <folder l='" + taskFolderId + @"' name='" + folderName + @"' view='task'/>
            </CreateFolderRequest>");

            String FolderId = TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            //Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the new sub-folder is synced to device");

            //Send the Sync request for new sub-folder
            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;

            //Create a new task in the Task sub-folder
            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<CreateTaskRequest xmlns='urn:zimbraMail'>
	            <m l='" + FolderId + @"'>
		            <inv>
			            <comp name='" + subject + @"' priority='1' status='NEED' percentComplete='0' class='PUB'>
				            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/> 
				            <or a='" + TestAccount.EmailAddress + @"'/>
				            <recur>
					            <add>
						            <rule freq='DAI'> 
							            <interval ival='1'/>
						            </rule>
					            </add>
				            </recur>
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

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = FolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
            
            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "2", "Verify Priority field is correct : High Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "0", "Verify the Privacy field is correct : 0 for Public");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");
            
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Type", null, "0", "Verify the frequency field is correct : 0 for Daily");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Interval", null, "1", "Verify the task recurs after every 1 Month interval");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Until", 0, "Verify that recurrence pattern does not have Until info");

            String startDate = StartDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easStartDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Start");
            String easFolderId = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//AirSync:CollectionId");

            ZAssert.AreEqual(easStartDate.Substring(0, 10), startDate.Substring(0, 10), "Verify that Start Date of recurring task is correct");
            ZAssert.AreEqual(easFolderId, FolderId, "Verify the task is created in Task sub-folder");

            #endregion

        }

        [Test, Description("ZCO Sync recurring daily task with end date, high importance, with reminder, without privacy to the device"),
        Property("TestSteps", "1. Add a recurring task to the mailbox using ZCO, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTask09()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String uid = HarnessProperties.getGUID();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime Reminder = timestamp.AddDays(1);
            DateTime EndDate = timestamp.AddDays(5);

            #endregion

            #region TEST ACTION
            // Add a task to the mailbox

            XmlDocument SetTaskResponse = TestAccount.soapSend(
            @"<SetTaskRequest l='" + taskFolderId + @"' xmlns='urn:zimbraMail'>
                <default ptst='NE'>
                    <m> 
                        <inv neverSent='0' method='REQUEST' percentComplete='0' priority='1' transp='O' allDay='1' uid='"+ uid +@"' draft='0' name='" + subject + @"' fb='B' class='PUB' seq='0' status='NEED'>
                            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/>
                            <or a='" + TestAccount.EmailAddress + @"'/>
                            <recur>
                                <add>
                                    <rule freq='DAI'>
                                        <interval ival='1'/>
                                        <until d='" + EndDate.ToString(@"yyyyMMdd") + @"'/>
                                    </rule>
                                </add>
                            </recur>
                            <alarm action='DISPLAY'>
                                <trigger>
                                    <abs d='" + Reminder.ToString(@"yyyyMMdd\T100000\Z") + @"'/>
                                </trigger>
                            <desc/>
                            </alarm>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </default>
            </SetTaskRequest>");

            String taskId1 = TestAccount.soapSelectValue(SetTaskResponse, "//mail:SetTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "2", "Verify Priority field is correct : High Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "0", "Verify the Privacy field is correct : 0 for Public");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");
            
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Type", null, "0", "Verify the frequency field is correct : 0 for Daily");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Interval", null, "1", "Verify the task recurs after every 1 Day interval");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Regenerate", null, "0", "Verify the task does not regenerate");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Recurrence//tasks:DeadOccur", null, "0", "Verify the DeadOccur field is correct");

            String endDate = EndDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easEndDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Until");
            String startDate = StartDate.ToString(@"yyyy-MM-dd\THH-mm-ss\Z");
            String easStartDate = ZAssert.XmlXpathValue(syncResponse.XmlElement, "//tasks:Recurrence//tasks:Start");
            
            ZAssert.AreEqual(easEndDate.Substring(0, 10), endDate.Substring(0, 10), "Verify that End Date of recurring task is correct");            
            ZAssert.AreEqual(easStartDate.Substring(0, 10), startDate.Substring(0, 10), "Verify that Start Date of recurring task is correct");
           
            #endregion

        }

        [Test, Description("ZCO Sync task with subject, due date, low importance, with reminder, with privacy to the device"),
        Property("TestSteps", "1. Add a task to the mailbox using ZCO, 2. Sync to device, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void GetTask10()
        {

            #region TEST SETUP

            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String uid = HarnessProperties.getGUID();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(5);
            DateTime Reminder = timestamp.AddDays(4);

            #endregion

            #region TEST ACTION
            // Add a task to the mailbox

            XmlDocument CreateTaskResponse = TestAccount.soapSend(
            @"<SetTaskRequest l='" + taskFolderId + @"' xmlns='urn:zimbraMail'>
                <default ptst='NE'>
                    <m>
                        <inv neverSent='0' method='REQUEST' percentComplete='0' priority='9' transp='O' allDay='1' uid='" + uid + @"' draft='0' name='" + subject + @"' fb='B' class='PRI' seq='0' status='NEED'>
                            <s d='" + StartDate.ToString(@"yyyyMMdd") + @"'/>
                            <e d='" + DueDate.ToString(@"yyyyMMdd") + @"'/>
                            <or a='" + TestAccount.EmailAddress + @"'/>
                            <alarm action='DISPLAY'>
                                <trigger>
                                    <abs d='" + Reminder.ToString(@"yyyyMMdd\T100000\Z") + @"'/>
                                </trigger>
                            <desc/>
                            </alarm>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </default>
            </SetTaskRequest>");

            String taskId1 = TestAccount.soapSelectValue(CreateTaskResponse, "//mail:CreateTaskResponse", "calItemId");

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = taskFolderId;
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Subject", null, subject, "Verify Subject field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSyncBase:Body//AirSyncBase:Data", null, content, "Verify Content field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Importance", null, "0", "Verify Priority field is correct : Low Importance");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Sensitivity", null, "2", "Verify Privacy field is correct : 2 for Private");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:StartDate", null, StartDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Start Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:DueDate", null, DueDate.ToString(@"yyyy-MM-dd\T00:00:00.000\Z"), "Verify Due Date field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderTime", null, Reminder.ToString(@"yyyy-MM-dd\T10:00:00.000\Z"), "Verify Reminder field is correct");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:Complete", null, "0", "Verify Complete field is correct : 0");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//tasks:ReminderSet", null, "1", "Verify Reminder flag is set to 1");
            
            #endregion

        }
    }
}