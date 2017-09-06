using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Basic
{
    public class ImportOne : BaseTestFixture
    {

        public ImportOne()
        {
            this.PstFilename = "/general/mailbox/mail1/mail_one.pst";
        }

        [Test, Description("Import a PST file with one mail")]
        [TestSteps("1. Create a new account.",
 	        "2. Use the PST Import tool to import the PST file.",
	        "3. Authenticate into the account",
	        "4. Search for the imported message",
	        "5. Check the message content: to, from, subject, fragment, content")]
        public void ImportOne01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case ImportOne01");
            #region Test Case variables

            string subject = "Microsoft Office Outlook Test Message";
            string messageid = null;
            
            #endregion

            #region SOAP Block


            // Search for the message ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                +           "<query> from:(user17@testdomain.com) in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                +       "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageid, 1);


            // Get the message
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                +           "<m id='"+ messageid +"'/>"
                +       "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageid + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='f']", "a", "user17@testdomain.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:su", null, subject, null, 1);
            
            #endregion

        }
    }

}
