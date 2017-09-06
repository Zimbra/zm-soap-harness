using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;



namespace Tests.MailClient.Tasks.Bugs
{
    [TestFixture]
    class Bug92924 : Tests.BaseTestFixture
    {

        [Test(Description = "Verify percent complete field is not garbled when task added from Device"),
        Property("Bug", 92924), 
        Property("TestSteps", "1. Add a new task on device and sync to server, 2. Verify that the percentComplete field is not garbled")]
        [Category("Smoke")]
        [Category("Tasks")]
        [Category("L1")]
        public void Bug92924_01()
        {

            #region Add a new task from device and sync to server

            String ClientId = HarnessProperties.getGUID();
            String subject = "subject" + HarnessProperties.getUniqueString();


            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
                    <Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMTASKS='Tasks'>
                    <Collections>
                    <Collection>
                        <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.tasks.id")] + @"</SyncKey>
                        <CollectionId>" + HarnessProperties.getString("folder.tasks.id") + @"</CollectionId>
                        <GetChanges/>
                        <WindowSize>5</WindowSize>
                        <Options>
                            <AirSyncBase:BodyPreference>
                                <AirSyncBase:Type>1</AirSyncBase:Type>
                                <AirSyncBase:TruncationSize>400000</AirSyncBase:TruncationSize>
                            </AirSyncBase:BodyPreference>
                        </Options>
                        <Commands>
                            <Add>
                                <ClientId>" + ClientId + @"</ClientId>
                                <ApplicationData>
                                    <AirSyncBase:Body>
                                        <AirSyncBase:Type>1</AirSyncBase:Type>
                                        <AirSyncBase:Data/>
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region Verify on Server that the percent field is not garbled

            XmlDocument SearchResponse = TestAccount.soapSend(
               @"<SearchRequest xmlns='urn:zimbraMail' types='task'>
                   <query>subject:(" + subject + @")</query>
                </SearchRequest>");

            String percentComplete = TestAccount.soapSelectValue(SearchResponse, "//mail:task", "percentComplete");

            ZAssert.AreEqual(percentComplete, "0", "Verify percent complete field is not garbled");

            #endregion

        }
    }
}
