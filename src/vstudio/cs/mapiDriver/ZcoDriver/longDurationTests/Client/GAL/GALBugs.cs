using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Xml;
using Soap;
using SoapAdmin;
using Redemption;
using SoapWebClient;
using SyncHarness;
using Microsoft.Office.Interop.Outlook;
using System.Text.RegularExpressions;

namespace longDurationTests.Client.GAL
{
    [TestFixture]
    class GALBugs :clientTests.BaseTestFixture
    {
        [Test, Description("Bug 19776: bump up number of aliases sent down for sync gal")]
        [Category("GAL")]
        [Bug("19776")]
        [TestSteps("1.Create Account and 25 Alias of the account", "SyncGAL", "ZCO should be able to send mail using From as Alias Name")]
        public void GALBugs_19776()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase Varibles

            const int NumberofAlias = 20;
            const int NumberofMails = 20;
            String[] Aliases = new string[NumberofAlias];
            String[] Mailsubject = new string[NumberofMails];
            string subject, content, messageId;
            #endregion

            #region Create new account and No. of GAL Aliases for SyncUser.

            zAccount account1 = new zAccount();
            account1.createAccount();

            for (int i = 0; i < NumberofAlias; i++)
            {
                Aliases[i] = zAccount.AccountZCO.alias = "alias" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            }

            #endregion

            #region Sync GAL to Outlook

            OutlookCommands.Instance.Sync();

            OutlookCommands.Instance.SyncGAL();

            System.Threading.Thread.Sleep(6000);

            #endregion

            #region Send Mail to Account1 using 25 Aliases in From field.

            RDOFolder mail = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderOutbox);

            for (int j = 0; j < NumberofMails; j++)
            {
                RDOMail rMail = OutlookMailbox.Instance.CreateMail();
                rMail.Subject = subject = ("subject" + GlobalProperties.time() + GlobalProperties.counter());

                // Create the email body
                rMail.Body = content = ("content" + GlobalProperties.time() + GlobalProperties.counter());

                //Add email recipient
                RDORecipients rRecipients = rMail.Recipients;
                RDORecipient rRecipient = rRecipients.Add(zAccount.AccountA.emailAddress);
                rRecipient.Type = (int)rdoMailRecipientType.olTo;

                //Add email sender
                OutlookCommands.Instance.SyncGAL();

                rMail.SentOnBehalfOfName = Aliases[j] + "@" + zAccount.AccountZCO.zimbraMailHost;

                // Send the email
                rMail.Save();
                rMail.Send();

                Mailsubject[j] = rMail.Subject;

                OutlookCommands.Instance.Sync();
            }
            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(60);
            #endregion

            #region SOAP Block

            // Auth as account1
            for (int k = 0; k < NumberofMails; k++)
            {
                // Search for the message ID
                zAccount.AccountA.sendSOAP(new SearchRequest().
                    Types("message").Query("subject:(" + Mailsubject[k] + ")"));

                zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

                // Get the message
                zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

                // Verifications
                XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

                zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, (string)Mailsubject[k], null, 1);

                // Verify the "FROM" field
                zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + Aliases[k] + "@" + zAccount.AccountZCO.zimbraMailHost + "']"), "d", Aliases[k], null, 1);
                zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + Aliases[k] + "@" + zAccount.AccountZCO.zimbraMailHost + "']"), "t", "f", null, 1);

                // Verify the "TO" field
                zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.displayName, null, 1);
                zAccount.AccountA.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);
            }
            #endregion
        }
    }
}
