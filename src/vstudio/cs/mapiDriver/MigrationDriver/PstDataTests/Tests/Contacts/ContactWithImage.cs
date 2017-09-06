using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Contacts 
{
    public class ContactWithImage : BaseTestFixture
    {
        public ContactWithImage()
        {
            this.PstFilename = "/general/contacts/pstimport2_contacts.pst";
        }

        [Test, Description("Verify that Image field of contact is getting migrated")]
        [TestSteps("1. Create a contact having profile picture in it and export it to PST.",
                    "2. Use the PST Import tool to import the PST file.",
                    "3. Verify using SOAP the firstname, email, IM address, image and other contact fields")]
        public void TC1_ContactWithImage()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_ContactWithImage");

            #region Test Case variables

            string contactId = null;
            string firstName = "ContactWithImage";
            string email = "testemail@test.com";
            string contactIm = "testemail@yahoo.com";
            string jobTitle = "test job title";
            string company = "test company";
            string workCity = "test street, test city, test state, test postal code";
            string workState = "test country";
            string workCountry = "United States of America";
            string workURL = "www.test.com";
            string workPhone = "111-222-3333";
            string homePhone = "222-333-4444";
            string workFax = "333-444-5555";
            string mobilePhone = "444-555-6666";
            string notes = "Test notes\n";
            
            #endregion

            #region SOAP Block

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
            TargetAccount.selectSOAP(m, "//mail:a[@n='email']", null, email, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='imAddress1']", null, contactIm, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='image']", "filename", "lslib32.bin", null, 1); //Image field validation

            //Other contacts fields validation
            TargetAccount.selectSOAP(m, "//mail:a[@n='jobTitle']", null, jobTitle, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='company']", null, company, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='workCity']", null, workCity, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='workState']", null, workState, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='workCountry']", null, workCountry, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='workURL']", null, workURL, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='workPhone']", null, workPhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='homePhone']", null, homePhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='workFax']", null, workFax, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='mobilePhone']", null, mobilePhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='notes']", null, notes, null, 1);

            #endregion

        }
    }
}
