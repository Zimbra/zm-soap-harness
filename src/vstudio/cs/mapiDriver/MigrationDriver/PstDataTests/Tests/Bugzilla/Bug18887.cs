using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Bugzilla
{
    public class Bug18887 : BaseTestFixture
    {
        public Bug18887()
        {
         
            this.PstFilename = "/Bugzilla/18887.pst";
            
        }

        [Test, Description("Verify that authentication succeeds.")]
        [TestSteps(
            "1. Create a new domain and a user in it.",
		    "2. use the PST Import tool to import the PST file.",
		    "3. Verify that while importing no error is given due to domain name.")]
        public void Bug18887_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug18887_01");

            #region Testcase variables
            string subject = "Microsoft Office Outlook Test Message";
            string from = "user17@testdomain.com";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query> from:(" + from + ") in:" + Harness.GlobalProperties.getProperty("globals.inbox") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m/mail:su", null, subject, null, 1);



        }

    }
}