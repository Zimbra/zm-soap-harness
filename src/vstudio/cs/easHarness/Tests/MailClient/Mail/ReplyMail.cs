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
    public class ReplyMail : Tests.BaseTestFixture
    {
        public ZimbraAccount account1;
        String folderid = HarnessProperties.getString("folder.inbox.id");

        public ReplyMail()
        {

            // Create accounts used in test
            account1 = new ZimbraAccount();
            account1.provision();
            account1.authenticate();

        }

        [Test, Description("Reply to plain text email"),
        Property("TestSteps", "1. Send email with plain text content from account1 to EAS user, 2. Reply to this mail from EAS user, 3. Verify the replied email is in Sent folder, 4. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void ReplyMail01()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String replySubject = "Re: " + subject;
            String content = "content" + HarnessProperties.getUniqueString();
            String replyContent = "Replied to the received email";
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

            #region Create Mime for SendMail - reply

            
            String mime =
@"Subject: " + "Re: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account1.EmailAddress + @"
Message-Id: " + sentMessageId + @"
Date: Thu, 14 Nov 2016 13:52:46 -0800
References: " + incomingMessageId + @"
In-Reply-To: " + incomingMessageId + @"
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

" + replyContent + @"
----- Reply message -----" + @"
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

            #region Verify the replied email is in Sent folder

            syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.sent.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + replySubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account1.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. plain on server");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, replyContent + "\r\n----- Reply message -----\r\n" + content, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");
            XmlNode m = account1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account1.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion


            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account1.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"'/>
			        </GetMsgRequest>");
            m = account1.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:su", null), replySubject, "Verify that replied email subject is correct");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account1.EmailAddress, "Verify that To address is correct");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "Content-type is text/plain");

            String soapContent = account1.soapSelectValue(GetMsgResponse, "//mail:content", null);
            String repliedContent = replyContent + "\r\n----- Reply message -----\r\n" + content + "\r\n";
            ZAssert.AreEqual(soapContent, repliedContent, "Verify that replied message content is correct i.e. has replied + original content");

            #endregion

            #endregion

        }

        [Test, Description("Reply to html text email"),
        Property("TestSteps", "1. Send email with html content from account1 to EAS user, 2. Reply to this mail from EAS user, 3. Verify the replied email is in Sent folder, 4. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void ReplyMail02()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String replySubject = "Re: " + subject;
            String content = "This message has html bold text";
            String replyContent = "Replied to the received email";
            String contentHtml = "&lt;html&gt;&lt;body&gt;This message has html &lt;strong&gt;bold&lt;/strong&gt; text&lt;/body&gt;&lt;/html&gt;";
            String contentHtmlEAS = "<html><body>This message has html <strong>bold</strong> text</body></html>";
            String replyContentHtmlEAS = "<html><body>Replied to the <strong>received</strong> email</body></html>";
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

            #region Create Mime for SendMail - reply

            String mimeText =
@"Subject: " + "Re: " +  subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account1.EmailAddress + @"
Message-Id: " + sentMessageId + @"
Date: Thu, 14 Nov 2016 13:52:46 -0800
References: " + incomingMessageId + @"
In-Reply-To: " + incomingMessageId + @"
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String plainContent = replyContent + "\r\n\r\n----- Reply message -----\r\n\r\n" + content;
            String htmlContent = replyContentHtmlEAS + "<html><body><br><br>----- Reply message -----<br><br></body></html>" + contentHtmlEAS;

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

            #region Verify the replied email is in Sent folder

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
            Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + replySubject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account1.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, replyContentHtmlEAS + "<html><body><br><br>----- Reply message -----<br><br></body></html>" + contentHtmlEAS, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @") + in:inbox</query>
			        </SearchRequest>");
            XmlNode m = account1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account1.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion


            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account1.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account1.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:su", null), replySubject, "Verify that replied email subject is correct");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account1.EmailAddress, "Verify that To address is correct");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Content-type is multipart/alternative");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content-type is text/plain");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "text/html", "Second part content-type is text/html");

            String soapContent = account1.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']/mail:content", null);
            ZAssert.AreEqual(soapContent, data, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }
        
    }
}
