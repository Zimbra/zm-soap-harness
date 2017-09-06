using System;
using System.Collections.Generic;
using System.Text;
using System.Collections;
using SoapAdmin;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.IO;
using SoapWebClient;
using System.Text.RegularExpressions;
using Redemption;
using System.Xml;

namespace clientTests.Client.Mail.Bugs
{
    [TestFixture]
    public class MailBugs : BaseTestFixture
    {
        [Test, Description("Bug 31607: missing read receipts in outlook")]
        [Category("Mail")]
        [Bug("31607")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message TO: sycuser requesting a read receipt",
            "Receive mail having logged in to the same profile and read the mail",
            "Sync",
            "Verify read receipt is recevied")]
        public void MailBugs_31607()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();

            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountZCO.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.ReadReceiptRequested = true;

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(2000);
            #endregion

            #region Outlook Block Receive mail and Read
            OutlookCommands.Instance.Sync();

            // Find the mail send to self
            RDOMail recMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(recMail, "Verify received mail exists");

            // Mark the mail as read. MarkRead(true)=suppress read receipts.
            recMail.MarkRead(false);

            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(4000);
            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(4000);
            #endregion

            #region Outlook Block Check the read receipt

            string receiptSubject = "Read: " + subject;
            RDOMail receiptMail = OutlookMailbox.Instance.findMessage(receiptSubject);
            // Verify read receipt mail is received
            zAssert.IsNotNull(receiptMail, "Verify that read receipt is received");

