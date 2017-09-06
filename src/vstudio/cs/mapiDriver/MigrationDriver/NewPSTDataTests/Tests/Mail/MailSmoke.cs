using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Mail
{
    public class MailSmoke : BaseTestFixture
    {
        public MailSmoke()
        {
            this.PstFilename = "/general/mailbox/smoke_mail.pst";
        }


        [Test, Description("Verify message content like date, fragment, from, subject")]
        [TestSteps("1. Create a new account.",
                "2. Use the PST Import tool to import the PST file.",
                "3. Authenticate into the account",
                "4. Search for the imported message",
                "5. Check the message content: date, to, from, subject, fragment, content and is HTML")]
        public void MailSmoke01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailSmoke01");

            #region Testcase Variables
            string subject = "testmail2";
            string fragment = "this is test mail sent to check the smoke tests i.e after importing check the to, from, subject date and content fields.";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1' html='1'>"
               + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
               + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='f']", "a", "pstimport2@gmail.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "a", "pstimport1@gmail.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:fr", null, fragment, null, 1);
        }

        [Test, Description("Verify if imported message contains CC field")]
        [TestSteps(
            "1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check whether imported message contains CC")]
        public void MailSmoke02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailSmoke02");

            #region Testcase Variables
            string subject = "subject3";
            string fragment = "this is test mail to test cc and bcc of a mail gets imported";
            string ccvalue = "pstimport2@gmail.com";
            #endregion

            TargetAccount.sendSOAP(
                            "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1' html='1'>"
                           + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                           + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='f']", "a", "pstimport2@gmail.com", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='t']", "a", "pstimport1@gmail.com", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='c']", "a", ccvalue, null, 1);

        }

        [Test, Description("Verify if imported message is unread")]
        [TestSteps(
            "1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check whether imported message is unread")]
        public void MailSmoke03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailSmoke03");

            #region Testcase Variables
            string subject = "subject4";
            string fragment = "this is test mail to check the unread mail gets imported.";
            #endregion

            TargetAccount.sendSOAP(
                            "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1' html='1'>"
                           + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                           + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='f']", "a", "pstimport2@gmail.com", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='t']", "a", "pstimport1@gmail.com", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "f", "u", null, 1);

        }

        [Test, Description("Verify if imported message is plain text")]
        [TestSteps(
            "1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check whether imported message is plain text")]
        public void MailSmoke04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailSmoke04");

            #region Testcase Variables
            string subject = "subject5";
            string fragment = "this is test mail to check whether the mail with plain text gets imported.";
            string content;
            #endregion

            TargetAccount.sendSOAP(
                            "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1' html='1'>"
                           + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                           + "</SearchRequest>");
            
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='f']", "a", "pstimport2@gmail.com", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e[@t='t']", "a", "pstimport1@gmail.com", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:mp/mail:mp", "ct", "text/plain", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:mp/mail:mp[2]/mail:content", null, null, out content, 1);

            ZAssert.IsFalse(content.Contains("face"), "Verify that content of the appointment has plain text");
    
        }

        [Test, Description("Verify if imported message has to and from field in sent folder.")]
        [TestSteps(
            "1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
           "5. Check whether the sent item is imported and has correct to and from fields.")]
        public void MailSmoke05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailSmoke05");

            #region Testcase Variables
            string subject = "subject123";
            string tofield = "pstimport1@gmail.com";
            string fromfield = "pstimport1@gmail.com";
            #endregion

            TargetAccount.sendSOAP(
                            "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1' html='1'>"
                           + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.sent") + "</query>"
                           + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e", "a", tofield, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:e", "a", fromfield, null, 1);

        }
    }
}