using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Mail
{
    public class Message_Tracking : BaseTestFixture
    {
        public Message_Tracking()
        {
        }

        [Test, Description("Verify a Delivary message is migrated correctly")]
        public void Message_Tracking01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "Subject14";
            string fullSubject="Delivered: Subject14";
            string body = "Your message has been delivered";
            string content;
            string messageid = null;
            #endregion

            #region SOAP Block


            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") in:inbox content:delivered</query>"
                + "</SearchRequest>");


            XmlNode result = account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");
            string sub;
            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            account.selectSOAP(m, "//mail:su", null, null, out sub, 1);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);

            if (sub.ToLower().Contains(fullSubject.ToLower()))

                ZAssert.That(true, "Delivery email's subject is migrated successfully");
            else
                ZAssert.That(false, "Delivery email's subject is NOT migrated successfully");

            // etc., etc.
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Delivery email's content is migrated successfully");
            else
                ZAssert.That(false, "Delivery email's content is NOT migrated successfully");

            
           #endregion

        }

        [Test, Description("Verify a Read-Reciept message is migrated correctly")]
        public void Message_Tracking02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "Subject14";
            string fullSubject = "Read: Subject14";
            string body = "Your message was read";
            string content;
            string messageid = null;
            #endregion

            #region SOAP Block


            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") in:inbox content:read</query>"
                + "</SearchRequest>");


            XmlNode result = account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");
            string sub;
            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            account.selectSOAP(m, "//mail:su", null, null, out sub, 1);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);

            if (sub.ToLower().Contains(fullSubject.ToLower()))

                ZAssert.That(true, "Delivery email's subject is migrated successfully");
            else
                ZAssert.That(false, "Delivery email's subject is NOT migrated successfully");

            // etc., etc.
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Delivery email's content is migrated successfully");
            else
                ZAssert.That(false, "Delivery email's content is NOT migrated successfully");


            #endregion

        }
    }
}
