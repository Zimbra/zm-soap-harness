using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;

using System.Xml;

namespace ExchangeDataTests.Mail
{
    public class MeetingResponse_Message : BaseTestFixture
    {
        public MeetingResponse_Message()
        {
        }

        [Test, Description("Verify a meeting invite message is migrated correctly")]
        public void MeetingResponse_Message01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "meeting11";
            string body = "Content11";
            string content;
            string messageid = null;
             string from = "ma2";
            string to = "ma1";
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
            
            account.selectSOAP(m, ("//mail:e[@d='" + from + "']"), "t", "f", null, 1);
            account.selectSOAP(m, ("//mail:e[@d='" + to + "']"), "t", "t", null, 1);
            account.selectSOAP(m, "//mail:mp[@ct='text/calendar']", null, null, null, 0);
            //ZAssert.IsNotNull(result, " Calendar part is not found in the migrated appointment invite message as Migration tool converts the invite to simple mail");
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            // etc., etc.
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");
            #endregion

        }

        [Test, Description("Verify a meeting 'accepted' message is migrated correctly")]
        public void MeetingResponse_Message02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "meeting4";
            string body = "Accepted";
            string content;
            string messageid = null;
            string from = "ma2";
            string to = "ma1";
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

            account.selectSOAP(m, ("//mail:e[@d='" + from + "']"), "t", "f", null, 1);
            account.selectSOAP(m, ("//mail:e[@d='" + to + "']"), "t", "t", null, 1);
            account.selectSOAP(m, "//mail:mp[@ct='text/calendar']", null, null, null, 0);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            // etc., etc.
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");

            XmlNode result = account.selectSOAP(m, "//mail:mp", "ct", "text/calendar", null, 1);
            #endregion

        }
    }
}
