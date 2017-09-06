using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Mail
{
    public class MailPriorityTag : BaseTestFixture
    {
        public MailPriorityTag()
        {
            this.PstFilename = "/general/mailbox/pstimport2_inbox.pst";
        }

        [Test, Description("Import a PST file having normal priority message")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the message content: from, subject, fragment, priority flag")]
        public void TC1_NormalPriorityMsg()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_NormalPriorityMsg");

            #region Test Case variables

            string subject = "Normal priority message";
            string fragment = "This message has normal priority/importance";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='f']", "d", "pstimport1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "f", null, null, 0);

            #endregion

        }

        [Test, Description("Import a PST file having low priority message")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the message content: from, subject, fragment, priority flag")]
        public void TC2_LowPriorityMsg()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_LowPriorityMsg");

            #region Test Case variables

            string subject = "Low priority message";
            string fragment = "This message has low priority/importance";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='f']", "d", "pstimport1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "f", "u?", null, 1);

            #endregion
        }

        [Test, Description("Import a PST file having high priority message")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the message content: from, subject, fragment, priority flag")]
        public void TC3_HighPriorityMsg()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_HighPriorityMsg");

            #region Test Case variables

            string subject = "High priority message";
            string fragment = "This message has high priority/importance";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='f']", "d", "pstimport1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "f", "u!", null, 1);

            #endregion
        }

        [Test, Description("Import a PST file having message recipients in To, CC and Bcc fields")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the message content: from, subject, fragment, to, cc and bcc")]
        public void TC4_CheckToCcandBcc()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_CheckToCcandBcc");

            #region Test Case variables

            string subject = "To, CC and BCC message";
            string fragment = "This message has recipients in To, CC and BCC fields To: pstimport3 CC: pstimport4 BCC: pstimpor2";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1); //If we find message then Bcc check is pass as original message was sent to source account keeping in Bcc

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='f']", "d", "pstimport1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "d", "pstimport3", null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='c']", "d", "pstimport4", null, 1);

            #endregion
        }

        [Test, Description("Import a PST file having tagged message")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the message content: from, subject, fragment, tag name")]
        public void TC5_CheckTag()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_CheckTag");

            #region Test Case variables

            string subject = "Tag this message";
            string fragment = "Message after received by pstimport2 will be tagged/categorized with \"Blue Category\" tag.";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='f']", "d", "pstimport1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "tn", "Blue Category", null, 1);

            #endregion
        }
    }
}