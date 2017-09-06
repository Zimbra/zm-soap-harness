using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;
using System.IO;

namespace Tests.MailClient.Mail.FromServer
{

    /* Notes:
     * GetAttachment is used to retrieve email attachment from the server. This is used by clients using 2.5/12.0 and 12.1 activesync protocols. Nexus 6 uses GetAttachment to get attachment data.
     * GetAttachment response is not WBXML. Response is binary data (byte representation of attachment)
     * For 14.0+ activesync protocols, attachment is fetched via the Fetch element in ItemOperations command
     */

    [TestFixture]
    public class GetMail_Attachment : Tests.BaseTestFixture
    {
        String folderid = HarnessProperties.getString("folder.inbox.id");

        /* Below function is used to get attachment's base64 value from mime 
         * Parameter Mime - Mime content
         * Parameter Identifier1 - string word before attachment's base64 value  
         * Parameter Identifier2 - string word after attachment's base64 value
         */
        public String getAttachmentBase64ValueFromMime(String Mime, String Identifier1, String Identifier2)
        {
            int index1 = Mime.IndexOf(Identifier1) + Identifier1.Length;

            if (index1 != -1)
            {   
                int index2 = Mime.IndexOf(Identifier2, index1);

                String subString = Mime.Substring(index1, index2 - index1);
                subString = subString.Replace("\r\n", String.Empty);
                return subString;
            }

            return null;
        }

        /* Below function is used to get byte value using attachment's base64 value from mime 
         * Parameter Mime - Mime content
         * Parameter Identifier1 - string word before attachment's base64 value  
         * Parameter Identifier2 - string word after attachment's base64 value
         */
        public byte[] getAttachmentByteValueFromMime(String Mime, String Identifier1, String Identifier2)
        {
            Identifier1 = Identifier1 + "\r\n\r\n";

            int index1 = Mime.IndexOf(Identifier1) + Identifier1.Length;

            if (index1 != -1)
            {
                int index2 = Mime.IndexOf(Identifier2, index1);

                String subString = Mime.Substring(index1, index2 - index1);
                return Encoding.UTF8.GetBytes(subString);
            }

            return null;
        }

        #region GetAttachment command tests

