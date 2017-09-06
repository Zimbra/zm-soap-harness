using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.OOO
{
    public class OutOfOffice : BaseTestFixture
    {
        private string DefaultDomain;

        public OutOfOffice()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            this.TargetAccount = ZAccount.GetAccount("zma6", DefaultDomain);
        }

        [Test, Description("Verify Out of office configuration is migrated correctly")]
        public void TC1_OutOfOffice()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_OutOfOffice");

            #region Test Case variables
            DateTime startTimeLocal = new DateTime(2015, 1, 1, 0, 0, 0);
            DateTime endTimeLocal = new DateTime(2015, 1, 2, 0, 0, 0);
            string oooReply = "I will be out of office on 1-Jan-2015.";
            
            #endregion

            #region SOAP Block

            // GetAccount Request
            ZAccountAdmin.GlobalAdminAccount.sendSOAP(
                        "<GetAccountRequest xmlns='urn:zimbraAdmin'>"
                + "<account by='name'>" + this.TargetAccount.emailAddress + "</account>"
                + "</GetAccountRequest>");

            ZAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:a[@n='zimbraPrefOutOfOfficeReplyEnabled']", null, "TRUE", null, 1);
            ZAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:a[@n='zimbraPrefOutOfOfficeReply']", null, oooReply, null, 1);
            
            #endregion

        }
    }
}