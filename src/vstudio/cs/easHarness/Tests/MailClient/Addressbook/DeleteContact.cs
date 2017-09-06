using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;


namespace Tests.MailClient.Addressbook
{
    [TestFixture]
    public class DeleteContact : Tests.BaseTestFixture
    {

        [Test, Description("Create a contact and then delete it on device and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Delete the contact on device, 3. Sync to server, 4. Verify the contact got deleted from server]")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L0")]
        public void DeleteContact01()
        {
            /*
             * Create a contact on device and then delete it. Verify it syncs on server
             */

            #region CREATE CONTACT
 
            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String fileAs = lastName + " " + firstName;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey + @"</SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
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
                    <ClientId>926</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:Email1Address>" + emailAddress + @"</POOMCONTACTS:Email1Address>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION

            // Send syncrequest/addcontact request
            ZSyncRequest r1 = new ZSyncRequest(TestAccount, xml);
            ZResponse response = TestClient.sendRequest(r1);
            String clientId = "926";
            ZAssert.IsNotNull(response, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            #endregion

            #region TEST VERIFICATION

            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");

            //Get contact id
            String contactId = TestAccount.soapSelectValue(SearchResponse, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='email']", null), emailAddress, "Verify Email value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");


            #endregion

            #endregion

            #region DELETE CONTACT

            #region TEST SETUP

            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;



            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Options>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>32768</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
            <Commands>
                <Delete>
                    <ServerId>" + ServerId + @"</ServerId>
                </Delete>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION

            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);

            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
           
            #endregion

            #region TEST VERIFICATION

            ZAssert.XmlXpathCount(SearchResponse1.DocumentElement, "//mail:cn", 0, "Verify contact deleted from device");

            #endregion

            #endregion
        }


    }

}
