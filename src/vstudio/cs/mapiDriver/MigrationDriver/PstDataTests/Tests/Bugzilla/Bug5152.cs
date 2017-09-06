using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5152 : BaseTestFixture
    {
        public Bug5152()
        {
            this.PstFilename = "/Bugzilla/5152.pst";
        }

        [Test, Description("Verify that migration does not halt for contacts..")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that migration does not halt for contacts.")]
        public void Bug5152_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5152_01");

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                + "<query>Contact-1.5</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", null, null, null, 1);

            TargetAccount.sendSOAP(
                 "<SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                 + "<query>Contact-1.10</query>"
                 + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", null, null, null, 1);



        }

    }
}