        [Test, Description("Get/Sync email having text attachment using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment01()
        {

            #region TEST SETUP
           
            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has text attachment</div></body></html>";
            String attachmentName = "TestTxt.txt";
            
            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_txt.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("TxtAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");
            
            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;        

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");
            
            String base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentMime, base64AttachmentResponse, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having docx attachment using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment02()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has docx attachment</div></body></html>";
            String attachmentName = "TestDoc.docx";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_docx.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("DocxAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");

            String base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentMime, base64AttachmentResponse, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having pdf attachment using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment03()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has pdf attachment</div></body></html>";
            String attachmentName = "TestPdf.pdf";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_pdf.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("PdfAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");

            String base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentMime, base64AttachmentResponse, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having jpg attachment using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment04()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has jpg attachment</div></body></html>";
            String attachmentName = "TestJpg.jpg";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_jpg.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("JPGAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");

            String base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentMime, base64AttachmentResponse, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having inline png attachment using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment05()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This email has inline image</div><br><div><img src=\"cid:04e6ce8ba68f672237a520a37f33fd0d24bbbf90@zimbra\" data-mce-src=\"cid:04e6ce8ba68f672237a520a37f33fd0d24bbbf90@zimbra\"></div><div><br data-mce-bogus=\"1\"></div><div>end of message</div></body></html>";
            String attachmentName = "TestPng.png";
            String contentId = "<04e6ce8ba68f672237a520a37f33fd0d24bbbf90@zimbra>";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_inlineattachment.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("InlineImage", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, contentId, "--=_aa3cc678-7d34-4cf0-8248-c8ab524e1a4b--");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:ContentId", null, contentId, "Verify the attachment content id is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:IsInline", null, "1", "Verify the attachment is inline");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");

            String base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentMime, base64AttachmentResponse, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having email attachment (.eml) with html content using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment06()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>this email has html content and email attachment has html content</div></body></html>";
            String attachmentName = "HtmlContentMessage.eml";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_eml_html.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("HtmlEmailAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's byte value from the mime text
            byte[] bytesAttachmentMime = getAttachmentByteValueFromMime(text, "Content-Disposition: attachment", "\r\n------=_Part_58_155920706.1478670114812--");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "5", "Verify the attachment is email message");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");
            ZAssert.AreEqual(bytesAttachmentMime, getAttachmentResponse.ResponseBytes, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        //Bug#107206
        [Test, Description("Get/Sync email having email attachment (.eml) with plain content using GetAttachment command"),
        Property("Bug", 107206), 
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment07()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "this email has plain text content and email attachment has plain text content";
            String attachmentName = "PlainTextMessage.eml";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_eml_plain.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("PlainEmailAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's byte value from the mime text
            byte[] bytesAttachmentMime = getAttachmentByteValueFromMime(text, "Content-Disposition: attachment", "\r\n------=_Part_20_279133768.1478669556693--");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "5", "Verify the attachment is email message");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "1", "Verify the Type is correct i.e plain format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. plain on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");
            ZAssert.AreEqual(bytesAttachmentMime, getAttachmentResponse.ResponseBytes, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having contact attachment using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment08()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has contact attachment</div></body></html>";
            String attachmentName = "lt1, testc1.vcf";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_contact.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("ContactAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest = new ZGetAttachmentRequest(TestAccount, fileReference);
            ZGetAttachmentResponse getAttachmentResponse = TestClient.sendRequest(getAttachmentRequest) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse, "Verify the GetAttachment response was received");

            String base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentMime, base64AttachmentResponse, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having multiple attachments using GetAttachment command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  GetAttachment command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment09()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>this email has text, docx, jpg and pdf attachments</div></body></html>";
            String attachmentName1 = "TestDoc.docx";
            String attachmentName2 = "TestJpg.jpg";
            String attachmentName3 = "TestPdf.pdf";
            String attachmentName4 = "TestTxt.txt";
            int index1, index2;
            String subString;
            String Identifier1 = "base64";
            String Identifier2 = "------=_Part";
            String base64AttachmentName1, base64AttachmentName2, base64AttachmentName3, base64AttachmentName4;

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_multiple.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("MultipleAttachments", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            //1 Docx          
            index1 = text.IndexOf(Identifier1) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName1 = subString;

            //2 JPG
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName2 = subString;

            //3 PDF
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName3 = subString;

            //4 TXT
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName4 = subString;

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 4, "Verify that email has  4 attachments");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String docxFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName1 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String jpgFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName2 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String pdfFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName3 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String txtFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName4 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            
            // Send GetAttachment request
            ZGetAttachmentRequest getAttachmentRequest1 = new ZGetAttachmentRequest(TestAccount, docxFileReference);
            ZGetAttachmentResponse getAttachmentResponse1 = TestClient.sendRequest(getAttachmentRequest1) as ZGetAttachmentResponse;

            ZGetAttachmentRequest getAttachmentRequest2 = new ZGetAttachmentRequest(TestAccount, jpgFileReference);
            ZGetAttachmentResponse getAttachmentResponse2 = TestClient.sendRequest(getAttachmentRequest2) as ZGetAttachmentResponse;

            ZGetAttachmentRequest getAttachmentRequest3 = new ZGetAttachmentRequest(TestAccount, pdfFileReference);
            ZGetAttachmentResponse getAttachmentResponse3 = TestClient.sendRequest(getAttachmentRequest3) as ZGetAttachmentResponse;

            ZGetAttachmentRequest getAttachmentRequest4 = new ZGetAttachmentRequest(TestAccount, txtFileReference);
            ZGetAttachmentResponse getAttachmentResponse4 = TestClient.sendRequest(getAttachmentRequest4) as ZGetAttachmentResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(getAttachmentResponse1, "Verify the GetAttachment response was received for docx attachment");
            String base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse1.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentName1, base64AttachmentResponse, "Verify that the response attachment data matches with mime doc attachment data");

            ZAssert.IsNotNull(getAttachmentResponse2, "Verify the GetAttachment response was received for jpg attachment");
            base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse2.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentName2, base64AttachmentResponse, "Verify that the response attachment data matches with mime jpg attachment data");

            ZAssert.IsNotNull(getAttachmentResponse3, "Verify the GetAttachment response was received for pdf attachment");
            base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse3.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentName3, base64AttachmentResponse, "Verify that the response attachment data matches with mime pdf attachment data");

            ZAssert.IsNotNull(getAttachmentResponse4, "Verify the GetAttachment response was received for txt attachment");
            base64AttachmentResponse = Convert.ToBase64String(getAttachmentResponse4.ResponseBytes);
            ZAssert.AreEqual(base64AttachmentName4, base64AttachmentResponse, "Verify that the response attachment data matches with mime txt attachment data");

            #endregion

        }

