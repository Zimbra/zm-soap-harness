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
    public class ContactAction : BaseTestFixture
    {
        [Test, Description("Verify that contact flag set in ZWC should reflect in ZCO too")]
        [Category("SMOKE"), Category("Contact")]
        public void ContactAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region SOAP Block to flag contact
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(contactID, "flag"));
            #endregion

            #region Outlook Block to Verify that the contact is flagged
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemFlagged = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemFlagged, "Check that contact exists in the contact book");
            zAssert.AreEqual(lastname, rdoContactItemFlagged.LastName, "Check contact's lastname");
            zAssert.AreEqual(2, rdoContactItemFlagged.FlagStatus, "Check the contact is flagged");
            #endregion
        }

        [Test, Description("Verify that contact unflag in ZWC should reflect in ZCO too")]
        [Category("Contact")]
        public void ContactAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            OutlookCommands.Instance.Sync(); 
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(contactID, "flag"));
            #endregion 

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(2, rdoContactItem.FlagStatus, "Check the contact is flagged");
            #endregion

            #region SOAP Block to unflag contact
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(contactID, "!flag"));
            #endregion

            #region Outlook Block to Verify that the contact is un-flagged
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemUnFlag = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemUnFlag, "Check that contact exists in the contact book");
            zAssert.AreEqual(lastname, rdoContactItemUnFlag.LastName, "Check contact's lastname");
            zAssert.AreEqual(0, rdoContactItemUnFlag.FlagStatus, "Check the contact is un-flagged");
            #endregion

        }

        [Test, Description("Verify that contact flag set in ZCO should reflect in ZWC too")]
        [Category("Contact")]
        public void ContactAction_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            #endregion

            #region Outlook Block to flag contact
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            rdoContactItem.FlagStatus = 2;
            rdoContactItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block to verify that the contact is flagged
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactID));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "f", "f", null, 1 );
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion

        }

        [Test, Description("Verify that contact unflag set in ZCO should reflect in ZWC too")]
        [Category("Contact")]
        public void ContactAction_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            OutlookCommands.Instance.Sync();
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(contactID, "flag"));
            #endregion

            #region Outlook Block to un-flag contact
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(2, rdoContactItem.FlagStatus, "Check the contact is flagged");
            rdoContactItem.FlagStatus = 0;
            rdoContactItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block to verify that the contact is un-flagged
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactID));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn[@f]", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion

        }

        [Test, Description("Verify that contact Tag set in ZWC should reflect in ZCO too")]
        [Category("SMOKE"), Category("Contact")]
        public void ContactAction_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID, tagID;
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block  
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region SOAP region to tag contact
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagID,1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(contactID, "tag", tagID));
            #endregion

            #region Outlook block to verify that the contact has been tagged
            ArrayList categoryList;
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemTag = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemTag, "check that the contact exists in the contacts book");
            if (rdoContactItemTag.Categories == null)
            {
                zAssert.IsNull(rdoContactItemTag, "Check that there are no categories on the contact");
            }
            else
            {
                categoryList = new ArrayList();
                foreach (string s in rdoContactItemTag.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.Contains(tagname, categoryList, "Checked that the Contact with Tag in ZWC synced correctly in ZCO");
            }
            #endregion
        }


        [Test, Description("Verify that contact un-tagged in ZWC should reflect in ZCO too")]
        [Category("Contact")]
        public void ContactAction_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID, tagID;
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagID, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(contactID, "tag", tagID));
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region SOAP block to un-tag the contact
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(contactID, "!tag", tagID));
            #endregion 

            #region Outlook block to verify that the contact gets un-tagged
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemUnTag = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemUnTag, "Check that contact exists in the contacts book");
            zAssert.IsNull(rdoContactItemUnTag.Categories,"tag is removed");
            #endregion
        }

        [Test, Description("Verify that Moving Contact to other folder (op=move) in ZWC moves it in ZCO too")]
        [Category("SMOKE"), Category("Contact")]
        public void ContactAction_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string contactID, folderID, parentFolderID;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderID, 1);
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(folderName).SetParent(parentFolderID).SetView("contact")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderID, 1);
            #endregion

            #region Outlook block to Sync Contact and folder
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region SOAP block to move contact to another folder
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().MoveContactbyID(contactID, folderID));
            #endregion

            #region Outlook block to verify that contact is moved
            OutlookCommands.Instance.Sync();
            RDOFolder contactsFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contactsFolder, "Check that the contacts folder exists");
            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, contactsFolder, true);
            RDOContactItem rdoContactItemMoved = OutlookMailbox.Instance.findContact(email, rdoFolder, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemMoved, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItemMoved.LastName, "Check contact lastname");
            #endregion
        }

        [Test, Description("Verify that Moving Contact to other folder (op=move) in ZCO moves it in ZWC too")]
        [Category("Contact")]
        public void ContactAction_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string contactID, folderID, parentFolderID;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.contacts") + "']", "id", null, out parentFolderID, 1);
            zAccount.AccountZCO.sendSOAP(new CreateFolderRequest().AddFolder(new FolderObject().SetName(folderName).SetParent(parentFolderID).SetView("contact")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateFolderResponse/mail:folder", "id", null, out folderID, 1);
            #endregion

            #region Outlook Block to Move contact
            OutlookCommands.Instance.Sync();
            RDOFolder contactsFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contactsFolder, "Check that the contacts folder exists");
            RDOFolder rdoFolder = OutlookMailbox.Instance.findFolder(folderName, contactsFolder, true);
            zAssert.IsNotNull(rdoFolder, "Check that the folder created exists");
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            rdoContactItem.Move(rdoFolder);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that the contact is moved
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query("in:" + "contacts/" + folderName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion

        }

        [Test, Description("Verify that contact Tag set in ZWC should reflect in ZCO too")]
        [Category("Contact")]
        public void ContactAction_09()
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
            rdoDistListItem.Categories = tagname;
            rdoDistListItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Outlook Block for verification
            ArrayList categoryList;
            OutlookCommands.Instance.Sync();
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the contacts folder");
            if (rdoDistList.Categories == null)
            {
                zAssert.IsNull(rdoDistList, "Check that there are no categories on the distribution list");
            }
            else
            {
                categoryList = new ArrayList();
                foreach (string s in rdoDistList.Categories.Split(",".ToCharArray()))
                {
                    categoryList.Add(s);
                }
                zAssert.Contains(tagname, categoryList, "Checked that the distribution list with Tag in ZWC synced correctly in ZCO");
            }

            #endregion

 
        }

        [Test, Description("Verify that contact Untagged in ZCO should reflect in ZWC too")]
        [Category("Contact")]
        public void ContactAction_10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID, tagID;
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagID, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(contactID, "tag", tagID));
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region Un-tag contact in ZCO
            rdoContactItem.Categories = null;
            rdoContactItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that contact was un-tagged
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactID));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn[@t]", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion

        }


        [Test, Description("Verify that contact Tag set in ZCO should reflect in ZWC too")]
        [Category("Contact")]
        public void ContactAction_11()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID, tagID;
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagID, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region Tag contact in ZCO
            rdoContactItem.Categories = tagname;
            rdoContactItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that contact was tagged
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactID));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "t", tagID, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion


        }

        [Test, Description("Verify that forwarding a tagged cotact does not cause any server failure notice")]
        [Category("Contact")]
        [Bug("44355")]
        public void ContactAction_12()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string tagID;

            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagID, 1);
            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.Categories = tagname;
            rContact.Save();
            RDOMail rMail = rContact.Forward();
            rMail.To = zAccount.AccountA.emailAddress;
            rMail.Recipients.ResolveAll(null, null);
            rMail.Send();
            #endregion

            #region Outlook block to check local failure
            //Sync ZCO
            OutlookCommands.Instance.Sync();

            // Let the harness check for local failures in the Teardown-> OutlookMailbox.Instance.HasConflictItems function

            #endregion
        }

    }
}