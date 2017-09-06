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
    public class SendMail_ImportanceCheck : Tests.BaseTestFixture
    {
        public ZimbraAccount account;

        public SendMail_ImportanceCheck()
        {

            // Create an account to search for
            //
            account = new ZimbraAccount();
            account.provision();
            account.authenticate();

        }

        [Test, Description("Send a mail with normal importance to another Zimbra account and sync to server"),
        Property("TestSteps", "1. Send a normal importance mail, 2. Sync to server, Verify the message is delivered to recepient, 3. Verify that the importance flag is correct")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void SendMail_NormalImp()
        {

            /*
             * Send a mail with normal importance to another Zimbra account 
             */


            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String mime =
@"Subject: " + subject + @"
From: " + this.TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

" + content;

            #endregion


            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION


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


            #region Verify that the importance flag is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"'/>
			        </GetMsgRequest>");

            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:content", null);
            ZAssert.StringContains(c, content, "Verify that content matches in sent and received message");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "To address is correct");

            String f = account.soapSelectValue(GetMsgResponse, "//mail:m", "f");
            ZAssert.StringDoesNotContain(f, "?", "Verify received message does not have low importance flag");
            ZAssert.StringDoesNotContain(f, "!", "Verify received message does not have high importance flag");

            #endregion

            #endregion

        }

        [Test, Description("Send a mail with Low importabce to another Zimbra account and sync to server"),
        Property("TestSteps", "1. Send a low importance mail, 2. Sync to server, Verify the message is delivered to recepient, 3. Verify that the importance flag is correct")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void SendMail_LowImp()
        {

            /*
             * Send a mail with Low importabce to another Zimbra account
             */


            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String mime =
@"Subject: " + subject + @"
From: " + this.TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Importance: Low" + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

" + content;

            #endregion


            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION


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


            #region Verify that the importance flag is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"'/>
			        </GetMsgRequest>");

            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:content", null);
            ZAssert.StringContains(c, content, "Verify that content matches in sent and received message");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "To address is correct");

            String f = account.soapSelectValue(GetMsgResponse, "//mail:m", "f");
            ZAssert.StringContains(f, "?", "Verify received message has low importance flag");
            
            #endregion

            #endregion

        }

        [Test, Description("Send a mail with High importance to another Zimbra account and sync to server"),
        Property("TestSteps", "1. Send a high importance mail, 2. Sync to server, Verify the message is delivered to recepient, 3. Verify that the importance flag is correct")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void SendMail_HighImp()
        {

            /*
             * Send a mail with High importance to another Zimbra account
             */


            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String mime =
@"Subject: " + subject + @"
From: " + this.TestAccount.EmailAddress + @"
To: " + account.EmailAddress + @"
Importance: High" + @"
Date: Thu, 14 Nov 2013 13:52:46 -0800
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

" + content;

            #endregion


            #region TEST ACTION

            // Create SendMail request
            ZSendMailRequest request = new ZSendMailRequest(TestAccount);
            request.DestinationPayloadText = mime;

            ZResponse response = TestClient.sendRequest(request);
            ZAssert.IsNotNull(response, "Verify the Send Mail response was received");

            #endregion


            #region TEST VERIFICATION


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


            #region Verify that the importance flag is correct

            XmlDocument GetMsgResponse = account.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"'/>
			        </GetMsgRequest>");

            m = account.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String c = account.soapSelectValue(GetMsgResponse, "//mail:content", null);
            ZAssert.StringContains(c, content, "Verify that content matches in sent and received message");

            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "From address is correct");
            ZAssert.AreEqual(account.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account.EmailAddress, "To address is correct");

            String f = account.soapSelectValue(GetMsgResponse, "//mail:m", "f");
            ZAssert.StringContains(f, "!", "Verify received message has high importance flag");

            #endregion

            #endregion

        }
    }
}