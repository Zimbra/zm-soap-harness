using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Contact
{
    public class ContactWithAttachment : BaseTestFixture
    {
        public ContactWithAttachment()
        {
            this.PstFilename = "/general/contacts/contact_attachment.pst";
        }

        [Test, Description("Verify a contact with .jpeg attachment is migrated correctly")]
        [Bug("71569")]
        public void Contact01_jpeg()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact10";
            string attachmentName = "Forest Flowers.jpg";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachmentName, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with inserted image is migrated correctly")]
        //As its an inline image verifying name is not possible so just verifying that the content type is correct and image does exist.
        public void Contact02_inline_image()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact13";
            string type = "image/jpeg";
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
            TargetAccount.selectSOAP(m, "//mail:a[@n='firstName']", null, firstname, null, 1);
            TargetAccount.selectSOAP(m, "//mail:a[@n='image']", "ct", type, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with .docx attachment is migrated correctly")]
        [Bug("71569")]
        public void Contact03_docx()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact4";
            string attachmentName = "migration_items_list.docx";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachmentName, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with .xlsx attachment is migrated correctly")]
        [Bug("71569")]
        public void Contact04_xlsx()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact6";
            string attachmentName = "Book1.xlsx";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachmentName, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with .pptx attachment is migrated correctly")]
        [Bug("71569")]
        public void Contact05_pptx()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact7";
            string attachmentName = "marketing_strategy.pptx";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachmentName, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with .png attachment is migrated correctly")]
        [Bug("71569")]
        public void Contact06_png()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact8";
            string attachmentName = "octopus_dotx_preview.png";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachmentName, null, 1);
            #endregion

        }

        [Test, Description("Verify a contact with .pdf attachment is migrated correctly")]
        [Bug("71569")]
        public void Contact07_pdf()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "contact9";
            string attachmentName = "SecurIDToken_release_notes.pdf";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachmentName, null, 1);
            #endregion

        }

    }
}

