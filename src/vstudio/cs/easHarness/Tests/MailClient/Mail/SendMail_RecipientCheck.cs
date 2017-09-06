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
    public class SendMail_RecipientCheck : Tests.BaseTestFixture
    {
        public ZimbraAccount account1, account2, account3;

        public SendMail_RecipientCheck()
        {
            
            // Create accounts to search for
            //
            account1 = new ZimbraAccount();
            account1.provision();
            account1.authenticate();

            account2 = new ZimbraAccount();
            account2.provision();
            account2.authenticate();

            account3 = new ZimbraAccount();
            account3.provision();
            account3.authenticate();

        }

        [Test, Description("Send a mail to another Zimbra account keeping recipient in To field and sync to server"),
        Property("TestSteps", "1. Send a mail to zimbra account keeping recepient in To field, 2. Sync to server, Verify the message is delivered to recepient, 3. Verify that the message content is correct")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail_To()
        {

            /*
             * Send a mail to another Zimbra account keeping recipient in To field
             */


            #region TEST SETUP

            String subject = "subject"+ HarnessProperties.getUniqueString();
            String content = "content"+ HarnessProperties.getUniqueString();
            String mime =
@"Subject: " + subject + @"
From: " + this.TestAccount.EmailAddress + @"
To: " + account1.EmailAddress + @"
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

            XmlDocument SearchResponse = account1.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:("+ subject +@")</query>
			        </SearchRequest>");

            XmlNode m = account1.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String id = account1.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion


            #region Verify that the recipient info is correct

            XmlDocument GetMsgResponse = account1.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='"+ id +@"'/>
			        </GetMsgRequest>");

            m = account1.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String c = account1.soapSelectValue(GetMsgResponse, "//mail:content", null);
            ZAssert.StringContains(c, content, "Verify that content matches in sent and received message");

            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "From address is correct");
            ZAssert.AreEqual(account1.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account1.EmailAddress, "To address is correct");
            

            #endregion

            #endregion

        }

        [Test, Description("Send a mail to another Zimbra account keeping recipient in Cc field and sync to server"),
        Property("TestSteps", "1. Send a mail to zimbra account keeping recepient in Cc field, 2. Sync to server, Verify the message is delivered to recepient, 3. Verify that the message content is correct")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void SendMail_Cc()
        {

            /*
             * Send a mail to another Zimbra account keeping recipient in Cc field
             */


            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String mime =
@"Subject: " + subject + @"
From: " + this.TestAccount.EmailAddress + @"
Cc: " + account2.EmailAddress + @"
To: " + account1.EmailAddress + @"
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

            XmlDocument SearchResponse = account2.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");

            XmlNode m = account2.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String id = account2.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion


            #region Verify that the recipient info is correct

            XmlDocument GetMsgResponse = account2.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"'/>
			        </GetMsgRequest>");

            m = account2.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");
            
            String c = account2.soapSelectValue(GetMsgResponse, "//mail:content", null);
            ZAssert.StringContains(c, content, "Verify that content matches in sent and received message");

            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "From address is correct");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account1.EmailAddress, "To address is correct");
            ZAssert.AreEqual(account2.soapSelectValue(GetMsgResponse, "//mail:e[@t='c']", "a"), account2.EmailAddress, "Cc address is correct");


            #endregion

            #endregion

        }

        [Test, Description("Send a mail to another Zimbra account keeping recipient in Bcc field and sync to server"),
        Property("TestSteps", "1. Send a mail to zimbra account keeping recepient in Bcc field, 2. Sync to server, Verify the message is delivered to recepient, 3. Verify that the message content is correct")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void SendMail_Bcc()
        {

            /*
             * Send a mail to another Zimbra account keeping recipient in Bcc field
             */


            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();
            String mime =
@"Subject: " + subject + @"
From: " + this.TestAccount.EmailAddress + @"
Bcc: " + account3.EmailAddress + @"
Cc: " + account2.EmailAddress + @"
To: " + account1.EmailAddress + @"
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

            XmlDocument SearchResponse = account3.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail'>
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");

            XmlNode m = account3.soapSelect(SearchResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String id = account3.soapSelectValue(SearchResponse, "//mail:m", "id");
            ZAssert.IsNotNull(id, "Verify the message id exists");

            #endregion


            #region Verify that the recipient info is correct

            XmlDocument GetMsgResponse = account3.soapSend(
                    @"<GetMsgRequest xmlns='urn:zimbraMail'>
				        <m id='" + id + @"'/>
			        </GetMsgRequest>");

            m = account3.soapSelect(GetMsgResponse, "//mail:m");
            ZAssert.IsNotNull(m, "Verify the message is received by the destination");

            String c = account3.soapSelectValue(GetMsgResponse, "//mail:content", null);
            ZAssert.StringContains(c, content, "Verify that content matches in sent and received message");

            ZAssert.AreEqual(account3.soapSelectValue(GetMsgResponse, "//mail:e[@t='f']", "a"), TestAccount.EmailAddress, "From address is correct");
            ZAssert.AreEqual(account3.soapSelectValue(GetMsgResponse, "//mail:e[@t='t']", "a"), account1.EmailAddress, "To address is correct");
            ZAssert.AreEqual(account3.soapSelectValue(GetMsgResponse, "//mail:e[@t='c']", "a"), account2.EmailAddress, "Cc address is correct");
            ZAssert.AreEqual(account3.countNodes(GetMsgResponse, "//mail:e"), 3, "Number of users is 3, From, To, Cc in msg header, Bcc user is not included");
           
            #endregion

            #endregion

        }
    }
}