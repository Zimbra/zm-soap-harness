using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Text.RegularExpressions;
using Redemption;
using System.IO;
using SoapWebClient;
namespace clientTests.Client.Mail
{
    [TestFixture]
    public class GetMessage : BaseTestFixture
    {
        [Test, Description("Verify received messages are synced to ZCO")]
        [Category("SMOKE")]
        public void GetMessage_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Add a message to the account mailbox

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();

            zAccount.AccountA.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook Block

            // Use Outlook to create a draft message and save in the default draft folder

            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            // Verify the received message data
            // Verify: Subject
            // Verify: Content
            // Verify: To, From

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");

            zAssert.That(Regex.IsMatch(rdoMail.Body, content), "Check that the message content matched expected value");

            foreach (RDORecipient r in rdoMail.Recipients)
            {
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olOriginator)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountA.emailAddress, "Check the Origination Address is correct");
                }
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olTo)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountZCO.emailAddress, "Check that the Destination Address is correct");
                }
            }

            #endregion
        }

        [Test, Description("Verify ZCO can sync received messages in html format")]
        [Category("SMOKE")]
        [Ignore("Ignore a test")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetMessage_02()
        {
            //Scripts needs to be modified to validate HTML text 
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Add a message to the account mailbox
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
                    
            zAccount.AccountA.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='text/html'>
                           <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion
            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            // Verify the received message data
            // Verify: Subject
            // Verify: Content
            // Verify: To, From

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");
            Match m2 = Regex.Match(rdoMail.HTMLBody, "color\\s*=\\s*(?:\"(?<1>[^\"]*)\"|(?<1>\\S+))");

            Console.WriteLine(m2.Groups[1].Value.ToString());

            //zAssert.That(Regex.IsMatch(rdoMail.HTMLBody,""), "Check that the message content matched expected value");


            //zAssert.that(rdoMail.HTMLBody.Contains("<font color='red'"), "Check that color of text 'content' as red in received mail");
            foreach (RDORecipient r in rdoMail.Recipients)
            {
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olOriginator)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountA.emailAddress, "Check the Origination Address is correct");
                }
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olTo)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountZCO.emailAddress, "Check that the Destination Address is correct");
                }
            }
            //Verify if format of the body text is HTML 
            //NOTE-BodyFormat returns a constant olFormatHTML with value 2 for HTML type      
            zAssert.AreEqual(rdoMail.BodyFormat, Convert.ToInt32(2), "Check that format of body text is in HTML");
            #endregion
        }
        [Test, Description("Verify ZCO can sync received messages with HIGH Importance")]
        [Category("SMOKE")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetMessage_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Add a message to the account mailbox
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            int highImporatnce = 2;
            zAccount.AccountA.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <f>!</f>
                        <mp ct='text/html'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion
            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            // Verify the received message data
            // Verify: Subject
            // Verify: Content
            // Verify: To, From

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");

            zAssert.That(Regex.IsMatch(rdoMail.Body, content), "Check that the message content matched expected value");

            foreach (RDORecipient r in rdoMail.Recipients)
            {
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olOriginator)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountA.emailAddress, "Check the Origination Address is correct");
                }
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olTo)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountZCO.emailAddress, "Check that the Destination Address is correct");
                }
            }

            //Importance value returned by rdoMail object as High=2,Low=0,Normal=1
            zAssert.AreEqual(rdoMail.Importance, highImporatnce, "Check that received mail at ZCO with high importance");

            #endregion
        }

        [Test, Description("Verify ZCO can sync received messages with LOW Importance")]
        [Category("SMOKE")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetMessage_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Add a message to the account mailbox
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            int lowImportance = 0;

            zAccount.AccountA.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <f>?</f>
                        <mp ct='text/html'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion
            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            // Verify the received message data
            // Verify: Subject
            // Verify: Content
            // Verify: To, From

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");

            zAssert.That(Regex.IsMatch(rdoMail.Body, content), "Check that the message content matched expected value");

            foreach (RDORecipient r in rdoMail.Recipients)
            {
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olOriginator)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountA.emailAddress, "Check the Origination Address is correct");
                }
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olTo)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountZCO.emailAddress, "Check that the Destination Address is correct");
                }
            }

            //Importance value returned by rdoMail object as High=2,Low=0,Normal=1
            zAssert.AreEqual(rdoMail.Importance, lowImportance, "Check that received mail at ZCO is flagged with Low importance");

            #endregion
        }
        [Test, Description("Verify ZCO can sync received messages with Normal Importance")]
        [Category("SMOKE")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetMessage_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Add a message to the account mailbox
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            int normalImportance = 1;
            zAccount.AccountA.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
                        <su>" + subject + @"</su>                        
                        <mp ct='text/html'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion
            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            // Verify the received message data
            // Verify: Subject
            // Verify: Content
            // Verify: To, From

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");

            zAssert.That(Regex.IsMatch(rdoMail.Body, content), "Check that the message content matched expected value");

            foreach (RDORecipient r in rdoMail.Recipients)
            {
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olOriginator)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountA.emailAddress, "Check the Origination Address is correct");
                }
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olTo)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountZCO.emailAddress, "Check that the Destination Address is correct");
                }
            }

            //Importance value returned by rdoMail object as High=2,Low=0,Normal=1          
            zAssert.AreEqual(rdoMail.Importance, normalImportance, "Check that received mail at ZCO is flagged with normal importance");

            #endregion
        }
        [Test, Description("Verify ZCO can sync received messages in plain text format")]
        [Category("SMOKE")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetMessage_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Add a message to the account mailbox

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            int plainBodyFormat = 1;

            zAccount.AccountA.sendSOAP(@"
                <SendMsgRequest xmlns='urn:zimbraMail'>
                    <m>
                        <e t='t' a='" + zAccount.AccountZCO.emailAddress + @"'/>
                        <su>" + subject + @"</su>
                        <mp ct='text/plain'>
                            <content>" + content + @"</content>
                        </mp>
                    </m>
                </SendMsgRequest>");
            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            #endregion

            #region Outlook Block

            // Use Outlook to create a draft message and save in the default draft folder

            OutlookCommands.Instance.Sync();

            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");

            // Verify the received message data
            // Verify: Subject
            // Verify: Content
            // Verify: To, From

            zAssert.AreEqual(rdoMail.Subject, subject, "Check that the subject matched expected value");

            zAssert.That(Regex.IsMatch(rdoMail.Body, content), "Check that the message content matched expected value");

            foreach (RDORecipient r in rdoMail.Recipients)
            {
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olOriginator)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountA.emailAddress, "Check the Origination Address is correct");
                }
                if (r.Type == (int)OutlookMailbox.olMailRecipientType.olTo)
                {
                    zAssert.AreEqual(r.Address, zAccount.AccountZCO.emailAddress, "Check that the Destination Address is correct");
                }
            }
            //Verify if format of the body text is plain text 
            //NOTE-BodyFormat returns a constant 'olFormatPlain' with value 1 for Plain text type   
            zAssert.AreEqual(rdoMail.BodyFormat, plainBodyFormat, "Check that received mail at ZCO have body type as Plain text format");

            #endregion
        }
        [Test, Description("Verify ZCO can sync a received text email with Binary attachment")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetMessageWithAttachment_07()
        {
            // Steps:
            // 1. Login a account1 (SOAP)
            // 2. SendMsgRequest to sync user
            // 3. Login as sync user (ZCO)
            // 4. Do Send/Receive to sync the incoming message
            // 5. Verify that the message has a single attachment with the correct file name

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, uploadId;
            int plainBodyFormat = 1;


            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            UploadServlet servlet = new UploadServlet(zAccount.AccountA);
            //uploading binary attachment            
            Console.WriteLine(Directory.GetCurrentDirectory());
            servlet.DoUploadFile(zAccount.AccountA.zimbraMailHost, GlobalProperties.TestMailRaw + "/attachments1/Book1.xls", out uploadId);
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content).
                            AddAttachment(uploadId)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            //Verify body type of mail
            zAssert.AreEqual(rMail.BodyFormat, plainBodyFormat, "Check that format of body text is in Plain");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rMail.Attachments.Count, "Verify that the message contains one attachment");
            zAssert.AreEqual("Book1.xls", rMail.Attachments[1].FileName, "Verify that the correct file name is used");
            Assert.IsTrue((Regex.IsMatch(rMail.Attachments[1].MimeTag, "excel")), "Check that attached file is of binary file type");

            #endregion
        }
        [Test, Description("Verify ZCO can sync a received text email with text attachment")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetMessageWithAttachment_08()
        {
            // Steps:
            // 1. Login a account1 (SOAP)
            // 2. SendMsgRequest to sync user
            // 3. Login as sync user (ZCO)
            // 4. Do Send/Receive to sync the incoming message
            // 5. Verify that the message has a single attachment with the correct file name

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, uploadId;
            int plainBodyFormat = 1;

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            UploadServlet servlet = new UploadServlet(zAccount.AccountA);
            //uploading binary attachment            
            Console.WriteLine(Directory.GetCurrentDirectory());
            servlet.DoUploadFile(zAccount.AccountA.zimbraMailHost, GlobalProperties.TestMailRaw + "/attachments1/filename.txt", out uploadId);
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(content).
                            AddAttachment(uploadId)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            //Verify body format type of mail
            zAssert.AreEqual(rMail.BodyFormat, plainBodyFormat, "Check that format of body text is in Plain");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rMail.Attachments.Count, "Verify that the message contains one attachment");
            zAssert.AreEqual("filename.txt", rMail.Attachments[1].FileName, "Verify that the correct file name is used");
            Assert.IsTrue((Regex.IsMatch(rMail.Attachments[1].MimeTag, "text")), "Check that attached file is of text type");

            #endregion
        }
        [Test, Description("Verify ZCO can sync a received HTML email with text attachment")]
        [Ignore("Ignore a test")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Category("Mail")]
        public void GetMessageWithAttachment_09()
        {
            // Steps:
            // 1. Login a account1 (SOAP)
            // 2. SendMsgRequest to sync user
            // 3. Login as sync user (ZCO)
            // 4. Do Send/Receive to sync the incoming message
            // 5. Verify that the message has a single attachment with the correct file name

            //Scripts needs to be modified to validate HTML text 
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, uploadId;
            int htmlBodyFormat = 2;

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            UploadServlet servlet = new UploadServlet(zAccount.AccountA);
            //uploading binary attachment            
            Console.WriteLine(Directory.GetCurrentDirectory());
            servlet.DoUploadFile(zAccount.AccountA.zimbraMailHost, GlobalProperties.TestMailRaw + "/attachments1/filename.txt", out uploadId);
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextHTML(content).
                            AddAttachment(uploadId)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            //Verify body format type of mail
            zAssert.AreEqual(rMail.BodyFormat, htmlBodyFormat, "Check that format of body text is in HTML");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rMail.Attachments.Count, "Verify that the message contains one attachment");
            zAssert.AreEqual("filename.txt", rMail.Attachments[1].FileName, "Verify that the correct file name is used");
            Assert.IsTrue((Regex.IsMatch(rMail.Attachments[1].MimeTag, "text")), "Check that attached file is of text type");

            #endregion
        }
        [Test, Description("Verify ZCO can sync a received HTML email with binary attachment")]
        [Ignore("Ignore a test")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Category("Mail")]
        public void GetMessageWithAttachment_10()
        {
            // Steps:
            // 1. Login a account1 (SOAP)
            // 2. SendMsgRequest to sync user
            // 3. Login as sync user (ZCO)
            // 4. Do Send/Receive to sync the incoming message
            // 5. Verify that the message has a single attachment with the correct file name

            //Scripts needs to be modified to validate HTML text 
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string messageId, uploadId;
            int htmlBodyFormat = 2;

            #region SOAP Block: Account1 sends a message to ZCO User, Auth as ZCO User & verify that the message is received correctly and is unflagged
            // Send Message
            UploadServlet servlet = new UploadServlet(zAccount.AccountA);
            //uploading binary attachment            
            Console.WriteLine(Directory.GetCurrentDirectory());
            servlet.DoUploadFile(zAccount.AccountA.zimbraMailHost, GlobalProperties.TestMailRaw + "/attachments1/Book1.xls", out uploadId);
            zAccount.AccountA.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextHTML(content).
                            AddAttachment(uploadId)));

            zAccount.AccountA.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();

            // Find the message verify that its not flagged.
            RDOMail rMail = OutlookMailbox.Instance.findMessage(subject);
            zAssert.IsNotNull(rMail, "Check that message the received message exists in the inbox");
            //Verify body format type of mail
            zAssert.AreEqual(rMail.BodyFormat, htmlBodyFormat, "Check that format of body text is in HTML");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rMail.Attachments.Count, "Verify that the message contains one attachment");
            zAssert.AreEqual("Book1.xls", rMail.Attachments[1].FileName, "Verify that the correct file name is used");
            Assert.IsTrue((Regex.IsMatch(rMail.Attachments[1].MimeTag, "excel")), "Check that attached file is of binary type");

            #endregion
        }

    }
}





