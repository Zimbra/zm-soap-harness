using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using SoapWebClient;
using System.Collections;
using System.Text.RegularExpressions;
using Redemption;
using System.Xml;

namespace clientTests.Client.Mail.LMTP
{
    [TestFixture]
    public class LmtpBasic : BaseTestFixture
    {
        [Test, Description("Verify a message sent from LMTP to ZCS can be opened in ZCO")]
        [Category("Mail")]
        public void LmtpBasic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region inject LMTP
            // Use LMTP to inject MIME into the ZCO user's mailbox
            string mimeFolder = GlobalProperties.TestMailRaw + @"\email01";

            ArrayList recipients = new ArrayList();
            recipients.Add(zAccount.AccountZCO.emailAddress);

            MailInject.injectLMTP(GlobalProperties.getProperty("zimbraServer.name"), mimeFolder, recipients, GlobalProperties.getProperty("defaultorigination.email"));
            #endregion

            OutlookCommands.Instance.Sync();

            ArrayList mimeSubjects = new ArrayList();
            mimeSubjects.Add("email01A");
            mimeSubjects.Add("email01B");
            mimeSubjects.Add("email01C");
            mimeSubjects.Add("email01D");
            mimeSubjects.Add("email01E");
            mimeSubjects.Add("email01F");
            mimeSubjects.Add("subject line text email01G");
            mimeSubjects.Add("Contributing to XMLBeans (email01H)");
            mimeSubjects.Add("bug8260");

            foreach (string subject in mimeSubjects)
            {   
                RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
                zAssert.IsNotNull(rMail, "Check that the received message (" + subject + ") exists in the inbox");
                rMail.Delete(redDeleteFlags.dfSoftDelete);
            }

        }
    }
}
