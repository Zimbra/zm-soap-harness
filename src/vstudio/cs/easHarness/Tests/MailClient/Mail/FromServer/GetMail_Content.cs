using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;
using System.IO;

namespace Tests.MailClient.Mail.FromServer
{

    /* Type Definitions:
     * 1 - Plain text
     * 2 - Html
     * 3 - RTF
     * 4 - MIME
     */

    /*MIMESupport Definitions:
     * 0 - Never send MIME data.
     * 1 - Send MIME data for S/MIME messages only. Send regular body for all other messages.
     * 2 - Send MIME data for all messages. This flag could be used by clients to build a more rich and complete Inbox solution.
     */

    [TestFixture]
    public class GetMail_Content : Tests.BaseTestFixture
    {
        public ZimbraAccount account1;
        String folderid = HarnessProperties.getString("folder.inbox.id");

        public GetMail_Content()
        {

            // Create accounts used in test
            account1 = new ZimbraAccount();
            account1.provision();
            account1.authenticate();

        }

        [Test, Description("Get/Sync plain format email on server"),
        Property("TestSteps", "1. Send mail with text/plain content, 2. Sync to device, 3. Verify the mail is added to the Inbox")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void GetMail_Content01()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            
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

            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");
         
            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "1", "Verify the Type is correct i.e plain format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. plain on server");

            #endregion

        }

        [Test, Description("Get/Sync html format email on server"),
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void GetMail_Content02()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";

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

            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            #endregion

        }

        [Test, Description("Get/Sync html format email on server requesting for Type=4 (MIME response) and MimeSupport=1"),
        Property("Bug", 106015), 
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox and validate Synced message data is not Mime ")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content03()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";

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

            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>1</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");

            //Validate - Synced message data is not Mime 
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.IsFalse(data.Contains("From: " + account1.EmailAddress), "Verify that Data field represents regular body and NOT Mime");

            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct i.e. Server returned regular body for Non-S/MIME message");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            #endregion

        }

        [Test, Description("Get/Sync html format email on server requesting for Type=2 (Html response) and MimeSupport=1"),
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox and validate Synced message data is not Mime ")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content03_1()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";

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

            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>1</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e Html format");

            //Validate - Synced message data is not Mime 
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.IsFalse(data.Contains("From: " + account1.EmailAddress), "Verify that Data field represents regular body and NOT Mime");

            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct i.e. Server returned regular body for Non-S/MIME message");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            #endregion

        }

        [Test, Description("Get/Sync html format email on server requesting for Type=4 and MimeSupport=2"),
        Property("Bug", 106016), 
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox and validate MIME data")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content04()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";

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

            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "4", "Verify the Type is correct i.e Mime format");