        #endregion

        #region ItemOperations-Fetch command tests

        [Test, Description("Get/Sync email having text attachment using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Smoke")]
        [Category("Mail")]
        [Category("L1")]
        public void GetMail_Attachment10()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has text attachment</div></body></html>";
            String attachmentName = "TestTxt.txt";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_txt.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("TxtAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "text/plain; name=" + attachmentName, "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having docx attachment using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment11()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has docx attachment</div></body></html>";
            String attachmentName = "TestDoc.docx";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_docx.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("DocxAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "application/vnd.openxmlformats-officedocument.wordprocessingml.document;\r\n name=" + attachmentName, "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having pdf attachment using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment12()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has pdf attachment</div></body></html>";
            String attachmentName = "TestPdf.pdf";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_pdf.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("PdfAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "application/pdf; name=" + attachmentName, "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having jpg attachment using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment13()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has jpg attachment</div></body></html>";
            String attachmentName = "TestJpg.jpg";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_jpg.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("JPGAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "image/jpeg; name=" + attachmentName, "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having inline png attachment using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment14()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This email has inline image</div><br><div><img src=\"cid:04e6ce8ba68f672237a520a37f33fd0d24bbbf90@zimbra\" data-mce-src=\"cid:04e6ce8ba68f672237a520a37f33fd0d24bbbf90@zimbra\"></div><div><br data-mce-bogus=\"1\"></div><div>end of message</div></body></html>";
            String attachmentName = "TestPng.png";
            String contentId = "<04e6ce8ba68f672237a520a37f33fd0d24bbbf90@zimbra>";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_inlineattachment.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("InlineImage", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, contentId, "--=_aa3cc678-7d34-4cf0-8248-c8ab524e1a4b--");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:ContentId", null, contentId, "Verify the attachment content id is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:IsInline", null, "1", "Verify the attachment is inline");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "image/png; name=" + attachmentName, "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having email attachment with html content using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment15()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>this email has html content and email attachment has html content</div></body></html>";
            String attachmentName = "HtmlContentMessage.eml";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_eml_html.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("HtmlEmailAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's byte value from the mime text
            byte[] bytesAttachmentMime = getAttachmentByteValueFromMime(text, "Content-Disposition: attachment", "\r\n------=_Part_58_155920706.1478670114812--");
            String base64AttachmentMime = Convert.ToBase64String(bytesAttachmentMime);

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "5", "Verify the attachment is email message");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "message/rfc822", "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having email attachment with plain content using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment16()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "this email has plain text content and email attachment has plain text content";
            String attachmentName = "PlainTextMessage.eml";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_eml_plain.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("PlainEmailAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's byte value from the mime text
            byte[] bytesAttachmentMime = getAttachmentByteValueFromMime(text, "Content-Disposition: attachment", "\r\n------=_Part_20_279133768.1478669556693--");
            String base64AttachmentMime = Convert.ToBase64String(bytesAttachmentMime);

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            //ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "5", "Verify the attachment is email message");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "1", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "1", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "message/rfc822", "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having contact attachment using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment17()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has contact attachment</div></body></html>";
            String attachmentName = "lt1, testc1.vcf";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_contact.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("ContactAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String fileReference = Add.SelectSingleNode("//AirSyncBase:Attachment/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachment on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + fileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            // Get the matching <Fetch/> elements
            XmlElement Fetch = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + fileReference + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Fetch was returned in the ItemOperations Response");

            #endregion


            #region TEST VERIFICATION

            ZAssert.XmlXpathMatch(Fetch, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:ContentType", null, "text/directory; name=\"" + attachmentName + "\"", "Verify the attachment content type is correct");

            String data = Fetch.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentMime, data, "Verify that the response attachment data matches with mime attachment data");

            #endregion

        }

        [Test, Description("Get/Sync email having multiple attachments using ItemOperationsRequest-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  ItemOperationsRequest-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment18()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>this email has text, docx, jpg and pdf attachments</div></body></html>";
            String attachmentName1 = "TestDoc.docx";
            String attachmentName2 = "TestJpg.jpg";
            String attachmentName3 = "TestPdf.pdf";
            String attachmentName4 = "TestTxt.txt";
            int index1, index2;
            String subString;
            String Identifier1 = "base64";
            String Identifier2 = "------=_Part";
            String base64AttachmentName1, base64AttachmentName2, base64AttachmentName3, base64AttachmentName4;

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_multiple.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("MultipleAttachments", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the injected mime 
            //1 Docx          
            index1 = text.IndexOf(Identifier1) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName1 = subString;

            //2 JPG
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName2 = subString;

            //3 PDF
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName3 = subString;

            //4 TXT
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName4 = subString;

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 4, "Verify that email has  4 attachments");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String docxFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName1 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String jpgFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName2 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String pdfFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName3 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String txtFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName4 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send the ItemOperations request to retrieve attachments on server
            ZItemOperationsRequest itemOperationsRequest = new ZItemOperationsRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<ItemOperations xmlns='ItemOperations' xmlns:AirSyncBase='AirSyncBase'>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + docxFileReference + @"</AirSyncBase:FileReference>
    </Fetch>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + jpgFileReference + @"</AirSyncBase:FileReference>
    </Fetch>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + pdfFileReference + @"</AirSyncBase:FileReference>
    </Fetch>
    <Fetch>
        <Store>Mailbox</Store>
        <AirSyncBase:FileReference>" + txtFileReference + @"</AirSyncBase:FileReference>
    </Fetch>
</ItemOperations>");

            // Send the request
            ZItemOperationsResponse itemOperationsResponse = TestClient.sendRequest(itemOperationsRequest) as ZItemOperationsResponse;
            
            #endregion

            #region TEST VERIFICATION

            ZAssert.IsNotNull(itemOperationsResponse, "Verify the ItemOperations response was received");

            //Docx attachment verification
            XmlElement Fetch1 = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + docxFileReference + "']");
            ZAssert.IsNotNull(Fetch1, "Verify the Fetch was returned in the ItemOperations Response");

            ZAssert.XmlXpathMatch(Fetch1, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch1, "//AirSyncBase:ContentType", null, "application/vnd.openxmlformats-officedocument.wordprocessingml.document;\r\n name=" + attachmentName1, "Verify the attachment content type is correct i.e. doc");

            String data1 = Fetch1.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentName1, data1, "Verify that the response attachment data matches with mime doc attachment data");

            //JPG attachment verification
            XmlElement Fetch2 = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + jpgFileReference + "']");
            ZAssert.IsNotNull(Fetch2, "Verify the Fetch was returned in the ItemOperations Response");

            ZAssert.XmlXpathMatch(Fetch2, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch2, "//AirSyncBase:ContentType", null, "image/jpeg; name=" + attachmentName2, "Verify the attachment content type is correct i.e. jpg");

            String data2 = Fetch2.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentName2, data2, "Verify that the response attachment data matches with mime jpg attachment data");

            //Pdf attachment verification
            XmlElement Fetch3 = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + pdfFileReference + "']");
            ZAssert.IsNotNull(Fetch3, "Verify the Fetch was returned in the ItemOperations Response");

            ZAssert.XmlXpathMatch(Fetch3, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch3, "//AirSyncBase:ContentType", null, "application/pdf; name=" + attachmentName3, "Verify the attachment content type is correct i.e pdf");

            String data3 = Fetch3.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentName3, data3, "Verify that the response attachment data matches with mime pdf attachment data");

