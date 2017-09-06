using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Contact
{
    public class GetDistList : BaseTestFixture
    {

        public GetDistList()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }

        [Test, Description("Verify a dl with one contact is migrated correctly")]
        [Bug("73326")]
        public void GetDistList01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = "dl3";
            string dlId = null;
            string email = "ma4 <ma4@zmexch.eng.vmware.com>";
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + dlName + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + dlId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email, null, 1);
            #endregion

        }

        [Test, Description("Verify a dl with two contacts is migrated correctly")]
        [Bug("73326")]
        public void GetDistList02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = "dl1";
            string dlId = null;
            string email1 = "ma2 <ma2@zmexch.eng.vmware.com>";
            string email2 = "ma3 <ma3@zmexch.eng.vmware.com>";
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + dlName + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + dlId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email2, null, 1);
            #endregion

        }

        [Test, Description("Verify a dl with category is migrated correctly")]
        [Bug("73326")]
        public void GetDistList04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = "dl1";
            string dlId = null;
            string categoryId = null;
            string category = "category101";
            string email1 = "ma2 <ma2@zmexch.eng.vmware.com>";
            string email2 = "ma3 <ma3@zmexch.eng.vmware.com>";
            #endregion

            #region SOAP Block
            TargetAccount.sendSOAP(
                "<GetTagRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:GetTagResponse/mail:tag[@name='" + category + "']", "id", null, out categoryId, 1);

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + dlName + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + dlId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='tags']", null, categoryId, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email2, null, 1);
            #endregion

        }

        [Test, Description("Verify a dl with all details is migrated correctly")]
        [Bug("73326")]
        public void GetDistList05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = "dl5";
            string dlId = null;
            string notes = "Test Notes";
            string text = null;
            string email1 = "ma2 <ma2@zmexch.eng.vmware.com>";
            string email2 = "ma3 <ma3@zmexch.eng.vmware.com>";
            string email3 = "ma4 <ma4@zmexch.eng.vmware.com>";
            string email4 = "ma5 <ma5@zmexch.eng.vmware.com>";
            #endregion

            #region SOAP Block

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + dlName + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + dlId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email2, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email3, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email4, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn/mail:a[@n='notes']", null, null, out text, 1);
            ZAssert.IsTrue((text.ToLower()).Contains((notes.ToLower())), "notes are migrated successfully");
            #endregion

        }

        [Test, Description("Verify a dl in subfolder is migrated correctly")]
        [Bug("73326")]
        public void GetDistList06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = "dl1";
            string foldername = "Folder1";
            string dlId = null;
            string folderId = null;
            string email1 = "ma2 <ma2@zmexch.eng.vmware.com>";
            string email2 = "ma3 <ma3@zmexch.eng.vmware.com>";
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderId, 1);

            // Search for the contact ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='contact'>"
                      + "<query>" + dlName + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + dlId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn", "l", folderId, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email2, null, 1);
            #endregion

        }

        [Test, Description("Verify a dl in sub-sub folder is migrated correctly")]
        [Bug("73326")]
        public void GetDistList07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = "dl3";
            string dlId = null;
            string foldername = "Folder2";
            string email = "ma4 <ma4@zmexch.eng.vmware.com>";
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
                      + "<query>" + dlName + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            // Get the contact
            TargetAccount.sendSOAP(
                "<GetContactsRequest xmlns='urn:zimbraMail'>"
                 + "<cn id='" + dlId + @"'/>"
              + "</GetContactsRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetContactsResponse", null, null, null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            TargetAccount.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            TargetAccount.selectSOAP(m, "//mail:cn", "l", folderId, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "value", email, null, 1);
            #endregion

        }
    }
}
