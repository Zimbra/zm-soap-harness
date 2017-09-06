using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.FromServer.Appointments.Itemized
{
    [TestFixture]
    public class GetItemizedAppointment : Tests.BaseTestFixture
    {

        [Test, Description("Sync appointments in itemized mode to the device"),
        Property("TestSteps", "1. Create 3 appointments on server, 2. Sync all 3 contacts to device, 3. Send the SyncRequest again with old Sync key, this causes Server to start itemized mode (Response returns only 1 item, MoreAvailable returned and new synckey), 4. Repeat above step 2 times. Verify all items are returned, 5. Verify the email address of each item")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L1")]
        public void GetItemizedAppointment01()
        {

            #region TEST SETUP

            #region Appt1
            // Add an Appointment to the mailbox

            String subject1 = "subject" + HarnessProperties.getUniqueString();
            String content1 = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp1 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 8, 0, 0);
            String start1 = timestamp1.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish1 = timestamp1.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject1 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start1 + @"'/>
                                <e d='" + finish1 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject1 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content1 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String apptId1 = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "apptId");

            #endregion

            #region Appt2
            // Add an Appointment to the mailbox

            String subject2 = "subject" + HarnessProperties.getUniqueString();
            String content2 = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp2 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 10, 0, 0);
            String start2 = timestamp2.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish2 = timestamp2.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject2 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start2 + @"'/>
                                <e d='" + finish2 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject2 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content2 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String apptId2 = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "apptId");

            #endregion

            #region Appt3
            // Add an Appointment to the mailbox

            String subject3 = "subject" + HarnessProperties.getUniqueString();
            String content3 = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp3 = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start3 = timestamp3.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish3 = timestamp3.AddHours(1).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject3 + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start3 + @"'/>
                                <e d='" + finish3 + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject3 + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content3 + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");

            String apptId3 = TestAccount.soapSelectValue(CreateAppointmentResponse, "//mail:CreateAppointmentResponse", "apptId");

            #endregion

            #endregion

            #region TEST ACTION AND VERIFICATION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            String SyncKey1 = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + SyncKey1);
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 3, "Verify that Sync response returns 3 items");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[1]//AirSync:ServerId", null, apptId1, "Verify that 1st Add record has info of 1st appointment");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[2]//AirSync:ServerId", null, apptId2, "Verify that 2nd Add record has info of 2nd appointment");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[3]//AirSync:ServerId", null, apptId3, "Verify that 3rd Add record has info of 3rd appointment");
            
            // Send the SyncRequest again with old Sync key, this causes Server to start itemized mode
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = SyncKey1;
            logger.Debug("Value of SyncKey:" + SyncKey1);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns only 1 item, MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, apptId1, "Verify that Add record has info of 1st appointment");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//calendar:Subject", null, subject1, "Verify the Subject field is correct - same as 1st appointment");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 1, "Verify that Sync response returns MoreAvailable tag");
            

            // Send the SyncRequest again with new Sync key
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns second item, MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, apptId2, "Verify that Add record has info of 2nd appointment");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//calendar:Subject", null, subject2, "Verify the Subject field is correct - same as 2nd appointment");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 1, "Verify that Sync response returns MoreAvailable tag");

            // Send the SyncRequest again with new Sync key
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns third item, No MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, apptId3, "Verify that Add record has info of 3rd appointment");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//calendar:Subject", null, subject3, "Verify the Subject field is correct - same as 3rd appointment");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 0, "Verify that Sync response does not returns MoreAvailable tag");                   

            // Send the SyncRequest again with new Sync key
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns no items
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 0, "Verify that Sync response returns no items");

            #endregion

        }
    }
}

