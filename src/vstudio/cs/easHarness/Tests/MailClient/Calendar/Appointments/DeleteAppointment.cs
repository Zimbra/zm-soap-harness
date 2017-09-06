using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Calendar.Appointments
{
    [TestFixture]
    public class DeleteAppointment : Tests.BaseTestFixture
    {

        /**

<?xml version="1.0" encoding="utf-8"?>
<Sync xmlns="AirSync">
    <Collections>
        <Collection>
            <Class>Calendar</Class>
            <SyncKey>{314ee1c8-3a9a-3439-b234-d59f0e65f0b3}3</SyncKey>
            <CollectionId>10</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <Truncation>8</Truncation> // MIMETruncation?
            </Options>
            <Commands>
                <Delete>
                    <ServerId>263</ServerId>
                </Delete>
            </Commands>
        </Collection>
    </Collections>
</Sync>

         */

        [Test, Description("Verify delete basic appointment from device, sync to server"),
        Property("TestSteps", "1. Add an appointment to the mailbox and sync to device, 2. Delete the appointment from device, 3. Verify the appointment is deleted from server as well")]
        [Category("Smoke")]
        [Category("Calendar")]
        [Category("L0")] 
        public void DeleteAppointment01()
        {

            #region TEST SETUP


            // Add an appointment to the mailbox
            //
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            DateTime timestamp = new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 12, 0, 0);
            String start = timestamp.ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");
            String finish = timestamp.AddHours(3).ToUniversalTime().ToString(@"yyyyMMdd\THHmmss\Z");

            XmlDocument CreateAppointmentResponse = TestAccount.soapSend(
                @"<CreateAppointmentRequest xmlns='urn:zimbraMail'>
                    <m l='" + HarnessProperties.getString("folder.calendar.id") + @"'>
                        <inv>
                            <comp name='" + subject + @"' allDay='0' class='PUB' transp='0' fb='B' status='CONF'>
                                <or a='" + TestAccount.EmailAddress + @"'/>
                                <s d='" + start + @"'/>
                                <e d='" + finish + @"'/>
                            </comp>
                        </inv>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>     
                </CreateAppointmentRequest>");


            // Verify the appointment is there
            //
            String expandStart = System.Convert.ToString(timestamp.AddDays(-7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            String expandEnd = System.Convert.ToString(timestamp.AddDays(7).Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);

            XmlDocument SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:("+ subject +@")</query>
                </SearchRequest>");
            ZAssert.XmlXpath(SearchResponse.DocumentElement, "//mail:appt", "Verify the appointment exists on the server");


            // Send the SyncRequest to get the appointment
            //
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            // get the ServerID of the new appointment
            //
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;


            #endregion



            #region TEST ACTION

            // Delete the appointment
            syncRequest = new ZSyncRequest(TestAccount,
    @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync'>
    <Collections>
        <Collection>
            <Class>Calendar</Class>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.calendar.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.calendar.id") + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <MIMETruncation>8</MIMETruncation>
            </Options>
            <Commands>
                <Delete>
                    <ServerId>" + ServerId +@"</ServerId>
                </Delete>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion




            #region TEST VERIFICATION

            // Verify the appointment is removed from the server

            SearchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' calExpandInstStart='" + expandStart + @"' calExpandInstEnd='" + expandEnd + @"' types='appointment'>
				    <query>inid:" + HarnessProperties.getString("folder.calendar.id") + @" subject:(" + subject + @")</query>
                </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:appt", 0, "Verify the appointment no longer exists on the server");


            #endregion


        }

    }

}
