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
    public class UnflagMail : Tests.BaseTestFixture
    {

        [Test, Description("Sync message unflag operation to the device"),
        Property("TestSteps", "1. Send a dlagged mail to mailbox, 2. Unflag the mail, 3. Sync to device, 4. Verify the mail is not flagged on device")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetUnFlaggedMail01()
        {

            /*
             * Unflag a message on the server.  Sync
             */



            #region TEST SETUP

            #region Add a flagged (f='f') message to the mailbox

            String folderid = HarnessProperties.getString("folder.inbox.id");

            String subject = "subject" + HarnessProperties.getUniqueString();
            XmlDocument soapResponse = TestAccount.soapSend(
                @"<AddMsgRequest xmlns='urn:zimbraMail'>
                    <m l='" + folderid + @"' f='f'>
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
                        <action id='" + messageid + @"' op='!flag'/>
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


            // Get the matching <Add/> elements
            XmlElement Change = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Change", "//AirSync:ServerId[text() = '"+ messageid +@"']");
            ZAssert.IsNotNull(Change, "Verify the Change was returned in the Sync Response");

            // Verify the <email:Flag /> element is empty
            Boolean found = false;
            foreach (XmlNode node in Change.SelectNodes("//email:Flag", ZAssert.NamespaceManager))
            {
                XmlElement element = node as XmlElement;
                if (element == null)
                {
                    continue;
                }

                // Is this the best way to check that element is <flag/> or <flag></flag> ??
                // Look for no attributes and innerText = ""
                // ??
                //

                if (element.Attributes.Count != 0)
                {
                    found = true; // No attributes are supposed to be present
                    break;
                }

                if ((element.InnerText != null) && (!element.InnerText.Equals("")))
                {
                    found = true; // No inner text is supposed to be set
                    break;
                }
            }

            ZAssert.IsFalse(found, "Verify no data was found under the <flag/> element");


            #endregion


        }


    }
}
