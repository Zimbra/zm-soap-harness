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
    public class ModifyContact : BaseTestFixture
    {
        [Test, Description("Verify that contact that was created in ZWC when modified in ZWC is modified by ZCO")]
        [Category("SMOKE"), Category("Contact")]
        public void ModifyContact_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string modifiedFirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedLastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactId;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region SOAP Block to Modify contact
            zAccount.AccountZCO.sendSOAP(new ModifyContactRequest().ModifyContact(new ContactObject(contactId).ModifyContactAttribute("firstName",modifiedFirstName).ModifyContactAttribute("lastName", modifiedLastName).ModifyContactAttribute("email", modifiedEmail)));
            #endregion

            #region Outlook Block to verify that contact was modified
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemModified = OutlookMailbox.Instance.findContact(modifiedEmail) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemModified, "Check that modifiedcontact exists in the contacts book");
            zAssert.AreEqual(modifiedLastName, rdoContactItemModified.LastName, "Check contact lastname");
            zAssert.AreEqual(modifiedFirstName, rdoContactItemModified.FirstName, "Check contact firstname");
            #endregion
        }

        [Test, Description("Verify that contact that was created in ZCO when modified in ZCO is modified by ZWC too")]
        [Category("Contact")]
        public void ModifyContact_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string modifiedFirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedLastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactId;

            #endregion

            #region Outlook Block to create contact
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");
            RDOContactItem rdoContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rdoContact, "Verify that the rdo contact item is created correctly");
            rdoContact.FirstName = firstname;
            rdoContact.LastName = lastname;
            rdoContact.Email1Address = email;
            rdoContact.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify the contact
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(firstname));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion

            #region Outlook Block to modify the contact
            rdoContact.FirstName = modifiedFirstName;
            rdoContact.LastName = modifiedLastName;
            rdoContact.Email1Address = modifiedEmail;
            rdoContact.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that the contact was modified
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, modifiedFirstName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, modifiedLastName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, modifiedEmail, null, 1);
            #endregion
        }

        [Test, Description("Verify that contact that was created in ZWC when modified in ZCO is modified by ZWC too")]
        [Category("Contact")]
        public void ModifyContact_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string modifiedFirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedLastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactId;
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            rdoContactItem.FirstName = modifiedFirstName;
            rdoContactItem.LastName = modifiedLastName;
            rdoContactItem.Email1Address = modifiedEmail;
            rdoContactItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that the contact was modified
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, modifiedFirstName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, modifiedLastName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, modifiedEmail, null, 1);
            #endregion

        }

        [Test, Description("Verify that contact with HTML notes that was created in ZWC when modified in ZWC is synced to ZCO")]
        [Category("SMOKE"), Category("Contact")]
        public void ModifyContact_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string modifiedFirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedLastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactId;
            string note = "note" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedNote = "modifiedNote" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(@"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname + @"</a>
                        <a n='lastName'>" + lastname + @"</a>
                        <a n='email'>" + email + @"</a>
					    <a n='notesHtml'>" + "&lt;html&gt;&lt;body&gt;my &lt;b&gt;" + note + "&lt;/b&gt; is here&lt;/body&gt;&lt;/html&gt;" + @"</a>
                    </cn>     
                </CreateContactRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion

            #region SOAP Block to Modify contact
            zAccount.AccountZCO.sendSOAP(@"<ModifyContactRequest xmlns='urn:zimbraMail'>
                    <cn id='" + contactId +@"'>
                        <a n='email'>" + modifiedEmail + @"</a>
                        <a n='notesHtml'>" + "&lt;html&gt;&lt;body&gt;my &lt;b&gt;" + modifiedNote + "&lt;/b&gt; is here&lt;/body&gt;&lt;/html&gt;" + @"</a>
                    </cn>     
                </ModifyContactRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:ModifyContactResponse/mail:cn", "id", null, out contactId, 1);
            #endregion

            #region Outlook Block to verify that contact was modified
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemModified = OutlookMailbox.Instance.findContact(modifiedEmail) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemModified, "Check that modifiedcontact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItemModified.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname, rdoContactItemModified.FirstName, "Check contact firstname");
            zAssert.IsNotNull(rdoContactItemModified.HTMLBody, "Check that contact's HTML notes exists in the contacts book");
            zAssert.IsTrue(rdoContactItemModified.HTMLBody.Contains("<b>" + modifiedNote + "</b>"), "Check contact notes contain HTML text");
            #endregion
        }
        [Test, Description("Verify that contact with HTML notes that was created in ZCO when modified in ZCO is synced to ZWC too")]
        [Category("Contact")]
        public void ModifyContact_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string modifiedFirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedLastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string note = "note" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contactId;
            string modifiedNote = "modifiedNote" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Outlook Block to create contact
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");
            RDOContactItem rdoContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rdoContact, "Verify that the rdo contact item is created correctly");
            rdoContact.FirstName = firstname;
            rdoContact.LastName = lastname;
            rdoContact.Email1Address = email;
            rdoContact.HTMLBody = "<html><body>my <b>" + note + "</b> is here</body></html>";
            rdoContact.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify the contact
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(firstname));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion

            #region Outlook Block to modify the contact
            rdoContact.Email1Address = modifiedEmail;
            rdoContact.HTMLBody = "<html><body>my <b>" + modifiedNote + "</b> is here</body></html>";
            rdoContact.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that the contact was modified
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(modifiedEmail));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, modifiedEmail, null, 1);
            XmlNode notesHTML = zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='notesHtml']", null, null, null, 1);
            string notesContent = notesHTML.InnerText;
            zAssert.IsTrue(notesContent.Contains(modifiedNote), "notes contain html formated text");
            #endregion
        }

        [Test, Description("Verify that contact that was created in ZWC when HTML notes modified in ZCO is modified by ZWC too")]
        [Category("Contact")]
        public void ModifyContact_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string modifiedFirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedLastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactId;
            string note = "note" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedNote = "modifiedNote" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(@"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname + @"</a>
                        <a n='lastName'>" + lastname + @"</a>
                        <a n='email'>" + email + @"</a>
					    <a n='notes'>" + note + @"</a>
                    </cn>     
                </CreateContactRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            rdoContactItem.HTMLBody = "<html><body>my <b>" + modifiedNote + "</b> is here</body></html>";
            rdoContactItem.Email1Address = modifiedEmail;
            rdoContactItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify that the contact was modified
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(modifiedEmail));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, modifiedEmail, null, 1);
            XmlNode notesHTML = zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='notesHtml']", null, null, null, 1);
            string notesContent = notesHTML.InnerText;
            zAssert.IsTrue(notesContent.Contains(modifiedNote), "notes contain html formated text");
            #endregion

        }

        [Test, Description("Verify that contact with HTML notes that was created in ZCO when modified in ZWC is synced to ZCO too")]
        [Category("Contact")]
        public void ModifyContact_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string modifiedFirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedLastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string modifiedEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string note = "note" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contactId;
            string modifiedNote = "modifiedNote" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Outlook Block to create contact
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");
            RDOContactItem rdoContact = contacts.Items.Add("IPM.Contact") as RDOContactItem;
            zAssert.IsNotNull(rdoContact, "Verify that the rdo contact item is created correctly");
            rdoContact.FirstName = firstname;
            rdoContact.LastName = lastname;
            rdoContact.Email1Address = email;
            rdoContact.HTMLBody = "<html><body>my <b>" + note + "</b> is here</body></html>";
            rdoContact.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block to verify the contact
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(firstname));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion

            #region SOAP Block to Modify contact
            zAccount.AccountZCO.sendSOAP(@"<ModifyContactRequest xmlns='urn:zimbraMail'>
                    <cn id='" + contactId + @"'>
                        <a n='email'>" + modifiedEmail + @"</a>
                        <a n='notesHtml'>" + "&lt;html&gt;&lt;body&gt;my &lt;b&gt;" + modifiedNote + "&lt;/b&gt; is here&lt;/body&gt;&lt;/html&gt;" + @"</a>
                    </cn>     
                </ModifyContactRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:ModifyContactResponse/mail:cn", "id", null, out contactId, 1);
            #endregion


            #region Outlook Block to verify that contact was modified
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItemModified = OutlookMailbox.Instance.findContact(modifiedEmail) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItemModified, "Check that modifiedcontact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItemModified.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname, rdoContactItemModified.FirstName, "Check contact firstname");
            zAssert.IsNotNull(rdoContactItemModified.HTMLBody, "Check that contact's HTML notes exists in the contacts book");
            zAssert.IsTrue(rdoContactItemModified.HTMLBody.Contains("<b>" + modifiedNote + "</b>"), "Check contact notes contain HTML text");
            #endregion
        }
    }
}