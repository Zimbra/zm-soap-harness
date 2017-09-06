using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;
using System.Net;

namespace Tests.MailClient.Search
{

    [TestFixture]
    public class SmartReplySearchedMail : Tests.BaseTestFixture
    {
        public ZimbraAccount account1;
        String folderid = HarnessProperties.getString("folder.inbox.id");

        public SmartReplySearchedMail()
        {

            // Create accounts used in test
            account1 = new ZimbraAccount();
            account1.provision();
            account1.authenticate();

        }

        [Test, Description("Search plain format email on server and reply to searched email using SmartReply command"),
        Property("TestSteps", "1. Send a mail to device user and sync to device, 2. Search for the mail on device and verify the message details are correct, 3. Reply to this mail using smartReply, 4. Verify the mail is received at the destination correctly")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L1")] 
        public void SmartReplySearchedMail01()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String replySubject = "Re: " + subject;
            String content = "content" + HarnessProperties.getUniqueString();
            String replyContent = "Replied to the received email";
            String sentMessageId = "<" + HarnessProperties.getUniqueString() + "@" + TestAccount.DomainName + ">";

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

            #region Search Email
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

            #region Verify Searched Email details

            XmlElement Result = ZSearchResponse.getMatchingElement(zSearchResponse.XmlElement, "//Search:Result", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//email:To", null, TestAccount.EmailAddress, "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Result, "//email:From", null, account1.EmailAddress, "Verify the From address is correct");
            ZAssert.XmlXpathMatch(Result, "//AirSyncBase:Data", null, content, "Verify the content is correct");

            String LongId = ZAssert.XmlXpathValue(Result, "//Search:LongId");

            #endregion


            #region Reply to searched email using SmartReply

            //Now, reply to the searched email
            #region Create Mime for SmartReply

            //Notice, we are not sending content/body of source email being replied
            String mime =
@"Subject: " + "Re: " + subject + @"
From: " + TestAccount.EmailAddress + @"
To: " + account1.EmailAddress + @"
Message-Id: " + sentMessageId + @"
Date: Thu, 14 Nov 2016 13:52:46 -0800
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

" + replyContent + @"

----- Reply message -----" + @"

";

            #endregion

            // Create SmartReply request
            ZSmartReplyRequest request = new ZSmartReplyRequest(TestAccount);
            request.DestinationPayloadText = mime;
            request.isItemSearched = true;
            request.ItemId = LongId;       

            #endregion

            #endregion

            #region TEST VERIFICATION

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the SmartReply response was received");

            #region Verify the replied email is in Sent folder

            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
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
            ZAssert.AreEqual(data, replyContent + "\r\n\r\n----- Reply message -----\r\n\r\n" + content + "\r\n", "Verify that content is correct in sent folder");

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
            ZAssert.AreEqual(soapContent, data, "Verify that replied message content is correct i.e. has replied + original content");

            #endregion

            #endregion

        }

    }
}


