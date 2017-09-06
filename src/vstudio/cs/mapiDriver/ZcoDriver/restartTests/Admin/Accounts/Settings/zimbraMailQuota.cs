using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using Redemption;
using System.IO;

namespace restartTests.Admin.Accounts.Settings
{


    [TestFixture]
    public class zimbraMailQuota :  RestartTestFixture
    {

        [Test, Description("Verify message is not lost if sending over quota")]
        [Category("SMOKE")]
        public void Account_Settings_zimbraMailQuota_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());


            #region Set AccountZCO zimbraMailQuota to 1000 bytes

            zAccount.AccountZCO.modifyAccountAttribute("zimbraMailQuota", "1000");

            #endregion


            #region Start OLK

            // Create a new profile and log into it
            OutlookProfile profile = new OutlookProfile(zAccount.AccountZCO);
            OutlookProcess.Instance.StartApplication(profile);
            System.Threading.Thread.Sleep(5000);

            #endregion

            OutlookCommands.Instance.Sync();

            #region Send a message greater than the quota
            
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            
            string attachment = GlobalProperties.TestMailRaw + "/photos/Picture1.jpg";
            FileInfo fileInfo = new FileInfo(attachment);
            zAssert.IsTrue(fileInfo.Exists, "Verify that the attachment exists "+ fileInfo);

            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();
            zAssert.IsNotNull(rdoMail, "Verify that the mail object was created correctly");

            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.Attachments.Add(attachment, Microsoft.Office.Interop.Outlook.OlAttachmentType.olByValue, 1, "textattachment");

            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            // TODO: should get bounceback
            // zAssert.Fail("need to implement test case - need to get bounceback");

            #endregion


        }

    }
}
