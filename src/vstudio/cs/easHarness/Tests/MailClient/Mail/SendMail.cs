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
    public class SendMail : Tests.BaseTestFixture
    {
        public ZimbraAccount account;

        public SendMail()
        {
            
            // Create an account to search for
            //
            account = new ZimbraAccount();
            account.provision();
            account.authenticate();

        }

        [Test, Description("Send a basic mail having plain text to another Zimbra account"),
        Property("TestSteps", "1. Send email from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void SendMail01()
        {

            #region TEST SETUP

            String subject = "subject"+ HarnessProperties.getUniqueString();
            String content = "content"+ HarnessProperties.getUniqueString();
            String mime =
@"Subject: "+ subject +@"
From: "+ TestAccount.EmailAddress +@"
To: "+ account.EmailAddress +@"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

"+ content;

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.sent.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement  Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. plain on server");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, content, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:("+ subject +@")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='"+ id +@"'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "Content-type is text/plain");

            String soapContent = account.soapSelectValue(GetMsgResponse, "//mail:content", null);
            ZAssert.AreEqual(soapContent, content + "\r\n", "Verify that message content is correct");

            #endregion

            #endregion

        }

        [Test, Description("Send html format mail to another Zimbra account"),
        Property("TestSteps", "1. Send email from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void SendMail02()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String mime = MimeBuilder.getHtmlMsgMime(mimeText, content, htmlContent);

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Content-type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content-type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "text/html", "Second part content-type is text/html");

            String soapContent = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']/mail:content", null);
            ZAssert.AreEqual(soapContent, data, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send plain text (i.e. no html tag content) mail having text attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having text attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail03()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestTxt.txt";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "text/plain", "Second part attachment content-type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }


        [Test, Description("Send html format mail having text attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having text attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail04()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestTxt.txt";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "text/plain", "Second part attachment content-type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having csv attachment to another on-net Zimbra account"),
        Property("TestSteps", "1. Send email having csv attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail05()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestCsv.csv";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "text/csv", "Attachment content-type is text/csv");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having csv attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having csv attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail06()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestCsv.csv";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "text/csv", "Attachment content-type is text/csv");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having docx attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having docx attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail07()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestDoc.docx";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Attachment content-type is doc");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having docx attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having docx attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail08()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestDoc.docx";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Attachment content-type is doc");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having pptx attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having pptx attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail09()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPpt.pptx";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Attachment content-type is presentation");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having pptx attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having pptx attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail10()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPpt.pptx";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Attachment content-type is presentation");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");
            
            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having pdf attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having pdf attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail11()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPdf.pdf";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/pdf", "Attachment content-type is pdf");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");
                
            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having pdf attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having pdf attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail12()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPdf.pdf";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/pdf", "Attachment content-type is pdf");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having pst attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having pst attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void SendMail13()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPst.pst";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/octet-stream", "Attachment content-type is octet-stream");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having pst attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having pst attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void SendMail14()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPst.pst";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "application/octet-stream", "Attachment content-type is octet-stream");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having jpg attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having jpg attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail15()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestJpg.jpeg";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "image/jpeg", "Attachment content-type is image/jpeg"); 
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");


            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having jpg attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having jpg attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail16()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestJpg.jpeg";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "image/jpeg", "Attachment content-type is image/jpeg");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");


            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having png attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having png attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail17()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPng.png";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "image/png", "Attachment content-type is image/png"); 
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");
            
            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having png attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having png attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail18()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestPng.png";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "image/png", "Attachment content-type is image/png");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send plain text mail having gif attachment to another on-net Zimbra account"),
        Property("TestSteps", "1. Send email having gif attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail19()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has Plain text content";
            String htmlContent = "<html><body><div>This message has Plain text content</div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestGif.gif";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "plain");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "image/gif", "Attachment content-type is image/gif");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }

        [Test, Description("Send html format mail having gif attachment to another Zimbra account"),
        Property("TestSteps", "1. Send email having gif attachment from EAS user, 2. Verify the sent email is in Sent folder, 3. Verify the message is received at the recepient")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail20()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "This message has HTML text content" + @"
Bold" + @"
Italics" + @"
Underline";
            String htmlContent = "<html><body><div>This message has HTML text content</div><div><b>Bold</b></div><div><i>Italics</i></div><div><u>Underline</u></div></body></html>";

            String mimeText =
            @"Subject: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0";

            String fileName = "TestGif.gif";
            String mime = MimeBuilder.getAttachmentMime(mimeText, content, htmlContent, fileName, "html");

            #endregion

            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion

            #region TEST VERIFICATION

            #region Verify the sent email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
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

            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, TestAccount.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:DisplayName", null, fileName, "Verify the attachment file name is correct");
            String data = Add.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(data, htmlContent, "Verify that content is correct in sent folder");

            #endregion

            #region Verify the message is received by the destination

            XmlDocument SearchResponse = account.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            XmlNode m = account.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            String id = account.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion

            #region Verify that the content is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"' html='1'/>
			        </GetMsgRequest>");
            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "Verify that From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "Verify that To address is correct");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='TEXT']", "ct"), "multipart/alternative", "Message content type is multipart/alternative");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='1']", "ct"), "text/plain", "First part content type is text/plain");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2']", "ct"), "multipart/mixed", "Second part content type is multipart/mixed");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']", "ct"), "text/html", "Second part body content-type is text/html");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "ct"), "image/gif", "Attachment content-type is image/gif");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "cd"), "attachment", "Second part has attachment");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.2']", "filename"), fileName, "Verify attachment file name");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:mp[@part='2.1']/mail:content", null);
            ZAssert.AreEqual(c, htmlContent, "Verify that content matches in sent and received message");

            #endregion

            #endregion

        }


    }
}
