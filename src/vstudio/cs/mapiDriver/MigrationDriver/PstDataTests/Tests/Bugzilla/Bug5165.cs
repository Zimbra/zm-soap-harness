using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug5165 : BaseTestFixture
    {
        public Bug5165()
        {
            this.PstFilename = "/Bugzilla/5165.pst";
            TargetAccount.sendSOAP(
                "<CreateContactRequest xmlns='urn:zimbraMail'>"
                +"<cn>"
                +"<a n='lastName'>Amit</a>"
                +"<a n='email'>amit@yahoo.com</a>"
                +"</cn>"
                +"</CreateContactRequest>");

            TargetAccount.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, null, 1);

        }

        [Test, Description("Verify that Contacts already present can be modified")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
            "3. Verify using SOAP that migration does not modify existing contacts.")]
        public void Bug5165_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug5165_01");

            TargetAccount.sendSOAP(
                " <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                + "<query>Amit</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "rev", "2", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "rev", "5", null, 1);

        }

    }
}