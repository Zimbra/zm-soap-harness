using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using Redemption;
using System.Collections;
using System.Xml;

namespace clientTests.Client.Contact
{
    [TestFixture]
    public class DistListAction : BaseTestFixture
    {
        [Test, Description("Verify that distribution list flag in ZCO, get flag in ZWC as well")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DistListAction_01()
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

            #region Outlook Block to flag DL
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            rdoDistList.FlagStatus = 2;
            rdoDistList.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().
               GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "f", null, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='dlist']", null, email, null, 1);
            #endregion

        }

        [Test, Description("Verify that distribution list !flag in ZCO, get !flag in ZWC as well")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DistListAction_02()
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

            #region Outlook Block 
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            #endregion

            #region SOAP block to flag contact
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(dlId,"flag"));
            #endregion

            #region Outlook Block to unflag DL
            OutlookCommands.Instance.Sync();
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            zAssert.AreEqual(2, rdoDistListItem.FlagStatus, "Check the contact is flagged");
            rdoDistListItem.FlagStatus = 0;
            rdoDistListItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn[@f]", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='dlist']", null, email, null, 1);
            #endregion
 
        }

        [Test, Description("Verify that distribution list flag in ZWC, get flag in ZCO as well")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DistListAction_03()
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

            #region Outlook Block 
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            #endregion

            #region SOAP block to flag contact group
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(dlId,"flag"));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            zAssert.AreEqual(2, rdoDistListItem.FlagStatus, "Check the distribution list is flagged");
            #endregion
        }

        [Test, Description("Verify that Contact Group !flag in ZWC, get !flag in ZCO as well")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DistListAction_04()
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

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            rdoDistList.FlagStatus = 2;
            rdoDistList.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block to unflag contact group
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(dlId, "!flag"));
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
            zAssert.AreEqual(0, rdoDistListItem.FlagStatus, "Check the distribution list is unflagged");
            #endregion
 
        }

        [Test, Description("Verify that distribution list tag in ZWC, get tag in ZCO as well")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DistListAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, tagId;
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);
            #endregion

            #region Outlook block
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            #endregion

            #region SOAP Block to tag distribution list
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(dlId, "tag", tagId));
            #endregion

            #region Outlook Block for verification
            ArrayList categoryList;
            OutlookCommands.Instance.Sync();
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
            if (rdoDistListItem.Categories == null)
            {
                zAssert.IsNull(rdoDistListItem, "Check that there are no categories on the distribution list");
            }
            else
            {
                categoryList = new ArrayList();
                foreach (string s in rdoDistListItem.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.Contains(tagname, categoryList, "Checked that the distribution list with Tag in ZWC synced correctly in ZCO");
            }

            #endregion

        }

        [Test, Description("Verify that distribution list !tag in ZWC, get !tag in ZCO as well")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DistListAction_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, tagId;
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(dlId, "tag", tagId));
            #endregion

            #region Outlook Block for verification
            ArrayList categoryList;
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
            if (rdoDistListItem.Categories == null)
            {
                zAssert.IsNull(rdoDistListItem, "Check that there are no categories on the distribution list");
            }
            else
            {
                categoryList = new ArrayList();
                foreach (string s in rdoDistListItem.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.Contains(tagname, categoryList, "Checked that the distribution list with Tag in ZWC synced correctly in ZCO");
            }
            #endregion

            #region SOAP Block to untag contact
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(dlId, "!tag", tagId));
            #endregion

            #region Outlook block for verification
            OutlookCommands.Instance.Sync();
            RDODistListItem rdoDistList= contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            zAssert.IsNull(rdoDistList.Categories, "Checked that the DL does not have any Category/Tag");
            #endregion
        }

        [Test, Description("Move to Folder:Verify that Contact Group(One Contact) moved to folder in ZCO moved to folder by ZWC too")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DistListAction_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, folderId, contactFolderId;
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out contactFolderId, 1);
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(folderName).SetParent(contactFolderId).SetView("contact")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);
            #endregion

            #region Outlook Block to move Distribution List
            OutlookCommands.Instance.Sync();
            RDOFolder folder = null;
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
            foreach (RDOFolder f in contacts.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);
                if (f.Name.Equals(folderName))
                {
                    folder = f;
                    break;
                }
            }
            rdoDistListItem.Move(folder);
            OutlookCommands.Instance.Sync();
            #endregion

            #region

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query("in:" + GlobalProperties.getProperty("globals.contacts") + "/" + folderName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, email, null, 1);
            #endregion

        }

        [Test, Description("Move to Folder:Verify that Contact Group(One Contact) moved to folder in ZWC moved to folder by ZCO too")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void DistListAction_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, folderId, parentFolderId;
            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string folderName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
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

            #region SOAP Block to Move distribution list to folder
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));

            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dlName, null, 1);
            //zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, emailaddress, null, 1);
            //As per http://bugzilla.zimbra.com/show_bug.cgi?id=66554#c2 the contact group is identified by m attribute with member name and email address 
            zAccount.AccountZCO.selectSOAP("//mail:m", "value", emailaddress, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:m", "type", "I", null, 1);
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderId, 1);

            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(folderName).SetParent(parentFolderId).SetView("contact")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderId, 1);

            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().MoveContactbyID(dlId, folderId));
            zAccount.AccountZCO.selectSOAP("//mail:ContactActionResponse/mail:action", null, null, null, 1);
            #endregion

            #region Outlook Block for verification
            OutlookCommands.Instance.Sync();
            RDOFolder folder = null;
            foreach (RDOFolder f in contacts.Folders)
            {
                tcLog.Debug("folder " + f.Name + " ... looking for " + folderName);
                if (f.Name.Equals(folderName))
                {
                    folder = f;
                    break;
                }
            }
            RDODistListItem rdoDistList = folder.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            RDOAddressEntries rlist = rdoDistList.Members as RDOAddressEntries;
            zAssert.AreEqual(emailaddress, rlist.GetFirst().Address.ToString(), "Verify that Dist List member name matched");
            #endregion

        }

        [Test, Description("Verify that Contact Group tag in ZCO, get tag in ZWC as well")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DistListAction_09()
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

            #region Outlook Block to tag distribution list
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
            rdoDistListItem.Categories = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rdoDistListItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Verification Block

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='dlist']", null, email, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn[@t]", null, null, null, 1);

            #endregion
        }

        [Test, Description("Verify that Contact Group !tag in ZCO, get !tag in ZWC as well")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void DistListAction_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string dlId, tagId;
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);

            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(dlId, "tag", tagId));
            #endregion

            #region Outlook Block to tag distribution list
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
            rdoDistListItem.Categories = null;
            rdoDistListItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Verification Block

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='dlist']", null, email, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn[@t]", null, null, null, 0);

            #endregion
        }

        [Test, Description("Verify that member added to DL in ZCO, get reflect in ZWC as well. ")]
        [Ignore("Ignore the test")] //As of 7/27/2010, this test case fails even though manual testing of the scenario is successful. After adding a contact to list in ZCO, it displays 2 contacts in ZCO. However in ZWC it shows only one contact in the list. It may be failing because redemption may not be saving the contacts list properly. Hence marking the case as IGNORE.
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        [Bug("31727")]
        public void DistListAction_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contactEmail1 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactEmail2 = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contact1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contact2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", contactEmail1).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out dlId, 1);
            #endregion

            #region Outlook Block to tag distribution list
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
            //RDOContactItem rContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            //rContact.FirstName = contact1;
            //rContact.Email1Address = contactEmail1;
            //rContact.Save();

            RDOContactItem rdoContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            rdoContact.FirstName = contact2;
            rdoContact.Email1Address = contactEmail2;
            rdoContact.Save();
            //rdoDistListItem.AddMemberEx(contact2, contactEmail2, "0");
            rdoDistListItem.AddMember(rdoContact.Email1Address);

            rdoDistListItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Verification Block

            

            //zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));
            //zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='nickname']", null, dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='type']", null, "group", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + dlName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='dlist']", null, contactEmail1, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='dlist']", null, contactEmail2, null, 1);

            #endregion
        }

        [Test, Description("Verify that member added to DL in ZWC, get reflect in ZCO as well")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        //PA 13-Dec-2012 - *Modified test* - Redemption seems to create multiple contacts and groups, so when member was added to DL using soap -> finding DL matching dlName would return the DL not updated by soap and hence the test failed
        //Current testcase logic -> Create DL using soap, Sync, check DL got created in ZCO, using soap add member to DL, Sync, check DL has the added member in ZCO
        public void DistListAction_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contactEmail = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string dlId;
            #endregion

            #region SOAP block to create distribution list
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", "").
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse//mail:cn", "id", null, out dlId, 1);
            #endregion

            #region Outlook block to verify DL is synced to ZCO
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);

            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the distribution list was found in the contacts folder");
            #endregion

            #region SOAP block to add contact to distribution list
            zAccount.AccountZCO.sendSOAP(new ModifyContactRequest("0", "0").
            ModifyContact(new ContactObject(dlId).ModifyContactAttribute_AddDLMember("value", contactEmail).ModifyContactAttribute("type", "group")));
            #endregion

            #region Outlook block to verify DL has newly added member
            OutlookCommands.Instance.Sync();
            RDOAddressEntry e = rdoDistList.GetMember(1);
            zAssert.IsTrue(e.Address.ToString().Contains(contactEmail), "Verify that the Dist List " + rdoDistList.Subject + " contains the member " + contactEmail);
            #endregion

        }
    }
}