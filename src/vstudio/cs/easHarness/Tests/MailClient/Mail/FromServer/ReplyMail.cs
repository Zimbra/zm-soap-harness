using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using System.Xml;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Mail.FromServer
{

    [TestFixture]
    public class ReplyMail : Tests.BaseTestFixture
    {

        [Test, Description("Sync a new message with the Reply flag from the server"),
        Property("TestSteps", "1. Send a message from AccountA to Test account, 2. Reply to this message from Test Account, 3. Sync to device, 4. Verify the replied status is correct")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetReplyMail01()
        {

            /*
             * Flag a message on the server.  Sync
             */



            #region TEST SETUP

            #region AccountA sends a message to the test account

            // Create AccountA
            ZimbraAccount accountA = new ZimbraAccount().provision().authenticate();

            // AccountA sends a message
            String subject = "subject" + HarnessProperties.getUniqueString();

            accountA.soapSend(
                @"<SendMsgRequest xmlns='urn:zimbraMail'>
                        <m>
	                        <e t='t' a='" + TestAccount.EmailAddress + @"'/>
	                        <su>" + subject + @"</su>
	                        <mp ct='text/plain'>
	                            <content>" + HarnessProperties.getUniqueString() + @"</content>
	                        </mp>
                        </m>
                    </SendMsgRequest>");



            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");


            // Test Account replies to the message
            XmlDocument sendMsgRequest = TestAccount.soapSend(
                @"<SendMsgRequest xmlns='urn:zimbraMail'>
                        <m origid='" + messageID + @"' rt='r'>
	                        <e t='t' a='" + accountA.EmailAddress + @"'/>
	                        <su>RE: " + subject + @"</su>
	                        <mp ct='text/plain'>
	                            <content>" + HarnessProperties.getUniqueString() + @"</content>
	                        </mp>
                        </m>
                    </SendMsgRequest>");

            #endregion


            #endregion



            #region TEST ACTION


            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");



            #endregion




            #region TEST VERIFICATION


            // Get the matching <Change/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//AirSync:ServerId[text() = '" + messageID + "']");
            ZAssert.IsNotNull(Add, "Verify the Add element for the new message was returned in the Sync Response");

            // TODO: See bug 89625 ... what is the element that describes that a message has been replied to?
            ZAssert.XmlXpathMatch(Add, "//email:Reply", null, "Replied", "Verify the replied status is correct");


            #endregion


        }


        [Test, Description("Sync an existing message with the Reply flag from the server"),
        Property("TestSteps", "1. Send a message from AccountA to Test account, 2. Reply to this message from Test Account, 3. Sync to device, 4. Verify the replied status is correct")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetReplyMail02()
        {

            /*
             * Flag a message on the server.  Sync
             */



            #region TEST SETUP

            #region AccountA sends a message to the test account

            // Create AccountA
            ZimbraAccount accountA = new ZimbraAccount().provision().authenticate();

            // AccountA sends a message
            String subject = "subject" + HarnessProperties.getUniqueString();

            accountA.soapSend(
                @"<SendMsgRequest xmlns='urn:zimbraMail'>
                        <m>
	                        <e t='t' a='" + TestAccount.EmailAddress + @"'/>
	                        <su>" + subject + @"</su>
	                        <mp ct='text/plain'>
	                            <content>" + HarnessProperties.getUniqueString() + @"</content>
	                        </mp>
                        </m>
                    </SendMsgRequest>");


            // Test Account receives the message
            XmlDocument searchResponse = TestAccount.soapSend(
                @"<SearchRequest xmlns='urn:zimbraMail' >
				        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");
            String messageID = this.TestAccount.soapSelectValue(searchResponse, "//mail:m", "id");



            // Send the SyncRequest to get the message
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #endregion



            #region TEST ACTION


            // Test Account replies to the message
            XmlDocument sendMsgRequest = TestAccount.soapSend(
                @"<SendMsgRequest xmlns='urn:zimbraMail'>
                        <m origid='" + messageID + @"' rt='r'>
	                        <e t='t' a='" + accountA.EmailAddress + @"'/>
	                        <su>RE: " + subject + @"</su>
	                        <mp ct='text/plain'>
	                            <content>" + HarnessProperties.getUniqueString() + @"</content>
	                        </mp>
                        </m>
                    </SendMsgRequest>");



            // Send the SyncRequest to get the new changes
            syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");



            #endregion




            #region TEST VERIFICATION


            // Get the matching <Change/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + messageID + "']");
            ZAssert.IsNotNull(Change, "Verify the Change element for the existing message was returned in the Sync Response");

            // TODO: See bug 89625 ... what is the element that describes that a message has been replied to?
            ZAssert.XmlXpathMatch(Change, "//email:Reply", null, "Replied", "Verify the replied status is correct");


            #endregion


        }


    }
}
