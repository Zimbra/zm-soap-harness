using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Mail
{
     public class Message_Content : BaseTestFixture
    {
        public Message_Content()
        {
        }

        [Test, Description("Verify a Text content of a message is migrated correctly")]
         public void Message_Content01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject1";
            string body = "body1";
            string content;
            string messageid = null;
            #endregion

            #region SOAP Block


            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @")</query>"
                + "</SearchRequest>");

            account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            // test to confirm mail body contains Plain text.
            account.selectSOAP(m, "//mail:mp", "ct", "text/plain", null, 1);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            // etc., etc.
            //Check for HTML content in the body
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");
            #endregion

        }

         [Test, Description("Verify a HTML content of a message  is migrated correctly")]
         public void Message_Content02()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject8";
             string body = "<b>bold</b>";
             string content;
             string messageid = null;
             #endregion

              #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @")</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
             // test to confirm mail body contains Plain text.
             account.selectSOAP(m, "//mail:mp", "ct", "text/plain", null, 1);
            
            

             #endregion

             #region SOAP Block to test HTML part

                  
             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "' html='1'/>"
                 + "</GetMsgRequest>");

             XmlNode m1 = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
             // test to confirm mail body contains HTML text.
             account.selectSOAP(m1, "//mail:mp", "ct", "text/html", null, 1);
             account.selectSOAP(m1, "//mail:content", null, null, out content, 1);
             // etc., etc.
             //Check for HTML content in the body
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "HTML Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "HTML Content of the email is NOT migrated successfully");
             #endregion         
         }


         [Test, Description("Verify a message with HTML content only is migrated correctly")]
         [Ignore ("Not able to get a HTML-only message into exchange account. The day we can get it into exchange successfully, we should remore 'Ignore' tage")]
         public void Message_Content13()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "foo13492883443563";
             string body = "<strong>bold</strong>";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));

             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @")</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);
          
             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "' html='1'/>"
                 + "</GetMsgRequest>");

             XmlNode m1 = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
             // test to confirm mail body contains HTML text.
             account.selectSOAP(m1, "//mail:mp", "ct", "text/html", null, 1);
             account.selectSOAP(m1, "//mail:content", null, null, out content, 1);
             // etc., etc.
             //Check for HTML content in the body
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "HTML Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "HTML Content of the email is NOT migrated successfully");
             #endregion
         }


         [Test, Description("Verify a Rich Text content of a message is migrated as HTML content-type")]
         public void Message_Content12()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "Subject13491262871926";
             string body = "13491262871926";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @")</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
             // test to confirm mail body contains Plain text.
             account.selectSOAP(m, "//mail:mp", "ct", "text/plain", null, 1);
            
            

             #endregion

             #region SOAP Block to test HTML part

                  
             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "' html='1'/>"
                 + "</GetMsgRequest>");

             XmlNode m1 = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
             // test to confirm mail body contains HTML text.
             account.selectSOAP(m1, "//mail:mp", "ct", "text/html", null, 1);
             account.selectSOAP(m1, "//mail:content", null, null, out content, 1);
             // etc., etc.
             //Check for HTML content in the body
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "HTML Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "HTML Content of the email is NOT migrated successfully");
             #endregion


         }

         [Test, Description("Verify a text and HTML content of a message is migrated correctly")]
         public void Message_Content11()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject1348637994c1809";
             string body = "<b>bold</b>";
             string content;
             string messageid = null;
             string htmlContent = "";
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @") </query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "' html='1'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
             // test to confirm mail body contains HTML text.
             XmlNode m1= account.selectSOAP(m, "//mail:mp", "ct", "text/html", null, 1);
             account.selectSOAP(m, "//mail:content", null, null, out content, 1);
             // etc., etc.
             //Check for HTML content in the body
             if (content.ToLower().Contains(body.ToLower()))
                 ZAssert.That(true, "HTML Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "HTML Content of the email is NOT migrated successfully");
             #endregion

         }

         [Test, Description("Verify a message with .doc attachment is migrated correctly")]
         public void Message_Content03()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject4";
             string body = "Content4";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @")</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
                          
             account.selectSOAP(m, "//mail:content", null, null, out content, 1);
             
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");

             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.presentationml.presentation", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "marketing_strategy.pptx", null, 1);

             #endregion

         }

         [Test, Description("Verify a message with .png attachment is migrated correctly")]
         public void Message_Content04()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject5";
             string body = "Content5";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @")</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

             account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");

             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "image/png", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "octopus_dotx_preview.png", null, 1);

             #endregion

         }

         [Test, Description("Verify a message with .xslx attachment is migrated correctly")]
         public void Message_Content05()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject6";
             string body = "Content6";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @")</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

             account.selectSOAP(m, "//mail:content", null, null, out content, 1);
             
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");

             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "vnd.openxmlformats-officedocument.spreadsheetml.sheet", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "Book1.xlsx", null, 1);

             #endregion

         }


         [Test, Description("Verify a message with .pdf attachment is migrated correctly")]
         public void Message_Content06()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject3";
             string body = "Content3";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @") has:attachment</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

             account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, " Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");

             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/pdf", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "SecurIDToken_release_notes.pdf", null, 1);

             #endregion

         }


         [Test, Description("Verify a message with .doc attachment is migrated correctly")]
         public void Message_Content07()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject15";
             string body = "Content15";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @") in:inbox</query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

             account.selectSOAP(m, "//mail:content", null, null, out content, 1);
             
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");

             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "MigrationTool  CommandLine Interface.docx", null, 1);

             #endregion

         }

         [Test, Description("Verify a message with outlook item as attachment is migrated correctly")]
         public void Message_Content08()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject10";
             string body = "outlook item meeting15 attached";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @") </query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

             account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");

             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "message/rfc822", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "meeting15", null, 1);
             //Make sure outlook attachment contains pptx attachment.
             account.selectSOAP(m, "//mail:mp/mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.presentationml.presentation", null, 1);
             account.selectSOAP(m, "//mail:mp/mail:mp[@cd='attachment']", "filename", "marketing_strategy.pptx", null, 1);

             #endregion

         }


         [Test, Description("Verify a message with calendar as attachment is migrated correctly")]
         public void Message_Content09()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject11";
             string body = "calendar attachment";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @") </query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

             account.selectSOAP(m, "//mail:content", null, null, out content, 1);

             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");
             //Check if the callendar content is inserted into body of the message
             string body1 = "ma2-Folder1 Calendar";
             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Callendar content in the body of the email is migrated successfully");
             else
                 ZAssert.That(false, "Callendar content in the body of the email is NOT migrated successfully");
             
             
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "text/calendar", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "ma2-Folder1 Calendar.ics", null, 1);

             #endregion

         }

         [Test, Description("Verify a message with inline attachment is migrated correctly")]
         [Bug ("75919")]
         public void Message_Content10()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

             #region Test Case variables
             string subject = "subject9";
             string body = "content9";
             string content;
             string messageid = null;
             #endregion

             #region SOAP Block


             ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



             // Search for the message ID
             account.sendSOAP(
                         "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                 + "<query>subject:(" + subject + @") </query>"
                 + "</SearchRequest>");

             account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


             // Get the message
             account.sendSOAP(
                         "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + messageid + "'/>"
                 + "</GetMsgRequest>");

             XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);

             account.selectSOAP(m, "//mail:content", null, null, out content, 1);

             if (content.ToLower().Contains(body.ToLower()))

                 ZAssert.That(true, "Content of the email is migrated successfully");
             else
                 ZAssert.That(false, "Content of the email is NOT migrated successfully");

             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "image/png", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "zimbra_notes.png", null, 1);
             //Make sure outlook attachment contains pptx attachment.
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "image/jpeg", null, 1);
             account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "Tulips.jpeg", null, 1);

             #endregion

         }


    }
}