            //Mime Data validation
            String mimeData = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.IsTrue(mimeData.Contains("From: " + account1.EmailAddress), "Mime has correct From address");
            ZAssert.IsTrue(mimeData.Contains("To: " + TestAccount.EmailAddress), "Mime has correct To address");
            ZAssert.IsTrue(mimeData.Contains("Subject: " + subject), "Mime has correct subject");
            ZAssert.IsTrue(mimeData.Contains(contentHtmlEAS), "Mime has correct content");

            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            #endregion

        }

        [Test, Description("Get/Sync html format email on server and check for Truncation with MIMESupport=2 (MIME data response) using TruncationSize value (AllOrNone=0)"),
        Property("Bug", 106017), 
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox and validate MIME data, 4. Verify that body is not trunated this time")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content05()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";

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

            #endregion


            #region TEST ACTION

            //Remember the SyncKey as client will resync with old SyncKey if data is truncated
            String syncKey = TestAccount.Device.SyncKeys[folderid] as String;

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>128</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");

            int EstimatedDataSize = Convert.ToInt32(Add.SelectSingleNode("//AirSyncBase:EstimatedDataSize", ZAssert.NamespaceManager).InnerText);

            if (EstimatedDataSize > 128)
            {
                ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Truncated", null, "1", "Verify that body is truncated as body size exceeds TruncationSize value");
            }
            else
            {
                return;
            }

            String newTruncationSize = Convert.ToString(EstimatedDataSize + 50);

            // Send the SyncRequest with old sync key
            syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + syncKey + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>" + newTruncationSize + @"</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            //Verify that body is not trunated this time
            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Truncated", 0, "Verify that Truncated element is not returned in response");

            //Mime Data validation
            String mimeData = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.IsTrue(mimeData.Contains("From: " + account1.EmailAddress), "Mime has correct From address");
            ZAssert.IsTrue(mimeData.Contains("To: " + TestAccount.EmailAddress), "Mime has correct To address");
            ZAssert.IsTrue(mimeData.Contains("Subject: " + subject), "Mime has correct subject");
            ZAssert.IsTrue(mimeData.Contains(contentHtmlEAS), "Mime has correct content");

            #endregion

        }

        [Test, Description("Get/Sync html format email on server and check for Truncation with MIMESupport=1 (Regular data response) using TruncationSize value (AllOrNone=0)"),
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox, 4. Verify that body is not trunated this time")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content06()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";

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

            #endregion


            #region TEST ACTION

            //Remember the SyncKey as client will resync with old SyncKey if data is truncated
            String syncKey = TestAccount.Device.SyncKeys[folderid] as String;

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>10</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>1</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");

            int EstimatedDataSize = Convert.ToInt32(Add.SelectSingleNode("//AirSyncBase:EstimatedDataSize", ZAssert.NamespaceManager).InnerText);

            if (EstimatedDataSize > 10)
            {
                ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Truncated", null, "1", "Verify that body is truncated as body size exceeds TruncationSize value");
            }
            else
            {
                return;
            }

            String newTruncationSize = Convert.ToString(EstimatedDataSize + 50);

            // Send the SyncRequest with old sync key
            syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + syncKey + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>" + newTruncationSize + @"</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>1</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Verify that body is not trunated this time
            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Truncated", 0, "Verify that Truncated element is not returned in response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, contentHtmlEAS, "Verify the content is correct i.e. has full content and not truncated one");

            #endregion

        }
        
        [Test, Description("Get/Sync html format email on server and check for Truncation with MIMESupport=1 using TruncationSize value (AllOrNone=1)"),
        Property("Bug", 106994), 
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox, 4. Verify the body is truncated")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content07()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            
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

            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>10</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>1</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>1</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");

            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Truncated", null, "1", "Verify that body is truncated as body size exceeds TruncationSize value");
            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Data", 0, "Verify that Data element is not returned in response when AllOrNone=1 and body is truncated");
            

            #endregion

        }

        /*
         * Steps: 
         * Client includes multiple BodyPreference elements in Sync request with different values of Type 
         * 1. With Type=2, TruncationSize as 10 and AllOrNone=1
         * 2. With Type=1, TruncationSize as 10 and AllOrNone=0
         * 
         * Expected:
         * Since, the Server will truncate response for both Type=1 and 2, server returns response for plain text as it has AllOrNone=0
         */

        [Test, Description("Check message truncation if the client requests with different types one with AllOrNone=1 and other with AllOrNone=0"),
        Property("Bug", 106994), 
        Property("TestSteps", "1. Send mail with text/html content, 2. Sync to device, 3. Verify the mail is added to the Inbox, 4. Verify the body is truncated")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content08()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has html bold text";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";

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

            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>10</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>1</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>10</AirSyncBase:TruncationSize>
                    <AirSyncBase:AllOrNone>0</AirSyncBase:AllOrNone>
                </AirSyncBase:BodyPreference>
                <MIMESupport>1</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            
            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");

            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Truncated", null, "1", "Verify that body is truncated as body size exceeds TruncationSize value");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "1", "Verify the Type is correct i.e plain format in the response");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, "This me...", "Verify the Data/content is in plain format and is truncated");


            #endregion

        }

        /*
         * MIMETruncation Defintions
         * 0 - Truncate all body text
         * 1 - Truncate text over 4096 characters
         * 2 - Truncate text over 5120 characters
         * 8 - Do no truncate, send complete MIME data
         */
        [TestCase(1), Description("Verify MIMETruncation scenarios in Sync request"),
        Property("Bug", 107096 ), 
        Property("TestSteps", "1. Send the test mail to the mailbox, 2. Sync to device, 3. Verify if mime data is truncated or not based on the MIMETruncation value in Sync request")]
        [TestCase(0)]
        [TestCase(8)]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Content09(int mimetruncation)
        {

            #region TEST SETUP

            // Inject the test message to the mailbox
            String mime = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime4K.txt";
            String subject = "subject" + HarnessProperties.getUniqueString();
            String mimeData = null;


            String text = File.ReadAllText(mime);
            text = text.Replace("MimeSizeOver4KCharacters", subject);
            
            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");
            #endregion


            #region TEST ACTION

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
                <FilterType>1</FilterType>
                <MIMETruncation>" + mimetruncation + @"</MIMETruncation>
                <MIMESupport>2</MIMESupport>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion


            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            //Verify if mime data is truncated or not based on the MIMETruncation value in Sync request
            switch (mimetruncation)
            {
                case 1:
                    ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Truncated", null, "1", "Verify that mime body is truncated as body size exceeds 4096 characters");
                    mimeData = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
                    ZAssert.IsFalse(mimeData.Contains("make this assessment."), "Mime does not have last 3 words indicating mime body got truncated");
                    break;

                case 0:
                    ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Truncated", null, "1", "Verify that mime body is truncated as MIMETruncation=0 means Truncate all text");
                    ZAssert.XmlXpathCount(Add, "//AirSyncBase:Data", 0, "Verify that Data element is not returned in response as all text would get truncated");
                    break;

                case 8:
                    ZAssert.XmlXpathCount(Add, "//AirSyncBase:Truncated", 0, "Verify that Truncated element is not returned in response as  MIMETruncation=8 means do not truncate text");
                    mimeData = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
                    ZAssert.IsTrue(mimeData.Contains("make this assessment."), "Mime should have last 3 words indicating full mime body was returned");
                    break;

            }

            #endregion

        }
        
    }
}