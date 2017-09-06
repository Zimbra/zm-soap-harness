using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Contacts
{
    public class BlankContacts : BaseTestFixture
    {
        public BlankContacts()
        {
            this.PstFilename = "/general/contacts/Blank_contact/5blankContact.pst";
        }

        [Test, Description("Import a PST file with empty contacts in it.")]
        [TestSteps("1. Create a new account",
 	                "2. use the PST Import tool to import the PST file with blank contacts.",
                    "3. Verify using soap that the contacts first and last name is empty")]
        public void BlankContacts01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case BlankContacts01");

            TargetAccount.sendSOAP(
               "<SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                + "<query>in:" + GlobalProperties.getProperty("globals.contacts") + "</query>"
                + "</SearchRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "fileAsStr", "", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='email']", null, "Contact-1.6@a.com", null, 1);
            
        }
    }
}
