using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Search
{

    #region Notes/Comments
    /*    
     * iPhone 6 (iOS 9.3.1) request
<Search xmlns="Search">
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>5</AirSync:CollectionId>
                <FreeText>Html</FreeText>
                <LessThan>
                    <POOMMAIL:DateReceived/>
                    <Value>2016-06-28T06:30:00.000Z</Value>
                </LessThan>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>1</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>0</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
     * 
     */
    #endregion

    [TestFixture]
    public class SearchMailbox : Tests.BaseTestFixture
    {
        public ZimbraAccount account1;
        String folderid = HarnessProperties.getString("folder.inbox.id");

        [SetUp]
        public void BeforeTest()
        {
            //This step is needed to enable MimeSupport for Search operation. See https://bugzilla.zimbra.com/show_bug.cgi?id=100436 for more info

            XmlDocument ModifyAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                "<ModifyAccountRequest xmlns='urn:zimbraAdmin'>"
                + "<id xmlns=''>" + TestAccount.ZimbraId + "</id>"
                + "<a n='zimbraMobileSearchMimeSupportEnabled'>TRUE</a>"
                + "</ModifyAccountRequest>");

            XmlNode response = ZimbraAdminAccount.GlobalAdmin.soapSelect(ModifyAccountResponse, "//admin:ModifyAccountResponse");

        }

        public SearchMailbox()
        {
            
            // Create accounts used in test
            account1 = new ZimbraAccount();
            account1.provision();
            account1.authenticate();

        }

        [Test, Description("Search plain format email on server residing in Inbox folder - Type=1"),
        Property("TestSteps", "1. Send a plain text mail to device user and sync to device, 2. Search for the mail on device and verify the message details are correct")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L0")] 
        public void SearchMailbox01()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String currentTime = System.DateTime.Now.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-ddTHH:mm:ss.000Z");

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + this.TestAccount.EmailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");

            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");

            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion


            #region TEST ACTION

            // Send the SearchRequest for added email 
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + folderid + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
                <LessThan>
                    <email:DateReceived/>
                    <Value>" + currentTime + @"</Value>
                </LessThan>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>1</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>0</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            ZSearchResponse zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Type", null, "1", "Verify the Type is correct i.e plain format");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. plain on server");

            
            #endregion

        }

        [Test, Description("Search Html format email on server residing in Inbox folder - Type=2"),
        Property("TestSteps", "1. Send a html format mail to device user and sync to device, 2. Search for the mail on device and verify the message details are correct")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L0")] 
        public void SearchMailbox02()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";
            String currentTime = System.DateTime.Now.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-ddTHH:mm:ss.000Z");

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + this.TestAccount.EmailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='multipart/alternative'>
                            <mp ct='text/plain'>
                                <content>" + content + @"</content>
                            </mp>
                            <mp ct='text/html'>
                                <content>" + contentHtml + @"</content>
                            </mp>
                        </mp>
                    </m>
                </SendMsgRequest>");

            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");

            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion


            #region TEST ACTION

            // Send the SearchRequest for added email 
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + folderid + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>2</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>0</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            ZSearchResponse zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            #endregion

        }

        [Test, Description("HTC style - Search Html format email on server residing in Inbox folder - Type=2"),
        Property("TestSteps", "1. Send a html format mail to HTC M9 device user and sync to device, 2. Search for the mail on device and verify the message details are correct"),
        Property("Bug", 105671)]
        [Category("Functional")]
        [Category("Search")]
        [Category("L2")]
        //Bug#105671 - HTC M9 - Email searched on server comes with no content
        //Bug is because HTC device is sending TruncationSize as 0 in Search request. This looks to be Device issue
        public void SearchMailbox03()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";
            String currentTime = System.DateTime.Now.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-ddTHH:mm:ss.000Z");

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + this.TestAccount.EmailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='multipart/alternative'>
                            <mp ct='text/plain'>
                                <content>" + content + @"</content>
                            </mp>
                            <mp ct='text/html'>
                                <content>" + contentHtml + @"</content>
                            </mp>
                        </mp>
                    </m>
                </SendMsgRequest>");

            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");

            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion


            #region TEST ACTION

            // Send the SearchRequest for added email 
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + folderid + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
            </And>
        </Query>
        <Options>
            <RebuildResults/>
            <DeepTraversal/>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>2</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>0</AirSyncBase:TruncationSize>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>0</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            ZSearchResponse zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            #endregion

        }

        [Test, Description("Search Html format email on server with MIMESupport=1"),
        Property("TestSteps", "1. Send a html format mail to device user and sync to device, 2. Search for the mail on device and verify the message details are correct. Validate - Searched message data is not Mime")]
        [Category("Functional")]
        [Category("Search")]
        [Category("L2")]
        public void SearchMailbox04()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";
            String currentTime = System.DateTime.Now.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-ddTHH:mm:ss.000Z");

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + this.TestAccount.EmailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='multipart/alternative'>
                            <mp ct='text/plain'>
                                <content>" + content + @"</content>
                            </mp>
                            <mp ct='text/html'>
                                <content>" + contentHtml + @"</content>
                            </mp>
                        </mp>
                    </m>
                </SendMsgRequest>");

            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");

            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion


            #region TEST ACTION

            // Send the SearchRequest for added email 
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + folderid + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>2</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>1</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            ZSearchResponse zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e Html format");

            //Validate - Searched message data is not Mime 
            String data = Result.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.IsFalse(data.Contains("From: " + account1.EmailAddress), "Verify that Data field represents regular body and NOT Mime");
            
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct i.e. Server returned regular body for Non-S/MIME message");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            #endregion

        }

        [Test, Description("Search Html format email on server with MIMESupport=2"),
        Property("TestSteps", "1. Send a html format mail to device user and sync to device, 2. Search for the mail on device and verify the message details are correct. Validate - Searched message  Mime"),
        Property("Bug", 106016)]
        [Category("Functional")]
        [Category("Search")]
        [Category("L2")]
        public void SearchMailbox05()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";
            String currentTime = System.DateTime.Now.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-ddTHH:mm:ss.000Z");

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + this.TestAccount.EmailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='multipart/alternative'>
                            <mp ct='text/plain'>
                                <content>" + content + @"</content>
                            </mp>
                            <mp ct='text/html'>
                                <content>" + contentHtml + @"</content>
                            </mp>
                        </mp>
                    </m>
                </SendMsgRequest>");

            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");

            // Send the SyncRequest
            
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>4</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion


            #region TEST ACTION

            // Send the SearchRequest for added email 
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + folderid + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>4</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>2</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            ZSearchResponse zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Type", null, "4", "Verify the Type is correct i.e MIME format");

            //Mime Data validation
            String mimeData = Result.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.IsTrue(mimeData.Contains("From: " + account1.EmailAddress), "Mime has correct From address");
            ZAssert.IsTrue(mimeData.Contains("To: " + TestAccount.EmailAddress), "Mime has correct To address");
            ZAssert.IsTrue(mimeData.Contains("Subject: " + subject), "Mime has correct subject");
            ZAssert.IsTrue(mimeData.Contains(contentHtmlEAS), "Mime has correct content");

            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            
            #endregion

        }

        [Test, Description("Search plain format email on server residing in Non-Inbox folder"),
        Property("TestSteps", "1. Create an Inbox level sub-folder, 2. Send a plain text mail to device user and sync to device, 3. Move this mail to sub folder, 4. Search for the mail on device and verify the message details are correct")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L0")] 
        public void SearchMailbox06()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            String currentTime = System.DateTime.Now.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-ddTHH:mm:ss.000Z");

            #region Create sub folder (Inbox level)
            String subFolderName = "folder" + HarnessProperties.getUniqueString();

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + subFolderName + "' l='" + folderid + "'/>" +
                    "</CreateFolderRequest>");

            String subFolderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            #endregion

            #region FolderSync
            // Send FolderSync (using the latest FolderSyncKey, so that we only pick up new changes)
            ZResponse response = TestClient.sendRequest(
                TestAccount,
                "<?xml version='1.0' encoding='utf-8'?>" +
                "<FolderSync xmlns='FolderHierarchy'>" +
                    "<SyncKey>" + TestAccount.Device.FolderSyncKey + @"</SyncKey>" +
                "</FolderSync>");
            ZAssert.IsNotNull(response, "Verify the response was received");

            ZFolderSyncResponse folderSync = response as ZFolderSyncResponse;
            ZAssert.IsNotNull(folderSync, "Verify the Folder Sync response was received");

            #endregion

            #region Initial Sync created sub-folder

            ZSyncRequest syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            ZSyncResponse syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            #endregion  

            #region Get message and move it to sub-folder

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + this.TestAccount.EmailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");

            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");

            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");

            TestAccount.soapSend(
                @"<MsgActionRequest xmlns='urn:zimbraMail'>
                    <action id='" + messageID + @"' op='move' l='" + subFolderId + @"'/>
                </MsgActionRequest>");

            #endregion 

            #region Verify moved message is synced to sub-folder

            // Device validation: Send the SyncRequest - sub folder, should get Add for the message
            syncRequest1 = new ZSyncRequest(TestAccount);
            syncRequest1.CollectionId = subFolderId;
            syncResponse1 = TestClient.sendRequest(syncRequest1) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse1, "Verify the Sync response was received");

            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse1.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageID + "']");
            ZAssert.IsNotNull(Add, "Verify the message got moved to sub folder");

            #endregion 

            #endregion


            #region TEST ACTION

            // Send the SearchRequest for added email 
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + subFolderId + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>1</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>0</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            ZSearchResponse zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Type", null, "1", "Verify the Type is correct i.e plain format");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. plain on server");

            #endregion

        }

        [Test, Description("Search Html format email on server and check for Truncation with MIMESupport=1 (Regular data response) using TruncationSize value"),
        Property("TestSteps", "1. Send a html format mail to device user and sync to device, 2. Search for the mail on device and verify the message details are correct.")]
        [Category("Functional")]
        [Category("Search")]
        [Category("L2")]
        public void SearchMailbox07()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";
            String currentTime = System.DateTime.Now.AddHours(1).ToUniversalTime().ToString(@"yyyy-MM-ddTHH:mm:ss.000Z");

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + this.TestAccount.EmailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='multipart/alternative'>
                            <mp ct='text/plain'>
                                <content>" + content + @"</content>
                            </mp>
                            <mp ct='text/html'>
                                <content>" + contentHtml + @"</content>
                            </mp>
                        </mp>
                    </m>
                </SendMsgRequest>");

            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");

            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            #endregion


            #region TEST ACTION

            // Send the SearchRequest for added email with low TruncationSize
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + folderid + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>2</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>10</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>1</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            ZSearchResponse zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");

            int EstimatedDataSize = Convert.ToInt32(Result.SelectSingleNode("//AirSyncBase:EstimatedDataSize", ZAssert.NamespaceManager).InnerText);

            if (EstimatedDataSize > 10)
            {
                ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Truncated", null, "1", "Verify that body is truncated as body size exceeds TruncationSize value");
            }
            else
            {
                return;
            }

            String newTruncationSize = Convert.ToString(EstimatedDataSize + 50);

            // Send the SearchRequest for above email with increased TruncationSize
            searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search' xmlns:AirSync='AirSync' xmlns:email='Email' xmlns:AirSyncBase='AirSyncBase'>
    <Store>
        <Name>Mailbox</Name>
        <Query>
            <And>
                <AirSync:Class>Email</AirSync:Class>
                <AirSync:CollectionId>" + folderid + @"</AirSync:CollectionId>
                <FreeText>" + subject + @"</FreeText>
            </And>
        </Query>
        <Options>
            <Range>0-99</Range>
            <AirSyncBase:BodyPreference>
                <AirSyncBase:Type>2</AirSyncBase:Type>
                <AirSyncBase:TruncationSize>" + newTruncationSize + @"</AirSyncBase:TruncationSize>
                <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
            </AirSyncBase:BodyPreference>
            <AirSync:MIMESupport>1</AirSync:MIMESupport>
            <DeepTraversal/>
            <RebuildResults/>
        </Options>
    </Store>
</Search>
");

            // Send the request
            zSearchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(zSearchResponse, "Verify the Search response was received");

            Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            //Verify that body is not trunated this time
            ZAssert.XmlXpathCount(Result, "//AirSyncBase:Truncated", 0, "Verify that Truncated element is not returned in response");

            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e Html format");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct i.e. has full content and not truncated one");
            
            #endregion

        }
    }
}
