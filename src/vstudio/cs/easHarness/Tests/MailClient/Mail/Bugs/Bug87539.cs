using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Mail.Bugs
{
    [TestFixture]
    public class Bug87539 : Tests.BaseTestFixture
    {

        [Test(Description = "Verify messages from bug 87539 are skipped.  Attachment: http://bugzilla-attach.zimbra.com/attachment.cgi?id=52937"),
        Property("Bug", 87539), 
        Property("TestSteps", "1. Send the test message to the mailbox, 2. Sync to device, 3. Verify the message is added correctly")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void Bug87539_01()
        {



            #region TEST SETUP

            // Inject the test message to the mailbox
            //
            String mime = HarnessProperties.getString("folder.harness.testmime") + "/bug87539/mime01.txt";
            String subject = "subject14008734452";
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new System.IO.FileInfo(mime), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");



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


            #endregion


        }


    }
}
