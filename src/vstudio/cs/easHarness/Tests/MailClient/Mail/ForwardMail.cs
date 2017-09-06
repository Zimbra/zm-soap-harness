using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Mail
{
    [TestFixture]
    public class ForwardMail : Tests.BaseTestFixture
    {
        public ZimbraAccount account1, account2;
        String folderid = HarnessProperties.getString("folder.inbox.id");

        public ForwardMail()
        {

            // Create accounts used in test
            account1 = new ZimbraAccount();
            account1.provision();
            account1.authenticate();

            account2 = new ZimbraAccount();
            account2.provision();
            account2.authenticate();

        }

        [Test, Description("Forward plain text email"),
        Property("TestSteps", "1. Send email from account1 to EAS user, 2. Forward the plain mail from EAS user, 3. Verify the forwarded email is in Sent folder, 4. Verify the message content and is received by the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void ForwardMail01()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String forwardSubject = "Fwd: " + subject;
            String content = "content" + HarnessProperties.getUniqueString();
            String forwardContent = "Forwarded the received email";
            String sentMessageId = "<" + HarnessProperties.getUniqueString() + "@" + TestAccount.DomainName + ">";

            #region Send email from account1 to EAS user

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

            #region Sync email on device and Save the Original Message-ID

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
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
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

            String mimeData = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            int index1 = mimeData.IndexOf("Message-ID");
            String incomingMessageId = MimeBuilder.getValueFromMime(mimeData, "Message-ID");

            #endregion

            #region Create Mime for SendMail - forward plain


            String mime =
@"Subject: " + "Fwd: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account2.EmailAddress + @"
Message-Id: " + sentMessageId + @"
Date: Thu, 14 Nov 2016 13:52:46 -0800
References: " + incomingMessageId + @"
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

" + forwardContent + @"
----- Forwarded message -----" + @"
" + content;

            #endregion

            #endregion


            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION

            #region Verify the forwarded email is in Sent folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.sent.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + forwardSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account2.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. plain on server");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, forwardContent + "\r\n----- Forwarded message -----\r\n" + content, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account2.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");
            XmlNode m = account2.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account2.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion


            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account2.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"'/>
			        </GetMsgRequest>");
            m = account2.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:su", null), forwardSubject, "Verify that forwarded subject is correct");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account2.EmailAddress, "Verify that To address is correct");           
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "Content-type is text/plain");

            String soapContent = account2.soapSelectValue(GetMsgResponse, "//mail:content", null);
            String forwardedContent = forwardContent + "\r\n----- Forwarded message -----\r\n" + content + "\r\n";
            ZAssert.AreEqual(soapContent, forwardedContent, "Verify that forwarded message content is correct i.e. has forwarded + original content");

            #endregion

            #endregion

        }

        [Test, Description("Forward html text email"),
        Property("TestSteps", "1. Send email from account1 to EAS user, 2. Forward the html mail from EAS user, 3. Verify the forwarded email is in Sent folder, 4. Verify the message content and is received by the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void ForwardMail02()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String forwardSubject = "Fwd: " + subject;
            String content = "This message has html bold text";
            String forwardContent = "Forwarded the received email";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";
            String forwardContentHtmlEAS = "<html><body>Forwarded the <strong>received</strong> email</body></html>";
            String sentMessageId = "<" + HarnessProperties.getUniqueString() + "@" + TestAccount.DomainName + ">";

            #region Send email from account1 to EAS user

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

            #region Sync email on device and Save the Original Message-ID

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
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
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

            String mimeData = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            int index1 = mimeData.IndexOf("Message-ID");
            String incomingMessageId = MimeBuilder.getValueFromMime(mimeData, "Message-ID");

            #endregion

            #region Create Mime for SendMail - forward html

            String mimeText =
@"Subject: " + "Fwd: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account2.EmailAddress + @"
Message-Id: " + sentMessageId + @"
Date: Thu, 14 Nov 2016 13:52:46 -0800
References: " + incomingMessageId + @"
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String plainContent = forwardContent + "\r\n\r\n----- Forwarded message -----\r\n\r\n" + content;
            String htmlContent = forwardContentHtmlEAS + "<html><body><br><br>----- Forwarded message -----<br><br></body></html>" + contentHtmlEAS;

            String mime = MimeBuilder.getHtmlMsgMime(mimeText, plainContent, htmlContent);


            #endregion

            #endregion


            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION

            #region Verify the forwarded email is in Sent folder

            syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[HarnessProperties.getString("folder.sent.id")] + @"</SyncKey>
            <CollectionId>" + HarnessProperties.getString("folder.sent.id") + @"</CollectionId>
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
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + forwardSubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account2.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, forwardContentHtmlEAS + "<html><body><br><br>----- Forwarded message -----<br><br></body></html>" + contentHtmlEAS, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account2.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");
            XmlNode m = account2.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account2.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion


            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account2.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account2.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:su", null), forwardSubject, "Verify that forwarded email subject is correct");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account2.EmailAddress, "Verify that To address is correct");           
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Content-type is multipart/alternative");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content-type is text/plain");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "text/html", "Second part content-type is text/html");

            String soapContent = account2.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']/mail:content", null);
            ZAssert.AreEqual(soapContent, data, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

    }
}