            #endregion
        }
           
        [Test, Description("Bug 47567: RECEIPTS: ZWC attempts to send a Read Notification even though ZCO has already sent one")]
        [Category("Mail")]
        [Bug("47567")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. Login to User1 in Server. ",
            "2. Send msg to User2, requesting a Read Receipt before clicking Send",
            "3. Loing as User2 in server and in ZCO. Find the msg.",
            "4. Open the message in ZCO and mark the message to send the read receipt. Sync until steady state is reached.",
            "5. In server, verify msg is marked as read as expected in user2 account",
            "6. Verify the status of read receipt is sent.")]
        public void MailBugs_47567()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
                
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            
            #endregion
            #region SOAP:Create Account1,Login and send mail to Syncuser.
      
            zAccount.AccountA.sendSOAP( @"<SendMsgRequest xmlns='urn:zimbraMail'>
				<m>
					<e t='t' a='" + zAccount.AccountZCO.emailAddress + @" '/>
					<e t='n' a='" + zAccount.AccountA.emailAddress + @"'/>
					<su>" + subject + @"</su>
					<mp ct='text/plain'>
						<content> " + content + @"</content>
					</mp>
				</m>
			</SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);
            
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
               Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            #endregion
            #region Outlook :read mail and send read reciept.

            OutlookCommands.Instance.Sync();

            // Find the mail send to self
            RDOMail recMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(recMail, "Verify received mail exists");

            // Mark the mail as read. MarkRead(true)=suppress read receipts.
            recMail.MarkRead(false);

            OutlookCommands.Instance.Sync();

            #endregion
            #region SOAP: read the mail in sync user. Verify that read reciept has been sent.

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            zAccount.AccountZCO.sendSOAP(@"<GetMsgRequest xmlns='urn:zimbraMail'>
                            <m id='"+ messageId +@"'/>
                        </GetMsgRequest>");


            zAccount.AccountZCO.selectSOAP("//mail:m", "f", "n", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:e[@t='n']","a", zAccount.AccountA.emailAddress,null,1);

            zAccount.AccountZCO.selectSOAP("//mail:content", null, content,null, 1);
            
            //verify TO field
            zAccount.AccountZCO.selectSOAP("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']", "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']", "t", "t", null, 1);


            #endregion
        }

        [Test, Description("Bug 14060: Cannot Forward Appointments from Outlook Calendar")]
        [Category("Mail")]
        [Bug("14060")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Compose a new message",
            "Drop down options, select 'From' (display the From field)",
            "Type an external user in the 'From' text field",
            "Enter a to, subject and body",
            "send the message",
            "Message should be sent and on behalf should be shown in from field.",
            "NOTE:Cannot forward appointment as appointment, so automating using repro steps from comment #1 of bug.")]
        public void Bug14060()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string email = zAccount.AccountA.emailAddress;
            #endregion

            #region SOAP Block - Grant SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<GrantRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountA.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </GrantRightRequest>");

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            // 'Create an Outlook mail item
            RDOFolder mail = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderOutbox);
            RDOMail rMail = OutlookMailbox.Instance.CreateObject(mail, "IPM.Note");

            // Create the email subject
            rMail.Subject = subject;

            // Create the email body
            rMail.Body = content;

            //Add email recipient. Send mail to self as read receipt should be send only from ZCO and receive from ZCO
            rMail.SentOnBehalfOfName = zAccount.AccountA.emailAddress;

            rMail.To = zAccount.AccountZCO.emailAddress;
            rMail.Recipients.ResolveAll(null, null);

            rMail.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region Outlook Receive Mail
            OutlookCommands.Instance.Sync();

            // Find the mail send to self
            RDOMail recMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(recMail, "Verify received mail exists");

            // Verify message is received and shows on behalf entry in from field.
            zAssert.IsTrue(recMail.SentOnBehalfOfEmailAddress.Equals(zAccount.AccountA.emailAddress), "Verify mail is received with on behalf in from field.");
            #endregion

            #region SOAP Block - Revoke SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<RevokeRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountA.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </RevokeRightRequest>");

            #endregion

        }

        [Test, Description("OL2007: Updating drafts messages is not reflected in ZWC")]
        [Category("Mail")]
        [Bug("20269")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. With a message in inbox, click forward",
            "2. Add cc,bcc and content",
            "3. Save draft",
            "4. Verify that the draft is reflected in ZWC with CC field etc",
            "5. Open the draft from outlook and add CC, BCC and some text in contents.",
            "6. Sync.", "7.The updated draft should reflect in ZWC.")]
        public void MailBugs_20269()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Send a message to account1
            // 3. Login as account1 (SOAP)
            // 4. Verify the message is received with proper Subject and Content
            // 5. Verify that the "FROM" field shows syncuser and the "TO" field shows account1.

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            string emailCc = "emailCc" + UtilFunctions.RandomStringGenerator() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string emailBcc = "emailBcc" + UtilFunctions.RandomStringGenerator() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string draftId;
            #endregion

            #region SOAP:Create Account1,Login and send mail to Syncuser.

            zAccount account1 = new zAccount();
            account1.createAccount();
            account1.login();
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject((subject1)).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content1)));

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Modifying Draft on ZCO side.
            RDOFolder inbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            OutlookCommands.Instance.Sync();
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject1, inbox, true);
            zAssert.IsNotNull(rdoMail, "Verify the initial draft exists");

            zAssert.IsTrue(rdoMail.Body.Contains(content1), String.Format("Verify the initial draft body ({0}) contains the expected ({1})", rdoMail.Body, content1));
            RDOMail fwdMail = OutlookMailbox.Instance.mailReply(rdoMail, OutlookMailbox.mailReplyType.forward);
            fwdMail.CC = emailCc;
            fwdMail.BCC = emailBcc;
            fwdMail.Body = content2;
            fwdMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP:Checking the Draft message on ZCS side

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject1 + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:content", null, content2, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:su", null, subject1, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e", "a", emailCc, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e", "t", "c", null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e", "a", emailBcc, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e", "t", "b", null, 1);
            #endregion

        }

        [Test, Description("Verify ZCO can send a messages using an Email Alias")]
        [Category("Mail")]
        [Bug("19355")]
        [SyncDirection(SyncDirection.TOZCS)]
        /*Prashant A [Dec-26-11]: 
         * 1. In case of alias address, if I try to assign SenderEntryId, SenderEmailAddress, SenderName of zco alias address in rMail object, the sent email has details of zco primary address
         * 2. Earlier, we used SentOnBehalfOfName property to assign alias address, but this is incorrect logic as we are not sending email from: zco primary address and on-behalfof: zco alias address
         * So, marking this test as "Ignore" and will have to test this case manually.
         */
        [Ignore("Incorrect approach - The test is trying to send email as alias address but is using SentOnBehalfOfName property ideally to be used only by delegates")]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message TO account1 using an Email Alias of Syncuser in the FROM field",
            "Login as account1 (SOAP)",
            "Verify the message is received with proper Subject and Content",
            "Verify that the FROM field shows the Email Alias of Syncuser and TO field shows account1")]
        public void MailBugs_19355()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Send a message TO: account1 using an Email Alias of Syncuser in the FROM field
            // 3. Login as account1 (SOAP)
            // 4. Verify the message is received with proper Subject and Content
            // 5. Verify that the FROM field shows the Email Alias of Syncuser and TO field shows account1
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string aliasDisplayName = "alias" + GlobalProperties.time() + GlobalProperties.counter();
            string aliasEmailAddress = aliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Account Setup

            // Create account alias
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, aliasEmailAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // 'Create an Outlook mail item
            RDOFolder outboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderOutbox);
            RDOMail rMail = OutlookMailbox.Instance.CreateMail();
            
            // Create the email subject
            rMail.Subject = subject;

            // Create the email body
            rMail.Body = content;

            //Add email recipient
            rMail.To = zAccount.AccountA.emailAddress;
            rMail.SentOnBehalfOfName = aliasEmailAddress;
            
            // Send the email
            rMail.Save();
            rMail.Send();

            // Close outlook
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            OutlookCommands.Instance.Sync();

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + aliasEmailAddress + "']"), "d", aliasDisplayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + aliasEmailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

        }

        [Test, Description("Bug 13098: If a recipient reply's to a message sent to its primary address then the reply would include the recipient's own primary address in the 'TO/CC' field.")]
        [Category("Mail")]
        [Bug("13098")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the primary address of sync user (To: Sync User, CC: Account2)",
            "2. ZCO: Reply to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's primary email address in the 'TO/CC' field")]
        public void MailBugs_13098_1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string originalMessageId, messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to the primary address of sync user (To: Sync User, CC: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountB.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of ZCO User and Account2 in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), null, null, null, 0);

            #endregion
        }

        [Test, Description("Bug 13098: If a recipient reply's to a message sent to its primary address then the reply would include the recipient's own primary address in the 'TO/CC' field.")]
        [Category("Mail")]
        [Bug("13098")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the primary address of sync user (To: Account2, CC: Sync User)",
            "2. ZCO: Reply to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's primary email address in the 'TO/CC' field")]
        public void MailBugs_13098_2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string originalMessageId, messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to the primary address of sync user (CC: Sync User, To: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountB.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO user and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of ZCO User and Account2 in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), null, null, null, 0);

            #endregion
        }

        [Test, Description("Bug 13098: If a recipient reply's to a message sent to its primary address then the reply would include the recipient's own primary address in the 'TO/CC' field.")]
        [Category("Mail")]
        [Bug("13098")]
        [Ignore("RDO Implementation contains the ZCO user's primary email address in the replyall email object. Need to change to SafeMail items. Similar to MailBugs_13455_3 ")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the primary address of sync user (To: Sync User, CC: Account2)",
            "2. ZCO: ReplyAll to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's primary email address in the 'TO/CC' field")]
        // added [ignore] tag for now. Looks like Redemption reply all mail object adds 'to/cc' field.  Need to find if we can create the reply mail object in any other way. this problem does not happen when manually executed.
        public void MailBugs_13098_3()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string originalMessageId, messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to the primary address of sync user (To: Sync User, CC: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountB.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.replyAll);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1/Account2 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            #region Account1 Verification

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);

            #endregion

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage1 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(mailMessage1, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);

            #endregion

            #endregion
        }

        [Test, Description("Bug 13098: If a recipient reply's to a message sent to its primary address then the reply would include the recipient's own primary address in the 'TO/CC' field.")]
        [Category("Mail")]
        [Bug("13098")]
        [Ignore("RDO Implementation contains the ZCO user's primary email address in the replyall email object. Need to change to SafeMail items. Similar to MailBugs_13455_3 ")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the primary address of sync user (To: Account2, CC: Sync User)",
            "2. ZCO: ReplyAll to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's primary email address in the 'TO/CC' field")]
        // added [ignore] tag for now. Looks like Redemption reply all mail object adds 'to/cc' field.  Need to find if we can create the reply mail object in any other way. this problem does not happen when manually executed.
        public void MailBugs_13098_4()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string originalMessageId, messageId;
            #endregion

            #region SOAP Block: Account1 sends a message to the primary address of sync user (CC: Sync User, To: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountB.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.replyAll);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1/Account2 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            #region Account1 Verification

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);

            #endregion

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage1 = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(mailMessage1, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);

            #endregion

            #endregion

        }

        [Test, Description("Bug 13455: Replying to a message sent to a recipients alias does not include alias as recipient of the reply")]
        [Category("Mail")]
        [Bug("13455")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)",
            "2. ZCO: Reply to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, syncUserAlias).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountB.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of ZCO User and Account2 in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), null, null, null, 0);

            #endregion

        }

        [Test, Description("Bug 13455: Replying to a message sent to a recipients alias in CC does not include alias as recipient of the reply")]
        [Category("Mail")]
        [Bug("13455")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)",
            "2. ZCO: Reply to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountB.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, syncUserAlias).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of ZCO User and Account2 in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), null, null, null, 0);

            #endregion

        }

        [Test, Description("Bug 13455: Reply All to a message sent to a recipients alias does not include alias as recipient of the reply")]
        [Category("Mail")]
        [Bug("13455"), Bug("16905")]
        [Ignore("RDO Implementation contains the alias's email address in the replyall email object. Need to change to SafeMail items.")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)",
            "2. ZCO: ReplyAll to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_3()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, syncUserAlias).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountB.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.replyAll);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1/Account2 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            #region Account1 Verification

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);

            #endregion

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(mailMessage1, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);

            #endregion

            #endregion

        }

        [Test, Description("Bug 13455: Reply All to a message sent to a recipients alias in CC does not include alias as recipient of the reply")]
        [Category("Mail")]
        [Bug("13455"), Bug("16905")]
        [Ignore("RDO Implementation contains the alias's email address in the replyall email object. Need to change to SafeMail items.")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)",
            "2. ZCO: ReplyAll to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_4()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountB.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, syncUserAlias).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.replyAll);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1/Account2 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            #region Account1 Verification

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);

            #endregion

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage1 = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(mailMessage1, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage1, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);

            #endregion

            #endregion

        }

        [Test, Description("Bug 13455: Replying to a message sent to a recipients alias includes alias as recipient of the reply (Case Sensitivity)")]
        [Category("Mail")]
        [Bug("13455")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "This is a case sensitivity test.",
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)",
            "2. ZCO: Reply to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_5()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserString = GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + syncUserString;
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string syncUserAliasDisplayNameCaseSensitive = "syncuser_alias" + syncUserString;
            string syncUserAliasCaseSensitive = syncUserAliasDisplayNameCaseSensitive + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, syncUserAliasCaseSensitive).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountB.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of ZCO User and Account2 in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAliasCaseSensitive + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), null, null, null, 0);

            #endregion

        }

        [Test, Description("Bug 13455: Replying to a message sent to a recipients alias includes alias as recipient of the reply")]
        [Category("Mail")]
        [Bug("13455")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "This is a case sensitivity test.",
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)",
            "2. ZCO: Reply to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_6()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserString = GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + syncUserString;
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string syncUserAliasDisplayNameCaseSensitive = "syncuser_alias" + syncUserString;
            string syncUserAliasCaseSensitive = syncUserAliasDisplayNameCaseSensitive + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountB.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, syncUserAliasCaseSensitive).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the absence of ZCO User and Account2 in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAliasCaseSensitive + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), null, null, null, 0);

            #endregion

        }

        [Test, Description("Bug 13455: Replying to a message sent to a recipients alias includes alias as recipient of the reply")]
        [Category("Mail")]
        [Bug("13455"), Bug("16905")]
        [Ignore("RDO Implementation contains the alias's email address in the replyall email object. Need to change to SafeMail items.")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "This is a case sensitivity test.",
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)",
            "2. ZCO: ReplyAll to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_7()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserString = GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + syncUserString;
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string syncUserAliasDisplayNameCaseSensitive = "syncuser_alias" + syncUserString;
            string syncUserAliasCaseSensitive = syncUserAliasDisplayNameCaseSensitive + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Sync User's Alias, CC: Account2)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, syncUserAliasCaseSensitive).
                            AddAddress(MessageObject.AddressType.Cc, zAccount.AccountB.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.replyAll);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1/Account2 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            #region Account1 Verification

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAliasCaseSensitive + "']"), null, null, null, 0);

            #endregion

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAliasCaseSensitive + "']"), null, null, null, 0);

            #endregion

            #endregion

        }

        [Test, Description("Bug 13455: Replying to a message sent to a recipients alias includes alias as recipient of the reply")]
        [Category("Mail")]
        [Bug("13455"), Bug("16905")]
        [Ignore("RDO Implementation contains the alias's email address in the replyall email object. Need to change to SafeMail items.")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps(
            "This is a case sensitivity test.",
            "1. ZCS: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)",
            "2. ZCO: ReplyAll to the message",
            "3. ZCS: Login as Account1 (SOAP)",
            "4. Verify the message is received without the sync user's alias in the 'TO/CC' field")]
        public void MailBugs_13455_8()
        {
            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string syncUserString = GlobalProperties.time() + GlobalProperties.counter();
            string syncUserAliasDisplayName = "syncUser_Alias" + syncUserString;
            string syncUserAlias = syncUserAliasDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string syncUserAliasDisplayNameCaseSensitive = "syncuser_alias" + syncUserString;
            string syncUserAliasCaseSensitive = syncUserAliasDisplayNameCaseSensitive + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string originalMessageId, messageId;
            #endregion

            #region Alias creation

            // Create the  Email Alias for Sync User
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(zAccount.AccountZCO.zimbraId, syncUserAlias));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            #endregion

            #region SOAP Block: Account1 sends a message to the alias of sync user (To: Account2, CC: Sync User's Alias)
            // Send Message
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountB.emailAddress).
                            AddAddress(MessageObject.AddressType.Cc, syncUserAliasCaseSensitive).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Login as ZCO User and get the original message ID so that we can verify the replied status later            

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out originalMessageId, 1);

            #endregion

            #region Outlook Block: Sync User replys to the message

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            // Make sure the mail is there in the Inbox.
            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify that the INBOX appears in the primary store");

            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, inboxFolder, true);
            zAssert.IsNotNull(rMail, "Verify that the mail exists in the INBOX");

            //Create reply mail object
            RDOMail replyMail = OutlookMailbox.Instance.mailReply(rMail, OutlookMailbox.mailReplyType.replyAll);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            // Send the mail
            replyMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block: Login as Account1/Account2 & verify the message is received without the sync user's primary email address in the 'TO/CC' field

            #region Account1 Verification

            // Search for the message ID
            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAliasCaseSensitive + "']"), null, null, null, 0);

            #endregion

            #region Account2 Verification

            // Search for the message ID
            zAccount.AccountB.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject
            zAccount.AccountB.selectSOAP(mailMessage, "//mail:su", null, replyMail.Subject, null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of Sync User in the "TO & CC" field
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "t", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "c", null, 0);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAlias + "']"), null, null, null, 0);
            zAccount.AccountB.selectSOAP(mailMessage, ("//mail:e[@a='" + syncUserAliasCaseSensitive + "']"), null, null, null, 0);

            #endregion

            #endregion

        }

        [Test, Description("Build 1068 ZCO does not like full names for recipients")]
        [Category("Mail")]
        [Bug("18408")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Send a Mail to Account1.Mail To: contains displayname<emailaddress>", "Sync", "Verify the message is received correctly")]
        public void MailBugs_18408()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block to Send the Mail
            RDOMail rMail = OutlookMailbox.Instance.CreateMail();
            rMail.To = zAccount.AccountA.displayName + "<" + zAccount.AccountA.emailAddress + ">";
            rMail.Recipients.ResolveAll(null, null);
            rMail.Subject = subject;
            rMail.Body = content;
            rMail.Save();
            rMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP block to Verify

            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                messageId + "']", null, null, null, 1);

            zAccount.AccountA.selectSOAP(mailMessage, "//mail:content", null, content, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "a", zAccount.AccountZCO.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "t", "f", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "a", zAccount.AccountA.emailAddress, null, 1);

            #endregion

        }

        [Test, Description("Bug19028: Certificates are marked as invalid when received through Outlook")]
        [Category("Calendar")]
        [Bug("19028")]
        [TestSteps("Inject the mime with certificate", "Sync", "Verify mime contents")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void MailBugs_19028()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string message2Subject = "here another";
            string message2Content = "Something is changing the mime content somewhere invalidating the signature";
            #endregion

            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.TestMailRaw + @"\Bugs\19028";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook Block. Verify MIME contents
            OutlookCommands.Instance.Sync();

            RDOFolder inbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(message2Subject, inbox, true);
            zAssert.IsNotNull(rdoMail, "Verify that the injected mail item exists.");

            zAssert.IsTrue(rdoMail.Subject.Contains(message2Subject), "Verify the mail subject matches");
            zAssert.IsTrue(rdoMail.Body.Contains(message2Content), "Verify the mail content matches the expected.");
            zAssert.IsTrue(rdoMail.To.Contains("Henry Gusakovsky"), "Verify the TO: field of the injected mime");


            #endregion

        }

        [Test, Description("Bug26696: Certificates are marked as invalid when received through Outlook")]
        [Category("Calendar"), Category("Mail")]
        [Bug("26696")]
        [TestSteps("Inject the mime.", "Sync", "Verify mime contents are not displayed in Outlook")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void MailBugs_26696()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string message2Subject = "Daily Technical Analysis - 20 March 2008";
            string message2Content = "Please find attached our Daily Technical Analysis for today.";
            #endregion

            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.TestMailRaw + @"\Bugs\26696";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook Block. Verify MIME contents
            OutlookCommands.Instance.Sync();

            RDOFolder inbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(message2Subject, inbox, true);
            zAssert.IsNotNull(rdoMail, "Verify that the injected mail item exists.");

            zAssert.IsTrue(rdoMail.Subject.Contains(message2Subject), "Verify the mail subject matches");
            zAssert.IsTrue(rdoMail.Body.Contains(message2Content), "Verify the mail content matches the expected.");

            //Verify that body does not contain MIME i.e X-Zimbra headers
            zAssert.IsFalse(rdoMail.Body.Contains("X-Zimbra"), "Verify body does not show mime contents");
            //Verify attachment name
            zAssert.IsTrue(rdoMail.Attachments.GetFirst().DisplayName.Contains("Daily Equities_ 20 March.pdf"), "Attachment should not be shown as mime in body, hence check that its attached to mail");
            #endregion

        }

        [Test, Description("Bug 32679: Connector times out attempting to sync with shared folders")]
        [Ignore("Ignoring as test scenario covered by other tests")]
        [Category("Mail"), Category("Delegation")]
        [Bug("32679")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Account2 sends a couple of messages to Account1.",
            "2. SOAP: Account1 shares the inbox with Sync User (Rights = REVIEWER)",
            "3. ZCS: Sync User mounts the shared folder.",
            "4. ZCS: Verify that the delegated store is mounted properly and the folder contents are synced properly.")]
        public void MailBugs_32679()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();

            string subject2 = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();

            string subject3 = "subject3" + GlobalProperties.time() + GlobalProperties.counter();
            string content3 = UtilFunctions.RandomUpperLowerStringGenerator(50) + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, message1Id, message2Id, message3Id;
            #endregion

            #region create account
            zAccount userA = new zAccount();
            userA.createAccount();
            userA.login();
            #endregion

            #region SOAP Block: Account2 sends a couple of messages to Account1, Account1 shares the inbox with Sync User (Rights = REVIEWER)

            #region Account2 sends a couple of messages to Account1

            //Auth as Account2 & send a couple of messages to Account1

            zAccount.AccountB.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().
                            Subject(subject1).
                            AddAddress(MessageObject.AddressType.To, userA.emailAddress).
                            BodyTextPlain(content1)));
            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            zAccount.AccountB.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().
                            Subject(subject2).
                            AddAddress(MessageObject.AddressType.To, userA.emailAddress).
                            BodyTextPlain(content2)));
            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            zAccount.AccountB.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().
                            Subject(subject3).
                            AddAddress(MessageObject.AddressType.To, userA.emailAddress).
                            BodyTextPlain(content3)));
            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region Account1 shares the inbox with Sync User (Rights = REVIEWER)

            //Auth as Account1 and share inbox to Sync User
            // Get all folders to determine the inbox id
            userA.sendSOAP(new GetFolderRequest());

            userA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            userA.sendSOAP(new FolderActionRequest().
                GrantFolderbyID(inboxId,
                FolderActionRequest.grantUser, zAccount.AccountZCO.emailAddress, FolderActionRequest.rightsZcoReviewer));

            #endregion

            #region Account1 notes the Message IDs of the messages sent by Account2

            // Message 1
            userA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject1 + ")"));
            userA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Message 2
            userA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject2 + ")"));
            userA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Message 3
            userA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject3 + ")"));
            userA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message3Id, 1);

            #endregion

            #endregion

            #region Outlook Block: Sync User mounts the shared folder, Verify that the delegated store is mounted properly and the folder contents are synced properly
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(userA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            OutlookCommands.Instance.Sync();

            RDOMail rMail1 = OutlookMailbox.Instance.findMessage(subject1, mountpointInbox, true);
            zAssert.IsNotNull(rMail1, "Verify that the mail exists in the delegate store");

            RDOMail rMail2 = OutlookMailbox.Instance.findMessage(subject2, mountpointInbox, true);
            zAssert.IsNotNull(rMail2, "Verify that the mail exists in the delegate store");

            RDOMail rMail3 = OutlookMailbox.Instance.findMessage(subject3, mountpointInbox, true);
            zAssert.IsNotNull(rMail3, "Verify that the mail exists in the delegate store");
            #endregion

        }

        [Test, Description("Bug15026: Message body not shown when injecting the attached message")]
        [Category("Mail")]
        [Bug("15026")]
        [TestSteps("Inject the mime", "Sync", "Verify mime contents")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void MailBugs_15026()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject2 = "iso-8859-1 8bit test please dont choke on that NUL byte";

            ArrayList mimeContents = new ArrayList();
            mimeContents.Add("58[72,3A]=:");
            mimeContents.Add("60[74,3C]=<");
            mimeContents.Add("67[103,43]=C");
            mimeContents.Add("109[155,6D]=m");
            mimeContents.Add("113[161,71]=q");
            mimeContents.Add("126[176,7E]=~");
            mimeContents.Add("82[122,52]=R");

            #endregion

            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.TestMailRaw + @"\Bugs\15026";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook Block. Verify MIME contents
            OutlookCommands.Instance.Sync();

            RDOFolder inbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject2, inbox, true);
            zAssert.IsNotNull(rdoMail, "Verify that the injected mail item exists.");

            zAssert.IsTrue(rdoMail.Subject.Contains(subject2), "Verify the mail subject matches");

            foreach (string content in mimeContents)
            {
                zAssert.IsTrue(rdoMail.Body.Contains(content), "Verify the mail content matches the expected.");
            }


            #endregion

        }

        [Test, Description("Bug13626:Mails sent from OL, Shows Senders address as To address in Sent folder of web client")]
        [Category("Mail")]
        [Bug("13626")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message TO account1",
            "Login as syncuser (SOAP)",
            "Verify the message is sent with proper To,From,Subject and Content")]
        public void MailBugs_13626()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Auth as account1
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(" subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion

        }
        
        [Test, Description("Bug 5552/6108: Different types of newlines handled improperly / '=' sign appears in message bodies")]
        [Category("Mail")]
        [Bug("5552"), Bug("6108")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "1. SOAP: Inject the MIME into SyncUser's account",
            "2. ZCO: Sync & verify the contents of the injected message")]
        public void MailBugs_5552()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "gmail advanced search...";

            ArrayList mimeContents = new ArrayList();
            mimeContents.Add("Various advanced searches you can do from the \"Search Mail\" field. Note the");
            mimeContents.Add("\"in:\" and \"is:\" searches, which are handy.");
            #endregion

            #region LMTP Inject

            // Use LMTP to inject MIME into the Sync User's mailbox
            string mimeMsg = GlobalProperties.TestMailRaw + "/mime/bugMIME5552.txt";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeMsg, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            System.Threading.Thread.Sleep(50000);

            #endregion

            #region Outlook Block: Verify the MIME contents

            // Sync Outlook
            OutlookCommands.Instance.Sync();

            // Search for the injected message
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Verify that the injected mail item exists.");

            // Verify the Subject of the injected message
            zAssert.IsTrue(rdoMail.Subject.Contains(subject), "Verify the mail subject matches");

            foreach (string content in mimeContents)
            {
                zAssert.IsTrue(rdoMail.Body.Contains(content), "Verify the mail content matches the expected.");
            }

            #endregion

        }

        [Test, Description("Bug28768: sync a chat message from ZCS to ZCO")]
        [Category("Mail")]
        [Bug("28768")]
        [SyncDirection(SyncDirection.TOZCO)]
        /*Prashant A [Dec-26-11]: IM chat no more supported by ZCS, so marking this test as Ignore*/
        [Ignore("IM chat no more supported by ZCS")]
        [TestSteps(
            "1. Create a chat record (SOAP)",
            "2. sync to zco",
            "3. verify that the message is present in ZCO")]
        public void MailBugs_28768()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string account2ChatId, chatSubject;
            string chatBody = chatSubject = "chatMessage" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            try
            {

                #region SOAP Login to IM

                // Enable sessions on both AccountZCO and AccountB
                zAccount.AccountZCO.enableSOAPSession();
                zAccount.AccountB.enableSOAPSession();

                //Login to IM from ZCO Account
                zAccount.AccountZCO.sendSOAP(new IMGatewayListRequest());
                zAccount.AccountZCO.selectSOAP("//im:IMGatewayListResponse", null, null, null, 1);

                //Login to IM from accountB
                zAccount.AccountB.sendSOAP(new IMGatewayListRequest());
                zAccount.AccountB.selectSOAP("//im:IMGatewayListResponse", null, null, null, 1);
                #endregion

                #region SOAP Add users in each others buddy list

                zAccount.AccountB.sendSOAP(new IMSubscribeRequest(zAccount.AccountZCO.emailAddress, zAccount.AccountZCO.displayName, "add"));
                zAccount.AccountB.selectSOAP("//im:IMSubscribeResponse", null, null, null, 1);

                zAccount.AccountZCO.sendSOAP(new IMAuthorizeSubscribeRequest(zAccount.AccountB.emailAddress, "true").DisplayName(zAccount.AccountB.displayName));
                zAccount.AccountZCO.selectSOAP("//im:IMAuthorizeSubscribeResponse", null, null, null, 1);

                zAccount.AccountB.sendSOAP(new IMAuthorizeSubscribeRequest(zAccount.AccountZCO.emailAddress, "true"));
                zAccount.AccountB.selectSOAP("//im:IMAuthorizeSubscribeResponse", null, null, null, 1);

                #endregion

                #region SOAP send chat message to syncuser
                zAccount.AccountB.sendSOAP(new IMSendMessageRequest(zAccount.AccountZCO.emailAddress, chatBody));
                zAccount.AccountB.selectSOAP("//im:IMSendMessageResponse", null, null, null, 1);

                // Wait for the message to arrive
                System.Threading.Thread.Sleep(10000);

                // Send NoOpRequest to receive the IM message
                zAccount.AccountZCO.sendSOAP("<NoOpRequest xmlns='urn:zimbraMail'/>");
                zAccount.AccountZCO.selectSOAP("//zimbra:n[@type='message']", "thread", null, out account2ChatId, 1);

                #endregion

                #region SOAP Close chat window so that chat is saved in folder
                zAccount.AccountZCO.sendSOAP(new IMModifyChatRequest(account2ChatId, "close"));
                zAccount.AccountZCO.selectSOAP("//im:IMModifyChatResponse", null, null, null, 1);
                #endregion

                #region Outlook Check chat folder for chat history
                OutlookCommands.Instance.Sync();

                string[] folderNames = { "Chats" };
                foreach (string folderName in folderNames)
                {
                    RDOFolder chatsFolder = OutlookMailbox.Instance.findFolder(folderName);
                    if (chatsFolder != null)
                    {
                        foreach (RDOMail m in chatsFolder.Items)
                        {

                            tcLog.Error(folderName + ": " + m.Body);
                            if (m.Subject.Contains(chatSubject))
                            {
                                // Verify the subject and content of the synced chat message
                                zAssert.AreEqual(zAccount.AccountB.emailAddress, m.SenderEmailAddress, "Verify sender of chat message is matched.");
                                zAssert.IsTrue(m.Body.Contains(chatBody), "Verify chat history contains expected message.");
                            }

                        }
                    }
                }

                #endregion

            }
            finally
            {
                zAccount.AccountZCO.disableSOAPSession();
                zAccount.AccountB.disableSOAPSession();
            }

        }

        [Test, Description("Verify that ZCO does not generates bounce message if message with read receipt is deleted")]
        [Category("Mail")]
        [Bug("46160")]
        public void MailBugs_46160()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Add a message to the account mailbox

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            zAccount.AccountA.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
                        <e t='n' a='" + zAccount.AccountA.emailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");
            zAssert.That(Regex.IsMatch(rdoMail.Body, content), "Check that the message content matched expected value");
            zAssert.IsTrue(rdoMail.ReadReceiptRequested, "read receipt is present");
            #endregion

            #region SOAP block to delete the message without reading
            zAccount.AccountZCO.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>subject:("+ subject +@")</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            zAccount.AccountZCO.sendSOAP(new MsgActionRequest().SetAction(messageId, MsgActionRequest.ActionOperation.delete));
            #endregion

            #region Outlook block to verify that the message is deleted permanently and there are no bounce messages
            OutlookCommands.Instance.Sync();
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNull(rMail, "Mail is not present in the inbox");

            rMail = OutlookMailbox.Instance.findMessage(subject, trash, true);
            zAssert.IsNull(rMail, "Mail is not present in the trash");

            rMail = OutlookMailbox.Instance.findMessage("Undeliverable: Not read:");
            zAssert.IsNull(rMail, "NDR is not present in the inbox");
            #endregion

        }

        [Test, Description("Verify that ZCO does not generates bounce message if message with read receipt is deleted")]
        [Category("Mail")]
        [Bug("46161")]
        public void MailBugs_46161()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "Fwd: SF: Case 00051788: Gabae Industries Corporation - migration to proffessional" ;

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly 
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.TestMailRaw + @"\bug46161\MimeMsg.txt";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            #region Outlook block 
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");
            rdoMail.MarkRead(true);
            OutlookCommands.Instance.Sync();
            zAssert.IsFalse(rdoMail.ReadReceiptRequested, "read receipt is not present");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rdoMail.Attachments.Count, "Verify that the message contains one attachment");
            zAssert.AreEqual("migration to proffessional (6.33 KB).msg", rdoMail.Attachments[1].FileName, "Verify that the correct file name is used");
            #endregion
        }

        [Test, Description("Bug 47730: sync mailbox with ZCO 6.0.6, lose Replied/Fowarded status")]
        [Category("Mail")]
        [Bug("47730")]
        [SyncDirection(SyncDirection.NOSYNC)]
        [TestSteps(
            "1. Send two mails from UserA to ZCO user",
            "2. ZCO user - Reply first mail and Forward second mail",
            "3. Check the originally received mail in Inbox - first email should have replied icon, second email should have forwarded icon",
            "4. ZCO Sync, again check the originally received emails icon - should be same as before sync"
            )]
        /*  Reference sources:
         * http://www.pcreview.co.uk/forums/programmatically-retrieve-reply-forward-flag-status-and-timestamp-t3757541.html
         * http://www.pcreview.co.uk/forums/unset-replied-status-message-t4029447.html
         */
        public void MailBugs_47730()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables

            string subject1 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string lastAction1, lastAction2, prIconValue1, prIconValue2;
            const int PR_LAST_VERB_EXECUTED = 0x10810003;
            const int PR_ICON_INDEX = 0x10800003;
            const string EXCHIVERB_REPLYTOSENDER = "102";
            const string EXCHIVERB_FORWARD = "104";
            const string PR_ICON_INDEX_REPLIED = "261";
            const string PR_ICON_INDEX_FORWARDED = "262";

            #endregion

            #region SOAP: Send two emails from userA to ZCO user
            zAccount.AccountA.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().
                            Subject(subject1).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            zAccount.AccountA.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().
                            Subject(subject2).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook: Reply to first email and forward second email

            OutlookCommands.Instance.Sync();

            #region Reply
            RDOMail recMail1 = OutlookMailbox.Instance.findMessage(subject1);
            zAssert.IsNotNull(recMail1, "Verify received mail exists");

            RDOMail replyMail = OutlookMailbox.Instance.mailReply(recMail1, OutlookMailbox.mailReplyType.reply);
            zAssert.IsNotNull(replyMail, "Verify that the reply mail object is created");

            replyMail.To = zAccount.AccountA.emailAddress;
            replyMail.Send();

            //Verify that icon index and last action on the mail reflects replied status
            prIconValue1 = recMail1.get_Fields(PR_ICON_INDEX).ToString();
            zAssert.AreEqual(PR_ICON_INDEX_REPLIED, prIconValue1, "Before Sync: Verify email has replied icon");

            lastAction1 = recMail1.get_Fields(PR_LAST_VERB_EXECUTED).ToString();
            zAssert.AreEqual(EXCHIVERB_REPLYTOSENDER, lastAction1, "Before Sync: Verify last action on email is replied");
            #endregion

            #region Forward
            RDOMail recMail2 = OutlookMailbox.Instance.findMessage(subject2);
            zAssert.IsNotNull(recMail2, "Verify received mail exists");

            RDOMail forwardMail = OutlookMailbox.Instance.mailReply(recMail2, OutlookMailbox.mailReplyType.forward);
            zAssert.IsNotNull(forwardMail, "Verify that the forward mail object is created");

            forwardMail.To = zAccount.AccountB.emailAddress;
            forwardMail.Send();

            //Verify that icon index and last action on the mail reflects forwarded status
            prIconValue2 = recMail2.get_Fields(PR_ICON_INDEX).ToString();
            zAssert.AreEqual(PR_ICON_INDEX_FORWARDED, prIconValue2, "Before Sync: Verify email has forwarded icon");

            lastAction2 = recMail2.get_Fields(PR_LAST_VERB_EXECUTED).ToString();
            zAssert.AreEqual(EXCHIVERB_FORWARD, lastAction2, "Before Sync: Verify last action on email is forwarded");
            #endregion

            #endregion

            #region Outlook: Sync and check if the reply/forward status of above emails gets lost

            OutlookCommands.Instance.Sync();

            //Verify that icon index and last action on the mail reflects replied status
            prIconValue1 = recMail1.get_Fields(PR_ICON_INDEX).ToString();
            zAssert.AreEqual(PR_ICON_INDEX_REPLIED, prIconValue1, "After Sync: Verify email has replied icon");

            lastAction1 = recMail1.get_Fields(PR_LAST_VERB_EXECUTED).ToString();
            zAssert.AreEqual(EXCHIVERB_REPLYTOSENDER, lastAction1, "After Sync: Verify last action on email is replied");

            //Verify that icon index and last action on the mail reflects forwarded status
            prIconValue2 = recMail2.get_Fields(PR_ICON_INDEX).ToString();
            zAssert.AreEqual(PR_ICON_INDEX_FORWARDED, prIconValue2, "After Sync: Verify email has forwarded icon");

            lastAction2 = recMail2.get_Fields(PR_LAST_VERB_EXECUTED).ToString();
            zAssert.AreEqual(EXCHIVERB_FORWARD, lastAction2, "After Sync: Verify last action on email is forwarded");

            #endregion


        }

        [Test, Description("Bug 57320: Invalid email address error does not list invalid ones in ZCO and HTML web client")]
        [Category("Mail")]
        [Bug("57320")]
        [SyncDirection(SyncDirection.NOSYNC)]
        [TestSteps(
            "1. Send mail to unresolvable address (explicit type - with missing userpart)",
            "2. Verify that, error prompt comes and message is not sent (stays in Outbox)"
            )]
        public void MailBugs_57320_1()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject1 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string recipient1 = "[SMTP:missinguserpart.com]";
            #endregion

            #region Outlook Send Block

            // 'Case1: Send email to recipient having missing user part
            RDOMail rdoMail1 = OutlookMailbox.Instance.CreateMail();
            rdoMail1.Subject = subject1;
            rdoMail1.Body = content;
            rdoMail1.To = recipient1;
            rdoMail1.Recipients.ResolveAll(null, null);
            rdoMail1.Send();

            OutlookCommands.Instance.Sync();

            System.Threading.Thread.Sleep(3000);

            OutlookCommands.Instance.Sync();

            #endregion

            #region Outbox verification

            RDOMail msg1 = OutlookMailbox.Instance.findMessage(subject1, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderOutbox), false);
            zAssert.IsNotNull(msg1, "Verify the mail was not sent");
            
            #endregion

            #region Outbox mail cleanup
            msg1.Delete(1);

            #endregion

        }

        [Test, Description("Bug 57320: Invalid email address error does not list invalid ones in ZCO and HTML web client")]
        [Category("Mail")]
        [Bug("57320")]
        [SyncDirection(SyncDirection.NOSYNC)]
        [TestSteps(
           "1. Send mails to unresolvable addresses having invalid host/domain",
           "2. Verify that, message undeliverable notification is received"
            )]
        public void MailBugs_57320_2()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            string subject2 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string recipient2 = zAccount.AccountA.displayName + "@invalidhost.com";
            #endregion

            #region Outlook Send Block

            // 'Case2: Send email to recipient with invalid host/domain
            RDOMail rdoMail2 = OutlookMailbox.Instance.CreateMail();
            rdoMail2.Subject = subject2;
            rdoMail2.Body = content;
            rdoMail2.To = recipient2;
            rdoMail2.Recipients.ResolveAll(null, null);
            rdoMail2.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region Undeliverable notification verification

            System.Threading.Thread.Sleep(5000);

            OutlookCommands.Instance.Sync();

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);

            RDOMail msg2 = OutlookMailbox.Instance.findMessage("Undelivered Mail Returned to Sender", inboxFolder, recipient2);
            zAssert.IsNotNull(msg2, "Verify the mail is not delivered");

            #endregion
        }
    }
}
