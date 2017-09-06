using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SoapWebClient;
using SoapAdmin;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Text.RegularExpressions;
using Redemption;
using System.Xml;

namespace clientTests.Client.Mail.DistributionLists
{
    [TestFixture]
    public class PersonalDistributionLists : BaseTestFixture
    {
        [Test, Description("Verify ZCO can send a message to a personal distribution list.")]
        [Category("Mail")]
        [SyncDirection(SyncHarness.SyncDirection.NOSYNC)]
        [TestSteps("Create a personal distribution list with 2 members", "Compose a message to the PDL", "Verify that both members receive the message")]
        public void SendMessage_01()
        {
            #region Test Case variables

            string account1Name = "account1" + GlobalProperties.time() + GlobalProperties.counter();
            string account2Name = "account2" + GlobalProperties.time() + GlobalProperties.counter();
            string pdlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Id, message2Id;
            XmlNode mailMessage = null;

            #endregion

            #region Account Setup

            // Create the test account1
            zAccount account1 = new zAccount(account1Name, GlobalProperties.getProperty("defaultdomain.name"));
            zAccount account2 = new zAccount(account2Name, GlobalProperties.getProperty("defaultdomain.name"));
            account1.createAccount();
            account2.createAccount();
            #endregion

            #region Outlook Block
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");
            rdoDistListItem.DLName = pdlName;
            rdoDistListItem.AddMemberEx(account1.emailAddress, account1.emailAddress, "SMTP");
            rdoDistListItem.AddMemberEx(account2.emailAddress, account2.emailAddress, "SMTP");
            rdoDistListItem.Save();

            // Create a new mail to the PDL
            RDOFolder outboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderOutbox);
            zAssert.IsNotNull(outboxFolder, "Verify the outbox folder is found correctly");

            RDOMail rdoMail = outboxFolder.Items.Add("IPM.NOTE");
            zAssert.IsNotNull(rdoMail, "Verify the new mail is created correctly");

            rdoMail.Subject = subject;
            rdoMail.Body = content;

            rdoMail.To = rdoDistListItem.DLName;
            rdoMail.Recipients.ResolveAll(null, null);

            rdoMail.Save();
            rdoMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block

            #region account1 verification

            // Search for the messageID
            account1.login();
            account1.sendSOAP(
                new SearchRequest().
                Types("message").
                Query("subject:(" + subject + ")"));

            account1.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            // Get the message
            account1.sendSOAP(
                             new GetMsgRequest().
                             Message(message1Id));

            // Verifications
            mailMessage = account1.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message1Id + "']", null, null, null, 1);

            // Verify the Subject, Content, FROM and TO
            account1.selectSOAP(mailMessage, "//mail:su", null, subject, null, 1);
            account1.selectSOAP(mailMessage, "//mail:content", null, content, null, 1);
            account1.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);
            account1.selectSOAP(mailMessage, ("//mail:e[@a='" + account1.emailAddress + "']"), "t", "t", null, 1);

            #endregion

            #region account2 verification
            // Search for the messageID
            account2.login();
            account2.sendSOAP(
                new SearchRequest().
                Types("message").
                Query("subject:(" + subject + ")"));

            account2.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message2Id, 1);

            // Get the message
            account2.sendSOAP(
                             new GetMsgRequest().
                             Message(message2Id));

            // Verifications
            mailMessage = account2.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + message2Id + "']", null, null, null, 1);

            // Verify the Subject, Content, FROM and TO
            account2.selectSOAP(mailMessage, "//mail:su", null, subject, null, 1);
            account2.selectSOAP(mailMessage, "//mail:content", null, content, null, 1);
            account2.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountZCO.emailAddress + "']"), "t", "f", null, 1);
            account2.selectSOAP(mailMessage, ("//mail:e[@a='" + account2.emailAddress + "']"), "t", "t", null, 1);


            #endregion

            #endregion

        }
    }
}