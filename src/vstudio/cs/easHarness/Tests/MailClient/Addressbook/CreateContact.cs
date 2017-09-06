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
    public class CreateContact : Tests.BaseTestFixture
    {

        [Test, Description("Create contact with name/email address on device and sync to server"),
        Property("TestSteps", "1. Create a contact with name/email on device, 2. Sync to server, 3. Verify the contact details on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L0")]
        public void CreateContact01()
        {

            /*
             * Create contact with name/email address on device and verify if it is synced to server
             */

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


            #endregion


        }

        [Test, Description("Create contact with multiple fields like home/work/fax numbers, home/work address, webpage, etc on device and sync to server"),
        Property("TestSteps", "1. Create a contact with multiple fields like home/work/fax numbers, home/work address, webpage, etc on device, 2. Sync to server, 3. Verify the contact details on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void CreateContact02()
        {

            /*
             * Create contact with multiple fields like home/work/fax numbers, home/work address, webpage, etc on device and verify if it is synced to server
             */

            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress1 = "primary" + "@domain.com";
            String emailAddress2 = "secondary" + "@domain.com";
            String fileAs = lastName + " " + firstName;

            //numbers
            String mobilePhoneNumber = "11-12223334";
            String pagerNumber = "22-23334444";
            String radioPhoneNumber = "33-31112222";
            String companyMainPhone = "22-23337777";
            String assistnamePhoneNumber = "22-23335555";
            String carPhoneNumber = "22-23336666";

            String webPage = "www.testhome.com";
            String companyName = "TestCompany";

            //address
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
                        <POOMCONTACTS:AssistnamePhoneNumber>" + assistnamePhoneNumber + @"</POOMCONTACTS:AssistnamePhoneNumber>
                        <POOMCONTACTS:BusinessCity>" + businessCity + @"</POOMCONTACTS:BusinessCity>
                        <POOMCONTACTS:BusinessCountry>" + businessCountry + @"</POOMCONTACTS:BusinessCountry>
                        <POOMCONTACTS:BusinessPostalCode>" + businessPostalCode + @"</POOMCONTACTS:BusinessPostalCode>
                        <POOMCONTACTS:BusinessState>" + businessState + @"</POOMCONTACTS:BusinessState>
                        <POOMCONTACTS:BusinessStreet>" + businessStreet + @"</POOMCONTACTS:BusinessStreet>
                        <POOMCONTACTS:BusinessFaxNumber>" + businessFaxNumber + @"</POOMCONTACTS:BusinessFaxNumber>
                        <POOMCONTACTS:BusinessPhoneNumber>" + businessPhoneNumber + @"</POOMCONTACTS:BusinessPhoneNumber>
                        <POOMCONTACTS:CarPhoneNumber>" + carPhoneNumber + @"</POOMCONTACTS:CarPhoneNumber>
                        <POOMCONTACTS:CompanyName>" + companyName + @"</POOMCONTACTS:CompanyName>
                        <POOMCONTACTS:Email1Address>" + emailAddress1 + @"</POOMCONTACTS:Email1Address>
                        <POOMCONTACTS:Email2Address>" + emailAddress2 + @"</POOMCONTACTS:Email2Address>
                        <POOMCONTACTS:FileAs>" + fileAs + @"</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:FirstName>" + firstName + @"</POOMCONTACTS:FirstName>
                        <POOMCONTACTS:HomeCity>" + homeCity + @"</POOMCONTACTS:HomeCity>
                        <POOMCONTACTS:HomeCountry>" + homeCountry + @"</POOMCONTACTS:HomeCountry>
                        <POOMCONTACTS:HomePostalCode>" + homePostalCode + @"</POOMCONTACTS:HomePostalCode>
                        <POOMCONTACTS:HomeState>" + homeState + @"</POOMCONTACTS:HomeState>
                        <POOMCONTACTS:HomeStreet>" + homeStreet + @"</POOMCONTACTS:HomeStreet>
                        <POOMCONTACTS:HomeFaxNumber>" + homeFaxNumber + @"</POOMCONTACTS:HomeFaxNumber>
                        <POOMCONTACTS:HomePhoneNumber>" + homePhoneNumber + @"</POOMCONTACTS:HomePhoneNumber>
                        <POOMCONTACTS:LastName>" + lastName + @"</POOMCONTACTS:LastName>
                        <POOMCONTACTS:MobilePhoneNumber>" + mobilePhoneNumber + @"</POOMCONTACTS:MobilePhoneNumber>
                        <POOMCONTACTS:PagerNumber>" + pagerNumber + @"</POOMCONTACTS:PagerNumber>
                        <POOMCONTACTS:Picture/>
                        <POOMCONTACTS:RadioPhoneNumber>" + radioPhoneNumber + @"</POOMCONTACTS:RadioPhoneNumber>
                        <POOMCONTACTS:WebPage>" + webPage + @"</POOMCONTACTS:WebPage>
                        <POOMCONTACTS2:CompanyMainPhone>" + companyMainPhone + @"</POOMCONTACTS2:CompanyMainPhone>
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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Mobile phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='pager']", null), pagerNumber, "Verify Pager number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='RadioPhoneNumber']", null), radioPhoneNumber, "Verify Radio phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='companyPhone']", null), companyMainPhone, "Verify Company main phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='assistantPhone']", null), assistnamePhoneNumber, "Verify Assistant phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='carPhone']", null), carPhoneNumber, "Verify Car phone number value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='homeURL']", null), webPage, "Verify Home Web URL value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='company']", null), companyName, "Verify Company name value");
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


        }

        [Test, Description("Create contact with birthday and anniversary values on device and sync to server"),
        Property("TestSteps", "1. Create a contact with birthday and anniversary values on device, 2. Sync to server, 3. Verify the contact details on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void CreateContact03()
        {

            /*
             * Create contact with birthday and anniversary values on device and verify if it is synced to server
             */

            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String fileAs = lastName + " " + firstName;
            String birthday = "2014-04-30T09:00:00.000Z";
            String anniversary = "2014-05-01T09:00:00.000Z";

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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='birthday']", null), "2014-04-30", "Verify Birthday value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='anniversary']", null), "2014-05-01", "Verify Anniversary value");

            #endregion


        }

        [Test, Description("Create contact with multiple fields and jpeg contact image on device and sync to server"),
        Property("TestSteps", "1. Create a contact with  multiple fields and jpeg contact image on device, 2. Sync to server, 3. Verify the contact details on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void CreateContact04()
        {


            /*
             * Create contact with multiple fields and jpeg contact image on device and verify it syncs on server
             */

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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Phone value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "filename"), "contact.jpg", "Verify contact image");
            #endregion

        }

        [Test, Description("Create contact with multiple fields like IMAddress and Notes on device and sync to server"),
        Property("TestSteps", "1. Create a contact  with multiple fields like IMAddress and Notes on device, 2. Sync to server, 3. Verify the contact details on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void CreateContact05()
        {
            /*
             * Create contact with multiple fields like IMAddress and Notes and sync to server
             */

            #region TEST SETUP
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String IMaddress = "IMadd" + HarnessProperties.getUniqueString();
            String Notes = "Notes" + HarnessProperties.getUniqueString();
            String fileAs = lastName + " " + firstName;

            String xml= @"<?xml version='1.0' encoding='utf-8'?>
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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='imAddress1']", null), IMaddress, "Verify IMAddress value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='notes']", null), Notes, "Verify Notes value");

             #endregion

        }

        [Test, Description("Create contact with multiple fields and png contact image on device and sync to server"),
        Property("TestSteps", "1. Create a contact with multiple fields and png contact image on device, 2. Sync to server, 3. Verify the contact details on server")]
        [Category("Functional")]
        [Category("Contacts")]
        [Category("L2")]
        public void CreateContact06()
        {
            /*
             * Create contact with multiple fields and "png" contact image on device and verify it syncs on server
             */

            #region TEST SETUP

            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String emailAddress = lastName + "@domain.com";
            String mobilePhoneNumber = "11-12223334";
            String fileAs = lastName + " " + firstName;

            String image = "TestPng.png";
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
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='mobilePhone']", null), mobilePhoneNumber, "Verify Phone value");
            string FileAs = TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='fileAs']", null);
            ZAssert.IsTrue(FileAs.Contains(fileAs), "Verify FileAs value");
            ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@ct='image/jpeg']", "filename"), "contact.jpg", "Verify contact image");
            #endregion  
        }

        [Test, Description("Create contact with Group/Category added to it on device and sync to server"),
        Property("TestSteps", "1. Create a contact with Group/Category added to it on device, 2. Sync to server, 3. Verify the contact details on server")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void CreateContact07()
        {

            /* 
             * Create contact with Group/Category added to it and verify it syncs to server
             */

            #region TEST SETUP  
            String CollectionId = HarnessProperties.getString("folder.contacts.id");
            String SyncKey = TestAccount.Device.SyncKeys[CollectionId] as String;
            String lastName = "lastname" + HarnessProperties.getUniqueString();
            String firstName = "firstname" + HarnessProperties.getUniqueString();
            String Category = "Friends";
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
           // ZAssert.AreEqual(TestAccount.soapSelectValue(GetContactsResponse, "//mail:cn/mail:a[@n='notes']", null), Notes, "Verify Notes value");

            #endregion
        }

    }
}