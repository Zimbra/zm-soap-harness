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
    public class DistListAction : BaseTestFixture
    {
        [Test, Description("Verify ZCO can edit Distlist of other users contacts folder")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Auth as user1 in ZCS and add DistList", "Share the contact folder with syncuser", "Sync", "Open the shared contact folder in ZCO",
            "Verify the shared contact folder can be mounted and DistList is visible", "Edit the Distlist and Save", "Sync", "Verify that edited DistList is synced correctly to ZWC")]
        public void DistListAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dl1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dl2name = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email1 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string email2 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId, dlId;
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
            #endregion

            #region Outlook Block to Mount the shared folder and Modify the Dist List
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folderName, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDODistListItem rdoDistList = folder1.Items.Find("[subject] = '" + dl1name + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the distribution list was found in the contacts folder");
            bool found = false;
            for (int i = 1; i <= rdoDistList.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList.GetMember(i);
                if (e.Address.Equals(email1, StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that Dist List member name matched");

            rdoDistList.DLName = dl2name;
            rdoDistList.AddMember(email2);
            rdoDistList.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block for verification
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("contact").Query(dl2name));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountA.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountA.selectSOAP("//mail:a[@n='nickname']", null, dl2name, null, 1);
            //zAccount.AccountA.selectSOAP("//mail:m", "value", "" + email1 + " <" + email1 + ">", null, 1);
            zAccount.AccountA.selectSOAP("//mail:m", "value", "" + email2 + " <" + email2 + ">", null, 1);
            #endregion
        }

        [Test, Description("Verify that syncuser can move DistList from one shared folder to another")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void DistListAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folder1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string account1folder2name = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folder1id, folder2id, dlId;
            #endregion

            #region SOAP block to create distribution list inside delegated folder

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folder1name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder1id, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folder2name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folder2id, 1);

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

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dlname).
                                            SetParent(folder1id).
                                            AddContactAttribute("nickname", dlname).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook Block to Mount both the shared folders and move the dist List to second folder
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

            RDODistListItem rdoDistList = folder1.Items.Find("[subject] = '" + dlname + "'") as RDODistListItem;
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
            rdoDistList.Move(folder2);
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block for verification
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("contact").Query(dlname));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountA.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountA.selectSOAP("//mail:a[@n='nickname']", null, dlname, null, 1);
            zAccount.AccountA.selectSOAP("//mail:a[@n='dlist']", null, email, null, 1);
            zAccount.AccountA.selectSOAP("//mail:GetContactsResponse/mail:cn", "l", folder2id, null, 1);

            #endregion

        }

        [Test, Description("Verify that syncuser can delete a DistList from shared folder")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void DistListAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folder1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId, dlId;
            #endregion

            #region SOAP block to create distribution list inside delegated folder

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folder1name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));

            zAccount.AccountA.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dlname).
                                            SetParent(folderId).
                                            AddContactAttribute("nickname", dlname).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountA.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);
            #endregion

            #region Outlook Block to Mount the shared folder and delete the dist list
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folder1name, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDODistListItem rdoDistList = folder1.Items.Find("[subject] = '" + dlname + "'") as RDODistListItem;
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
            rdoDistList.Delete(redDeleteFlags.dfSoftDelete) ;
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for verification
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("contact").Query(dlname));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:cn[@id='" + dlId + "']", null, null, null, 0);

            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountA.selectSOAP("//mail:GetContactsResponse/mail:cn[@id='" + dlId + "']", null, null, null, 0);
            #endregion

        }

        [Test, Description("Verify that syncuser can create a Distlist in shared folder")]
        [Category("Contact"), Category("SMOKE")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("")]
        public void DistListAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1folder1name = UtilFunctions.RandomStringGenerator() + GlobalProperties.counter() + GlobalProperties.time();
            string parentFolderId, folderId, dlId;
            #endregion

            #region SOAP block to create distribution list inside delegated folder

            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountA.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(account1folder1name).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountA.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            // Share it with the delegatee (sync user)
            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                            GrantFolderbyID(
                                                folderId,
                                                FolderActionRequest.grantUser,
                                                zAccount.AccountZCO.emailAddress,
                                                FolderActionRequest.rightsZcoAdministrator));
            #endregion

            #region Outlook Block to Mount the shared folder and create a dist list
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointContacts = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(mountpointContacts, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder folder1 = OutlookMailbox.Instance.findFolder(account1folder1name, mountpointContacts, true);
            zAssert.IsNotNull(folder1, "Verify that the shared folder appears in the delegate store");

            RDODistListItem rdoDistListItem = folder1.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            rdoDistListItem.DLName = dlname;
            rdoDistListItem.AddMember(email);
            rdoDistListItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Soap Block for verification
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("contact").Query(dlname));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountA.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountA.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountA.selectSOAP("//mail:a[@n='nickname']", null, dlname, null, 1);
            zAccount.AccountA.selectSOAP("//mail:m", "value", "" + email + " <" + email + ">", null, 1);
            zAccount.AccountA.selectSOAP("//mail:GetContactsResponse/mail:cn", "l", folderId, null, 1);

            #endregion

        }

    }
}