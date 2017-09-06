using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Basic
{
    public class ImportEmpty : BaseTestFixture
    {

        public ImportEmpty()
        {
            this.PstFilename = "/general/mailbox/mail0/no_mails.pst";
        }

        [Test, Description("Import empty PST and check no mails are present in inbox")]
        [TestSteps("1. Create a new account", "2. Using PST Impot too, import the empty PST file to the account.", "3. Verify using SOAP that the inbox is empty.")]

        public void ImportEmpty01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            logger.Info("Starting test case ImportEmpty01");
            // Search Inbox and verify its empty
            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                +           "<query>in:" + GlobalProperties.getProperty("globals.inbox") + "</query>"
                +       "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse", null, null, null, 1);
                
        }

    }

}
