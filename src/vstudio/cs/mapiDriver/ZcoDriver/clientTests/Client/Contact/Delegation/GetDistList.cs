using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using Redemption;
using System.Collections;
using System.Xml;

namespace clientTests.Client.Contact.Delegation
{
    [TestFixture]
    public class GetDistList : BaseTestFixture
    {
        [Test, Description("Verify ZCO can open other users contacts folder")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add DistList", "Share the contact folder with syncuser", "Sync", "Open the shared contact folder in ZCO",
            "Verify the shared contact folder can be mounted and DistList is visible")]
        public void OpenDistList_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId;
            #endregion

            #region SOAP block to create distribution list inside delegated folder

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dlName).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook Block to Mount the shared folder
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDODistListItem rdoDistList = folder1.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the distribution list was found in the contacts folder");
            bool found = false;
            for (int i = 1; i <= rdoDistList.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList.GetMember(i);
                if (e.Address.Equals(email, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");
            #endregion
        }

        [Test, Description("Verify ZCO can not delete/edit/insert/move DistList when shared as readonly (r) (rights=rightsZcoReviewer)")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auht as user1 in ZCS and add DistList", "Share the contact folder with syncuser", "Sync", "Verify that delete/edit/insert/move actions are not allowed in shared contact folder")]
        public void OpenDistList_Basic_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dl1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dl2name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dl3name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email1 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string email2 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId;
            #endregion

            #region SOAP block to create distribution list inside delegated folder

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoReviewer));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dl1name).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dl1name).
                                            AddContactAttribute("dlist", email1).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dl2name).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dl2name).
                                            AddContactAttribute("dlist", email2).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            #endregion

            #region Outlook Block to create contact group and 
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.Save();

            rdoDistListItem.DLName = dl3name;
            rdoDistListItem.AddMember(rContact.Email1Address);
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDODistListItem rdoDistList1 = folder1.Items.Find("[subject] = '" + dl1name + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList1, "Verify that the distribution list was found in the contacts folder");
            bool found = false;
            for (int i = 1; i <= rdoDistList1.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList1.GetMember(i);
                if (e.Address.Equals(email1, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");

            RDODistListItem rdoDistList2 = folder1.Items.Find("[subject] = '" + dl2name + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList2, "Verify that the distribution list was found in the contacts folder");
            found = false;
            for (int i = 1; i <= rdoDistList2.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList2.GetMember(i);
                if (e.Address.Equals(email2, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");

            #endregion

            #region verification

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                rdoDistListItem.CopyTo(folder1);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to copy the contact to shared folder");

            //Insert
            u = null;
            try
            {
                RDODistListItem rdoDistList = folder1.Items.Add("IPM.DistList") as RDODistListItem;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to create new DistList in shared folder");

            //Edit
            u = null;
            try
            {
                rdoDistList1.DLName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoDistList1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to edit DistList from shared folder");

            //Move
            u = null;
            try
            {
                rdoDistList1.Move(contacts);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to move DistList from shared folder");

            //Delete
            u = null;
            try
            {
                rdoDistList2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to delete DistList from shared folder");

            #endregion
        }

        [Test, Description("Verify ZCO can not delete/edit/insert/move DistList when shared as readwrite (rw) (rights=rightsZcoDelegate)")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auht as user1 in ZCS and add DistList", "Share the contact folder with syncuser", "Sync", "Verify that delete/insert/move actions are allowed in shared contact folder")]
        public void OpenDistList_Basic_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dl1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dl2name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dl3name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email1 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string email2 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId;
            #endregion

            #region SOAP block to create distribution list inside delegated folder

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoDelegate));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dl1name).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dl1name).
                                            AddContactAttribute("dlist", email1).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dl2name).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dl2name).
                                            AddContactAttribute("dlist", email2).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            #endregion

            #region Outlook Block to create contact group and
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.Save();

            rdoDistListItem.DLName = dl3name;
            rdoDistListItem.AddMember(rContact.Email1Address);
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDODistListItem rdoDistList1 = folder1.Items.Find("[subject] = '" + dl1name + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList1, "Verify that the distribution list was found in the contacts folder");
            bool found = false;
            for (int i = 1; i <= rdoDistList1.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList1.GetMember(i);
                if (e.Address.Equals(email1, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");

            RDODistListItem rdoDistList2 = folder1.Items.Find("[subject] = '" + dl2name + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList2, "Verify that the distribution list was found in the contacts folder");
            found = false;
            for (int i = 1; i <= rdoDistList2.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList2.GetMember(i);
                if (e.Address.Equals(email2, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");

            #endregion

            #region verification

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                rdoDistListItem.CopyTo(folder1);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to copy the contact to shared folder");

            //Insert
            u = null;
            try
            {
                RDODistListItem rdoDistList = folder1.Items.Add("IPM.DistList") as RDODistListItem;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to create new DistList in shared folder");

            //Edit
            u = null;
            try
            {
                rdoDistList1.DLName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoDistList1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is NOT thrown when trying to edit DistList from shared folder");

            //Move
            u = null;
            try
            {
                rdoDistList1.Move(contacts);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to move DistList from shared folder");

            //Delete
            u = null;
            try
            {
                rdoDistList2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to delete DistList from shared folder");

            #endregion
        }

        [Test, Description("Verify ZCO can delete/edit/insert/move DistList when shared as Admin(rwid)(rights=rights=rightsZcoAdministrator)")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auht as user1 in ZCS and add DistList", "Share the contact folder with syncuser", "Sync", "Verify that edit/delete/insert/move actions are allowed in shared contact folder")]
        public void OpenDistList_Basic_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dl1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dl2name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dl3name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email1 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string email2 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId;
            #endregion

            #region SOAP block to create distribution list inside delegated folder

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folderName).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dl1name).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dl1name).
                                            AddContactAttribute("dlist", email1).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dl2name).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dl2name).
                                            AddContactAttribute("dlist", email2).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            #endregion

            #region Outlook Block to create contact group and
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.Save();

            rdoDistListItem.DLName = dl3name;
            rdoDistListItem.AddMember(rContact.Email1Address);
            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDODistListItem rdoDistList1 = folder1.Items.Find("[subject] = '" + dl1name + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList1, "Verify that the distribution list was found in the contacts folder");
            bool found = false;
            for (int i = 1; i <= rdoDistList1.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList1.GetMember(i);
                if (e.Address.Equals(email1, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");

            RDODistListItem rdoDistList2 = folder1.Items.Find("[subject] = '" + dl2name + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList2, "Verify that the distribution list was found in the contacts folder");
            found = false;
            for (int i = 1; i <= rdoDistList2.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList2.GetMember(i);
                if (e.Address.Equals(email2, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");
            #endregion

            #region verification

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                rdoDistListItem.CopyTo(folder1);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is NOT thrown when trying to copy the contact to shared folder");

            //Insert
            u = null;
            try
            {
                RDODistListItem rdoDistList = folder1.Items.Add("IPM.DistList") as RDODistListItem;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is NOT thrown when trying to create new DistList in shared folder");

            //Edit
            u = null;
            try
            {
                rdoDistList1.DLName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoDistList1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is NOT thrown when trying to edit DistList from shared folder");

            //Move
            u = null;
            try
            {
                rdoDistList1.Move(contacts);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is NOT thrown when trying to move DistList from shared folder");

            //Delete
            u = null;
            try
            {
                rdoDistList2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is NOT thrown when trying to delete DistList from shared folder");

            #endregion
        }
    }
}
