using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;


namespace ExchangeDataTests.Mail.Drafts
{
    public class BasicMessages : BaseTestFixture
    {
        public BasicMessages()
        {
        }


        [Test, Description("Verify a basic message in Drafts folder is migrated correctly")]
        public void BasicMessage01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject12";
            string body = "Draft";
            string content;
            string messageid = null;
            #endregion

            #region SOAP Block


            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") in:Drafts</query>"
                + "</SearchRequest>");

            account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            account.selectSOAP(m, ("//mail:e[@t='f']"), null, null, null, 0);
            account.selectSOAP(m, ("//mail:e[@t='t']"), null,null, null, 0);
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");
            #endregion

        }


        [Test, Description("Verify a basic message with blank subject in Drafts folder is migrated correctly")]
        public void BasicMessage02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            
            string messageid = null;
            #endregion

            #region SOAP Block


            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>content:7.2.0_GA_2634.NETWORK.20120313211714 in:Drafts</query>"
                + "</SearchRequest>");

            account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            account.selectSOAP(m, "//mail:su", null, null, null, 0);
            account.selectSOAP(m, ("//mail:e[@t='f']"), null, null, null, 0);
            account.selectSOAP(m, ("//mail:e[@t='t']"), null, null, null, 0);

            #endregion
        }

        [Test, Description("Verify a basic message > 2MB size is migrated correctly")]
        public void BasicMessage03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject13471902531960";
            string messageid = "";
            string content = "";
            string body = "Content13471902531960";
            string sub = "";
            #endregion

            #region SOAP Block


            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>size:(>2MB) in:Drafts</query>"
                + "</SearchRequest>");

            account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            account.selectSOAP(m, "//mail:su", null, null, out sub, 1);
            

            if (sub.ToLower().Contains(subject.ToLower()))

                ZAssert.That(true, "Subject of the email is migrated successfully");
            else
                ZAssert.That(false, "Subject of the email is NOT migrated successfully");
            account.selectSOAP(m, ("//mail:e[@t='f']"), null, null, null, 0);
            account.selectSOAP(m, ("//mail:e[@t='t']"), null, null, null, 0);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);

            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");


            account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "image/jpeg", null, 1);
            account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "Jellyfish.jpg", null, 1);
            //Make sure outlook attachment contains pptx attachment.
            account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "image/jpeg", null, 1);
            account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "Lighthouse.jpg", null, 1);
            account.selectSOAP(m, "//mail:mp[@cd='attachment']", "ct", "application/vnd.openxmlformats-officedocument.presentationml.presentation", null, 1);
            account.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "marketing_strategy.pptx", null, 1);
            
            #endregion
        }

    }
}