            //Txt attachment verification
            XmlElement Fetch4 = ZItemOperationsResponse.getMatchingElement(itemOperationsResponse.XmlElement, "//ItemOperations:Fetch", "//AirSyncBase:FileReference[text() = '" + txtFileReference + "']");
            ZAssert.IsNotNull(Fetch4, "Verify the Fetch was returned in the ItemOperations Response");

            ZAssert.XmlXpathMatch(Fetch4, "//ItemOperations:Status", null, "1", "Verify the Fetch action succeeded");
            ZAssert.XmlXpathMatch(Fetch4, "//AirSyncBase:ContentType", null, "text/plain; name=" + attachmentName4, "Verify the attachment content type is correct i.e txt");

            String data4 = Fetch4.SelectSingleNode("//ItemOperations:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual(base64AttachmentName4, data4, "Verify that the response attachment data matches with mime txt attachment data");

            #endregion

        }

        #endregion

        #region Sync-Fetch command tests
        
        [Test, Description("Get/Sync email having text attachment using Sync-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  Sync-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment19()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has text attachment</div></body></html>";
            String attachmentName = "TestTxt.txt";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_txt.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("TxtAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime1 = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Save the ServerId
            String serverId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            // Send Sync request with Fetch command for added email
            syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>0</GetChanges>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
            </Options>
            <Commands>
                <Fetch>
                    <ServerId>" + serverId +@"</ServerId>
                </Fetch>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            
            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Fetch = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Fetch", "//AirSync:ServerId[text() = '" + serverId + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Add was returned in the Sync Response");

            // Verify the <Fetch/> element contents match the message
            ZAssert.XmlXpathMatch(Fetch, "//email:Subject", null, subject, "Verify the Subject is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Fetch, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Type", null, "4", "Verify the Type is correct i.e Mime format");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Data", null, content, "Verify the content is correct");

            // Below line has been commented as it fails because of Bug#106016. Uncomment the line after bug gets fixed
            // ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server"); 

            //Mime Data validation
            String mimeData = Fetch.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual("foo@example.com", MimeBuilder.getValueFromMime(mimeData, "From"), "Verify that From address is correct in fetched email mime");
            ZAssert.AreEqual("bar@example.com", MimeBuilder.getValueFromMime(mimeData, "To"), "Verify that To address is correct in fetched email mime");
            ZAssert.AreEqual(subject, MimeBuilder.getValueFromMime(mimeData, "Subject"), "Verify that Subject is correct in fetched email mime");
            
            ZAssert.IsTrue(mimeData.Contains("Content-Type: " + "text/plain; name=" + attachmentName), "Verify that Content-Type is correct in fetched email mime");
            ZAssert.AreEqual("attachment; filename=" + attachmentName, MimeBuilder.getValueFromMime(mimeData, "Content-Disposition"), "Verify that Content-Disposition is correct in fetched email mime");

            String base64AttachmentMime2 = getAttachmentBase64ValueFromMime(mimeData, "base64", "------=_Part");
            ZAssert.AreEqual(base64AttachmentMime1, base64AttachmentMime2, "Verify that attachment data matches in source attachment and fetched email");

            #endregion

        }

        [Test, Description("Get/Sync email having docx attachment using Sync-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  Sync-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment20()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has docx attachment</div></body></html>";
            String attachmentName = "TestDoc.docx";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_docx.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("DocxAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime1 = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Save the ServerId
            String serverId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            // Send Sync request with Fetch command for added email
            syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>0</GetChanges>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
            </Options>
            <Commands>
                <Fetch>
                    <ServerId>" + serverId + @"</ServerId>
                </Fetch>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Fetch = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Fetch", "//AirSync:ServerId[text() = '" + serverId + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Add was returned in the Sync Response");

            // Verify the <Fetch/> element contents match the message
            ZAssert.XmlXpathMatch(Fetch, "//email:Subject", null, subject, "Verify the Subject is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Fetch, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Type", null, "4", "Verify the Type is correct i.e Mime format");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Data", null, content, "Verify the content is correct");

            // Below line has been commented as it fails because of Bug#106016. Uncomment the line after bug gets fixed
            // ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            //Mime Data validation
            String mimeData = Fetch.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual("foo@example.com", MimeBuilder.getValueFromMime(mimeData, "From"), "Verify that From address is correct in fetched email mime");
            ZAssert.AreEqual("bar@example.com", MimeBuilder.getValueFromMime(mimeData, "To"), "Verify that To address is correct in fetched email mime");
            ZAssert.AreEqual(subject, MimeBuilder.getValueFromMime(mimeData, "Subject"), "Verify that Subject is correct in fetched email mime");

            ZAssert.IsTrue(mimeData.Contains("Content-Type: " + "application/vnd.openxmlformats-officedocument.wordprocessingml.document;\r\n name=" + attachmentName), "Verify that Content-Type is correct in fetched email mime");
            ZAssert.AreEqual("attachment; filename=" + attachmentName, MimeBuilder.getValueFromMime(mimeData, "Content-Disposition"), "Verify that Content-Disposition is correct in fetched email mime");

            String base64AttachmentMime2 = getAttachmentBase64ValueFromMime(mimeData, "base64", "------=_Part");
            ZAssert.AreEqual(base64AttachmentMime1, base64AttachmentMime2, "Verify that attachment data matches in source attachment and fetched email");

            #endregion

        }

        [Test, Description("Get/Sync email having contact attachment using Sync-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  Sync-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment21()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>This message has contact attachment</div></body></html>";
            String attachmentName = "lt1, testc1.vcf";

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_contact.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("ContactAttachment", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            String base64AttachmentMime1 = getAttachmentBase64ValueFromMime(text, "base64", "------=_Part");

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Save the ServerId
            String serverId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            // Send Sync request with Fetch command for added email
            syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>0</GetChanges>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
            </Options>
            <Commands>
                <Fetch>
                    <ServerId>" + serverId + @"</ServerId>
                </Fetch>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Fetch = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Fetch", "//AirSync:ServerId[text() = '" + serverId + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Add was returned in the Sync Response");

            // Verify the <Fetch/> element contents match the message
            ZAssert.XmlXpathMatch(Fetch, "//email:Subject", null, subject, "Verify the Subject is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Fetch, "//AirSyncBase:Attachment", 1, "Verify that only 1 attachment is retrieved from the server");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Attachment/AirSyncBase:DisplayName", null, attachmentName, "Verify the attachment display name is correct");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Type", null, "4", "Verify the Type is correct i.e Mime format");
            ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:Data", null, content, "Verify the content is correct");

            // Below line has been commented as it fails because of Bug#106016. Uncomment the line after bug gets fixed
            // ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            //Mime Data validation
            String mimeData = Fetch.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual("foo@example.com", MimeBuilder.getValueFromMime(mimeData, "From"), "Verify that From address is correct in fetched email mime");
            ZAssert.AreEqual("bar@example.com", MimeBuilder.getValueFromMime(mimeData, "To"), "Verify that To address is correct in fetched email mime");
            ZAssert.AreEqual(subject, MimeBuilder.getValueFromMime(mimeData, "Subject"), "Verify that Subject is correct in fetched email mime");

            ZAssert.IsTrue(mimeData.Contains("Content-Type: " + "text/directory; name=\"" + attachmentName + "\""), "Verify that Content-Type is correct in fetched email mime");
            ZAssert.AreEqual("attachment; filename=\"" + attachmentName + "\"", MimeBuilder.getValueFromMime(mimeData, "Content-Disposition"), "Verify that Content-Disposition is correct in fetched email mime");

            String base64AttachmentMime2 = getAttachmentBase64ValueFromMime(mimeData, "base64", "------=_Part");
            ZAssert.AreEqual(base64AttachmentMime1, base64AttachmentMime2, "Verify that attachment data matches in source attachment and fetched email");

            #endregion

        }

        [Test, Description("Get/Sync email having multiple attachments using Sync-Fetch command"),
        Property("TestSteps", "1. Send the test message with attachment to the mailbox, 2. Sync to device using  Sync-Fetch command, 3. Verify the mail is added to the mailbox with correct attachment")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L2")]
        public void GetMail_Attachment22()
        {

            #region TEST SETUP

            String subject = "subject" + HarnessProperties.getUniqueString();
            String content = "<html><body><div>this email has text, docx, jpg and pdf attachments</div></body></html>";
            String attachmentName1 = "TestDoc.docx";
            String attachmentName2 = "TestJpg.jpg";
            String attachmentName3 = "TestPdf.pdf";
            String attachmentName4 = "TestTxt.txt";
            int index1, index2;
            String subString;
            String Identifier1 = "base64";
            String Identifier2 = "------=_Part";
            String base64AttachmentName1, base64AttachmentName2, base64AttachmentName3, base64AttachmentName4;
            String base64AttachmentName1Response, base64AttachmentName2Response, base64AttachmentName3Response, base64AttachmentName4Response;

            // Inject the test message to the mailbox
            String mimeFile = HarnessProperties.getString("folder.harness.testmime") + "/misc-mimes/Mime_attachment_multiple.txt";
            String text = File.ReadAllText(mimeFile);
            text = text.Replace("MultipleAttachments", subject);

            // Inject the email
            MailInject.injectLMTP(TestAccount.ZimbraMailHost, new StringReader(text), new System.Collections.ArrayList(TestAccount.EmailAddress.Split(',')), "foo@example.com");

            // Get the attachment's base64 content from the mime text
            //1 Docx          
            index1 = text.IndexOf(Identifier1) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName1 = subString;

            //2 JPG
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName2 = subString;

            //3 PDF
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName3 = subString;

            //4 TXT
            index1 = text.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = text.IndexOf(Identifier2, index1);

            subString = text.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName4 = subString;

            #endregion


            #region TEST ACTION

            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>2</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>1024</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the request
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            //Save the ServerId
            String serverId = Add.SelectSingleNode("//AirSync:ServerId", ZAssert.NamespaceManager).InnerText;

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Add, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 4, "Verify that email has  4 attachments");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            String docxFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName1 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String jpgFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName2 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String pdfFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName3 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;
            String txtFileReference = Add.SelectSingleNode("//AirSyncBase:Attachment[AirSyncBase:DisplayName='" + attachmentName4 + "']/AirSyncBase:FileReference", ZAssert.NamespaceManager).InnerText;

            // Send Sync request with Fetch command for added email
            syncRequest = new ZSyncRequest(TestAccount,
               @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync' xmlns:AirSyncBase='AirSyncBase' >
    <Collections>
        <Collection>
            <SyncKey>" + TestAccount.Device.SyncKeys[folderid] + @"</SyncKey>
            <CollectionId>" + folderid + @"</CollectionId>
            <GetChanges>0</GetChanges>
            <Options>
                <FilterType>1</FilterType>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>4</AirSyncBase:Type>
                </AirSyncBase:BodyPreference>
                <MIMESupport>2</MIMESupport>
            </Options>
            <Commands>
                <Fetch>
                    <ServerId>" + serverId + @"</ServerId>
                </Fetch>
            </Commands>
        </Collection>
    </Collections>
</Sync>");

            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;

            #endregion


            #region TEST VERIFICATION

            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");

            XmlElement Fetch = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Fetch", "//AirSync:ServerId[text() = '" + serverId + "']");
            ZAssert.IsNotNull(Fetch, "Verify the Add was returned in the Sync Response");

            // Verify the <Fetch/> element contents match the message
            ZAssert.XmlXpathMatch(Fetch, "//email:Subject", null, subject, "Verify the Subject is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:To", null, "bar@example.com", "Verify the To address is correct");
            ZAssert.XmlXpathMatch(Fetch, "//email:From", null, "foo@example.com", "Verify the From address is correct");

            ZAssert.XmlXpathCount(Add, "//AirSyncBase:Attachment", 4, "Verify that email has  4 attachments");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Attachment/AirSyncBase:Method", null, "1", "Verify the attachment is normal attachment");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Type", null, "2", "Verify the Type is correct i.e html format");
            ZAssert.XmlXpathMatch(Add, "//AirSyncBase:Data", null, content, "Verify the content is correct");
            
            // Below line has been commented as it fails because of Bug#106016. Uncomment the line after bug gets fixed
            // ZAssert.XmlXpathMatch(Fetch, "//AirSyncBase:NativeBodyType", null, "2", "Verify the body type is correct i.e. html on server");

            //Mime Data validation
            String mimeData = Fetch.SelectSingleNode("//AirSyncBase:Data", ZAssert.NamespaceManager).InnerText;
            ZAssert.AreEqual("foo@example.com", MimeBuilder.getValueFromMime(mimeData, "From"), "Verify that From address is correct in fetched email mime");
            ZAssert.AreEqual("bar@example.com", MimeBuilder.getValueFromMime(mimeData, "To"), "Verify that To address is correct in fetched email mime");
            ZAssert.AreEqual(subject, MimeBuilder.getValueFromMime(mimeData, "Subject"), "Verify that Subject is correct in fetched email mime");

            // Get the attachment's base64 content from the mime text
            //1 Docx          
            index1 = mimeData.IndexOf(Identifier1) + Identifier1.Length;
            index2 = mimeData.IndexOf(Identifier2, index1);

            subString = mimeData.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName1Response = subString;

            //2 JPG
            index1 = mimeData.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = mimeData.IndexOf(Identifier2, index1);

            subString = mimeData.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName2Response = subString;

            //3 PDF
            index1 = mimeData.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = mimeData.IndexOf(Identifier2, index1);

            subString = mimeData.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName3Response = subString;

            //4 TXT
            index1 = mimeData.IndexOf(Identifier1, index2) + Identifier1.Length;
            index2 = mimeData.IndexOf(Identifier2, index1);

            subString = mimeData.Substring(index1, index2 - index1);
            subString = subString.Replace("\r\n", String.Empty);
            base64AttachmentName4Response = subString;

            ZAssert.IsTrue(mimeData.Contains("Content-Type: " + "application/vnd.openxmlformats-officedocument.wordprocessingml.document;\r\n name=" + attachmentName1), "Verify that fetched email mime has doc content-type");
            ZAssert.AreEqual(base64AttachmentName1, base64AttachmentName1Response, "Verify that doc attachment data matches in source attachment and fetched email");

            ZAssert.IsTrue(mimeData.Contains("Content-Type: " + "image/jpeg; name=" + attachmentName2), "Verify that fetched email mime has jpeg content-type");
            ZAssert.AreEqual(base64AttachmentName2, base64AttachmentName2Response, "Verify that jpg attachment data matches in source attachment and fetched email");

            ZAssert.IsTrue(mimeData.Contains("Content-Type: " + "application/pdf; name=" + attachmentName3), "Verify that fetched email mime has pdf content-type");
            ZAssert.AreEqual(base64AttachmentName3, base64AttachmentName3Response, "Verify that pdf attachment data matches in source attachment and fetched email");

            ZAssert.IsTrue(mimeData.Contains("Content-Type: " + "text/plain; name=" + attachmentName4), "Verify that fetched email mime has text content-type");
            ZAssert.AreEqual(base64AttachmentName4, base64AttachmentName4Response, "Verify that txt attachment data matches in source attachment and fetched email");

            #endregion

        }

        #endregion

    }
}