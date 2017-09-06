using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Collections;
using Redemption;
using SoapWebClient;
using SyncHarness;

namespace longDurationTests.Client.Contact
{
    [TestFixture]
    public class DeleteDistList : clientTests.BaseTestFixture
    {
        [Test, Description("Move to Trash:Verify that Contact Group(100 Contact) deleted in ZCO deleted by ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DeleteDistList_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            const int numberOfContacts = 100;
            String[] contactEmails = new string[numberOfContacts];
            string dlMembers = null;
            #endregion

            #region SOAP block to create an 100 contacts and DL
            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                        AddContact(new ContactObject().
                        AddContactAttribute("firstName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("lastName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("email", contactEmails[i])));
                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            }

            int j = 0;
            for (j = 0; j < numberOfContacts - 1; j++)
            {
                dlMembers = dlMembers + (contactEmails[j] + ",");
            }
           dlMembers = dlMembers + contactEmails[j];

            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                                        AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist",dlMembers).
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
            for (int i = 0; i < numberOfContacts; i++)
            {
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, contactEmails[i], null, 1);
            }
            #endregion
 
        }

        [Test, Description("Move to Trash:Verify that Contact Group(100 Contact) deleted in ZWC deleted by ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DeleteDistList_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, trashFolderId;
            const int numberOfContacts = 100;
            String[] contactEmails = new string[numberOfContacts];
            String[] memberofDLs = new string[numberOfContacts];
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
                rContact.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Email1Address = contactEmails[i];
                rContact.Save();
            }

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");
            rdoDistListItem.DLName = dlName;
            for (int j = 0; j < numberOfContacts; j++)
            {
                rdoDistListItem.AddMember(contactEmails[j]);
            }
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block to move distribution list to trash
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            for (int k = 0; k < numberOfContacts; k++)
            {
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, contactEmails[k], null, 1);
            }

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out trashFolderId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().MoveContactbyID(dlId, trashFolderId));
            zAccount.AccountZCO.selectSOAP("//mail:ContactActionResponse/mail:action", null, null, null, 1);
            #endregion

            #region Outlook block for verification
            OutlookCommands.Instance.Sync();
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDODistListItem rdoDistList = trash.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the trash folder");
            zAssert.AreEqual(rdoDistListItem.Subject, dlName, "Verify that the Dist List name matches");
            for (int l = 1; l <= rdoDistList.Members.Count; l++ )
            {
                zAssert.AreEqual(contactEmails[l-1], rdoDistList.Members.Item(l).Address.ToString(), "verify the dist list member matched");
            }
            #endregion
        }

        [Test, Description("Move to Trash:Verify that Contact Group(with Random number of Contacts) deleted in ZCO deleted by ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DeleteDistList_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            const int numberOfContacts = 100;
            const int numberOfDistLists = 100;
            string comma = " , ";
            String[] contactEmails = new string[numberOfContacts];
            String[] contactDLs = new string[numberOfDistLists];
            String[] memberofDLs = new string[numberOfContacts];
            string dlId, dList;
            #endregion

            #region SOAP block to create an 100 contacts and DL
            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                        AddContact(new ContactObject().
                        AddContactAttribute("firstName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("lastName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("email", contactEmails[i])));
                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            }

            for (int i = 0; i < numberOfDistLists; i++)
            {
                int j = 0;
                string dlmembers = null;
                contactDLs[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();

                int startRandomContact = UtilFunctions.RandomNumberGenerator();
                int endRandomContact = UtilFunctions.RandomNumberGenerator(startRandomContact);

                for (j = startRandomContact; j < endRandomContact - 1; j++)
                {
                    dlmembers += (contactEmails[j] + comma);
                }
                dlmembers = dlmembers + contactEmails[j];

                memberofDLs[i] = dlmembers;

                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                                AddContact(new ContactObject().
                                    AddContactAttribute("fileAs", "8:" + contactDLs[i]).
                                    AddContactAttribute("nickname", contactDLs[i]).
                                    AddContactAttribute("dlist", memberofDLs[i]).
                                    AddContactAttribute("type", "group")));

                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            }
            #endregion

            #region Outlook block to move distribution lists to trash
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            zAssert.IsNotNull(contacts, "Verify contacts folder is found");

            for (int i = 0; i < numberOfDistLists; i++)
            {
                RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + contactDLs[i] + "'") as RDODistListItem;
                zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
                zAssert.AreEqual(rdoDistListItem.Subject, contactDLs[i], "Verify that the Dist List name matches");

                for (int j = 1; j <= rdoDistListItem.Members.Count; j++)
                {
                    RDOAddressEntry e = rdoDistListItem.GetMember(j);
                    zAssert.IsTrue(memberofDLs[i].Contains(e.Address.ToString()), "Verify that the Dist List " + rdoDistListItem.Subject + " contains the member " + e.Address.ToString());
                }

                rdoDistListItem.Move(trash);
            }

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for Verification

            for (int i = 0; i < numberOfDistLists; i++)
            {

               zAccount.AccountZCO.sendSOAP(new SearchRequest().
                   Types("contact").Query("in:" + GlobalProperties.getProperty("globals.trash") + " " + contactDLs[i]));

                zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
                zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, contactDLs[i], null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, null, out dList, 1);


                RDODistListItem rdoDistListItem = trash.Items.Find("[subject] = '" + contactDLs[i] + "'") as RDODistListItem;
                zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the Trash folder");
                zAssert.AreEqual(rdoDistListItem.Subject, contactDLs[i], "Verify that the Dist List name matches");

                for (int j = 1; j <= rdoDistListItem.Members.Count; j++)
                {
                    zAssert.IsTrue(dList.Contains(rdoDistListItem.GetMember(j).Address.ToString()), "Verify that the Dist List " + contactDLs[i] + " contains the member " + rdoDistListItem.GetMember(j).Address.ToString());
                }
            }

            #endregion
        }

        [Test, Description("Hard Delete:Verify that Contact Group(100 Contact) deleted in ZCO deleted by ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DeleteDistList_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            const int numberOfContacts = 100;
            String[] contactEmails = new string[numberOfContacts];
            string dlMembers = null, dlId;
            #endregion

            #region SOAP block to create an 100 contacts and DL
            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                        AddContact(new ContactObject().
                        AddContactAttribute("firstName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("lastName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("email", contactEmails[i])));
                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            }

            int j = 0;
            for (j = 0; j < numberOfContacts - 1; j++)
            {
                dlMembers = dlMembers + (contactEmails[j] + ",");
            }
            dlMembers = dlMembers + contactEmails[j];

            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                                        AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", dlMembers).
                                            AddContactAttribute("type", "group")));

            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);
            #endregion

            #region Outlook block to delete the contact group
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDOFolder trash = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);

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

        [Test, Description("Hard Delete:Verify that Contact Group(100 Contact) deleted in ZWC deleted by ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DeleteDistList_13()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            const int numberOfContacts = 100;
            String[] contactEmails = new string[numberOfContacts];
            String[] memberofDLs = new string[numberOfContacts];
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
                rContact.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Email1Address = contactEmails[i];
                rContact.Save();
            }

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");
            rdoDistListItem.DLName = dlName;
            for (int j = 0; j < numberOfContacts; j++)
            {
                rdoDistListItem.AddMember(contactEmails[j]);
            }
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block to delete contact group
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            for (int k = 0; k < numberOfContacts; k++)
            {
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, contactEmails[k], null, 1);
            }

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