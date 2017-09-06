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
    public class GetContact : BaseTestFixture
    {
        [Test, Description("Verify ZCO can open other users contacts folder")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auht as user1 in ZCS and add contact", "Share the contact folder with syncuser", "Sync", "Open the shared contact folder in ZCO",
            "Verify the shared contact folder can be mounted and contact is visible")]
        public void OpenContact_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId;
            #endregion 

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
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
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            zAccount.AccountA.sendSOAP(new CreateContactRequest().                
                AddContact(new ContactObject().
                SetParent(folderId).
                AddContactAttribute("firstName", firstname).
                AddContactAttribute("lastName", lastname).
                AddContactAttribute("email", emailaddress)));

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn[@l='" + folderId + "']", null, null, null, 1);
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

            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(emailaddress, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItem.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname, rdoContactItem.FirstName, "Check contact firstname");

            #endregion

        }
        [Test, Description("Verify ZCO can not delete/edit/insert/move contacts when shared as readonly (r) (rights=rightsZcoReviewer)")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add contacts", "Share the contact folder with syncuser", "Sync", "Verify that delete/edit/insert/move actions are not allowed in shared contact folder")]
        public void OpenContact_Basic_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string firstname2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string firstname3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
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
                                                FolderActionRequest.rightsZcoReviewer)
                                        );
            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                SetParent(folderId).
                AddContactAttribute("firstName", firstname1).
                AddContactAttribute("lastName", lastname1).
                AddContactAttribute("email", emailaddress1)));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                SetParent(folderId).
                AddContactAttribute("firstName", firstname2).
                AddContactAttribute("lastName", lastname2).
                AddContactAttribute("email", emailaddress2)));

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn[@l='" + folderId + "']", null, null, null, 1);
            #endregion

            #region Outlook Block 

            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstname3;
            rContact.LastName = lastname3;
            rContact.Email1Address = emailaddress3;
            rContact.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDOContactItem rdoContact1 = OutlookMailbox.Instance.findContact(emailaddress1, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContact1, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname1, rdoContact1.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname1, rdoContact1.FirstName, "Check contact firstname");

            RDOContactItem rdoContact2 = OutlookMailbox.Instance.findContact(emailaddress2, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContact2, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname2, rdoContact2.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname2, rdoContact2.FirstName, "Check contact firstname");

            #endregion

            #region verification block for rights

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                rContact.CopyTo(folder1);
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
                RDOContactItem newContact = folder1.Items.Add("IPM.Contact") as RDOContactItem;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to create new contact in shared folder");

            //Edit
            u = null;
            try
            {
                rdoContact1.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContact1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to edit contact from shared folder");

            //Move
            u = null;
            try
            {
                rdoContact1.Move(contacts);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to move contact from shared folder");

            //Delete
            u = null;
            try
            {
                rdoContact2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying to delete contact from shared folder");

            #endregion
        }

        [Test, Description("Verify ZCO can not delete/insert/move contacts when shared as readonly (rw) (rights=rightsZcoDelegate)")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add contact", "Share the contact folder with syncuser", "Sync", "Verify that delete/insert/move actions are not allowed in shared contact folder")]
        public void OpenContact_Basic_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string firstname2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string firstname3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
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
                                                FolderActionRequest.rightsZcoDelegate)
                                        );
            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                SetParent(folderId).
                AddContactAttribute("firstName", firstname1).
                AddContactAttribute("lastName", lastname1).
                AddContactAttribute("email", emailaddress1)));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                SetParent(folderId).
                AddContactAttribute("firstName", firstname2).
                AddContactAttribute("lastName", lastname2).
                AddContactAttribute("email", emailaddress2)));

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn[@l='" + folderId + "']", null, null, null, 1);
            #endregion

            #region Outlook Block

            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstname3;
            rContact.LastName = lastname3;
            rContact.Email1Address = emailaddress3;
            rContact.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDOContactItem rdoContact1 = OutlookMailbox.Instance.findContact(emailaddress1, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContact1, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname1, rdoContact1.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname1, rdoContact1.FirstName, "Check contact firstname");

            RDOContactItem rdoContact2 = OutlookMailbox.Instance.findContact(emailaddress2, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContact2, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname2, rdoContact2.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname2, rdoContact2.FirstName, "Check contact firstname");

            #endregion

            #region verification block for rights

            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                rContact.CopyTo(folder1);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to copy the contact to shared folder");


            //Insert
            u = null;
            try
            {
                RDOContactItem newContact = folder1.Items.Add("IPM.Contact") as RDOContactItem;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to create new contact in shared folder");

            //Edit
            u = null;
            try
            {
                rdoContact1.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContact1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that edit contact is allowed in shared folder");

            //Move
            u = null;
            try
            {
                rdoContact1.Move(contacts);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to move contact from shared folder");

            //Delete
            u = null;
            try
            {
                rdoContact2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that UnauthorizedAccessException execption is not thrown when trying to delete contact from shared folder");

            #endregion
 
        }
        [Test, Description("Verify ZCO can delete/insert/move contacts when shared as readonly (rwidx) (rights=rightsZcoAdministrator)")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Auth as user1 in ZCS and add contact", "Share the contact folder with syncuser", "Sync", "Verify that delete/insert/move actions are allowed in shared contact folder")]
        public void OpenContact_Basic_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string firstname2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string firstname3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
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
                                                FolderActionRequest.rightsZcoAdministrator)
                                        );
            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                SetParent(folderId).
                AddContactAttribute("firstName", firstname1).
                AddContactAttribute("lastName", lastname1).
                AddContactAttribute("email", emailaddress1)));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                SetParent(folderId).
                AddContactAttribute("firstName", firstname2).
                AddContactAttribute("lastName", lastname2).
                AddContactAttribute("email", emailaddress2)));

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn[@l='" + folderId + "']", null, null, null, 1);
            #endregion

            #region Outlook Block

            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstname3;
            rContact.LastName = lastname3;
            rContact.Email1Address = emailaddress3;
            rContact.Save();

            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDOContactItem rdoContact1 = OutlookMailbox.Instance.findContact(emailaddress1, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContact1, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname1, rdoContact1.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname1, rdoContact1.FirstName, "Check contact firstname");

            RDOContactItem rdoContact2 = OutlookMailbox.Instance.findContact(emailaddress2, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContact2, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname2, rdoContact2.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname2, rdoContact2.FirstName, "Check contact firstname");

            #endregion

            #region verification block for rights
            UnauthorizedAccessException u = null;
            //Copy
            u = null;
            try
            {
                rContact.CopyTo(folder1);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that copy contact to shared contact folder is allowed");

            //Insert
            u = null;
            try
            {
                RDOContactItem newContact = folder1.Items.Add("IPM.Contact") as RDOContactItem;
                zAssert.IsNotNull(newContact, "Verify that Insert contact to shared contact folder is allowed");
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that Insert contact to shared contact folder is allowed");

            //Edit
            u = null;
            try
            {
                rdoContact1.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContact1.Save();
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that edit contact is allowed in shared folder");

            //Move
            u = null;
            try
            {
                rdoContact1.Move(contacts);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that move contact to shared contact folder is allowed");

            //Delete
            u = null;
            try
            {
                rdoContact2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that delete contact from shared contact folder is allowed");
            #endregion

        }
 
    }
}