using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using NUnit.Framework;

namespace Tests.MailClient.Mail.FromServer
{


    [TestFixture]
    public class GetMail : Tests.BaseTestFixture
    {
        public ZimbraAccount account1, account2, account3;

        public GetMail()
        {
            
            // Create accounts used in test
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

        [Test(Description="Get a new message from the server in Inbox"),
        Property("TestSteps", "1. Add a message to the mailbox, 2. Sync to device, 3. Verify the mail got added in the Inbox")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void GetMail01()
        {

            /*
             * Get a new message from the server
             */



            #region TEST SETUP

            // Add a message to the mailbox
            //
            String folderid = HarnessProperties.getString("folder.inbox.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: " + subject + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content 



                        </content>
                    </m>
                </AddMsgRequest>");



            #endregion



            #region TEST ACTION


            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion




            #region TEST VERIFICATION


            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From field is correct");


            #endregion


        }


        [Test(Description = "Get 3 new messages from the server in Inbox"),
        Property("TestSteps", "1. Add 3 messages with the data to mailbox, 2. Sync to device, 3. Verify 3 mails got added in the Inbox")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail02()
        {

            /*
             * Get a three new message from the server
             */



            #region TEST SETUP

            // Add a message to the mailbox
            //
            String folderid = HarnessProperties.getString("folder.inbox.id");

            // An array with the message data (subject, To, From, Content)
            String[,] data = new String[3, 4] {
                { "subject" + HarnessProperties.getUniqueString(), "to" + HarnessProperties.getUniqueString() + "@example.com", "from" + HarnessProperties.getUniqueString() + "@example.com", "content" + HarnessProperties.getUniqueString() },
                { "subject" + HarnessProperties.getUniqueString(), "to" + HarnessProperties.getUniqueString() + "@example.com", "from" + HarnessProperties.getUniqueString() + "@example.com", "content" + HarnessProperties.getUniqueString() },
                { "subject" + HarnessProperties.getUniqueString(), "to" + HarnessProperties.getUniqueString() + "@example.com", "from" + HarnessProperties.getUniqueString() + "@example.com", "content" + HarnessProperties.getUniqueString() } };


            // Add 3 messages with the data
            for (int i = 0; i < 3; i++)
            {

                TestAccount.soapSend(
                    @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
Subject: " + data[i, 0] + @"
To: " + data[i, 1] + @"
From: " + data[i, 2] + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

" + data[i, 3] + @" 



                        </content>
                    </m>
                </AddMsgRequest>");

            }

            #endregion



            #region TEST ACTION


            // Send the SyncRequest
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion




            #region TEST VERIFICATION

            // Verify the SyncResponse contains the three new messages

            for (int i = 0; i < 3; i++)
            {

                // Get the matching <Add/> elements
                XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + data[i, 0] + "']");
                ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


                ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, data[i, 0], "Verify the Subject field is correct");
                ZAssert.XmlXpathMatch(Add, "//email:To", null, data[i, 1], "Verify the To field is correct");
                ZAssert.XmlXpathMatch(Add, "//email:From", null, data[i, 2], "Verify the From field is correct");

            }

            #endregion


        }


        [Test(Description = "Get a new message from the server in a subfolder of Inbox and USER_ROOT"),
        Property("TestSteps", "1. Create a folder in Inbox, 2. Add a message to the folder, 3. Sync to device, 4. Verify the mail got added in the folder")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        [TestCase("Inbox")]
        [TestCase("USER_ROOT")]
        public void GetMail03(String parentFolderName)
        {

            /*
             * Get a new message in a subfolder of Inbox/Root
             */

            /*
             * 1. Create a folder in Inbox
             * 2. AddMsgRequest to add a message to the folder
             * 3. Sync
             * 4. Verify the message shows up correctly
             */

            #region TEST SETUP

            // Create a new folder
            //
            String foldername = "folder" + HarnessProperties.getUniqueString();

            // Get the server's folder structrue
            // So we can put the new folder in the Root
            XmlDocument GetFolderResponse = this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            String parentFolderId = this.TestAccount.soapSelectValue(GetFolderResponse, "//mail:folder[@name='"+ parentFolderName +"']", "id");

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder name='" + foldername + "' l='" + parentFolderId + "'/>" +
                    "</CreateFolderRequest>");
            String subfolderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder[@name='"+ foldername +"']", "id");


            // Add a message to the subfolder
            //
            String subject = "subject" + HarnessProperties.getUniqueString();
            
            TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + subfolderId + @"'>
                        <content>Date: Mon, 9 Dec 2013 15:25:36 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: " + subject + @"
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content 



                        </content>
                    </m>
                </AddMsgRequest>");



            #endregion



            #region TEST ACTION

            // Sync the folders
            ZFolderSyncResponse folderSyncResponse = TestClient.sendRequest(new ZFolderSyncRequest(this.TestAccount)) as ZFolderSyncResponse;
            ZAssert.IsNotNull(folderSyncResponse, "Verify the Folder Sync response was received");

            // Verify the new folder is resturned
            ZAssert.XmlXpathMatch(folderSyncResponse.XmlElement, "//FolderHierarchy:Add//FolderHierarchy:ServerId", null, subfolderId, "Verify the new folder is returned");


            /**
             * 4/28/2014 ... Multiple SyncRequests may be required for the message to appear, so send a few until the new message shows up
             * The harness probably needs a way to send a translaction like this, but I'm not quite sure at this moment what parameters
             * would make the most sense for a transaction call.  Maybe rename sendSyncTransaction() to sendInitialSyncTransaction() and 
             * create a sendSyncTransaction(String collectionId) method?
             **/

            ZSyncResponse syncResponse = null;
            for (int i = 0; i < 5; i++)
            {

                // Send the SyncRequest for the folder
                ZSyncRequest syncRequest = new ZSyncRequest(this.TestAccount);
                syncRequest.CollectionId = subfolderId;

                // Send the SyncRequest
                syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
                ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

                // Verify the SyncResponse contains the new message
                XmlNodeList adds = syncResponse.XmlElement.SelectNodes("//AirSync:Add//email:Subject[text() = '" + subject + "']", ZAssert.NamespaceManager);
                if ( (adds != null) && (adds.Count > 0) ) {
                    break; // from the for (int i = 0; i < 5 ...
                }

                syncResponse = null;

            }

            ZAssert.IsNotNull(syncResponse, "Verify the SyncResponse containing the added message is found");

            #endregion




            #region TEST VERIFICATION


            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From field is correct");


            #endregion


        }

        [Test(Description = "Get a new message from another user where ActiveSync user is To"),
        Property("TestSteps", "1. Send message to ActiveSync user (in To field), 2. Sync to device, 3. Verify the mail got added in the Inbox of ActiveSync user")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L0")]
        public void GetMail04()
        {

            #region TEST SETUP

            // Send message to ActiveSync user (in To field)
            
            String folderid = HarnessProperties.getString("folder.inbox.id");
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
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct");

            #endregion


        }

        [Test(Description = "Get a new message from another user where ActiveSync user is Cc"),
        Property("TestSteps", "1. Send message to ActiveSync user (in Cc field), 2. Sync to device, 3. Verify the mail got added in the Inbox of ActiveSync user")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail05()
        {

            #region TEST SETUP

            // Send message to ActiveSync user (in To field)

            String folderid = HarnessProperties.getString("folder.inbox.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + account2.EmailAddress + @"'/>
                        <e t='c' a='" + this.TestAccount.EmailAddress + @"'/>
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
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account2.EmailAddress, "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:Cc", null, TestAccount.EmailAddress, "Verify the Cc field is correct");

            #endregion


        }

        [Test(Description = "Get a new message from another user where ActiveSync user is Bcc"),
        Property("TestSteps", "1. Send message to ActiveSync user (in Bcc field), 2. Sync to device, 3. Verify the mail got added in the Inbox of ActiveSync user")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail06()
        {

            #region TEST SETUP

            // Send message to ActiveSync user (in To field)

            String folderid = HarnessProperties.getString("folder.inbox.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + account2.EmailAddress + @"'/>
                        <e t='c' a='" + account3.EmailAddress + @"'/>
                        <e t='b' a='" + this.TestAccount.EmailAddress + @"'/>
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
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            //Cant verify Bcc info as no relevant node is returned in Add command, verification is based on check if email is received by Bcc user
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, account2.EmailAddress, "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:Cc", null, account3.EmailAddress, "Verify the Cc field is correct");
            

            #endregion


        }

        [Test(Description = "Get a normal importance message from another user"),
        Property("TestSteps", "1. Send normal importance message to ActiveSync user, 2. Sync to device, 3. Verify the mail got added in the Inbox of ActiveSync user, 4. Verify the message is of Normal importance ")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail07()
        {

            #region TEST SETUP

            // Send normal importance message to ActiveSync user 

            String folderid = HarnessProperties.getString("folder.inbox.id");
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
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:Importance", null, "1", "Verify the email Importance is Normal");

            #endregion


        }

        [Test(Description = "Get a low importance message from another user"),
        Property("TestSteps", "1. Send normal importance message to ActiveSync user, 2. Sync to device, 3. Verify the mail got added in the Inbox of ActiveSync user, 4. Verify the message is of low importance ")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail08()
        {

            #region TEST SETUP

            // Send low importance message to ActiveSync user

            String folderid = HarnessProperties.getString("folder.inbox.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m f='?'>
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
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:Importance", null, "0", "Verify the email Importance is Low");

            #endregion


        }

        [Test(Description = "Get a high importance message from another user"),
        Property("TestSteps", "1. Send normal importance message to ActiveSync user, 2. Sync to device, 3. Verify the mail got added in the Inbox of ActiveSync user, 4. Verify the message is of High importance ")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail09()
        {

            #region TEST SETUP

            // Send high importance message to ActiveSync user

            String folderid = HarnessProperties.getString("folder.inbox.id");
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "content" + HarnessProperties.getUniqueString();

            account1.soapSend(
               @"<SendMsgRequest xmlns='urn:zimbraMail'>
                    <m f='!'>
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
            ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            #endregion

            #region TEST VERIFICATION

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:Subject ", null, subject, "Verify the Subject field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, account1.EmailAddress, "Verify the From field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:To", null, TestAccount.EmailAddress, "Verify the To field is correct");
            ZAssert.XmlXpathMatch(Add, "//email:Importance", null, "2", "Verify the email Importance is High");

            #endregion


        }
    }
}
