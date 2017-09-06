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
    public class ContactAction : BaseTestFixture
    {
        [Test, Description("Verify that syncuser can edit a contact in shared folder")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.BOTH)]
        public void Contact_Action_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId, contactId;
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

            rdoContactItem.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rdoContactItem.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rdoContactItem.Email1Address = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + GlobalProperties.getProperty("defaultdomain.name");
            rdoContactItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("contact").Query(rdoContactItem.FirstName));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"firstName\"]", null, rdoContactItem.FirstName, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"lastName\"]", null, rdoContactItem.LastName, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"email\"]", null, rdoContactItem.Email1Address, null, 1);

            #endregion
        }

        [Test, Description("Verify that syncuser can move contact from one shared folder to another")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void Contact_Action_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folder1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string account1folder2name = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folder1id, folder2id, contactId;
            #endregion

            #region SOAP Block to create a Folder in the delegate account and share it to Sync account
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folder1name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder1id, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folder2name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder2id, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folder1id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folder2id,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                SetParent(folder1id).
                AddContactAttribute("firstName", firstname).
                AddContactAttribute("lastName", lastname).
                AddContactAttribute("email", emailaddress)));

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn[@l='" + folder1id + "']", null, null, null, 1);
            #endregion

            #region Outlook Block to Mount the shared folder and move the contact to the other mounted folder
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folder1name, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDOFolder folder2 = OutlookMailbox.Instance.findFolder(account1folder2name, mountpointContacts, true);
            zAssert.IsNotNull(folder2, "Verify that the shared folder appears in the delegate store");

            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(emailaddress, folder1, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");

            rdoContactItem.Move(folder2);

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("contact").Query(rdoContactItem.FirstName));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            zAccount.AccountA.selectSOAP("//mail:cn", "l", folder2id, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"firstName\"]", null, rdoContactItem.FirstName, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"lastName\"]", null, rdoContactItem.LastName, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"email\"]", null, rdoContactItem.Email1Address, null, 1);

            #endregion
        }

        [Test, Description("Verify that syncuser can delete a contact from shared folder")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void Contact_Action_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId, contactId;
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

            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactId, 1);
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
            rdoContactItem.Delete(redDeleteFlags.dfSoftDelete);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountA.selectSOAP("//zimbra:Code", null, "^mail.NO_SUCH_CONTACT", null, 1);
            #endregion
        }

        [Test, Description("Verify that syncuser can create a contact in shared folder")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void Contact_Action_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string parentFolderId, folderId, contactId;
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
            #endregion

            #region Outlook block to mount the shared folder and create a contact in it
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDOContactItem rContact = folder1.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;

            rContact.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("contact").Query(rContact.FirstName));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            zAccount.AccountA.selectSOAP("//mail:cn", "l", folderId, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"firstName\"]", null, rContact.FirstName, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"lastName\"]", null, rContact.LastName, null, 1);
            zAccount.AccountA.selectSOAP("//mail:cn/mail:a[@n=\"email\"]", null, rContact.Email1Address, null, 1);
            #endregion

        }
    }
}