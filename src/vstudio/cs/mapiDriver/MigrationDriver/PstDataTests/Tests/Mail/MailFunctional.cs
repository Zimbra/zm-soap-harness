using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Mail
{
    public class MailFunctional : BaseTestFixture
    {
        public MailFunctional()
        {
            this.PstFilename = "/general/mailbox/functional_mail.pst";
        }

        [Test, Description("Verify whether the message with UTF-8 format is imported.")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check whether the message that was in UTF-8 format is exported")]
        public void MailFunctional01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailFunctional01");

            #region Testcase Variables
            string subject = "UTF-8 charset";
            string fragment = "hi this text is for UTF-8 charset.";
            #endregion 

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1' html='1'>"
                + "<query> subject:(" + subject + ")  in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
               + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:fr", null, fragment, null, 1);
        }

        [Test, Description("Verify whether message from trash are imported")]
        [TestSteps("1. Create a new account.", 
			"2. Use the PST Import tool to import the PST file.",
			"3. Authenticate into the account",
			"4. Search for the imported message",
			"5. Check whether messages in trash are imported")]
        
        public void MailFunctional02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailFunctional02");

            #region Testcase Variables
            string sender = "pstimport2@gmail.com";
            string subject = "Deleted1";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1'>"
                + "<query> from:(" + sender + ") in:" + Harness.GlobalProperties.getProperty("globals.trash") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);
        }

        [Test, Description("Verify whether messages with rich text are imported.")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check whether messages with rich text are imported")]

        public void MailFunctional03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailFunctional03");

            #region Testcase variables
            string subject = "RichText";
            string match = "multipart/alternative";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1'>"
                + "<query>subject:(" + subject + ") in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:mp", "ct", match, null, 1);
        }

        [Test, Description("Verify that mail with attachment is imported")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check whether mail with attachment is imported")]
        public void MailFunctional04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailFunctional04");

            #region Testcase variables
            string subject = "MIME format";
            string filename1 = "MIME";
            string filename2 = "Winter.jpg";
            string msgId = null;
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1'>"
                + "<query>subject:(" + subject + ") in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out msgId, 1);

            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + msgId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m/mail:mp", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", filename1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp/mail:mp/mail:mp", "filename", filename2, null, 1);

        }

        [Test, Description("Verify that message with ANSI character gets imported")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check whether ANSI characters get imported")]
        public void MailFunctional05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case MailFunctional05");

            #region Testcase variables
            string subject = "ANSI Characters";
            string sender = "pstimport2@gmail.com";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message' fetch='1'>"
                + "<query>from:(" + sender + ") in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);

        }
    }
}