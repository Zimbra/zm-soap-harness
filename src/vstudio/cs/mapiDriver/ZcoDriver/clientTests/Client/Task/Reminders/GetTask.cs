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

namespace clientTests.Client.Task.Reminders
{
    public class GetTask : BaseTestFixture
    {
       
        [Test, Description("Verify the task created with reminder and NO due date is synced and shows due date as 'none'")]
        [Bug ("46448")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Auth as user in ZCS and add task with reminder that has no due date",
            "2. ZCO: Sync",
            "3. ZCO: Verify task is synced to ZCO and the due date is set to 'none'")]
        //[04/05/2011 sramarao] Now (according to Jhalm) server does not accept a task with start date without due date.
        // Hence this test case has been modified to create task without start and due date.
        public void GetTask_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2012, 10, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId;
            #endregion

            #region SOAP Block: Auth as ZCO user in ZCS and add task with a reminder and no value to due date
            
            zAccount.AccountZCO.sendSOAP(@"
                <CreateTaskRequest xmlns='urn:zimbraMail'>
                      <m >
                        <inv>
                          <comp name='"+ subject +@"' status='INPR' percentComplete='0' priority='1' loc='Location12781085646'>
                            <alarm action='DISPLAY'>
                              <trigger>
                                           <abs d='20101025T120000'/>
                              </trigger>
                              <desc>15 minutes before start</desc>
                            </alarm>
                            </comp>
                        </inv>
                        <mp ct='text/plain'>
                          <content>" + content + @"</content>
                        </mp>
                      </m>
                    </CreateTaskRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));
            XmlNode taskMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
           
            #endregion

            #region Outlook Block: Verify task is synced and the attributes are correct

            OutlookCommands.Instance.Sync();

            RDOTaskItem rTaskItem = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTaskItem, "Verify that task exists in ZCO");
            // Since task does not contain both start and end date, they should dislay "none" ie, "45010101".
            zAssert.AreEqual("45010101", rTaskItem.StartDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the StartDate Matches and is 'none'");
            //"45010101" is the mazimum allows value for date. This means "none". So when ZCO recieves this value, it sends "none" as the value to outlook.
            zAssert.AreEqual("45010101", rTaskItem.DueDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the DueDate Matches and is 'none'");
               

            #endregion

        }
    

        [Test, Description("Verify the task created with reminder in ZCS is synced correctly to ZCO")]
        [Bug ("11496")]
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Auth as user in ZCS and add task with reminder",
            "2. ZCO: Sync",
            "3. ZCO: Verify task is synced to ZCO")]
        public void GetTask_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2012, 10, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId;
            #endregion

            #region SOAP Block: Auth as ZCO user in ZCS and add task with a reminder.
            
            zAccount.AccountZCO.sendSOAP(@"
                <CreateTaskRequest xmlns='urn:zimbraMail'>
                      <m >
                        <inv>
                          <comp name='"+ subject +@"' status='INPR' percentComplete='0' priority='1' loc='Location12781085646'>
                            <s d='" + startDate.ToString("yyyyMMdd'T'HHmmss") + @"' />
                            <e d='" + dueDate.ToString("yyyyMMdd'T'HHmmss") + @"' />  
                               <alarm action='DISPLAY'>
                                  <trigger>
                                               <abs d='20101025T120000'/>
                                  </trigger>
                                  <desc>15 minutes before start</desc>
                                </alarm>
                                </comp>
                        </inv>
                        <mp ct='text/plain'>
                          <content>" + content + @"</content>
                        </mp>
                      </m>
                    </CreateTaskRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            #endregion

            #region Outlook Block: Verify task is synced and the attributes are correct

            OutlookCommands.Instance.Sync();

            RDOTaskItem rTaskItem = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNotNull(rTaskItem, "Verify that task exists in ZCO");
            
            zAssert.AreEqual(startDate.ToUniversalTime().ToString("yyyyMMdd"), rTaskItem.StartDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the StartDate Matches");
            zAssert.AreEqual(dueDate.ToUniversalTime().ToString("yyyyMMdd"), rTaskItem.DueDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the DueDate Matches");

            
            #endregion

        }


        
        [Test, Description("Verify the task with reminder in ZCS is not created successfully as 'rel' property of <alarm> is used")]
        [Ignore("Ignore the test")] // since harness does not handle local error messages, marking this test case as Ignore. So this test case is not run. However, it shows the task is not created.
        [Bug("11496")] //http://bugzilla.zimbra.com/show_bug.cgi?id=11496#c5
        [Category("SMOKE"), Category("Task")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Auth as user in ZCS and add task with reminder",
            "2. ZCO: Sync",
            "3. ZCO: Verify task is synced to ZCO")]
        public void GetTask_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variab\les
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startDate = new DateTime(2012, 10, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);
            string taskId;
            #endregion

            #region SOAP Block: Auth as ZCO user in ZCS and add task with a reminder.

            zAccount.AccountZCO.sendSOAP(@"
                <CreateTaskRequest xmlns='urn:zimbraMail'>
                      <m >
                        <inv>
                          <comp name='" + subject + @"' status='INPR' percentComplete='0' priority='1' loc='Location12781085646'>
                            <s d='" + startDate.ToString("yyyyMMdd'T'HHmmss") + @"' />
                            <e d='" + dueDate.ToString("yyyyMMdd'T'HHmmss") + @"' />  
                               <alarm action='DISPLAY'>
                                  <trigger>
                                               <rel related='START' neg='1' m='30'/>
                                  </trigger>
                                  <desc>15 minutes before start</desc>
                                </alarm>
                                </comp>
                        </inv>
                        <mp ct='text/plain'>
                          <content>" + content + @"</content>
                        </mp>
                      </m>
                    </CreateTaskRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            #endregion

            #region Outlook Block: Verify task is synced and the attributes are correct

            OutlookCommands.Instance.Sync();

            RDOTaskItem rTaskItem = OutlookMailbox.Instance.findTask(subject);
            zAssert.IsNull(rTaskItem, "Verify that task do not exists in ZCO");

            //zAssert.AreEqual(startDate.ToUniversalTime().ToString("yyyyMMdd"), rTaskItem.StartDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the StartDate Matches");
            //zAssert.AreEqual(dueDate.ToUniversalTime().ToString("yyyyMMdd"), rTaskItem.DueDate.ToUniversalTime().ToString("yyyyMMdd"), "Verify that the DueDate Matches");


            #endregion

        }
    }

}

 
 
