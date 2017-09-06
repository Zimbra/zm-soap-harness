using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using SoapAdmin;
using System.Xml;
using System.IO;

namespace clientTests.Client.Mail
{
    [TestFixture]
    public class SendMessage : BaseTestFixture
    {
        [Test, Description("Verify ZCO can send a message to a user using the 'TO' field.")]
        [Category("SMOKE")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message to account1",
            "Login as account1 (SOAP)",
            "Verify the message is received with proper Subject and Content",
            "Verify that the FROM field shows syncuser and the TO field shows account1")]
        public void SendMessage_01()
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
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            string messageId;

            // Auth as account1
            zAccount.AccountA.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>subject:(" + subject + @")</query>
                    </SearchRequest>");
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(
                @"  <GetMsgRequest xmlns='urn:zimbraMail'>
                        <m id='" + messageId + @"'/>
                    </GetMsgRequest>");
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

        [Test, Description("Verify ZCO can send a message to a user using the 'CC' field.")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message TO: account1 and CC: account2",
            "Login as account2 (SOAP)",
            "Verify the message is received with proper Subject and Content",
            "Verify that the FROM field shows syncuser, TO field shows account1 and the CC field shows account2")]
        public void SendMessage_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.CC = zAccount.AccountB.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountB.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.cn, null, 1);
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            #endregion
        }

        [Test, Description("Bug 15384: Verify ZCO can send a message to a user using the 'BCC' field.")]
        [Category("Mail")]
        [Bug("15384")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. Login as sync user (ZCO)",
            "2. Send a message TO: account1, CC: account2, BCC: account3 and account4",
            "3. Login as account3 (SOAP)",
            "4. Verify the message is received with proper Subject and Content",
            "5. Verify that the FROM field shows syncuser, TO field shows account1, CC field shows account2",
            "6. Verify that account3 and account4 does not appears in header",
            "7. Login as account2 (SOAP)",
            "8. Verify that the FROM field shows syncuser, TO field shows account1, CC field shows account2",
            "9. Verify that account3 and account4 does not appears in header")]
        public void SendMessage_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.CC = zAccount.AccountB.emailAddress;
            rdoMail.BCC = zAccount.AccountC.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            //Verification in Account2
            zAccount.AccountB.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountB.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountB.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountB.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountB.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.cn, null, 1);
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of BCC users in "TO & CC" fields
            zAccount.AccountB.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountC.emailAddress + "']"), null, null, null, 0);

            //Verification in Account3
            zAccount.AccountC.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountC.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountC.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verify the Subject and Content
            zAccount.AccountC.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountC.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountC.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountC.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountC.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountC.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the "CC" field
            zAccount.AccountC.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.cn, null, 1);
            zAccount.AccountC.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            // Verify the absence of BCC users in "TO & CC" fields
            zAccount.AccountC.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountC.emailAddress + "']"), null, null, null, 0);

            #endregion

        }

        [Test, Description("Verify ZCO can send a messages with HIGH Importance")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as sync user (ZCO)", "Send a message to account1 using IMPORTANCE: HIGH", "Login as account1 (SOAP)", "Verify the message is received with proper Subject and Content", "Verify that the FROM field shows syncuser and the TO field shows account1", "Verify that the IMPORTANCE shows HIGH")]
        public void SendMessage_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Importance = (int)OlImportance.olImportanceHigh;

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify that the message is marked IMPORTANTANCE: HIGH
            zAccount.AccountA.selectSOAP("//mail:m", "f", "u!", null, 1);
            #endregion
        }

        [Test, Description("Verify ZCO can send a messages with LOW Importance")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as sync user (ZCO)", "Send a message to account1 using IMPORTANCE: LOW", "Login as account1 (SOAP)", "Verify the message is received with proper Subject and Content", "Verify that the FROM field shows syncuser and the TO field shows account1", "Verify that the IMPORTANCE shows LOW")]
        public void SendMessage_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Importance = (int)OlImportance.olImportanceLow;

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify that the message is marked IMPORTANTANCE: LOW
            zAccount.AccountA.selectSOAP("//mail:m", "f", "u?", null, 1);
            #endregion
        }

        [Test, Description("Verify ZCO can send a messages with NORMAL Importance")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as sync user (ZCO)", "Send a message to account1 using IMPORTANCE: NORMAL", "Login as account1 (SOAP)", "Verify the message is received with proper Subject and Content", "Verify that the FROM field shows syncuser and the TO field shows account1", "Verify that the IMPORTANCE shows NORMAL")]
        public void SendMessage_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Importance = (int)OlImportance.olImportanceNormal;

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify that the message is marked IMPORTANTANCE: NORMAL
            zAccount.AccountA.selectSOAP("//mail:m", "f", "u", null, 1);
            #endregion
        }

        [Test, Description("Verify ZCO can send a messages using an Email Alias")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as sync user (ZCO)", "Send a message TO account1 using an Email Alias of Syncuser in the FROM field", "Login as account1 (SOAP)", "Verify the message is received with proper Subject and Content", "Verify that the FROM field shows the Email Alias of Syncuser and TO field shows account1")]
        public void SendMessage_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string account = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region SOAP Block - Grant SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<GrantRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountB.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </GrantRightRequest>");

            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            OutlookCommands.Instance.SyncGAL();
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;

            //Add email recipient
            rdoMail.To = zAccount.AccountA.emailAddress;

            //Add email sender
            rdoMail.SentOnBehalfOfName = zAccount.AccountB.emailAddress;

            // Send the email
            rdoMail.Save();
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "Sender" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "s", null, 1);

            /* Prashant - As per http://bugzilla.zimbra.com/show_bug.cgi?id=75895 reply-to is not set for SOBO messages
            // Verify the "Reply-To" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "r", null, 1);
             */

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion
        }

        [Test, Description("Verify ZCO can send a messages 'OnBehalfOf' another user in GAL")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. Login as sync user (ZCO)",
            "2. Send a message TO: account1 'OnBehalfOf' account2 user in GAL",
            "3. Login as account1 (SOAP)",
            "4. Verify the message is received with proper Subject and Content",
            "5. Verify that the FROM field shows account2,  SENDER shows syncuser and TO field shows account1")]
        public void SendMessage_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string account = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region SOAP Block - Grant SOBO right

            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<GrantRightRequest xmlns='urn:zimbraAdmin'>
	        <target by='name' type='account'>" + zAccount.AccountB.displayName + @"</target>
	        <grantee by='name' type='usr'>" + zAccount.AccountZCO.displayName + @"</grantee>
	        <right>sendOnBehalfOf</right>
            </GrantRightRequest>");

            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            OutlookCommands.Instance.SyncGAL();
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;

            //Add email recipient
            rdoMail.To = zAccount.AccountA.emailAddress;

            //Add email sender
            rdoMail.SentOnBehalfOfName = zAccount.AccountB.emailAddress;

            // Send the email
            rdoMail.Save();
            rdoMail.Send();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountB.selectSOAP(m, "//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "Sender" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "s", null, 1);

            /* Prashant - As per http://bugzilla.zimbra.com/show_bug.cgi?id=75895 reply-to is not set for SOBO messages
            // Verify the "Reply-To" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "r", null, 1);
             */

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountA.selectSOAP(m, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            #endregion
        }

        [Test, Description("Verify message sent to a Contact by ZCO is received in ZCS")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a contact in ZCO", "Send mail to contact from ZCO sync", "Login as contact in ZCS", "Verify the message is received correctly")]
        public void SendMessage_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string domainName = "domain" + GlobalProperties.time() + GlobalProperties.counter() + "." + "com";
            string accountName = "account" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, domainId;
            #endregion

            #region SOAP Block to create a user in different domain
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateDomainRequest().DomainName(domainName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:CreateDomainResponse/admin:domain", "id", null, out domainId, 1);
            zAccount account1 = new zAccount(accountName, domainName);
            account1.createAccount();
            #endregion

            #region Outlook Block

            // Create an Outlook mail item

            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            rContact.Email1Address = account1.emailAddress;

            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;

            //Add email recipient
            rdoMail.To = rContact.Email1Address;

            // Send the email
            rdoMail.Save();
            rdoMail.Send();
            OutlookCommands.Instance.Sync();

            #endregion

            #region soap
            account1.login();
            account1.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));

            account1.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            account1.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode m = account1.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            account1.selectSOAP("//mail:content", null, content, null, 1);
            account1.selectSOAP("//mail:su", null, subject, null, 1);
            account1.selectSOAP("//mail:e", "d", zAccount.AccountZCO.cn, null, 1);
            account1.selectSOAP("//mail:e", "a", zAccount.AccountZCO.displayName, null, 1);
            account1.selectSOAP("//mail:e", "t", "f", null, 1);
            account1.selectSOAP("//mail:e", "d", account1.displayName, null, 1);
            account1.selectSOAP("//mail:e", "a", account1.emailAddress, null, 1);

            #endregion


        }

        [Test, Description("Verify that ZCO cannot resend a mail")]
        [Category("Mail")]
        [Bug("44564")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as sync user (ZCO)", "Send a message to account1", "Login as account1 (SOAP)", "Verify the message is received with proper Subject and Content", "Verify that the FROM field shows syncuser and the TO field shows account1", "Resend the message from OlK", "It should not be allowed")]
        public void SendMessage_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #endregion

            #region Outlook Block

            // Create an Outlook mail item
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
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
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

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            try
            {
                rdoMail.Send();
            }
            catch (SystemException e)
            {
                zAssert.IsTrue(e.Message.Contains("MAPI_E_NO_ACCESS"), "Exception thrown indicating Resend operation is not permitted");
            }
            #endregion

        }

        [Test, Description("Verify that message of size greater than permitted is saved in drafts")]
        [Category("Mail")]
        [Bug("44425")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as sync user (ZCO)", "Send a message to account1 with attachment of size greater than permitted value", "The message is saved in drafts and the NDR contains the names of the attachments")]
        public void SendMessage_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments/bugAttachment15318.txt";
            string attachmentName = "bugAttachment15318.txt";
            const int Modified_Message_Size = 1048576; //earlier size was set to 1024 which is very less (1 kb) so modified to set size to 1048576 bytes i.e. 1 mb
            string messageSize;
            #endregion

            #region set maximum message size
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.GetConfigRequest().GetAttributeValue(ConfigAttributes.zimbraMtaMaxMessageSize));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:GetConfigResponse/admin:a[@n='zimbraMtaMaxMessageSize']", null, null, out messageSize, 1);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                                                                  ModifyAttribute(ConfigAttributes.zimbraMtaMaxMessageSize, Modified_Message_Size.ToString()));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);
            #endregion

            #region Outlook Block

            try
            {
                // Create an Outlook mail item
                RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

                // Set the values
                rdoMail.Subject = subject;
                rdoMail.Body = content;
                rdoMail.To = zAccount.AccountA.emailAddress;
                rdoMail.Recipients.ResolveAll(null, null);

                rdoMail.Attachments.Add(attachmentFileName, OlAttachmentType.olByValue, 1, "textattachment");
                // Send the email
                rdoMail.Send();

                OutlookCommands.Instance.Sync();

            #endregion

                #region SOAP Block
                OutlookCommands.Instance.Sync();
                RDOFolder draftsFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts);
                zAssert.IsNotNull(draftsFolder, "Check that the drafts folder exists");

                RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, draftsFolder, true);
                zAssert.IsNotNull(rMail, "Verify that the initial draft is found");

                RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
                zAssert.IsNotNull(inboxFolder, "Check that the drafts folder exists");

                RDOMail rMail1 = OutlookMailbox.Instance.findMessage("Undeliverable:" + " " + subject, inboxFolder, true);
                zAssert.IsNotNull(rMail1, "Verify that the NDR is found");
                zAssert.IsTrue(rMail1.Body.Contains(attachmentName), "NDR contains attachment name");
                #endregion
            }
            catch (SystemException e)
            {
                //added try-catch-finally block to catch exception like missing attachment, fail the test and restore zimbraMtaMaxMessageSize to original value
                if (e.Message.Contains("does not exist"))
                    zAssert.Fail("Exception thrown indicating attachment file " + attachmentFileName + " not found");
            }
            finally
            {
                #region set the message size back to default value
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                                                                  ModifyAttribute(ConfigAttributes.zimbraMtaMaxMessageSize, messageSize.ToString()));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);
                #endregion
            }

        }

        [Test, Description("Refuse to send mail to correct addresses if one of the email address is misspelled")]
        [Category("Mail")]
        [Bug("45614")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Login as sync user (ZCO)", "User1 sends mail to 3 users, namely user2@domain.com, user3@domain.com and testñtest@domain.com (original user testntest@domain.com, the message is saved in outbox and there is an error dialog")]
        //Modified testcase as per bug#57320 changes 
        public void SendMessage_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string firstName = GlobalProperties.time();
            string lastName = GlobalProperties.counter();
            string accountEmailAddress = firstName + "testEAA" + lastName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string misspelledEmailAddress = firstName + GlobalProperties.getProperty("AD.account03.password") + lastName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string messageId;
            #endregion

            #region create an account
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                UserName(accountEmailAddress).
                UserPassword(GlobalProperties.getProperty("defaultpassword.value")));
            #endregion

            #region Outlook Block

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.CC = misspelledEmailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP(m, "//mail:content", null, content, null, 1);
            #endregion

            #region Outlook block to check the NDR
            OutlookCommands.Instance.Sync();
            RDOMail rMail = OutlookMailbox.Instance.findMessage("Undelivered Mail Returned to Sender");
            zAssert.IsNotNull(rMail, "Mail delivery notice should be present");
            #endregion
        }

        [Test, Description("verify that upload servlet request fails when ZCO account is in maintenance mode")]
        [Category("Mail")]
        [Bug("9686")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Set the zco account in maintenance mode",
            "Send a message to account1 with attachment",
            "The message is saved in drafts and the NDR contains the names of the attachments")]
        public void SendMessage_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();

            FileInfo attachmentInfo = new FileInfo(GlobalProperties.TestMailRaw + "/attachments1/filename.txt");

            // Make sure the attachment exists
            zAssert.IsTrue(attachmentInfo.Exists, "Verify the attachment file exists on the file system " + attachmentInfo.FullName);


            #endregion


            #region Sync the ZCO account and set it in maintenance mode.

            OutlookCommands.Instance.Sync();

            zAccountAdmin.GlobalAdminAccount.sendSOAP(
                                        new SoapAdmin.ModifyAccountRequest().
                                                SetAccountId(zAccount.AccountZCO.zimbraId).
                                                ModifyAttribute("zimbraAccountStatus", "maintenance"));


            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);

            #endregion

            try
            {
                #region Outlook Block

                // Create an Outlook mail item
                RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

                // Set the values
                rdoMail.Subject = subject;
                rdoMail.Body = content;
                rdoMail.To = zAccount.AccountA.emailAddress;
                rdoMail.Recipients.ResolveAll(null, null);

                rdoMail.Attachments.Add(attachmentInfo.FullName, OlAttachmentType.olByValue, 1, "textattachment");
                // Send the email
                rdoMail.Send();

                OutlookCommands.Instance.Sync();

                #region Check that the message is in outbox

                OutlookCommands.Instance.Sync();
                RDOFolder sentFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderSentMail);
                zAssert.IsNotNull(sentFolder, "Check that the sent folder exists");

                RDOMail rMail = OutlookMailbox.Instance.findMessage(subject, sentFolder, false);
                zAssert.IsNotNull(rMail, "Verify that the sent message is found");

                #endregion

                #region Check that the recipient receives the message

                zAccount.AccountA.sendSOAP(
                                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                        + "<query>subject:(" + subject + ")</query>"
                        + "</SearchRequest>");

                // Check that message is present
                zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 1);


                #endregion


                #endregion
            }
            finally
            {
                #region set the message size back to default value

                zAccountAdmin.GlobalAdminAccount.sendSOAP(
                                            new SoapAdmin.ModifyAccountRequest().
                                                    SetAccountId(zAccount.AccountZCO.zimbraId).
                                                    ModifyAttribute("zimbraAccountStatus", "active"));


                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);

                #endregion

            }

        }

        [Test, Description("Verify ZCO can send a message in plain text format.")]
        [Bug("9553")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message to account1",
            "Login as account1 (SOAP)",
            "Verify the message is received with proper Subject and Content",
            "Verify that the content is plain text")]
        public void SendMessage_14()
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
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            string messageId;

            // Auth as account1
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content is in plain text
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP(m, "//mail:mp", "ct", "text/html", null, 0);
            zAccount.AccountA.selectSOAP(m, "//mail:mp", "ct", "text/plain", null, 1);
            #endregion
        }

        [Test, Description("Verify that Misaddressed message results in NDR.")]
        [Ignore("SendMessage_12 test already covers this testcase")]
        [Bug("31504")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message to a non-existant",
            "Verify that NDR is there in the inbox")]
        public void SendMessage_15()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string randomEmail = "sdjhfkshdfhsdhfsjhdf" + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = randomEmail;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.Sync();

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.Sync();
            RDOMail rmail = OutlookMailbox.Instance.findMessage("Undelivered Mail Returned to Sender");
            zAssert.IsNotNull(rmail, "Verify that NDR is seen ");
            #endregion
        }
        [Test, Description("Verify ZCO can send a message in HTML format.")]
        [Ignore("Ignore a test")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "Login as sync user (ZCO)",
            "Send a message to account1",
            "Login as account1 (SOAP)",
            "Verify the message is received with proper Subject and Content",
            "Verify that mail recieved is in HTML format")]
        public void SendMessage_16()
        {
            //Scripts needs to be modified to validate HTML text 
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string srch = "2";
            // string encodingName = "UTF-8";
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;

            // rdoMail.HTMLBody= "<head><meta http-equiv='content-type' content='text/html' charset='UTF-8'></head><body><h1>My Website</h1><p>Some text...</p></body></html>";
            //rdoMail.InternetCodepage = 52936;
            //htmlBody = htmlBody.Insert(startEncoding, "<meta http-equiv=\"content-type\" content=\"text/html;charset=" + encodingName + "\">");

            rdoMail.HTMLBody = "<html><header><meta http-equiv='Content-Type' content='text/html'></header><body><h1>My Website</h1><p>Some text...</p></body></html>";
            //int startEncoding = rdoMail.HTMLBody.ToLower().IndexOf("</body>");
            // rdoMail.HTMLBody.Insert(startEncoding, "<meta http-equiv=\"content-type\" content=\"text/html;charset=" + encodingName + "\">");
            //  rdoMail.InternetCodepage = 52936;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            string messageId;



            // Auth as account1
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query(subject));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);



            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));
            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content body type is HTML
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP(m, "//mail:mp", "ct", "text/html", null, 1);

            zAccount.AccountA.sendSOAP(@"<GetMsgRequest xmlns='urn:zimbraMail'><m id= '" + messageId + @" part='+srch+' /></GetMsgRequest>");
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, srch, null, 1);
            Console.WriteLine(srch.ToString());

            #endregion
        }

        [Test, Description("Verify ZCO can send a plain text messages with text attachments")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: Login as sync user & Send a plain text message with text attachment to Account1",
            "2. SOAP: Auth as Account1 and verify that the message is received",
            "3. SOAP: Verify that the attachment is received",
            "4. SOAP:Verify that mail received is in plain text format")]
        public void SendMessage_17()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments1/filename.txt";
            #endregion

            #region Outlook Block

            FileInfo fileinfo = new FileInfo(attachmentFileName);

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Attachments.Add(attachmentFileName, OlAttachmentType.olByValue, 1, "textattachment");
            rdoMail.Save();
            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            // Search for the messageID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP("//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the presence of an attachment flag
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "au", null, 1);

            // Verify the attachment and attachment type
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "cd", "attachment", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "/attachments1/filename.txt", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='/attachments1/filename.txt']"), "ct", "text/plain", null, 1);
            //Verify mail is in plain text format
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp"), "ct", "text/plain", null, 1);
            #endregion
        }
        [Test, Description("Verify ZCO can send a HTML messages with text attachments")]
        [Ignore("Ignore a test")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: Login as sync user & Send a HTML text message with an text attachment to Account1",
            "2. SOAP: Auth as Account1 and verify that the message is received",
            "3. SOAP: Verify that the attachment is received",
            "4. SOAP:Verify that mail received is in HTML format")]
        public void SendMessage_18()
        {
            //Scripts needs to be modified to validate HTML text 
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments1/filename.txt";
            #endregion

            #region Outlook Block

            FileInfo fileinfo = new FileInfo(attachmentFileName);

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.HTMLBody = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Attachments.Add(attachmentFileName, OlAttachmentType.olByValue, 1, "textattachment");
            rdoMail.Save();
            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            // Search for the messageID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP("//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the presence of an attachment flag
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "au", null, 1);

            // Verify the attachment and attachment type
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "cd", "attachment", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "/attachments1/filename.txt", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='/attachments1/filename.txt']"), "ct", "text/plain", null, 1);

            //verify mail is in HTML format
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@part='1.2']"), "ct", "text/html", null, 1);

            #endregion
        }

        [Test, Description("Verify ZCO can send a plain text messages with binary attachments")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: Login as sync user & Send a plain text message with binary attachment to Account1",
            "2. SOAP: Auth as Account1 and verify that the message is received",
            "3. SOAP: Verify that the binary attachment is received",
            "4. SOAP:Verify that mail received is in plain text format")]
        public void SendMessage_19()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments1/Book1.xls";
            #endregion

            #region Outlook Block

            FileInfo fileinfo = new FileInfo(attachmentFileName);

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Attachments.Add(attachmentFileName, OlAttachmentType.olByValue, 1, "binaryattachment");
            rdoMail.Save();
            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            // Search for the messageID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP("//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the presence of an attachment flag
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "au", null, 1);

            // Verify the attachment and attachment type
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "cd", "attachment", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "/attachments1/Book1.xls", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='/attachments1/Book1.xls']"), "ct", "application/vnd.ms-excel", null, 1);
            //Verify mail is in plain text format
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp"), "ct", "text/plain", null, 1);
            #endregion
        }
        [Test, Description("Verify ZCO can send a HTML messages with binary attachments")]
        [Ignore("Ignore a test")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: Login as sync user & Send a plain text message with text attachment to Account1",
            "2. SOAP: Auth as Account1 and verify that the message is received",
            "3. SOAP: Verify that the binary attachment is received",
            "4. SOAP:Verify that mail received is in HTML text format")]
        public void SendMessage_20()
        {
            //Scripts needs to be modified to validate HTML text 
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments1/Book1.xls";
            #endregion

            #region Outlook Block

            FileInfo fileinfo = new FileInfo(attachmentFileName);

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.HTMLBody = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Attachments.Add(attachmentFileName, OlAttachmentType.olByValue, 1, "binaryattachment");
            rdoMail.Save();
            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            // Search for the messageID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP("//mail:su", null, subject, null, 1);
            zAccount.AccountA.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the presence of an attachment flag
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "au", null, 1);

            // Verify the attachment and attachment type
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "cd", "attachment", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "/attachments1/Book1.xls", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='/attachments1/Book1.xls']"), "ct", "application/vnd.ms-excel", null, 1);
            //verify mail is in HTML format
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@part='1.2']"), "ct", "text/html", null, 1);
            #endregion
        }

        [Test, Description("Verify ZCO can send mail with inline image attachment")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps(
            "1. ZCO: Login as sync user & Send a message with inline image attachment to Account1",
            "2. SOAP: Auth as Account1 and verify that the message is received",
            "3. SOAP: Verify that the mail with inline image attachment is received"
            )]
        public void SendMessage_21()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            string attachmentFileName = GlobalProperties.TestMailRaw + "/attachments1/image1.jpg";
            #endregion

            #region Outlook Block
            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();
            rdoMail.Subject = subject;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            string imageCid = "image1.jpg@123";
            RDOAttachment attach = rdoMail.Attachments.Add(attachmentFileName, OlAttachmentType.olByValue, 1, "inlineimage");
            attach.set_Fields(MAPITags.PR_ATTACH_CONTENT_ID, "image1.jpg@123");
            rdoMail.HTMLBody = String.Format("<body><img src=\"cid:{0}\"></body>", imageCid);

            rdoMail.Save();
            // Send the email
            rdoMail.Send();


            OutlookCommands.Instance.Sync();
            #endregion
            #region soap verifications
            // Search for the messageID
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP("//mail:su", null, subject, null, 1);

            // Verify the "FROM" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "d", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the presence of an attachment flag
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:m", "f", "au", null, 1);

            // Verify the attachment and attachment type
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "ct", "image/jpeg", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", "/attachments1/image1.jpg", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, ("//mail:mp[@filename='/attachments1/image1.jpg']"), "ci", "<image1.jpg@123>", null, 1);

            #endregion

        }


    }



}

