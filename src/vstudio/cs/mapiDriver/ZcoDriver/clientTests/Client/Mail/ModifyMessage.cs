using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using SoapWebClient;
using System.Text.RegularExpressions;
using Redemption;
using System.Xml;

namespace clientTests.Client.Mail
{
    [TestFixture]
    public class ModifyMessage : BaseTestFixture
    {
        [Test, Description("Verify local message changes (subject) are synced to the Server")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [Bug("7164")]
        [TestSteps(
            "AddMsgRequest to add a message to the mailbox",
            "Sync",
            "Modify the message subject in OLK",
            "Sync",
            "GetMsgRequest - verify the new subject is set")]
        public void ModifyMessage_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject1 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, messageId;
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(
                                new AddMsgRequest().
                                        AddMessage(new MessageObject().
                                                        SetParent(inboxId).
                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject1 + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body


")));
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse", null, null, null, 1);
            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject1);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");
            zAssert.AreEqual(rdoMail.Subject, subject1, "Check that the subject matched expected value");
            rdoMail.Subject = subject2;
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            rdoMail = OutlookMailbox.Instance.findMessage(subject2);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");
            zAssert.AreEqual(rdoMail.Subject, subject2, "Check that the subject matched expected value");

            #endregion

            #region SOAP Verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject1 + ")"));

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject2 + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:m", "id", null, out messageId, 1);
            #endregion
        }

        [Test, Description("Verify local message changes (content) are synced to the Server")]
        [Ignore] //[07/29/2010] This test case fails to find the modifies message content. When this test case runs, it modifies the message's content in Outlook. However modified message is not synced to the ZCS. If I manually execute the test, it works. So looks like when Redemption is used, event which handles the updating of message in ZCS is not triggered. Hence marking this case as IGNORE. 
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [Bug("7164")]
        [TestSteps(
            "AddMsgRequest to add a message to the mailbox",
            "Sync",
            "Modify the message content in OLK",
            "Sync",
            "GetMsgRequest - verify the new content is set")]
        public void ModifyMessage_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, messageId, content;
            #endregion

            #region SOAP Block

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            // Add a message to the account mailbox
            zAccount.AccountZCO.sendSOAP(
                                new AddMsgRequest().
                                        AddMessage(new MessageObject().
                                                        SetParent(inboxId).
                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + subject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

" + content1 + @"


")));
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse", null, null, null, 1);
            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");
            zAssert.IsTrue((rdoMail.Body).Contains(content1), "Check that the content matched expected value");
            rdoMail.Body = content2;
            rdoMail.Save();
            OutlookCommands.Instance.Sync();
            rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that changed message exists in the inbox");
            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");
            zAssert.IsTrue((rdoMail.Body).Contains(content2), "Check the body of the message to see if the new text is updated");
            #endregion

            #region SOAP Verification

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));

            XmlNode m = zAccount.AccountZCO.selectSOAP("//mail:m", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(m, "//mail:content", null, null, out content, 1);

            zAssert.IsTrue(content.Contains(content2), "Verify the message content (" + content + ") is updated (" + content2 + ")");

            #endregion

        }
    }
}