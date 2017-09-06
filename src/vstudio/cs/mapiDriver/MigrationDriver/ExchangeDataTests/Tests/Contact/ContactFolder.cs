using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Contact
{
    public class ContactFolder : BaseTestFixture
    {

        public ContactFolder()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }

        [Test, Description("Verify a contact in subfolder is migrated correctly")]
        public void Contact01_SubFolder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact3";
            string foldername = "Folder1";
            string contactId = null;
            string folderId;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderId, 1);


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
            TargetAccount.selectSOAP(m, "//mail:cn", "l", folderId, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact in sub-sub folder is migrated correctly")]
        public void Contact02_SubSubFolder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact2";
            string foldername = "Folder2";
            string contactId = null;
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderId, 1);


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
            TargetAccount.selectSOAP(m, "//mail:cn", "l", folderId, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact in Suggested Contacts folder is migrated correctly")]
        public void Contact03_SuggestedContactsFolder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact11";
            string foldername = "Suggested Contacts";
            string contactId = null;
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderId, 1);

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
            TargetAccount.selectSOAP(m, "//mail:cn", "l", folderId, null, 1);
            #endregion

        }

        [Test, Description("Verify a contactfolder with a backslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void Contact04_backslash()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "contact\\backslash";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a contactfolder with a forwardslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void Contact05_forwardslash()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "contact_forwardslash";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a contactfolder with a asterisk in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void Contact06_asterisk()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "contact*asterisk";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

    }
}