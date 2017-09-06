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
    public class CreateTasks : Tests.BaseTestFixture
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

        [Test, Description("Create task with subject, content and normal importance on Device and sync to server"),
        Property("TestSteps", "1. Add a basic task to the mailbox on device, 2. Sync to server, 3. Verify the task details")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L0")]
        public void CreateTask01()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            #endregion

            // Add a task to the mailbox
            #region TEST ACTION

            // Send the SyncRequest with the new Task
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>1</POOMTASKS:Importance>     
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>0</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderSet>0</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + invId + @"' html='1'/>
			        </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "0", "Verify the Priority is Normal");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the Sensitivity is set correctly i.e. PUB:Public");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:alarm", 0, "Verify the Reminder is set not set");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:s", 0, "Verify the Start date is not set");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:e", 0, "Verify the Due date is not set");

            #endregion
        }
        
        [Test, Description("Create task with subject, content low importance and Due date on Device and sync to server"),
        Property("TestSteps", "1. Add a task with due date to the mailbox on device, 2. Sync to server, 3. Verify the task details")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L0")]
        public void CreateTask02()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime StartDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime DueDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime ReminderUTC = timestamp.AddDays(1).ToUniversalTime();
                       
            #endregion

            // Add a task to the mailbox
            #region TEST ACTION
            
            // Send the SyncRequest with the new Task
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
						<POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>0</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>0</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + ReminderUTC.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion
            
            #region TEST VERIFICATION
            
            XmlDocument SearchResponse = TestAccount.soapSend(
            @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
			    <query>subject:(" + subject + @")</query>
            </SearchRequest>");

            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
			    <m id='" + invId + @"' html='1'/>
			</GetMsgRequest>");
          
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");          
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "9", "Verify the Priority is Low");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", ReminderUTC.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:s", "d", StartDateUTC.ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the Start Date is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:e", "d", DueDateUTC.ToString(@"yyyyMMdd\THHmmss\Z"), "Verify the End Date is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly");
 
            #endregion

        }

        [Test, Description("Create a recurring daily task with end date, high importance, with reminder, without privacy on Device and sync to server"),
        Property("TestSteps", "1. Add a daily recurring task to the mailbox on device, 2. Sync to server, 3. Verify the task details are correct")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L0")]
        public void CreateTask03()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(5);
            DateTime StartDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime DueDateUTC = timestamp.AddDays(5).ToUniversalTime();
            DateTime ReminderUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime EndDate = timestamp.AddDays(5);

            #endregion

            // Add a task to the mailbox
            #region TEST ACTION

            // Send the SyncRequest with the new Task
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>2</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Recurrence>
                            <POOMTASKS:Type>0</POOMTASKS:Type>
                            <POOMTASKS:Start>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Start>
                            <POOMTASKS:Until>" + EndDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Until>
                            <POOMTASKS:Interval>1</POOMTASKS:Interval>
                        </POOMTASKS:Recurrence>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>0</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + ReminderUTC.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + invId + @"' html='1'/>
			        </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "1", "Verify the Priority is Normal");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the Sensitivity is set correctly i.e. PUB:Public");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", ReminderUTC.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:rule", "freq", "DAI", "Verify the Frequency is set correctly i.e DAI: Daily");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:interval", "ival", "1", "Verify the task recurrs after every 1 day interval");
            String endDateSoap = TestAccount.soapSelectValue(GetMsgResponse, "//mail:rule/mail:until", "d");
            String endDate = EndDate.ToString(@"yyyyMMdd\THHmmss\Z");
            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");


            #endregion

        }

        [Test, Description("Create a recurring weekly task with end date, low importance, without reminder, with privacy on Device and sync to server"),
        Property("TestSteps", "1. Add a weekly recurring task to the mailbox on device, 2. Sync to server, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void CreateTask04()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime StartDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime DueDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime EndDate = timestamp.AddDays(5);

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            #endregion

            // Add a task to the mailbox
            #region TEST ACTION

            // Send the SyncRequest with the new Task
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>0</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Recurrence>
                            <POOMTASKS:Type>1</POOMTASKS:Type>
                            <POOMTASKS:Start>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Start>
                            <POOMTASKS:Until>" + EndDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Until>
                            <POOMTASKS:Interval>1</POOMTASKS:Interval>
                            <POOMTASKS:DayOfWeek>" + easDayOfWeek + @"</POOMTASKS:DayOfWeek>
                        </POOMTASKS:Recurrence>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>2</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderSet>0</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + invId + @"' html='1'/>
			        </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "9", "Verify the Priority is Low");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the Sensitivity is set correctly i.e. PRI:Private");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:alarm", 0, "Verify the Reminder is not set");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:rule", "freq", "WEE", "Verify the Frequency is set correctly i.e DAI: Daily");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:wkday", "day", soapDayOfWeek, "Verify the WeekDay is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:interval", "ival", "1", "Verify the task recurrs after every 1 week interval");
            String endDateSoap = TestAccount.soapSelectValue(GetMsgResponse, "//mail:rule/mail:until", "d");
            String endDate = EndDate.ToString(@"yyyyMMdd\THHmmss\Z");
            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");
            
            #endregion

        }

        [Test, Description("Create a recurring every 2 weeks task with end date, normal importance, with reminder, with privacy on Device and sync to server"),
        Property("TestSteps", "1. Add a biweekly recurring task to the mailbox on device, 2. Sync to server, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void CreateTask05()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime StartDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime DueDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime EndDate = timestamp.AddDays(5);
            DateTime ReminderUTC = timestamp.AddDays(1).ToUniversalTime();

            String dayOfWeek = timestamp.ToString("dddd");
            String easDayOfWeek = getDayOfWeek(dayOfWeek);
            String soapDayOfWeek = dayOfWeek.Substring(0, 2).ToUpper();

            #endregion

            // Add a task to the mailbox
            #region TEST ACTION

            // Send the SyncRequest with the new Task
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>1</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Recurrence>
                            <POOMTASKS:Type>1</POOMTASKS:Type>
                            <POOMTASKS:Start>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Start>
                            <POOMTASKS:Until>" + EndDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Until>
                            <POOMTASKS:Interval>2</POOMTASKS:Interval>
                            <POOMTASKS:DayOfWeek>" + easDayOfWeek + @"</POOMTASKS:DayOfWeek>
                        </POOMTASKS:Recurrence>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>2</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + ReminderUTC.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + invId + @"' html='1'/>
			        </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "0", "Verify the Priority is Normal");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the Sensitivity is set correctly i.e. PRI: Private");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", ReminderUTC.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:rule", "freq", "WEE", "Verify the Frequency is set correctly i.e WEE: Weekly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:wkday", "day", soapDayOfWeek, "Verify the WeekDay is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:interval", "ival", "2", "Verify the task recurrs after every 2 weeks interval");
            String endDateSoap = TestAccount.soapSelectValue(GetMsgResponse, "//mail:rule/mail:until", "d");
            String endDate = EndDate.ToString(@"yyyyMMdd\THHmmss\Z");
            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");
            
            #endregion

        }

        [Test, Description("Create a recurring monthly task with end date, normal importance, with reminder, with privacy on Device in non default folder and sync to server"),
        Property("TestSteps", "1. Add a monthly recurring task to the mailbox on device, 2. Sync to server, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void CreateTask06()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime StartDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime DueDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime EndDate = timestamp.AddMonths(5);
            DateTime ReminderUTC = timestamp.AddDays(1).ToUniversalTime();

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

            // Send the SyncRequest with the new Task created in sub-folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[FolderId] + @"</SyncKey>
            <CollectionId>" + FolderId + @"</CollectionId>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Options>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>32768</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>1</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Recurrence>
                            <POOMTASKS:Type>2</POOMTASKS:Type>
                            <POOMTASKS:Start>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Start>
                            <POOMTASKS:Until>" + EndDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Until>
                            <POOMTASKS:Interval>1</POOMTASKS:Interval>
                            <POOMTASKS:DayOfMonth>" + dayOfMonth + @"</POOMTASKS:DayOfMonth>
                        </POOMTASKS:Recurrence>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>2</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + ReminderUTC.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the task is created in sub-folder");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + invId + @"' html='1'/>
			        </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "0", "Verify the Priority is Normal");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PRI", "Verify the Sensitivity is set correctly i.e. PRI: Private");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", ReminderUTC.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:rule", "freq", "MON", "Verify the Frequency is set correctly i.e MON: Monthly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:interval", "ival", "1", "Verify the task recurrs after every 1 month interval");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:bymonthday", "modaylist", dayOfMonth, "Verify the Day of Month is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:m", "l", FolderId, "Verify the task is created in the sub-folder created within Task folder");
            String endDateSoap = TestAccount.soapSelectValue(GetMsgResponse, "//mail:rule/mail:until", "d");
            String endDate = EndDate.ToString(@"yyyyMMdd\THHmmss\Z");
            ZAssert.AreEqual(endDate.Substring(0, 8), endDateSoap.Substring(0, 8), "Verify that End Date of recurring appointment is correct");
            
            #endregion
        }

        [Test, Description("Create a recurring yearly task with no end date, low importance, with reminder, without privacy on Device in non default folder and sync to server"),
        Property("TestSteps", "1. Add a yearly recurring task to the mailbox on device, 2. Sync to server, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void CreateTask07()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime StartDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime DueDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime ReminderUTC = timestamp.AddDays(1).ToUniversalTime();

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

            // Send the SyncRequest with the new Task created in sub-folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[FolderId] + @"</SyncKey>
            <CollectionId>" + FolderId + @"</CollectionId>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Options>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>32768</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>0</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Recurrence>
                            <POOMTASKS:Type>5</POOMTASKS:Type>
                            <POOMTASKS:Start>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Start>
                            <POOMTASKS:Interval>1</POOMTASKS:Interval>
                            <POOMTASKS:DayOfMonth>" + dayOfMonth + @"</POOMTASKS:DayOfMonth>
                            <POOMTASKS:MonthOfYear>" + month + @"</POOMTASKS:MonthOfYear>
                        </POOMTASKS:Recurrence>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>0</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + ReminderUTC.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the task is created in sub-folder");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + invId + @"' html='1'/>
			        </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "9", "Verify the Priority is Low");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the Sensitivity is set correctly i.e. PUB: Public");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", ReminderUTC.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:until", 0, "Verify the event recurrence has no end date");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:rule", "freq", "YEA", "Verify the Frequency is set correctly i.e YEA: Yearly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:interval", "ival", "1", "Verify the task recurrs after every 1 year interval");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:bymonthday", "modaylist", dayOfMonth, "Verify the Day of Month is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:bymonth", "molist", month, "Verify the Month is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:m", "l", FolderId, "Verify the task is created in the sub-folder created within Task folder");

            #endregion
        }

        [Test, Description("Create a recurring daily task with no end date, high importance, with reminder, without privacy on Device in non default folder and sync to server"),
        Property("TestSteps", "1. Add a daily recurring task without end date to the mailbox on device, 2. Sync to server, 3. Verify the task details are correct")]
        [Category("Functional")]
        [Category("Tasks")]
        [Category("L2")]
        public void CreateTask08()
        {
            #region TEST SETUP

            //Set Tasks details
            String taskFolderId = HarnessProperties.getString("folder.tasks.id");
            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            DateTime StartDate = timestamp.AddDays(1);
            DateTime DueDate = timestamp.AddDays(1);
            DateTime StartDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime DueDateUTC = timestamp.AddDays(1).ToUniversalTime();
            DateTime ReminderUTC = timestamp.AddDays(1).ToUniversalTime();

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

            // Send the SyncRequest with the new Task created in sub-folder
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks'>
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[FolderId] + @"</SyncKey>
            <CollectionId>" + FolderId + @"</CollectionId>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Options>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>32768</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Add>
                    <ClientId>" + ClientId + @"</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + content + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMTASKS:Subject>" + subject + @"</POOMTASKS:Subject>
                        <POOMTASKS:Importance>2</POOMTASKS:Importance>
                        <POOMTASKS:UtcStartDate>" + StartDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcStartDate>
                        <POOMTASKS:StartDate>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:StartDate>
                        <POOMTASKS:UtcDueDate>" + DueDateUTC.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:UtcDueDate>
                        <POOMTASKS:DueDate>" + DueDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:DueDate>
                        <POOMTASKS:Recurrence>
                            <POOMTASKS:Type>0</POOMTASKS:Type>
                            <POOMTASKS:Start>" + StartDate.ToString(@"yyyy-MM-dd\THH:mm:ss.000\Z") + @"</POOMTASKS:Start>
                            <POOMTASKS:Interval>1</POOMTASKS:Interval>
                        </POOMTASKS:Recurrence>
                        <POOMTASKS:Complete>0</POOMTASKS:Complete>
                        <POOMTASKS:Sensitivity>0</POOMTASKS:Sensitivity>
                        <POOMTASKS:ReminderTime>" + ReminderUTC.ToString(@"yyyy-MM-dd\T08:00:00.000\Z") + @"</POOMTASKS:ReminderTime>
                        <POOMTASKS:ReminderSet>1</POOMTASKS:ReminderSet>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the task is created in sub-folder");

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
				    <query>subject:(" + subject + @")</query>
                </SearchRequest>");


            String invId = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "invId");

            XmlDocument GetMsgResponse = TestAccount.soapSend(@"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + invId + @"' html='1'/>
			        </GetMsgRequest>");

            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "name", subject, "Verify the task subject is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", null, content, "Verify the task content is set correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "priority", "1", "Verify the Priority is High");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "percentComplete", "0", "Verify the Percent Complete is set correctly i.e. 0");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "class", "PUB", "Verify the Sensitivity is set correctly i.e. PUB: Public");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:abs", "d", ReminderUTC.ToString(@"yyyyMMdd\T080000\Z"), "Verify the Reminder is set Correctly");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:comp", "status", "NEED", "Verify the Status is set correctly i.e NEED: Not Started");
            ZAssert.XmlXpathCount(GetMsgResponse.DocumentElement, "//mail:until", 0, "Verify the event recurrence has no end date");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:rule", "freq", "DAI", "Verify the Frequency is set correctly i.e DAI: Daily");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:interval", "ival", "1", "Verify the task recurrs after every 1 day interval");
            ZAssert.XmlXpathMatch(GetMsgResponse.DocumentElement, "//mail:m", "l", FolderId, "Verify the task is created in the sub-folder created within Task folder");
            
            #endregion
        
        }
    }
}
