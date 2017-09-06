using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Mail.Bugs
{
    public class MailBugs : BaseTestFixture
    {
        private string DefaultDomain;

        public MailBugs()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Verify that subject of message containing japanese codepage content gets migrated correctly")]
        [Bug("81037")]
        public void Bug81037()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug70156");

            #region Test Case variables

            string subject = "RE: LA Work Scope";
            string messageId = null;

            #endregion

            #region SOAP Block

            //Search for the Message
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='message'>"
                + "<query>from: masaya</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);
            
            //Check message details
            TargetAccount.sendSOAP(
                        "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + messageId + "'/>"
                + "</GetMsgRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "su", subject, null, 1); //Verify that message has valid subject
            
            #endregion
        }
        
    }
}
