using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using Redemption;
using System.Xml;

namespace clientTests.Client.Contact
{
    [TestFixture]
    public class DeleteContact : BaseTestFixture
    {
        [Test, Description("Hard Delete:Verify that contact deleted in ZWC deleted by ZCO")]
        [Category("SMOKE"), Category("Contact")]
        [BugAttribute("28374")]
        public void DeleteContact_01()
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
            zAssert.AreEqual(lastname, rdoContactItem.LastName,"Check contact lastname");
            #endregion

            #region SOAP Block Delete Contact
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().DeleteContactbyID(contactID));
            #endregion

            #region Outlook Block to verify that the contact gets deleted
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemdel = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNull(rdoContactItemdel, "Check that contact is deleted from the contacts book");
            #endregion
        }

        [Test, Description("Hard Delete:Verify that contact deleted in ZCO deleted by ZWC")]
        [Category("Contact")]
        [BugAttribute("28374")]
        public void DeleteContact_02()
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

            #region Outlook Block to delete contact
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItem.LastName, "Check contact lastname");
            rdoContactItem.Delete(true);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that contact gets deleted
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactID));
            zAccount.AccountZCO.selectSOAP("//zimbra:Code",null,"^mail.NO_SUCH_CONTACT", null, 1);
            #endregion

        }

        [Test, Description("Move to Trash:Verify that contact deleted in ZWC deleted by ZCO")]
        [Category("SMOKE"), Category("Contact")]
        [BugAttribute("28374")]
        public void DeleteContact_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID;
            string trashFolderId;
            #endregion

            #region SOAP Block to create contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            #endregion

            #region Outlook Block to sync Created contact
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItem.LastName, "Check contact lastname");
            #endregion
      
            #region SOAP Block to move contact to trash 
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out trashFolderId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().MoveContactbyID(contactID, trashFolderId));
            #endregion

            #region Outlook Block to verify that the contact is moved to trash
            OutlookCommands.Instance.Sync();
            RDOFolder trashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDOContactItem rdoContactItemTrash = OutlookMailbox.Instance.findContact(email, trashFolder, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemTrash, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItem.LastName,"Check contact lastname");
            #endregion

        }

        [Test, Description("Move to Trash:Verify that contact deleted in ZCO deleted by ZWC")]
        [Category("Contact")]
        [BugAttribute("28374")]
        public void DeleteContact_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactID;
            string trashFolderId;
            string trashFolder = GlobalProperties.getProperty("globals.trash");
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactID, 1);
            #endregion

            #region Outlook Block to delete contact
            OutlookCommands.Instance.Sync();
            RDOFolder rdoTrashFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDeletedItems);
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            rdoContactItem.Move(rdoTrashFolder);
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that the contact is in Trash
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.trash") + "']", "id", null, out trashFolderId, 1);
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Query("in:" + trashFolder));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion
        }
    }
}