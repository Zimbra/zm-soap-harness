using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using SyncHarness;

namespace clientTests.Client.Contact
{
    [TestFixture]
    public class CreateDistList : BaseTestFixture
    {
        [Test, Description("Verify that a DistList (empty) created in ZCO synced to ZWC")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateDistList_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            rdoDistListItem.DLName = dlName;
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for Verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "id", dlId, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            #endregion
        }

        [Test, Description("Verify that a DistList (one contact) created in ZCO synced to ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateDistList_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region Outlook Block to create contact group

            RDODistListItem rdoDistListItem = OutlookMailbox.Instance.CreateDistList();
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.Save();

            rdoDistListItem.DLName = dlName;
            rdoDistListItem.AddMember(rContact.Email1Address);
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for Verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "id", dlId, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m", "value", "" + emailaddress + " <" + emailaddress + ">", null, 1);
            #endregion
 
        }

        [Test, Description("Verify that a DistList (one member that is a non-contact) created in ZCO synced to ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateDistList_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            string dlMemberAddress = "primaryemail" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            rdoDistListItem.DLName = dlName;
            rdoDistListItem.AddMemberEx("FirstName LastName", dlMemberAddress, "SMTP");
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for Verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "id", dlId, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m", "value", "FirstName LastName" + " <" + dlMemberAddress + ">", null, 1);
            #endregion
 
        }

        [Test, Description("Verify that a DistList (10 contacts) created in ZCO synced to ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateDistList_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            const int numberOfContacts = 10;
            String[] contactEmails = new string[numberOfContacts];
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                RDOContactItem rdoContactItem = contacts.Items.Add("IPM.Contact") as RDOContactItem;
                zAssert.IsNotNull(rdoContactItem, "Verify that the rdo contact item is created correctly");

                rdoContactItem.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.Email1Address = contactEmails[i];
                rdoContactItem.Save();
            }

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");
            rdoDistListItem.DLName = dlName;

            for (int i = 0; i < numberOfContacts; i++)
            {
                rdoDistListItem.AddMember(contactEmails[i]);
            }

            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for Verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "id", dlId, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
                        for (int i = 0; i < numberOfContacts; i++)
            {
                zAccount.AccountZCO.selectSOAP("//mail:m", "value", "" + contactEmails[i] + " <" + contactEmails[i] + ">", null, 1);
            }

            #endregion
        }
    }

}