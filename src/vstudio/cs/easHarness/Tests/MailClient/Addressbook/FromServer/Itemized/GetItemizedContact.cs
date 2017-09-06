using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Addressbook.FromServer.Itemized
{
    [TestFixture]
    public class GetItemizedContact : Tests.BaseTestFixture
    {

        [Test, Description("Sync contacts in itemized mode to the device"),
        Property("TestSteps", "1. Create 3 contacts on server, 2. Sync all 3 contacts to device, 3. Send the SyncRequest again with old Sync key, this causes Server to start itemized mode (Response returns only 1 item, MoreAvailable returned and new synckey), 4. Repeat above step 2 times. Verify all items are returned, 5. Verify the email address of each item")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void GetItemizedContact01()
        {

            #region TEST SETUP

            #region Contact1
            // Add a contact to the mailbox
            String firstname1 = "first" + HarnessProperties.getUniqueString();
            String lastname1 = "last" + HarnessProperties.getUniqueString();
            String email1 = "email" + HarnessProperties.getUniqueString() + "@example.com";

            XmlDocument CreateContactResponse = TestAccount.soapSend(
                @"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname1 + @"</a>
                        <a n='lastName'>" + lastname1 + @"</a>
                        <a n='email'>" + email1 + @"</a>
                    </cn>     
                </CreateContactRequest>");

            String contactId1 = TestAccount.soapSelectValue(CreateContactResponse, "//mail:CreateContactResponse//mail:cn", "id");

            #endregion

            #region Contact2
            // Add a contact to the mailbox
            String firstname2 = "first" + HarnessProperties.getUniqueString();
            String lastname2 = "last" + HarnessProperties.getUniqueString();
            String email2 = "email" + HarnessProperties.getUniqueString() + "@example.com";

            CreateContactResponse = TestAccount.soapSend(
                @"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname2 + @"</a>
                        <a n='lastName'>" + lastname2 + @"</a>
                        <a n='email'>" + email2 + @"</a>
                    </cn>     
                </CreateContactRequest>");

            String contactId2 = TestAccount.soapSelectValue(CreateContactResponse, "//mail:CreateContactResponse//mail:cn", "id");

            #endregion

            #region Contact3
            // Add a contact to the mailbox
            String firstname3 = "first" + HarnessProperties.getUniqueString();
            String lastname3 = "last" + HarnessProperties.getUniqueString();
            String email3 = "email" + HarnessProperties.getUniqueString() + "@example.com";

            CreateContactResponse = TestAccount.soapSend(
                @"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname3 + @"</a>
                        <a n='lastName'>" + lastname3 + @"</a>
                        <a n='email'>" + email3 + @"</a>
                    </cn>     
                </CreateContactRequest>");

            String contactId3 = TestAccount.soapSelectValue(CreateContactResponse, "//mail:CreateContactResponse//mail:cn", "id");

            #endregion

            #endregion

            #region TEST ACTION AND VERIFICATION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            String SyncKey1 = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + SyncKey1);
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 3, "Verify that Sync response returns 3 items");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[1]//AirSync:ServerId", null, contactId1, "Verify that 1st Add record has info of 1st contact");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[2]//AirSync:ServerId", null, contactId2, "Verify that 2nd Add record has info of 2nd contact");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add[3]//AirSync:ServerId", null, contactId3, "Verify that 3rd Add record has info of 3rd contact");

            // Send the SyncRequest again with old Sync key, this causes Server to start itemized mode
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            syncRequest.SyncKey = SyncKey1;
            logger.Debug("Value of SyncKey:" + SyncKey1);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns only 1 item, MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, contactId1, "Verify that Add record has info of 1st contact");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//contacts:Email1Address ", null, email1, "Verify Email field is correct - same as 1st contact");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 1, "Verify that Sync response returns MoreAvailable tag");

            // Send the SyncRequest again with new Sync key
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns second item, MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, contactId2, "Verify that Add record has info of 2nd contact");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//contacts:Email1Address ", null, email2, "Verify Email field is correct - same as 2nd contact");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 1, "Verify that Sync response returns MoreAvailable tag");

            // Send the SyncRequest again with new Sync key
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns third item, No MoreAvailable returned and new synckey
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 1, "Verify that Sync response returns only 1 item");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//AirSync:Add//AirSync:ServerId", null, contactId3, "Verify that Add record has info of 3rd contact");
            ZAssert.XmlXpathMatch(syncResponse.XmlElement, "//contacts:Email1Address ", null, email3, "Verify Email field is correct - same as 1st contact");
            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:MoreAvailable", 0, "Verify that Sync response does not returns MoreAvailable tag");

            // Send the SyncRequest again with new Sync key
            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            logger.Debug("Value of SyncKey:" + syncRequest.SyncKey);
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse; //Response returns no items
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            ZAssert.XmlXpathCount(syncResponse.XmlElement, "//AirSync:Add", 0, "Verify that Sync response returns no items");

            #endregion
            
        }
    }
}


