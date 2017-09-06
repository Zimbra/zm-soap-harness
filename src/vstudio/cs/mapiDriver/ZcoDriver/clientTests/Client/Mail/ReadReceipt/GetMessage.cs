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

namespace clientTests.Client.Mail.ReadReceipt
{
    [TestFixture]
    public class GetMessage : BaseTestFixture
    {
        [Test, Description("verify read receipts sent from ZCO is synced to ZCS")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "In ZCS send a message from UserA to sycuser requesting a read receipt",
            "In ZCO, receive mail having and read the mail",
            "Sync",
            "Verify read receipt is recevied in userA in ZCS")]
        public void GetMessage_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;

            #region SOAP Block

            zAccount.AccountA.sendSOAP(@" <SendMsgRequest xmlns='urn:zimbraMail'>
				<m>
					<e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
					<e t='n' a='" + zAccount.AccountA.emailAddress + @"'/>
					<su>" + subject + @"</su>
					<mp ct='text/plain'>
						<content>" + content + @"</content>
					</mp>
				</m>
			</SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook Block Receive mail and Read
            OutlookCommands.Instance.Sync();

            // Find the mail send to self
            RDOMail recMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(recMail, "Verify received mail exists");

            // Mark the mail as read. MarkRead(true)=suppress read receipts.
            recMail.MarkRead(false);
            //System.Threading.Thread.Sleep(10000);
            OutlookCommands.Instance.Sync();
            System.Threading.Thread.Sleep(10000);
            #endregion

            #region Outlook Block Check the read receipt

            string receiptSubject = "Read: " + subject;
            zAccount.AccountA.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>subject:(" + subject + @")</query>
                    </SearchRequest>");
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m[mail:su ='" + receiptSubject + "']", "id", null, out messageId, 1);
            // Get the message
            zAccount.AccountA.sendSOAP(
                @"  <GetMsgRequest xmlns='urn:zimbraMail'>
                        <m id='" + messageId + @"'/>
                    </GetMsgRequest>");

            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountA.selectSOAP(m, "//mail:su", null, receiptSubject, null, 1);
            //string mailContent= (appointmentMessage, "//mail:s");
            
            XmlNode contentNode=zAccount.AccountA.selectSOAP(m, "//mail:content", null, null, null, 1);
            string mailcontent1 = contentNode.InnerText;
            zAssert.IsTrue(mailcontent1.Contains(zAccount.AccountZCO.emailAddress), "verify mail contains organizer email address in the body");
            zAssert.IsTrue(mailcontent1.Contains(subject), "verify mail contains correct subject in the body");
            zAssert.IsTrue(mailcontent1.Contains("was read"), "verify mail contains correct text 'was read' in the body");

            #endregion
        }
    }
}
