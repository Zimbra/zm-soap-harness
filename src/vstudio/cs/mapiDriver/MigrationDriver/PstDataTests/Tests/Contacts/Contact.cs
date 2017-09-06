using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Contacts
{
    public class Contact : BaseTestFixture
    {
        public Contact()
        {
            this.PstFilename = "/general/contacts/contact.pst";
        }

        [Test, Description ("Verify that contacts are imported")]
        [TestSteps("1. Create few contacts and export it to PST",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP the firstname, lastname and email of contact are imported")]
        public void Contact01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Contact01");

            #region Testcase variables
            string firstname = "First1";
            string lastname = "Last1";
            string email = "email01@01.com";
            #endregion


            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<a n='firstName'/>"
                 + "<a n='lastName'/>"
                 + "<a n='email'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='email']", null, email, null, 1);
        }

        [Test, Description("Verify that all fields of the contact are imported")]
        [TestSteps("1. Create a contact with all fields",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP if all fields are imported")]
        public void Contact02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Contact02");

            #region Testcase Variables
            string contactId = null;
            #endregion


            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
				+ "<a n='firstName'/>"
                 + "<a n='lastName'/>"
                 + "<a n='email'/>"
              + "</GetContactsRequest>");

            TargetAccount.selectSOAP("//mail:GetContactsResponse/mail:cn[@fileAsStr='Last2, First2']", "id", null, out contactId, 1);

            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
				+ "<cn id='" + contactId   + "'/>"
			   + "</GetContactsRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, "First2", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='lastName']", null, "Last2", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='email']", null, "email02@02.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='company']", null, "Company2", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workFax']", null, "3333333333", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='middleName']", null, "Middle2", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='jobTitle']", null, "Job2", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPhone']", null, "1111111111", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='homePhone']", null, "2222222222", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workStreet']", null, "street2", null, 1);
	        TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workCountry']", null, "India", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workURL']", null, "http://www.zimbra.com", null, 1);
        }

        [Test, Description("Verify that DL is imported as group and contains all the members")]
        [TestSteps("1. Create a distribution list",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP if DL is imported as group and contains all the members")]
        public void Contact03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Contact03");

            #region Testcase Variables
            string dlId = null;
            #endregion


            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
              + "</GetContactsRequest>");

            TargetAccount.selectSOAP("//mail:GetContactsResponse/mail:cn[@fileAsStr='DL1']", "id", null, out dlId, 1);

            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
				+ "<cn id='" + dlId + "'/>"
			  + "</GetContactsRequest>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='dlist']", null, "First2 Middle2 Last2 <email02@02.com>,First3 Last3 <email03@03.com>,First4 Middle4 Last4 <email04@04.com>,First5 Middle5 Last5 <email05@05.com>", null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='type']", null, "group",null, 1);

        }

    }
}
