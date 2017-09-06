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
    public class DeleteDistList : BaseTestFixture
    {
        [Test, Description("Move to Trash:Verify that Contact Group(Empty:No Contact) deleted in ZCO deleted by ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DeleteDistList_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP block to create an empty distribution list
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", "").
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook block to move contact group to trash
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);

            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '"+ dlName +"'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");

            rdoDistList.Move(trash);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query("in:" + GlobalProperties.getProperty("globals.trash")));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            #endregion
        }


        [Test, Description("Move to Trash:Verify that Contact Group(Empty:No Contact) deleted in ZWC deleted by ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DeleteDistList_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, trashFolderId;
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

            #region SOAP block to move contact group to trash
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out trashFolderId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().MoveContactbyID(dlId, trashFolderId));
            zAccount.AccountZCO.selectSOAP("//mail:ContactActionResponse/mail:action", null, null, null, 1);
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDODistListItem rdoDistList = trash.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the trash folder");
            zAssert.AreEqual(rdoDistListItem.Subject, dlName, "Verify that the Dist List name matches");
            #endregion

        }

        [Test, Description("Move to Trash:Verify that Contact Group(One Contact) deleted in ZCO deleted by ZWC")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DeleteDistList_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook block to move contact group to trash
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);

            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");

            rdoDistList.Move(trash);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query("in:" + GlobalProperties.getProperty("globals.trash")));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, email, null, 1);
            #endregion

        }


        [Test, Description("Move to Trash:Verify that Contact Group(One Contact) deleted in ZWC deleted by ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DeleteDistList_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, trashFolderId;
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.Save();

            rdoDistListItem.DLName = dlName;
            rdoDistListItem.AddMember(rContact.Email1Address);
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block to move distribution list to trash
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m", "value", "" + emailaddress + " <" + emailaddress + ">", null, 1);

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out trashFolderId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().MoveContactbyID(dlId, trashFolderId));
            zAccount.AccountZCO.selectSOAP("//mail:ContactActionResponse/mail:action", null, null, null, 1);
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDODistListItem rdoDistList = trash.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the trash folder");
            zAssert.AreEqual(rdoDistListItem.Subject, dlName, "Verify that the Dist List name matches");
            zAssert.AreEqual(emailaddress, rdoDistList.Members.GetFirst().Address.ToString(), "verify the dist list member matched");
            #endregion
        }

        [Test, Description("Hard Delete:Verify that Contact Group(Empty:No Contact) deleted in ZCO deleted by ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DeleteDistList_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            #endregion

            #region SOAP block to create an empty distribution list
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", "").
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);
            #endregion

            #region Outlook block to hard delete the contact group
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");

            rdoDistList.Delete(redDeleteFlags.dfSoftDelete);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that contact gets deleted
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_CONTACT", null, 1);
            #endregion

        }


        [Test, Description("Hard Delete:Verify that Contact Group(One Contact) deleted in ZCO deleted by ZWC")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DeleteDistList_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string dlId;
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);
            #endregion

            #region Outlook block to hard delete the contact group
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");

            rdoDistList.Delete(redDeleteFlags.dfSoftDelete);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that contact gets deleted
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_CONTACT", null, 1);
            #endregion

        }

        [Test, Description("Hard Delete:Verify that Contact Group(Empty:No Contact) deleted in ZWC deleted by ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DeleteDistList_11()
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

            #region SOAP block to delete contact group
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);

            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().DeleteContactbyID(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:ContactActionResponse/mail:action", null, null, null, 1);
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDODistListItem rdoDistList = trash.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNull(rdoDistList, "Verify that the dist list was not found in the trash folder");

            RDODistListItem distlist = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNull(distlist, "Verify that the dist list was not found in the contacts folder");

            #endregion
 
        }


        [Test, Description("Hard Delete:Verify that Contact Group(One Contact) deleted in ZWC deleted by ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DeleteDistList_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string dlId;
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.Save();

            rdoDistListItem.DLName = dlName;
            rdoDistListItem.AddMember(rContact.Email1Address);
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block to delete contact group
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m", "value", "" + emailaddress + " <" + emailaddress + ">", null, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().DeleteContactbyID(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:ContactActionResponse/mail:action", null, null, null, 1);
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDODistListItem rdoDistList = trash.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNull(rdoDistList, "Verify that the dist list was not found in the trash folder");

            RDODistListItem distlist = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNull(distlist, "Verify that the dist list was not found in the contacts folder");
            #endregion
        }

    }
}