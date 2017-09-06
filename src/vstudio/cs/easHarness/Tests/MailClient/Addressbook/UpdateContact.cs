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
    class UpdateContact: Tests.BaseTestFixture
    {


        [Test, Description("Update a contact's FirstName/LastName and Email on device and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L0")]
        public void UpdateContact01()
        {
            /* 
             * Update a contact's FirstName/LastName and Email on device and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String fileAs = lastName + " " + firstName;
            String lastName1 = "lastnameNew" + HarnessProperties.getUniqueString();
            String firstName1 = "firstnameNew" + HarnessProperties.getUniqueString();
            String emailAddress1 = lastName1 + "@domain.com";
            String fileAs1 = lastName1 + " " + firstName1;

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
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
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

            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION

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
            # endregion

            # endregion

            #region UPDATE CONTACT TEST SETUP AND VERFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;


            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:LastName>" + lastName1 + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName1 + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:FileAs>" + fileAs1 + @"</POOMCONTACTS:FileAs>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data></AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:Email1Address>" + emailAddress1 + @"</POOMCONTACTS:Email1Address>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);

         
            ZAssert.IsNotNull(response, "Verify the Sync response was received");

            XmlDocument SearchResponseLastName = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            String contactId1_lName = TestAccount.soapSelectValue(SearchResponseLastName, "//mail:cn", "id");
            ZAssert.IsNull(contactId1_lName, "Verify the contact with previous lastname does not exist on the server");


            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName1 + @"</query>
			        </SearchRequest>");


            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='lastName']", null), lastName1, "Verify Updated Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='email']", null), emailAddress1, "Verify Updated Email value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='firstName']", null), firstName1, "Verify Updated First Name value");
           
            
            #endregion

            #endregion

        }

        [Test, Description("Update a contact's phone number's on device and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L0")]
        public void UpdateContact02()
        {
            /*
             * Update a contact's phone number's on device and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();

            String mobilePhoneNumber = "11-12223334";
            String pagerNumber = "22-23334444";
            String radioPhoneNumber = "33-31112222";
            String companyMainPhone = "22-23337777";
            String assistnamePhoneNumber = "22-23335555";
            String carPhoneNumber = "22-23336666";
            String businessPhoneNumber = "11-12223336";
            String homePhoneNumber = "11-12223335";

            String mobilePhoneNumber1 = "99-33334444";
            String pagerNumber1 = "88-99998888";
            String radioPhoneNumber1 = "33-33332222";
            String companyMainPhone1 = "22-22221111";
            String assistnamePhoneNumber1 = "11-11110000";
            String carPhoneNumber1 = "44-44443333";
            String businessPhoneNumber1 = "55-55554444";
            String homePhoneNumber1 = "66-66665555";

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
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
                        <POOMCONTACTS:AssistnamePhoneNumber>" + assistnamePhoneNumber + @"</POOMCONTACTS:AssistnamePhoneNumber>
                        <POOMCONTACTS:BusinessPhoneNumber>" + businessPhoneNumber + @"</POOMCONTACTS:BusinessPhoneNumber>
                        <POOMCONTACTS:CarPhoneNumber>" + carPhoneNumber + @"</POOMCONTACTS:CarPhoneNumber>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        <POOMCONTACTS:PagerNumber>" + pagerNumber + @"</POOMCONTACTS:PagerNumber>
                        <POOMCONTACTS:Picture/>
                        <POOMCONTACTS:RadioPhoneNumber>" + radioPhoneNumber + @"</POOMCONTACTS:RadioPhoneNumber>
                        <POOMCONTACTS:HomePhoneNumber>" + homePhoneNumber + @"</POOMCONTACTS:HomePhoneNumber>
                        <POOMCONTACTS2:CompanyMainPhone>" + companyMainPhone + @"</POOMCONTACTS2:CompanyMainPhone>
                    </ApplicationData>                    
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION

            ZSyncRequest r1 = new ZSyncRequest(TestAccount, xml);
            ZResponse response = TestClient.sendRequest(r1);

            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            XmlDocument SearchResponse = TestAccount.soapSend(
                               @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId = TestAccount.soapSelectValue(SearchResponse, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Mobile phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='pager']", null), pagerNumber, "Verify Pager number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='RadioPhoneNumber']", null), radioPhoneNumber, "Verify Radio phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='companyPhone']", null), companyMainPhone, "Verify Company main phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='assistantPhone']", null), assistnamePhoneNumber, "Verify Assistant phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='carPhone']", null), carPhoneNumber, "Verify Car phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workPhone']", null), businessPhoneNumber, "Verify Business phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homePhone']", null), homePhoneNumber, "Verify Home phone number value");

            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

          String xml1=  @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:AssistnamePhoneNumber>" + assistnamePhoneNumber1 + @"</POOMCONTACTS:AssistnamePhoneNumber>
                        <POOMCONTACTS:BusinessPhoneNumber>" + businessPhoneNumber1 + @"</POOMCONTACTS:BusinessPhoneNumber>
                        <POOMCONTACTS:CarPhoneNumber>" + carPhoneNumber1 + @"</POOMCONTACTS:CarPhoneNumber>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber1 + @"</POOMCONTACTS:MobilePhoneNumber>
                        <POOMCONTACTS:PagerNumber>" + pagerNumber1 + @"</POOMCONTACTS:PagerNumber>
                        <POOMCONTACTS:Picture/>
                        <POOMCONTACTS:RadioPhoneNumber>" + radioPhoneNumber1 + @"</POOMCONTACTS:RadioPhoneNumber>
                        <POOMCONTACTS:HomePhoneNumber>" + homePhoneNumber1 + @"</POOMCONTACTS:HomePhoneNumber>
                        <POOMCONTACTS2:CompanyMainPhone>" + companyMainPhone1 + @"</POOMCONTACTS2:CompanyMainPhone>
                    </ApplicationData>  
                </Change>
              </Commands>
        </Collection>
    </Collections>
</Sync>";
          #endregion

            #region TEST ACTION
          ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
          ZResponse response1 = TestClient.sendRequest(r2);


          ZAssert.IsNotNull(response, "Verify the Sync response was received");
          XmlDocument SearchResponse1 = TestAccount.soapSend(
                  @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
          #endregion

            #region TEST VERIFICATION
          //Get contact id
          String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
          ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

          //Verify contact details
          XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                  @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");


          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber1, "Verify Mobile phone number value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='pager']", null), pagerNumber1, "Verify Pager number value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='RadioPhoneNumber']", null), radioPhoneNumber1, "Verify Radio phone number value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='companyPhone']", null), companyMainPhone1, "Verify Company main phone number value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='assistantPhone']", null), assistnamePhoneNumber1, "Verify Assistant phone number value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='carPhone']", null), carPhoneNumber1, "Verify Car phone number value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workPhone']", null), businessPhoneNumber1, "Verify Business phone number value");
          ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homePhone']", null), homePhoneNumber1, "Verify Home phone number value");
          #endregion

            #endregion

        }

        [Test, Description("Update contact with birthday and anniversary values on device and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact03()
        {

            /* 
             * Update contact with birthday and anniversary values on device and verify it syncs on server
             */
            #region CREATE CONTACT TEST SETUP AND VERIFICATION
            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String fileAs = lastName + " " + firstName;
            String birthday = "2014-04-30T09:00:00.000Z";
            String anniversary = "2014-05-01T09:00:00.000Z";

            String birthday1 = "2012-05-23T09:00:00.000Z";
            String anniversary1 = "2013-05-12T09:00:00.000Z";

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
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:Birthday>" + birthday + @"</POOMCONTACTS:Birthday>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:Anniversary>" + anniversary + @"</POOMCONTACTS:Anniversary>
                        <POOMCONTACTS:Email1Address>" + emailAddress + @"</POOMCONTACTS:Email1Address>
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

            ZAssert.IsNotNull(response, "Verify the Sync response was received");

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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='birthday']", null), birthday.Substring(0, 10), "Verify Birthday value updated");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='anniversary']", null), anniversary.Substring(0, 10), "Verify Anniversary value updated");
            #endregion
            #endregion



            #region UPDATE CONTACT TEST SETUP AND VERIFICATION
            #region TEST SETUP

            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            
            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:Birthday>" + birthday1 + @"</POOMCONTACTS:Birthday>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:Anniversary>" + anniversary1 + @"</POOMCONTACTS:Anniversary>
                        <POOMCONTACTS:Email1Address>" + emailAddress + @"</POOMCONTACTS:Email1Address>
                    </ApplicationData>  
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            #endregion


            #region TEST VERIFICATION
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");

            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='birthday']", null), birthday1.Substring(0, 10), "Verify Birthday value updated");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='anniversary']", null), anniversary1.Substring(0, 10), "Verify Anniversary value updated");
        
            #endregion

            #endregion


        }

        [Test, Description("Update contact with address and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact04()
        {
            /*
             * Update contact with address and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION
            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();

            //address
            String businessCity = "Pune";
            String businessCountry = "India";
            String businessPostalCode = "411047";
            String businessState = "Maharashtra";
            String businessStreet = "Business street";
            String businessFaxNumber = "11-12223338";
            //String businessPhoneNumber = "11-12223336";

            String homeCity = "Homecity";
            String homeCountry = "HomeCountry";
            String homePostalCode = "411028";
            String homeState = "HomeState";
            String homeStreet = "HomeStreet";
            //String homePhoneNumber = "11-12223335";
            String homeFaxNumber = "11-12223337";

            //updated Address
            String businessCity1 = "New York";
            String businessCountry1 = "USA";
            String businessPostalCode1 = "52478";
            String businessState1 = "Washington";
            String businessStreet1 = "Business street 2";
            String businessFaxNumber1 = "22-98568545";
            //String businessPhoneNumber = "11-12223336";

            String homeCity1 = "Ontorio";
            String homeCountry1 = "Canada";
            String homePostalCode1 = "77784";
            String homeState1 = "Vancouver";
            String homeStreet1 = "HomeStreet 2";
           // String homePhoneNumber = "11-12223335";
            String homeFaxNumber1 = "66-56565784";

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
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
                        <POOMCONTACTS:BusinessCity>" + businessCity + @"</POOMCONTACTS:BusinessCity>
                        <POOMCONTACTS:BusinessCountry>" + businessCountry + @"</POOMCONTACTS:BusinessCountry>
                        <POOMCONTACTS:BusinessPostalCode>" + businessPostalCode + @"</POOMCONTACTS:BusinessPostalCode>
                        <POOMCONTACTS:BusinessState>" + businessState + @"</POOMCONTACTS:BusinessState>
                        <POOMCONTACTS:BusinessStreet>" + businessStreet + @"</POOMCONTACTS:BusinessStreet>
                        <POOMCONTACTS:BusinessFaxNumber>" + businessFaxNumber + @"</POOMCONTACTS:BusinessFaxNumber>
                         <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:HomeCity>" + homeCity + @"</POOMCONTACTS:HomeCity>
                        <POOMCONTACTS:HomeCountry>" + homeCountry + @"</POOMCONTACTS:HomeCountry>
                        <POOMCONTACTS:HomePostalCode>" + homePostalCode + @"</POOMCONTACTS:HomePostalCode>
                        <POOMCONTACTS:HomeState>" + homeState + @"</POOMCONTACTS:HomeState>
                        <POOMCONTACTS:HomeStreet>" + homeStreet + @"</POOMCONTACTS:HomeStreet>
                        <POOMCONTACTS:HomeFaxNumber>" + homeFaxNumber + @"</POOMCONTACTS:HomeFaxNumber>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                         <POOMCONTACTS:Picture/>
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

            ZAssert.IsNotNull(response, "Verify the Sync response was received");

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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workCity']", null), businessCity, "Verify Business city value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workCountry']", null), businessCountry, "Verify Business country value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workPostalCode']", null), businessPostalCode, "Verify Business postal code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workState']", null), businessState, "Verify Business state code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workStreet']", null), businessStreet, "Verify Business street value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workFax']", null), businessFaxNumber, "Verify Business fax number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeCity']", null), homeCity, "Verify Home city value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeCountry']", null), homeCountry, "Verify Home country value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homePostalCode']", null), homePostalCode, "Verify Home postal code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeState']", null), homeState, "Verify Home state value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeStreet']", null), homeStreet, "Verify Home street value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeFax']", null), homeFaxNumber, "Verify Home fax number value");
            #endregion
            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERIFICATION
            #region TEST SETUP

            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;
            
            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:BusinessCity>" + businessCity1 + @"</POOMCONTACTS:BusinessCity>
                        <POOMCONTACTS:BusinessCountry>" + businessCountry1 + @"</POOMCONTACTS:BusinessCountry>
                        <POOMCONTACTS:BusinessPostalCode>" + businessPostalCode1 + @"</POOMCONTACTS:BusinessPostalCode>
                        <POOMCONTACTS:BusinessState>" + businessState1 + @"</POOMCONTACTS:BusinessState>
                        <POOMCONTACTS:BusinessStreet>" + businessStreet1 + @"</POOMCONTACTS:BusinessStreet>
                        <POOMCONTACTS:BusinessFaxNumber>" + businessFaxNumber1 + @"</POOMCONTACTS:BusinessFaxNumber>
                         <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:HomeCity>" + homeCity1 + @"</POOMCONTACTS:HomeCity>
                        <POOMCONTACTS:HomeCountry>" + homeCountry1 + @"</POOMCONTACTS:HomeCountry>
                        <POOMCONTACTS:HomePostalCode>" + homePostalCode1 + @"</POOMCONTACTS:HomePostalCode>
                        <POOMCONTACTS:HomeState>" + homeState1 + @"</POOMCONTACTS:HomeState>
                        <POOMCONTACTS:HomeStreet>" + homeStreet1 + @"</POOMCONTACTS:HomeStreet>
                        <POOMCONTACTS:HomeFaxNumber>" + homeFaxNumber1 + @"</POOMCONTACTS:HomeFaxNumber>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                         <POOMCONTACTS:Picture/>
                    </ApplicationData>  
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            #endregion


            #region TEST VERIFICATION
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");

            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workCity']", null), businessCity1, "Verify Business city value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workCountry']", null), businessCountry1, "Verify Business country value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workPostalCode']", null), businessPostalCode1, "Verify Business postal code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workState']", null), businessState1, "Verify Business state code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workStreet']", null), businessStreet1, "Verify Business street value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workFax']", null), businessFaxNumber1, "Verify Business fax number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homeCity']", null), homeCity1, "Verify Home city value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homeCountry']", null), homeCountry1, "Verify Home country value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homePostalCode']", null), homePostalCode1, "Verify Home postal code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homeState']", null), homeState1, "Verify Home state value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homeStreet']", null), homeStreet1, "Verify Home street value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homeFax']", null), homeFaxNumber1, "Verify Home fax number value");
            #endregion
            #endregion
        }

        [Test, Description("Update a contact with Webpage URL,job title and company name and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact05()
        {
            /*
             * Update a contact with Webpage URL,job title and company name
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String URL = "www.webpageURL.com";
            String Job = "Developer";
            String Company = "company pvt ltd";

            String URL1 = "www.newurl.com";
            String Job1 = "Sr.developer/manager";
            String Company1 = "Demo Solutions pvt ltd";

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
                        <POOMCONTACTS:WebPage>" + URL + @"</POOMCONTACTS:WebPage>
                        <POOMCONTACTS:CompanyName>" + Company + @"</POOMCONTACTS:CompanyName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                          <POOMCONTACTS:JobTitle>" + Job + @"</POOMCONTACTS:JobTitle>

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

            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId = TestAccount.soapSelectValue(SearchResponse, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeURL']", null), URL, "Verify URL value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='company']", null), Company, "Verify Company value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='jobTitle']", null), Job, "Verify Job Title value");

            #endregion

            # endregion

            #region UPDATE CONTACT TEST SETUP AND VERFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;


            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:WebPage>" + URL1 + @"</POOMCONTACTS:WebPage>
                        <POOMCONTACTS:CompanyName>" + Company1 + @"</POOMCONTACTS:CompanyName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:JobTitle>" + Job1 + @"</POOMCONTACTS:JobTitle>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='homeURL']", null), URL1, "Verify updated URL value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='company']", null), Company1, "Verify updated Company value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='jobTitle']", null), Job1, "Verify updated Job Title value");
            #endregion

            #endregion
        }
        
        [Test, Description("Update a contact's profile pic and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void UpdateContact06()
        {
            /*
             * Update a contact's profile pic and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION
            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String mobilePhoneNumber = "11-12223334";
            String fileAs = lastName + " " + firstName;

            String image = "TestJpg.jpeg";
            String imageMime = MimeEncoder.EncodeBase64File(image);
            String image1 = "TestJpg_New.jpg";
            String imageMime1 = MimeEncoder.EncodeBase64File(image1);

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
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        
                         <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:Picture>" + imageMime + @"</POOMCONTACTS:Picture>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                       
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
            ZSyncResponse syncResponse = TestClient.sendRequest(r1) as ZSyncResponse;
        

            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new appointment
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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Phone value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "filename"), "contact.jpg", "Verify contact image");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "s"), "2877", "Verify original contact image uploaded");
            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        
                         <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:Picture>" + imageMime1 + @"</POOMCONTACTS:Picture>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");



            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@ct='image/jpeg']", "s"), "31739", "Verify contact image updated successfully");
#endregion

            #endregion
        }

        [Test, Description("Update a contact's image from jpeg to png image and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void UpdateContact07()
        {
            /*
             * Update a contact's image from jpeg to png image and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String mobilePhoneNumber = "11-12223334";
            String fileAs = lastName + " " + firstName;

            String image = "TestJpg.jpeg";
            String imageMime = MimeEncoder.EncodeBase64File(image);
            String image1 = "TestPng.png";
            String imageMime1 = MimeEncoder.EncodeBase64File(image1);

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
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        
                         <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:Picture>" + imageMime + @"</POOMCONTACTS:Picture>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                       
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
            ZSyncResponse syncResponse = TestClient.sendRequest(r1) as ZSyncResponse;
        

            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new appointment
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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Phone value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "filename"), "contact.jpg", "Verify contact image");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "s"), "2877", "Verify original contact image uploaded");

            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERFICATION

            #region TEST SETUP

            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        
                         <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:Picture>" + imageMime1 + @"</POOMCONTACTS:Picture>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");



            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@ct='image/jpeg']", "s"), "2104", "Verify contact image updated successfully");

            #endregion

            #endregion


        }

        [Test, Description("Update contact's category/group and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void UpdateContact08()
        {
            /*
             * Update contact's category/group and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String Category = "Friends";
            String fileAs = lastName + " " + firstName;

            String Category1 = "Family";

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey + @"</SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
            <DeletesAsMoves/>
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
                    <ClientId>926</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data></AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:Categories>
                            <POOMCONTACTS:Category>" + Category + @"</POOMCONTACTS:Category>
                        </POOMCONTACTS:Categories>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION
            ZSyncRequest r1 = new ZSyncRequest(TestAccount, xml);
            ZResponse response = TestClient.sendRequest(r1);

            ZAssert.IsNotNull(response, "Verify the Sync response was received");

            XmlDocument SearchResponse = TestAccount.soapSend(
                 @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId = TestAccount.soapSelectValue(SearchResponse, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn", "tn"), Category, "Verify Category added to Contact");
            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:Categories>
                            <POOMCONTACTS:Category>" + Category1 + @"</POOMCONTACTS:Category>
                        </POOMCONTACTS:Categories>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn", "tn"), Category1, "Verify Category added to Contact");

            #endregion
            #endregion
        }

        [Test, Description("Update contact's File as field and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact09()
        {
            /*
             * Update contact's File as field and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String fileAs = lastName + " " + firstName;
            String fileAs1 = firstName + " " + lastName;

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
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
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

            ZAssert.IsNotNull(response, "Verify the Sync response was received");

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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
           
            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
            <Status>1</Status>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Commands>
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:FileAs>" + fileAs1 + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                     </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");

            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");


            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn", "fileAsStr"), fileAs1, "Verify First Name value");
            #endregion

            #endregion


        }

        [Test, Description("Update a contact's picture to nil and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact10()
        {
            /*
             * Update a contact's picture to nil and verify it syncs to server
             */
            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String mobilePhoneNumber = "11-12223334";
            String fileAs = lastName + " " + firstName;

            String image = "TestJpg.jpeg";
            String imageMime = MimeEncoder.EncodeBase64File(image);
           

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
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        
                         <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:Picture>" + imageMime + @"</POOMCONTACTS:Picture>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                       
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
            ZSyncResponse syncResponse = TestClient.sendRequest(r1) as ZSyncResponse;


            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // get the ServerID of the new appointment
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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Phone value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "filename"), "contact.jpg", "Verify contact image");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "s"), "2877", "Verify original contact image uploaded");

            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        
                         <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:Picture/>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='filename']", 0, "Verify image removed successfully");

            #endregion

            #endregion


        }

        [Test, Description("Update a contact, remove home and company phone field , and sycn to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact11()
        {
            /*
             * Update a contact, remove home and company phone field , and verify it sycns on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();

            String mobilePhoneNumber = "11-12223334";
            String companyMainPhone = "22-23337777";
            String homePhoneNumber = "11-12223335";

          

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
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
         
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                       
                        
                        <POOMCONTACTS:HomePhoneNumber>" + homePhoneNumber + @"</POOMCONTACTS:HomePhoneNumber>
                        <POOMCONTACTS2:CompanyMainPhone>" + companyMainPhone + @"</POOMCONTACTS2:CompanyMainPhone>
                    </ApplicationData>                    
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>";


            #endregion

            #region TEST ACTION
            ZSyncRequest r1 = new ZSyncRequest(TestAccount, xml);
            ZResponse response = TestClient.sendRequest(r1);

            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            XmlDocument SearchResponse = TestAccount.soapSend(
                               @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId = TestAccount.soapSelectValue(SearchResponse, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Mobile phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='companyPhone']", null), companyMainPhone, "Verify Company main phone number value");
        
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homePhone']", null), homePhoneNumber, "Verify Home phone number value");
            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP

            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
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
                <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                      <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                         <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:HomePhoneNumber/>
                        <POOMCONTACTS2:CompanyMainPhone/>
                    </ApplicationData>  
                </Change>
              </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            XmlNode xmlResponse = TestAccount.soapSelect(GetContactsResponse1, "//mail:cn");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='companyPhone']", 0, "Verify company phone removed successfully");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homePhone']", 0, "Verify home phone removed successfully");
            #endregion

            #endregion

        }

        [Test, Description("Update contact: Create a contact with home and work email address. Remove work address and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void UpdateContact12()
        {
            /*
             * Update contact: Create a contact with home and work email address. Remove work address and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION
            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress1 = "primaryWork" + "@domain.com";
            String emailAddress2 = "secondaryHome" + "@domain.com";
            String fileAs = lastName + " " + firstName;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
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
                        <POOMCONTACTS:Email1Address>" + emailAddress1 + @"</POOMCONTACTS:Email1Address>
                        <POOMCONTACTS:Email2Address>" + emailAddress2 + @"</POOMCONTACTS:Email2Address>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                         <POOMCONTACTS:Picture/>
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

            ZAssert.IsNotNull(response, "Verify the Sync response was received");

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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fullName']", null), fileAs, "Verify Full Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='email']", null), emailAddress1, "Verify Email address1 value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='email2']", null), emailAddress2, "Verify Email address2 value");

            #endregion
            #endregion 


            #region UPDATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:Email1Address>" + emailAddress1 + @"</POOMCONTACTS:Email1Address>
                        <POOMCONTACTS:Email2Address/>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                            <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION
            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");


            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='email']", null), emailAddress1, "Verify Email address1 value");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='email2']", 0, "Verify home email address removed successfully");
        
            #endregion

            #endregion
        }

        [Test, Description("Update Contact: Create contact with home and work address. Remove home address and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact13()
        {
            /*
             * Update Contact: Create contact with home and work address. Remove home address and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
          
            String businessCity = "Pune";
            String businessCountry = "India";
            String businessPostalCode = "411047";
            String businessState = "Maharashtra";
            String businessStreet = "Business street";
            String businessFaxNumber = "11-12223338";
            String businessPhoneNumber = "11-12223336";

            String homeCity = "Homecity";
            String homeCountry = "HomeCountry";
            String homePostalCode = "411028";
            String homeState = "HomeState";
            String homeStreet = "HomeStreet";
            String homePhoneNumber = "11-12223335";
            String homeFaxNumber = "11-12223337";

            //Sync add request
            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
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
                        
                        <POOMCONTACTS:BusinessCity>" + businessCity + @"</POOMCONTACTS:BusinessCity>
                        <POOMCONTACTS:BusinessCountry>" + businessCountry + @"</POOMCONTACTS:BusinessCountry>
                        <POOMCONTACTS:BusinessPostalCode>" + businessPostalCode + @"</POOMCONTACTS:BusinessPostalCode>
                        <POOMCONTACTS:BusinessState>" + businessState + @"</POOMCONTACTS:BusinessState>
                        <POOMCONTACTS:BusinessStreet>" + businessStreet + @"</POOMCONTACTS:BusinessStreet>
                        <POOMCONTACTS:BusinessFaxNumber>" + businessFaxNumber + @"</POOMCONTACTS:BusinessFaxNumber>
                        <POOMCONTACTS:BusinessPhoneNumber>" + businessPhoneNumber + @"</POOMCONTACTS:BusinessPhoneNumber>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:HomeCity>" + homeCity + @"</POOMCONTACTS:HomeCity>
                        <POOMCONTACTS:HomeCountry>" + homeCountry + @"</POOMCONTACTS:HomeCountry>
                        <POOMCONTACTS:HomePostalCode>" + homePostalCode + @"</POOMCONTACTS:HomePostalCode>
                        <POOMCONTACTS:HomeState>" + homeState + @"</POOMCONTACTS:HomeState>
                        <POOMCONTACTS:HomeStreet>" + homeStreet + @"</POOMCONTACTS:HomeStreet>
                        <POOMCONTACTS:HomeFaxNumber>" + homeFaxNumber + @"</POOMCONTACTS:HomeFaxNumber>
                        <POOMCONTACTS:HomePhoneNumber>" + homePhoneNumber + @"</POOMCONTACTS:HomePhoneNumber>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:Picture/>
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

            ZAssert.IsNotNull(response, "Verify the Sync response was received");

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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
  
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workCity']", null), businessCity, "Verify Business city value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workCountry']", null), businessCountry, "Verify Business country value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workPostalCode']", null), businessPostalCode, "Verify Business postal code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workState']", null), businessState, "Verify Business state code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workStreet']", null), businessStreet, "Verify Business street value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workFax']", null), businessFaxNumber, "Verify Business fax number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='workPhone']", null), businessPhoneNumber, "Verify Business phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeCity']", null), homeCity, "Verify Home city value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeCountry']", null), homeCountry, "Verify Home country value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homePostalCode']", null), homePostalCode, "Verify Home postal code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeState']", null), homeState, "Verify Home state value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeStreet']", null), homeStreet, "Verify Home street value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homePhone']", null), homePhoneNumber, "Verify Home phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeFax']", null), homeFaxNumber, "Verify Home fax number value");
            #endregion
            #endregion
            #region UPDATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP

            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:BusinessCity>" + businessCity + @"</POOMCONTACTS:BusinessCity>
                        <POOMCONTACTS:BusinessCountry>" + businessCountry + @"</POOMCONTACTS:BusinessCountry>
                        <POOMCONTACTS:BusinessPostalCode>" + businessPostalCode + @"</POOMCONTACTS:BusinessPostalCode>
                        <POOMCONTACTS:BusinessState>" + businessState + @"</POOMCONTACTS:BusinessState>
                        <POOMCONTACTS:BusinessStreet>" + businessStreet + @"</POOMCONTACTS:BusinessStreet>
                        <POOMCONTACTS:BusinessFaxNumber>" + businessFaxNumber + @"</POOMCONTACTS:BusinessFaxNumber>
                        <POOMCONTACTS:BusinessPhoneNumber>" + businessPhoneNumber + @"</POOMCONTACTS:BusinessPhoneNumber>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:HomeCity/>
                        <POOMCONTACTS:HomeCountry/>
                        <POOMCONTACTS:HomePostalCode/>
                        <POOMCONTACTS:HomeState/>
                        <POOMCONTACTS:HomeStreet/>
                        <POOMCONTACTS:HomeFaxNumber/>
                        <POOMCONTACTS:HomePhoneNumber/>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:Picture/>
                    <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data/>
                        </AirSyncBase:Body>
                    </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION

            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workCity']", null), businessCity, "Verify Business city value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workCountry']", null), businessCountry, "Verify Business country value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workPostalCode']", null), businessPostalCode, "Verify Business postal code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workState']", null), businessState, "Verify Business state code value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workStreet']", null), businessStreet, "Verify Business street value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workFax']", null), businessFaxNumber, "Verify Business fax number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse1, "//mail:cn/mail:a[@n='workPhone']", null), businessPhoneNumber, "Verify Business phone number value");
         
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homeCity']", 0, "Verify home city removed successfully");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homeCountry']", 0, "Verify home country removed successfully");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homePostalCode']", 0, "Verify home postal removed successfully");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homeState']", 0, "Verify home state removed successfully");

            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homeStreet']", 0, "Verify home street removed successfully");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homePhone']", 0, "Verify home phone removed successfully");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='homeFax']", 0, "Verify home fax removed successfully");


            #endregion
            #endregion
        }

        [Test, Description("Update contact: Create contact with IMAddress and Notes. Remove both and sync to server"),
        Property("TestSteps", "1. Create a contact on device, 2. Update the contact on device, 3. Sync to server, 4. Verify the updates are reflected on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void UpdateContact14()
        {
            /*
             * Update contact: Create contact with IMAddress and Notes. Remove both and verify it syncs on server
             */

            #region CREATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String IMaddress = "IMadd" + HarnessProperties.getUniqueString();
            String Notes = "Notes" + HarnessProperties.getUniqueString();
            String fileAs = lastName + " " + firstName;

            String xml = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey + @"</SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
            <DeletesAsMoves/>
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
                    <ClientId>926</ClientId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data>" + Notes + @"</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS2:IMAddress>" + IMaddress + @"</POOMCONTACTS2:IMAddress>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>";
            #endregion

            #region TEST ACTION

            ZSyncRequest r1 = new ZSyncRequest(TestAccount, xml);
            ZResponse response = TestClient.sendRequest(r1);

            ZAssert.IsNotNull(response, "Verify the Sync response was received");

            XmlDocument SearchResponse = TestAccount.soapSend(
                 @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId = TestAccount.soapSelectValue(SearchResponse, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
			        </GetContactsRequest>");

            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='lastName']", null), lastName, "Verify Last Name value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='firstName']", null), firstName, "Verify First Name value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='imAddress1']", null), IMaddress, "Verify IMAddress value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='notes']", null), Notes, "Verify Notes value");

            #endregion

            #endregion

            #region UPDATE CONTACT TEST SETUP AND VERIFICATION

            #region TEST SETUP
            String SyncKey1 = TestAccount.Device.SyncKeys[CollectionId] as String;
            String clientId = "926";
            XmlElement Add = ZSyncResponse.getMatchingElement(response.XmlElement, "//AirSync:Add", "//AirSync:ClientId[text() = '" + clientId + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            String ServerId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;


            String xml1 = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' xmlns:POOMCONTACTS='contacts' xmlns:POOMCONTACTS2='contacts2'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey1 + @"</SyncKey>
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
               <Change>
                    <ServerId>" + ServerId + @"</ServerId>
                    <ApplicationData>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:Data></AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS2:IMAddress/>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                     </ApplicationData>
                </Change>
            </Commands>
        </Collection>
    </Collections>
</Sync>";

            #endregion

            #region TEST ACTION

            ZSyncRequest r2 = new ZSyncRequest(TestAccount, xml1);
            ZResponse response1 = TestClient.sendRequest(r2);


            ZAssert.IsNotNull(response1, "Verify the Sync response was received");
            XmlDocument SearchResponse1 = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + lastName + @"</query>
			        </SearchRequest>");
            #endregion

            #region TEST VERIFICATION
            //Get contact id
            String contactId1 = TestAccount.soapSelectValue(SearchResponse1, "//mail:cn", "id");
            ZAssert.IsNotNull(contactId1, "Verify the contact is created on the server");

            //Verify contact details
            XmlDocument GetContactsResponse1 = TestAccount.soapSend(
                    @"<GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId1 + @"'/>
			        </GetContactsRequest>");

            XmlNode xmlResponse = TestAccount.soapSelect(GetContactsResponse1, "//mail:cn");
            ZAssert.IsFalse(xmlResponse.InnerXml.Contains("imAddress1"), "Verify IM Address removed successfully");
            ZAssert.IsFalse(xmlResponse.InnerXml.Contains("notes"), "Verify Notes removed successfully");

            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='imAddress1']", 0, "Verify IM Address removed successfully");
            ZAssert.XmlXpathCount(GetContactsResponse1.DocumentElement, "//mail:cn/mail:a[@n='notes']", 0, "Verify Notes removed successfully");

            #endregion
            #endregion
        }
    }
    
}

