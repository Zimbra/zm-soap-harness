using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Mail
{
    public class BasicMessages : BaseTestFixture
    {

        public BasicMessages()
        {
        }

        [Test, Description("Verify a basic message is migrated correctly")]
        public void BasicMessage01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject1";
            string body = "Body1";
            string content;
            string messageid = null;
            #endregion

            #region SOAP Block

            
            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));


            
            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                +       "<query>subject:(" + subject + @")</query>"
                +       "</SearchRequest>");

            account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                +           "<m id='"+ messageid +"'/>"
                +       "</GetMsgRequest>");

            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            // etc., etc.
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");
            #endregion

        }


        [Test, Description("Verify a basic message with user in TO field is migrated correctly")]
        public void BasicMessage07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject1";
            string body = "Body1";
            string content;
            string from = "ma2";
            string to = "ma1";
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
            account.selectSOAP(m, "//mail:e[@t='f']", "d", from, null, 1);
            account.selectSOAP(m, ("//mail:e[@d='" + from + "']"), "t", "f", null, 1);

            // Verify the "TO" field
            account.selectSOAP(m, ("//mail:e[@d='" + to + "']"), "t", "t", null, 1);
           
            #endregion

        }

        [Test, Description("Verify a basic message with user in CC field is migrated correctly")]
        public void BasicMessage08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject9";
            string from = "ma2@zmexch.eng.vmware.com";
            string to = "ma3@zmexch.eng.vmware.com";
            string cc = "ma1@zmexch.eng.vmware.com";
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
            account.selectSOAP(m, "//mail:e[@t='f']", "a", from, null, 1);
            account.selectSOAP(m, "//mail:e[@t='t']", "a", to, null, 1);
            account.selectSOAP(m, "//mail:e[@t='c']", "a", cc, null, 1);

            
            #endregion

        }
        
        [Test, Description("Verify a basic message in Sent folder with user in Bcc field is migrated correctly")]
        public void BasicMessage09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject13545170792044";
            string body = "content13545170792044";
            string content;
            string from = "ma1@zmexch.eng.vmware.com";
            string to = "ma3@zmexch.eng.vmware.com";
            string bcc = "ma2@zmexch.eng.vmware.com";
            
            string messageid = null;
            #endregion

            #region SOAP Block


            ZAccount account = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));



            // Search for the message ID
            account.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>subject:(" + subject + @") in:sent</query>"
                + "</SearchRequest>");

            account.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            account.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = account.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            account.selectSOAP(m, "//mail:content", null, null, out content, 1);
            account.selectSOAP(m, "//mail:e[@t='f']", "a", from, null, 1);
            account.selectSOAP(m, "//mail:e[@t='t']", "a", to, null, 1);
            account.selectSOAP(m, "//mail:e[@t='b']", "a", bcc, null, 1);


            #endregion

        }

        [Test, Description("Verify a mail with follow-up flag is migrated correctly")]
        public void BasciMessage02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject1";
           // string body = "Body1";
            //string content;
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
            account.selectSOAP(m, "//mail:m", "f", "f", null, 1);
            #endregion

        }

        [Test, Description("Verify a mail with “Completed” follow-up flag is migrated and no flag is found")]
        public void BasicMessage03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject9";
           
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
            account.selectSOAP(m, "//mail:m[f='f']", null, null, null, 0);
            
          
           
            #endregion

        }

        [Test, Description("Verify a message with category is migrated correctly")]
        public void BasicMessage04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject2";
            string category = "category104";
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
            
            account.selectSOAP(m, "//mail:m", "tn", category, null, 1);

            #endregion

        }


        [Test, Description("Verify a message whose category is untagged is migrated correctly")]
        public void BasicMessage10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject13";
            //string category = "category104";
            //string content;
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

            account.selectSOAP(m, "//mail:m", "tn", null, null, 0);

            #endregion

        }
        [Test, Description("Verify a basic message with LOW priority is migrated correctly")]
        public void BasicMessage05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject11";
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
            string flags;
            account.selectSOAP(m, "//mail:m", "f", null, out flags, 1);
            
            if (flags.Contains("?"))

                ZAssert.That(true, "Low priority status of the email is migrated successfully");
            else
                ZAssert.That(false, "Low priority status of the email is NOT migrated successfully");
            #endregion

        }

        [Test, Description("Verify a basic message with NORMAL priorityis migrated correctly")]
        public void BasicMessage13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject1";
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
            
            XmlNodeList list =account.select(m, "//mail:m");
            
            string flag;
            int i = 0;
            
           
            
            if (list.Count > 0 && i <= list.Count)
            {
                XmlAttribute flagAttr=list[i].Attributes["f"];
                //mail with normal priority has to have:
                //1. no f attribute
                //2. f exists but does not contain ? nor +
                if (flagAttr ==null || flagAttr.InnerText.Equals(""))
                {
                    ZAssert.That(true, "Normal priority status of the email is migrated successfully");
                }
                else
                {
                    if (!(flagAttr.InnerText.Contains("?") || flagAttr.InnerText.Contains("+")))
                        Assert.That(true, "Normal priority status of the email is migrated successfully");
                    else
                        ZAssert.That(false, "Normal priority status of the email is NOT migrated successfully");
                }
                i++;
            }
            
            //if (!(flags.Contains("?") || flags.Contains("+")))

            //    ZAssert.That(true, "Normal priority status of the email is migrated successfully");
            //else
            //    ZAssert.That(false, "Normal priority status of the email is NOT migrated successfully");
            #endregion

        }

           [Test, Description("Verify a basic message with HIGH priority is migrated correctly")]
        public void BasicMessage06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject10";
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
            string flags;
            account.selectSOAP(m, "//mail:m", "f", null, out flags, 1);
            //// etc., etc.
            if (flags.Contains("!"))

                ZAssert.That(true, "High riority status of the email is migrated successfully");
            else
                ZAssert.That(false, "High priority status of the email is NOT migrated successfully");
            #endregion

        }

        [Test, Description("Verify a message with REPLIED status is migrated correctly")]
        public void BasicMessage11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject13491262941928";
            string body = "content13491262941928";
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
            account.selectSOAP(m, "//mail:m", "f", "r", null, 1);
            // etc., etc.
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");

            
            #endregion

        }


        [Test, Description("Verify a message with FORWARD status is migrated correctly")]
        public void BasicMessage12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "subject13491259641802";
            string body = "content13491259641802";
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
            account.selectSOAP(m, "//mail:m", "f", "w", null, 1);
            // etc., etc.
            if (content.ToLower().Contains(body.ToLower()))

                ZAssert.That(true, "Content of the email is migrated successfully");
            else
                ZAssert.That(false, "Content of the email is NOT migrated successfully");
            #endregion

        }
    }
}
