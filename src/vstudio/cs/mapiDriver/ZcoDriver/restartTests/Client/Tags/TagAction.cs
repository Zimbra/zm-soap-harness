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
using System.Threading;
using System.Text.RegularExpressions;
using System.Collections;

namespace clientTests.Client.Tags
{
    [TestFixture]
    public class TagAction : BaseTestFixture
    {
        Thread HandleMSOLKDialog;

        [Test, Description("Verify that Tag modified assign to Items modified in ZWC,get modify in ZCO too")]
        [Bug("6099")]
        public void TagAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string tagName = "tag" + "/" + GlobalProperties.time() + GlobalProperties.counter();
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string folderInboxId, messageId;
            HandleMSOLKDialog = new Thread(new ThreadStart(NativeWIN32.ClickOK));
            HandleMSOLKDialog.Start();
            #endregion

            #region add message to ZCO account
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            zAccount.AccountZCO.sendSOAP(new AddMsgRequest().
                             AddMessage(new MessageObject().
                             SetParent(folderInboxId).
                             AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + messageSubject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body


")));
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);
            #endregion

            #region outlook block to tag mail
            OutlookCommands.Instance.Sync();
            RDOMail rMail = OutlookMailbox.Instance.findMessage(messageSubject);
            ArgumentException u = null;
            //Copy
            u = null;
            try
            {
                rMail.Categories = tagName;
                rMail.Save();
            }
            catch (ArgumentException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that Argument execption is thrown when trying tag a mail with category with " + "/" + " in name.");
        }
            #endregion
    }
}
