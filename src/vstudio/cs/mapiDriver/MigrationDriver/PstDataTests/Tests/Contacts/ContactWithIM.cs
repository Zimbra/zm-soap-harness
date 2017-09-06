using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Contacts
{
    public class ContactWithIM : BaseTestFixture
    {
        public ContactWithIM()
        {
            this.PstFilename = "/general/contacts/IM_Contact.pst";
        }

        [Test, Description("Verify that IM address field of contact is getting migrated")]
        [TestSteps("1. Create a contacts having IM address in it and export it to PST.",
                    "2. use the PST Import tool to import the PST file.",
                    "3. Verify using SOAP the firstname, lastname, IM address and email of contact are imported.")]
        public void ContactWithIM01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case ContactWithIM01");

            #region Testcase Variables
            string contactId = null;
            string firstName = "Test";
            string lastName = "user";
            string email = "testuser@zimqa.com";
            string contactIm = "testuser_test@yahoo.com";
            #endregion


            TargetAccount.sendSOAP(
                 "<SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                    + "<query>in:contacts</query>"
                 + "</SearchRequest>");
  
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
        		    + "<cn id='" + contactId + "'/>"
   		          + "</GetContactsRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse/mail:cn", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='firstName']", null, firstName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='lastName']", null, lastName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='email']", null, email, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='imAddress1']", null, contactIm, null, 1);


        }

    }
}
