using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Contact
{
    public class GetContact : BaseTestFixture
    {

        public GetContact()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }

        [Test, Description("Verify a basic contact is migrated correctly")]
        public void GetContact01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact16";
            string lastname = "lastname";
            string emailaddress = "contact16@testdomain.com";
            string contactId = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      +  "<query>"+ firstname +@"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with display name is migrated correctly")]
        public void GetContact02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact12";
            string emailaddress = "ma2@zmexch.eng.vmware.com";
            string contactId = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with category is migrated correctly")]
        public void GetContact03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact5";
            string category = "category100";
            string categoryId = null;
            string contactId = null;
            #endregion

            #region SOAP Block

            //Search for Tag ID
            TargetAccount.sendSOAP(
                "<GetTagRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:GetTagResponse/mail:tag[@name='" + category + "']", "id", null, out categoryId, 1);

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='tags']", null, categoryId, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with birthdate is migrated correctly")]
        public void GetContact04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact15";
            string contactId = null;
            string birthday = "1980-08-23";
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='birthday']", null, birthday, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with anniversary is migrated correctly")]
        public void GetContact05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact15";
            string contactId = null;
            string anniversary = "2012-08-21";
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='anniversary']", null, anniversary, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with text notes is migrated correctly")]
        public void GetContact06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact11";
            string notes = "Simple contact with email, phone number and text notes and category100";
            string contactId = null;
            string text = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='notes']", null, null, out text, 1);
            ZAssert.IsTrue((text.ToLower()).Contains((notes.ToLower())), "notes are migrated successfully");
            #endregion

        }

        [Test, Description("Verify a contact with emailaddress is migrated correctly")]
        public void GetContact07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact12";
            string emailaddress = "ma2@zmexch.eng.vmware.com";
            string contactId = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with phone number is migrated correctly")]
        public void GetContact08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact7";
            string workphone = "14084565634";
            string contactId = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPhone']", null, workphone, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with mailing address is migrated correctly")]
        public void GetContact09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact5";
            string lastname = "contact5";
            string workPostalCode = "94053";
            string workCity = "palo alto";
            string workCountry = "United States of America";
            string workStreet = "3100, hillview ave";
            string notes = "Contact with address and category “category100”";
            string contactId = null;
            string text = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPostalCode']", null, workPostalCode, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workCity']", null, workCity, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workCountry']", null, workCountry, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workStreet']", null, workStreet, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='notes']", null, null, out text, 1);
            ZAssert.IsTrue((text.ToLower()).Contains((notes.ToLower())), "notes are migrated successfully");
            #endregion

        }

        [Test, Description("Verify a contact with all details is migrated correctly")]
        public void GetContact10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "Contact14";
            string emailaddress = "ma3@zmexch.eng.vmware.com";
            string lastname = "Contact14";
            string workPostalCode = "94533";
            string workCity = "PA";
            string workCountry = "United States of America";
            string workStreet = "3432 Hillview ave";
            string notes = "Simple note";
            string fileAsStr = "Contact14, Contact14";
            string nameSuffix = "I";
            string homePhone = "1-408-231-1245";
            string imAddress1 = "abc@yahoo.com";
            string mobilePhone = "1-650-343-2311";
            string company = "zzz inc";
            string workURL = "xyz.com";
            string workState = "ca";
            string workPhone = "1-408-343-2641";
            string namePrefix = "Mr.";
            string jobTitle = "product manager";
            string contactId = null;
            string text = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn", "fileAsStr", fileAsStr, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPostalCode']", null, workPostalCode, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workCity']", null, workCity, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workCountry']", null, workCountry, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workStreet']", null, workStreet, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='nameSuffix']", null, nameSuffix, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='homePhone']", null, homePhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='imAddress1']", null, imAddress1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='mobilePhone']", null, mobilePhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='company']", null, company, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workURL']", null, workURL, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workState']", null, workState, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPhone']", null, workPhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='namePrefix']", null, namePrefix, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='jobTitle']", null, jobTitle, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='notes']", null, null, out text, 1);
            ZAssert.IsTrue((text.ToLower()).Contains((notes.ToLower())), "notes are migrated successfully");
            #endregion

        }

        [Test, Description("Verify that a contact with all the fields in outlook is migrated correctly")]
        [Bug("80959")]
        public void GetContact11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact17";
            string birthday = "2010-08-12";     
            string nameSuffix = "Sr.";
            string workCity = "Business City.";
            string otherPhone = "other phone";
            string homePhone = "02030493146";
            string homeFax = "Home Fax";
            string workURL = "www.webpage.com";
            string workFax = "02030418769";
            string workPhone = "02060456789"; 
            string workState = "Business State";
            string fileAs = "1";
            string namePrefix = "Mr.";
            string jobTitle = "Job title";
            string pager = "pager";
            string lastName = "lastname";
            string callbackPhone = "call back";
            string carPhone = "Car Phone";
            string custome = "custom";
            string workCountry = "India"; 
            string otherFax = "other fax";
            string imAddress1 = "contact17_im";
            string workPostalCode = "411032";
            string mobilePhone = "1-650-343-2311";
            string email = "email@email.com";
            string company = "Company";
            string homePhone2 = "home phone 2";
            string workStreet = "Business Address, \nBusiness Street,";
            string primaryPhone = "primary phone";
            string contactId = null;
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + firstname + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + contactId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='birthday']", null, birthday, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='nameSuffix']", null, nameSuffix, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workCity']", null, workCity, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='otherPhone']", null, otherPhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='homePhone']", null, homePhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='homeFax']", null, homeFax, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workURL']", null, workURL, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workFax']", null, workFax, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPhone']", null, workPhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workState']", null, workState, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='fileAs']", null, fileAs, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='namePrefix']", null, namePrefix, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='jobTitle']", null, jobTitle, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='pager']", null, pager, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='lastName']", null, lastName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='callbackPhone']", null, callbackPhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='carPhone']", null, carPhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='custome']", null, custome, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workCountry']", null, workCountry, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='otherFax']", null, otherFax, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='imAddress1']", null, imAddress1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPostalCode']", null, workPostalCode, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='mobilePhone']", null, mobilePhone, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='email']", null, email, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='company']", null, company, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='homePhone2']", null, homePhone2, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workStreet']", null, workStreet, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='workPhone3']", null, primaryPhone, null, 1);

            #endregion

        }

    }
}

 