using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug7831 : BaseTestFixture
    {
        public Bug7831()
        {
            this.PstFilename = "/Bugzilla/7831.pst";
        }

        [Test, Description("Verify that the To: field is correct in:Sent when PST file account does NOT match Zimbra account.")]
        [TestSteps(
            "1. Create a new account",
            "2. Use the PST Import tool to import the PST file.",
           "3. Verify using SOAP that PST is imported without errors and shows proper to: field in sent folder")]
        public void Bug7831_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug7831_01");

            #region Testcase variables
            string to1 = "pc04@testdomain.com";
            string to2 = "pc05@testdomain.com";
            string to3 = "pc06@testdomain.com";
            string subject2 = "To pc04";
            string subject3 = "To pc05";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='conversation' recip='1'>"
                + "<query>in:" + Harness.GlobalProperties.getProperty("globals.sent") + "</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:c[1]", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "a", to1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "a", to2, null, 1);
            TargetAccount.selectSOAP(m, "//mail:e[@t='t']", "a", to3, null, 1);

            XmlNode m1 = TargetAccount.selectSOAP("//mail:SearchResponse/mail:c[2]", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:e[@t='t']", "a", to1, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:su", null, subject2, null, 1);

            XmlNode m2 = TargetAccount.selectSOAP("//mail:SearchResponse/mail:c[3]", null, null, null, 1);
            TargetAccount.selectSOAP(m2, "//mail:e[@t='t']", "a", to2, null, 1);
            TargetAccount.selectSOAP(m2, "//mail:su", null, subject3, null, 1);
            
        }

    }
}