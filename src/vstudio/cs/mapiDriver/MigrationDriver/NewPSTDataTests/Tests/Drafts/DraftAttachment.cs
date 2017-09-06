using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Drafts
{
    public class DraftAttachment : BaseTestFixture
    {
        public DraftAttachment()
        {
            this.PstFilename = "/general/drafts/pstimport2_drafts.pst";
        }

        [Test, Description("Import a PST file having draft with no attachment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the draft content: to, subject, fragment, draft flag")]
        public void TC1_DraftWithNoAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_DraftWithNoAttachment");

            #region Test Case variables

            string subject = "Simple draft";
            string fragment = "This message is being drafted.";
            string to = "pstimport1";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.drafts") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "d", to, null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "f", "d", null, 1);

            #endregion

        }

        [Test, Description("Import a PST file having draft with text attachment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the draft content: to, subject, fragment, draft flag, attachment")]
        public void TC2_DraftWithTxtAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_DraftWithTxtAttachment");

            #region Test Case variables

            string subject = "Draft having text attachment";
            string fragment = "This message is being drafted and has one text attachment";
            string to = "pstimport1";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.drafts") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "d", to, null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "f", "ad", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "pstinfo.txt", null, 1);

            #endregion

        }

        [Test, Description("Import a PST file having draft with jpg attachment")]
        [TestSteps("1. Create a new account.",
            "2. Use the PST Import tool to import the PST file.",
            "3. Authenticate into the account",
            "4. Search for the imported message",
            "5. Check the draft content: to, subject, fragment, draft flag, attachment")]
        public void TC3_DraftWithJpgAttachment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_DraftWithJpgAttachment");

            #region Test Case variables

            string subject = "Draft having jpg attachment";
            string fragment = "This message is being drafted and has one jpg attachment";
            string to = "pstimport1";
            string messageid = null;

            #endregion

            #region SOAP Block

            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> subject:(" + subject + ") in:" + GlobalProperties.getProperty("globals.drafts") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);

            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageid + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "d", to, null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            TargetAccount.selectSOAP(m, "mail:fr", null, fragment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "f", "ad", null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp[@cd='attachment']", "filename", "Forest Flowers.jpg", null, 1);

            #endregion

        }
    }
}