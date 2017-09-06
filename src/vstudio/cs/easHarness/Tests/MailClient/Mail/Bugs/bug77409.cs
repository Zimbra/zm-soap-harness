using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;
using System.IO;

namespace Tests.MailClient.Mail.Bugs
{
    [TestFixture]
    public class Bug77049 : Tests.BaseTestFixture
    {

        [Test(Description = "Verify messages from bug 77409 are skipped and warning is given to user."),
        Property("Bug", 77049), 
        Property("TestSteps", "1. Send the test invite to the mailbox, 2. Sync to device, 3. Make sure all the warning messages are delivered, 4. Verify appointment is placed in the calendar")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void Bug77049_01()
        {



            #region TEST SETUP

            // Inject the test message to the mailbox
            //
            String mime = HarnessProperties.getString("folder.harness.testmime") + "/bug77049/mime01.txt";
            String subject = "subject14008741231";

            // Replace the date in the ICS
            String text = File.ReadAllText(mime);
            text = text.Replace("20120725", DateTime.Now.ToUniversalTime().ToString(@"yyyyMMdd"));

            // Inject the invite
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");


            TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>subject:(" + subject + @")</query>
			        </SearchRequest>"); 
            
            #endregion



            #region TEST ACTION


            // Send the SyncRequest - Inbox
            ZSyncResponse syncResponseInbox = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponseInbox, "Verify the Sync response was received");


            // Send the SyncRequest - Calendar
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponseCalendar = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponseCalendar, "Verify the Sync response was received");


            // Make sure all the warning messages are delivered
            MailInject.waitForPostfixQueue();


            #endregion




            #region TEST VERIFICATION


            // Verify the message is not delivered to the inbox
            List<XmlElement> message = ZSyncResponse.getMatchingElements(syncResponseInbox.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.AreEqual(0, message.Count, "Verify there are no 'Add' elements - the message should not be delivered to the device");

            // Verify the appointment is placed in the calendar
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponseCalendar.XmlElement, "//AirSync:Add", "//calendar:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the "item skipped" in the user's mailbox
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>in:inbox subject:(warning) content:("+ subject +@")</query>
			        </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:m", 1, "Verify the warning message is shown in the inbox");

            #endregion


        }

        [Test(Description = "Verify messages from bug 77409 are skipped and warning is given to admin."),
        Property("Bug", 77049),
        Property("TestSteps", "1. Create an admin, 2. Send the test invite to the mailbox, 3. Sync to device, 4. Make sure all the warning messages are delivered, 5. Verify appointment is placed in the calendar")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void Bug77049_02()
        {



            #region TEST SETUP

            // Create an admin
            ZimbraAccount admin = (new ZimbraAdminAccount()).provision().authenticate();

            // Set the admin user for notifications
            admin.soapSend(
                @"<ModifyAccountRequest xmlns='urn:zimbraAdmin'>
                    <id>"+ TestAccount.ZimbraId + @"</id>
                    <a n='zimbraMobileNotificationEnabled'>TRUE</a>
                    <a n='zimbraMobileNotificationAdminAddress'>"+ admin.EmailAddress + @"</a>
                </ModifyAccountRequest>");

            // Inject the test message to the mailbox
            //
            String mime = HarnessProperties.getString("folder.harness.testmime") + "/bug77049/mime01.txt";
            String subject = "subject14008741231";

            // Replace the date in the ICS
            String text = File.ReadAllText(mime);
            text = text.Replace("20120725", DateTime.Now.ToUniversalTime().ToString(@"yyyyMMdd"));

            // Inject the invite
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");


            TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>subject:(" + subject + @")</query>
			        </SearchRequest>");

            #endregion



            #region TEST ACTION


            // Send the SyncRequest - Inbox
            ZSyncResponse syncResponseInbox = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponseInbox, "Verify the Sync response was received");

            // Make sure all the warning messages are delivered
            MailInject.waitForPostfixQueue();

            #endregion




            #region TEST VERIFICATION

            // Verify the "item skipped" in the user's mailbox
            XmlDocument SearchResponse = TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>in:inbox subject:(warning) content:(" + subject + @")</query>
			        </SearchRequest>");
            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:m", 1, "Verify the warning message is shown in the User's inbox");

            // Verify the "item skipped" in the admin's mailbox
            SearchResponse = admin.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>in:inbox subject:(warning) content:(" + subject + @")</query>
			        </SearchRequest>");

            ZAssert.XmlXpathCount(SearchResponse.DocumentElement, "//mail:m", 1, "Verify the warning message is shown in the Admin's inbox");

            #endregion


        }

    }
}
