using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using System.Collections;
using SyncHarness;

namespace longDurationTests.Client.Contact
{
    [TestFixture]
    public class CreateContact : clientTests.BaseTestFixture
    {
        [Test, Description("Verify that 100 Contact created in ZCO synced to ZWC correctly")]
        [Category("Contact")]
        public void CreateContact_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string contactId;
            #endregion

            #region Outlook Block to create contact
            ArrayList oContactCollection = new ArrayList();

            for (int i = 1; i <= 100; i++)
            {
                RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
                zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

                RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
                zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

                rContact.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Email1Address = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                rContact.FileAs = "1";
                rContact.CompanyName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.BusinessTelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.CallbackTelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.CarTelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.HomeTelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.HomeFaxNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.OtherTelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.OtherFaxNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Email2Address = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() +"@" + GlobalProperties.getProperty("defaultdomain.name");
                rContact.MiddleName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.JobTitle = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Business2TelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Home2TelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.MobileTelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.PagerNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Email3Address = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() +"@" + GlobalProperties.getProperty("defaultdomain.name");
                rContact.BusinessAddressStreet = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.BusinessAddressCity = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.BusinessAddressState = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.BusinessAddressPostalCode = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.WebPage = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.HomeAddressStreet = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.HomeAddressCity = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.HomeAddressState = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.HomeAddressPostalCode = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.OtherAddressStreet = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.OtherAddressCity = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.OtherAddressState = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.OtherAddressPostalCode = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Save();

                oContactCollection.Add(rContact.Email1Address);
            }
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            foreach (string email in oContactCollection)
            {
                RDOContactItem rContact = OutlookMailbox.Instance.findContact(email);
                zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(email));
                zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);
                zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, rContact.FirstName, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, rContact.LastName, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='callbackPhone']", null, rContact.CallbackTelephoneNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='jobTitle']", null, rContact.JobTitle, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='homeCity']", null, rContact.HomeAddressCity, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='homePostalCode']", null, rContact.HomeAddressPostalCode, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='otherState']", null, rContact.OtherAddressState, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workCity']", null, rContact.BusinessAddressCity, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='company']", null, rContact.CompanyName, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='mobilePhone']", null, rContact.MobileTelephoneNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workStreet']", null, rContact.BusinessAddressStreet, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='homeStreet']", null, rContact.HomeAddressStreet, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workPhone2']", null, rContact.Business2TelephoneNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='homePhone2']", null, rContact.Home2TelephoneNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='middleName']", null, rContact.MiddleName, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email2']", null, rContact.Email2Address, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='pager']", null, rContact.PagerNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workPhone']", null, rContact.BusinessTelephoneNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='otherStreet']", null, rContact.OtherAddressStreet, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email3']", null, rContact.Email3Address, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='homePhone']", null, rContact.HomeTelephoneNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='otherCity']", null, rContact.OtherAddressCity, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workState']", null, rContact.BusinessAddressState, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='otherPhone']", null, rContact.OtherTelephoneNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='homeFax']", null, rContact.HomeFaxNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='otherPostalCode']", null, rContact.OtherAddressPostalCode, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='otherFax']", null, rContact.OtherFaxNumber, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workURL']", null, rContact.WebPage, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workPostalCode']", null, rContact.BusinessAddressPostalCode, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='carPhone']", null, rContact.CarTelephoneNumber, null, 1);

            }
            #endregion
        }
    }
}