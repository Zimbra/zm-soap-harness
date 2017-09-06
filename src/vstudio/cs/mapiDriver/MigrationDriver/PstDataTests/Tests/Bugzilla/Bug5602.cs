using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5602 : BaseTestFixture
    {
        public Bug5602()
        {
            this.PstFilename = "/Bugzilla/5602.pst";
        }

        [Test, Description("Verify that PST is imported without errors.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
           "3. Verify using SOAP that PST is imported without errors.")]
        public void Bug5602_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5602_01");

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse", null, null, null, 1);

        }

    }
}