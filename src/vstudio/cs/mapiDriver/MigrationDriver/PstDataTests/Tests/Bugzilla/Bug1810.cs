using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug1810 : BaseTestFixture
    {
        public Bug1810()
        {
            this.PstFilename = "/general/tags/tags63.pst";
        }

        [Test, Description("Verify that tags are imported after pst migration.")]
        [TestSteps(
            "1. Create a new account",
 	        "2. Use the PST Import tool to import the PST file.",
	        "3. Verify using SOAP that the pst gets imported correctly.")]
        public void Bug1810_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug1810_01");

            #region Testcase variables

            #endregion

            TargetAccount.sendSOAP(
                "<GetTagRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetTagResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:tag", "id", "64", null, 1);
            TargetAccount.selectSOAP(m, "//mail:tag", "name", "67", null, 0);
        }

    }
}