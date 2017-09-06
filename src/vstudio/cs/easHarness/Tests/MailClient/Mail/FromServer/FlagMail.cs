using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using System.Xml;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.Mail.FromServer
{

    [TestFixture]
    public class FlagMail : Tests.BaseTestFixture
    {

            [Test, Description("Sync flag a mail to the device"),
            Property("TestSteps", "1. Add a message to the mailbox, 2. Flag the message on server, 3. Sync to device, 4. Verify the message is flagged")]
            [Category("Functional")]
            [Category("Mail")]
            [Category("L2")]
            public void GetFlaggedMail()
            {

                /*
                 * Flag a message on the server.  Sync
                 */



                #region TEST SETUP

                #region Add a message to the mailbox

                String folderid = HarnessProperties.getString("folder.inbox.id");

                String subject = "subject" + HarnessProperties.getUniqueString();
                XmlDocument soapResponse = TestAccount.soapSend(
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
                String messageid = TestAccount.soapSelectValue(soapResponse, "//mail:m", "id");

                #endregion

                #region Sync so the device has the message

                TestClient.sendRequest(new ZSyncRequest(TestAccount));

                #endregion

                #region Delete the message from the server

                TestAccount.soapSend(
                    @"<MsgActionRequest xmlns='urn:zimbraMail'>
                        <action id='" + messageid + @"' op='flag'/>
                    </MsgActionRequest>");

                #endregion

                #endregion



                #region TEST ACTION


                // Send the SyncRequest
                ZSyncResponse syncResponse = TestClient.sendRequest(new ZSyncRequest(TestAccount)) as ZSyncResponse;
                ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

                //TestClient.sendRequest(new ZFolderSyncRequest(TestAccount));


                #endregion




                #region TEST VERIFICATION


                // Get the matching <Change/> elements
                XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '" + messageid + "']");
                ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

                // Verify the <Change/> element contents contains the correct Flag Status.  2=followup.  1=complete.
                ZAssert.XmlXpathMatch(Change, "//email:Flag/email:Status ", null, "2", "Verify the flag status is correct.  2==follow up");


                #endregion


            }


    }
}
