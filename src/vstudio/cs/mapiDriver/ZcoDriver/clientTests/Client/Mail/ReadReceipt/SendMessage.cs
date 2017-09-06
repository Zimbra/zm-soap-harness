using System;
using System.Collections.Generic;
using System.Text;

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
    public class SendMessage : BaseTestFixture
    {
        [Test, Description("verify read receipts sent from ZCS is synced to ZCO")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "In ZCO send a message to UserA requesting a read receipt",
            "In ZCS, receive mail and read the mail",
            "Sync",
            "Verify read receipt is recevied by ZCOuser in ZCO")]
        public void SendMessage_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId;
            #region Outlook Block

            // 'Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            rdoMail.ReadReceiptRequested = true;

            // Send the email
            rdoMail.Send();

            OutlookCommands.Instance.Sync();

            #endregion

            zAccount.AccountA.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>subject:(" + subject + @")</query>
                    </SearchRequest>");
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

//            // Get the message
//            zAccount.AccountA.sendSOAP(
//                @"  <GetMsgRequest xmlns='urn:zimbraMail'>
//                        <m id='" + messageId + @"'/>
//                    </GetMsgRequest>");
//            XmlNode m = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m", null, null, null, 1);

            zAccount.AccountA.sendSOAP(@"<SendDeliveryReportRequest xmlns='urn:zimbraMail' mid='" + messageId + @"'/>");
            zAccount.AccountA.selectSOAP("//mail:SendDeliveryReportResponse", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(
                      @"  <SearchRequest xmlns='urn:zimbraMail' types='message'>
                        <query>subject:(" + subject + @")</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            #region Outlook Block

            OutlookCommands.Instance.Sync();
            string receiptSubject = "Read: " + subject;
            RDOMail receiptMail = OutlookMailbox.Instance.findMessage(receiptSubject);
            // Verify read receipt mail is received
            zAssert.IsNotNull(receiptMail, "Verify that read receipt is received");

            #endregion
        }
    }
}
