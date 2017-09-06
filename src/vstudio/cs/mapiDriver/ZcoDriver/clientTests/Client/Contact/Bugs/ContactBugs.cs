using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using SoapWebClient;
using SoapAdmin;
using System.IO;
using Redemption;
using Microsoft.Office.Interop.Outlook;
using System.Collections;
using System.Xml;

namespace clientTests.Client.Contact.Bugs
{
    [TestFixture]
    public class ContactBugs : BaseTestFixture
    {
        [Test, Description("Cannot forward a contact in Outlook")]
        [Category("Contact")]
        public void ContactBugs_11813()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string filename = GlobalProperties.TestMailRaw + "photos/Picture1.jpg";
            string contactId, messageId;

            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.AddPicture(filename);
            rContact.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for Verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(firstname));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='image']", "filename", "ContactPicture.jpg", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='image']", "ct", "image/jpeg", null, 1);
            #endregion

            #region Find the contact in mailbox and Forward it as VCard

            OutlookCommands.Instance.Sync();

            RDOContactItem rdoContact = OutlookMailbox.Instance.findContact(emailaddress); 
            string rMailSubject = rContact.LastName + " " + rContact.FirstName;
            string vCardfilename = rContact.FirstName + " " + rContact.LastName;
            RDOMail rMail = rdoContact.ForwardAsVCard() as RDOMail;
            rMail.To = zAccount.AccountA.emailAddress;
            rMail.Recipients.ResolveAll(null, null);
            rMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region Verification on Recipients side
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + rMailSubject + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            zAccount.AccountA.selectSOAP(mailMessage, "//mail:su", null, rMail.Subject, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "a", zAccount.AccountZCO.displayName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "t", "f", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "a", zAccount.AccountA.emailAddress, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:e", "t", "t", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "cd", "attachment", null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", vCardfilename, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "ct", "application/octet-stream", null, 1);

            #endregion
        }

        [Test, Description("Tags/Categories related sync issue")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("4891")]
        [TestSteps("Create a Contact and Tag(Tag should be in Upper & lower case combination) in ZWC", "Assign Tag to Contact", "Sync", "Verify that contact is associated with the tag")]
        public void ContactBugs_4891()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string contactId, tagId;
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

            #region SOAP region to tag contact
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagId, 1);
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().TagContactbyID(contactId, "tag", tagId));
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

        [Test, Description("Contact Tagged in ZCO remain untagged in ZWC")]
        [Category("Contact")]
        [Bug("33559")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("1. Create a tag[Upper Lower case combination e.g. SsSs] (SOAP)",
               "2. Create a contact (SOAP)", "3. Sync", "4. tag[Only lower case i.e. ssss] the contact (ZCO)",
               "5. Sync", "6. Verify the contact is tagged(ZWC) by tag created in first step.")]
        public void ContactBugs_33559()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string tagname = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string contactId, tagId;
            #endregion

            #region SOAP Block to create contact and tag
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagname));
            zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse/mail:tag", "id", null, out tagId, 1);
            #endregion

            #region Outlook Block to sync and tag the contact
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            rdoContactItem.Categories = tagname;
            rdoContactItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP block for Verification

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "t", tagId, null, 1);

            #endregion


        }

        [Test, Description("Bug10770: Verify contacts are auto added when email sent from ZCO.")]
        [Category("Mail"), Category("Contact")]
        [Bug("10770")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("1. Using web client, turn on auto-add of contacts when sending mail",
                    "2. Open ZCO, send a mail to a new email address",
                    "3. Using web client, view contacts - contact is not added")]
        public void ContactBugs_10770()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            zAccount destination = new zAccount();
            destination.createAccount();

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string contactId;
            #endregion

            #region soap block to set auto-add preference for contancts. In harness you can only do it directly in Server using soap. As a end user u can only do it in Zwc not in outlook as it is not a free feature.
            zAccount.AccountZCO.sendSOAP(@"
                    <ModifyPrefsRequest xmlns='urn:zimbraAccount'>
                        <pref name='zimbraPrefAutoAddAddressEnabled'>" + GlobalProperties.getProperty("globals.true") + @"</pref>
                    </ModifyPrefsRequest>");
            zAccount.AccountZCO.selectSOAP("//acct:ModifyPrefsResponse", null, null, null, 1);
            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            // Create an Outlook mail item

            RDOMail rMail = OutlookMailbox.Instance.CreateMail();
            rMail.Subject = subject;
            rMail.Body = content;

            rMail.Recipients.Add(destination.emailAddress);
            rMail.Recipients.ResolveAll(null, null);

            rMail.Save();
            rMail.Send();

            OutlookCommands.Instance.Sync();
            
            // Check that the sent message exists in zco
            RDOMail sentMail = OutlookMailbox.Instance.findMessage(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderSentMail), false);
            zAssert.IsNotNull(sentMail, "Verify the sent message exists in the sent folder");

            #endregion

            #region SOAP Block to verify that the contact is auto added to the emailed contact list
            // Search contact email address 
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(destination.emailAddress));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            // Verify email address is auto added
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n=\"email\"]", null, destination.emailAddress, null, 1);

            #endregion
        }

        [Test, Description("Bug31615:workPhone2 of a contact in ZWC does not get sync with Business2TelephoneNumber of a contact in ZCO")]
        [Category("Contact")]
        [Bug("31615")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Create a Contact with workPhone2 attribute in ZWC", "sync", "Login as Syncuser in ZCO", "Verify the Contact Synced correctly")]
        public void ContactBugs_31615()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string workPhone2 = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.counter();
            string email = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP Block to create contact with workPhone2 attribute
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                AddContactAttribute("firstName", firstName).
                AddContactAttribute("lastName", lastName).
                AddContactAttribute("workPhone2", workPhone2).
                AddContactAttribute("email", email)));

            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            #endregion

            #region Outlook Block to Verify
            
            OutlookCommands.Instance.Sync();
            
            // Find the new Contact
            RDOContactItem rContact = OutlookMailbox.Instance.findContact(email);

            zAssert.IsNotNull(rContact, "Checked that the Contact exists in Outlook");
            zAssert.AreEqual(rContact.FirstName, firstName, "Checked that Firstname of Contact match the expected value");
            zAssert.AreEqual(rContact.LastName, lastName, "Checked that Lastname of Contact match the expected value");
            zAssert.AreEqual(rContact.Email1Address, email, "Checked that Primary Email of Contact match the expected value");
            zAssert.AreEqual(rContact.Business2TelephoneNumber, workPhone2, "Verify that the workPhone2 of Contact matches");

            #endregion

 
        }

        [Test, Description("Bug24496:Some Outlook contact fields (homeURL, workURL, assistantPhone) are not mapped to server")]
        [Category("Contact")]
        [Bug("24496")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Create a Contact with contact fields (homeURL, workURL, assistantPhone)in ZWC", "sync", "Login as Syncuser in ZCO",
                   "Verify the Contact Synced correctly", "Modify Contact in ZCO", "Sync", "Check whether ZWC Syncs the Contact correctly")]
        public void ContactBugs_24496()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string homeURL = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string workURL = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string workPhone2 = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.counter();
            string assistantPhone = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.counter();
            string email = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactId;
            #endregion

            #region SOAP Block to create contact with workPhone2 attribute
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                AddContactAttribute("firstName", firstName).
                AddContactAttribute("lastName", lastName).
                AddContactAttribute("workPhone2", workPhone2).
                AddContactAttribute("homeURL", homeURL).
                AddContactAttribute("workURL", workURL).
                AddContactAttribute("assistantPhone", assistantPhone).
                AddContactAttribute("email", email)));

            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            #endregion

            #region Outlook Block to Verify

            OutlookCommands.Instance.Sync();

            // Find the new Contact
            RDOContactItem rContact = OutlookMailbox.Instance.findContact(email);

            zAssert.IsNotNull(rContact, "Checked that the Contact exists in Outlook");
            zAssert.AreEqual(rContact.FirstName, firstName, "Checked that Firstname of Contact match the expected value");
            zAssert.AreEqual(rContact.LastName, lastName, "Checked that Lastname of Contact match the expected value");
            zAssert.AreEqual(rContact.Business2TelephoneNumber, workPhone2, "Verify that the workPhone2 of Contact matches");
            zAssert.AreEqual(rContact.BusinessHomePage, workURL, "Verify that the workURL of Contact matches");
            zAssert.AreEqual(rContact.PersonalHomePage, homeURL, "Verify that the homeURL of Contact matches");
            zAssert.AreEqual(rContact.AssistantTelephoneNumber, assistantPhone, "Verify that the assistantPhone of Contact matches");

            // Modifying the contact
            rContact.FirstName =  UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rContact.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rContact.Business2TelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rContact.BusinessHomePage = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rContact.PersonalHomePage = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rContact.AssistantTelephoneNumber = UtilFunctions.RandomNumberStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            rContact.Email1Address = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

            rContact.Save();

            OutlookCommands.Instance.Sync();

            #endregion

            #region Verify that Contact is synced Correctly

            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(rContact.FirstName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, rContact.FirstName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, rContact.LastName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, rContact.Email1Address, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workURL']", null, rContact.BusinessHomePage, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='workPhone2']", null, rContact.Business2TelephoneNumber, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='homeURL']", null, rContact.PersonalHomePage, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='assistantPhone']", null, rContact.AssistantTelephoneNumber, null, 1);

            #endregion

        }

        [Test, Description("Contact photo addition only does not result in a sync to the server")]
        [Category("Contact")]
        [Bug("22270")]
        [SyncDirection(SyncDirection.BOTH)]
        [TestSteps("Create a Contact in ZCO and Sync to Server", "Verify that contact is created on server", "Open a Contact in ZCO and add a contact photo to it", "Check that contact is synced to server correctly")]
        public void ContactBugs_22270()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string contactId;
            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstName;
            rContact.LastName = lastName;
            rContact.Email1Address = email;
            rContact.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(rContact.FirstName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            #endregion


            #region Outlook Block to modify a contact
            rContact = OutlookMailbox.Instance.findContact(email);

            zAssert.IsNotNull(rContact, "Checked that the Contact exists in Outlook");
            zAssert.AreEqual(rContact.FirstName, firstName, "Checked that Firstname of Contact match the expected value");
            zAssert.AreEqual(rContact.LastName, lastName, "Checked that Lastname of Contact match the expected value");
            zAssert.AreEqual(rContact.Email1Address, email, "Checked that Primary Email of Contact match the expected value");

            string filename = GlobalProperties.TestMailRaw + "/photos/Picture1.jpg";
            rContact.AddPicture(filename);
            rContact.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for verification
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastName, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, email, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='image']", "filename", "ContactPicture.jpg", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='image']", "ct", "image/jpeg", null, 1);
            #endregion
        }

        [Test, Description("error opening AB details dlg for entries with no email address")]
        [Category("Contact")]
        [Bug("25227")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("1.Add Contact in ZWC with No Email", "Sync", "In ZCO check that contact syncs correctly and user able to open the contact")]
        public void ContactBugs_25227()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string firstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP Block to create contact with workPhone2 attribute
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                AddContactAttribute("firstName", firstName).
                AddContactAttribute("lastName", lastName).
                AddContactAttribute("email", email)));

            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
           #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            // Find the new Contact
            RDOContactItem rContact = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rContact, "Checked that the Contact exists in Outlook");
            zAssert.AreEqual(rContact.FirstName, firstName, "Checked that Firstname of Contact match the expected value");
            zAssert.AreEqual(rContact.LastName, lastName, "Checked that Lastname of Contact match the expected value");

            #endregion

        }

        [Test, Description("Corrupt Contact Groups")]
        [Category("Contact")]
        [Bug("29580")]
        [TestSteps("1.Import CSV file having DistList in ZWC", "2.Sync", "3.Verify all the distlist synced correctly")]
        public void ContactBugs_29580()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string uploadSize, uploadId;
            string filename = GlobalProperties.TestMailRaw + "/Contact/ZContact2.csv";
            const int Modified_Upload_Size = 52428800;
            #endregion

            #region Login using Admin and Change the default Upload Size Setting.

                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.GetConfigRequest().GetAttributeValue(SoapAdmin.ConfigAttributes.zimbraFileUploadMaxSize));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:GetConfigResponse/admin:a[@n='zimbraFileUploadMaxSize']", null, null, out uploadSize, 1);

                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                                                                      ModifyAttribute(SoapAdmin.ConfigAttributes.zimbraFileUploadMaxSize, Modified_Upload_Size.ToString()));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);

            #endregion


                #region
                UploadServlet servlet = new UploadServlet(zAccount.AccountZCO);
                servlet.DoUploadFile(zAccount.AccountZCO.zimbraMailHost, GlobalProperties.TestMailRaw + "/Contact/ZContact2.csv", out uploadId);

                zAssert.IsNotNull(uploadId, "Verify that the Contact CSV file was uploaded correctly to ZCS");

                zAccount.AccountZCO.sendSOAP(new SoapWebClient.ImportContactsRequest().
                    UploadCSVbyID((string)uploadId));

                #endregion

                #region Outlook Block for verification

                OutlookCommands.Instance.Sync();

                RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
                zAssert.IsNotNull(contacts, "Verify contacts folder is found");

                Dictionary<string, string> csvEntry = new Dictionary<string, string>();

                bool headerrow = true;
                int k;
                using (StreamReader readFile = new StreamReader(GlobalProperties.TestMailRaw + "/Contact/ZContact2.csv"))
                {
                    string line;
                    string[] row;
                    string[] headerKeyArray = null;

                    while ((line = readFile.ReadLine()) != null)
                    {
                        row = line.Split(',');

                        if (headerrow) //First Row of the CSV file
                        {
                            headerKeyArray = new string[row.Length];
                            for (k = 0; k < row.Length; k++)
                            {

                                string s = row[k].ToString();
                                s = s.Replace("\\", "");
                                s = s.Replace("\"", "");
                                headerKeyArray[k] = s;
                            }
                            headerrow = false;
                        }
                        else
                        {
                            for (k = 0; k < row.Length; k++)
                            {
                                string s = row[k].ToString();
                                s = s.Replace("\\", "");
                                s = s.Replace("\"", "");
                                if (csvEntry.ContainsKey(headerKeyArray[k]))
                                {
                                    csvEntry.Remove(headerKeyArray[k]);
                                    csvEntry.Add(headerKeyArray[k], s);
                                }
                                else
                                {
                                    csvEntry.Add(headerKeyArray[k], s);
                                }

                            }

                            // Find the distribution list in the contacts folder
                            // DLName maps to subject

                            RDODistListItem rdoDistListItem = contacts.Items.Find("[Subject] = '" + csvEntry["nickname"] + "'") as RDODistListItem;
                            zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
                            zAssert.AreEqual(rdoDistListItem.Subject, csvEntry["nickname"], "Verify that the Dist List name matches");

                            for (int j = 1; j <= rdoDistListItem.Members.Count; j++)
                            {
                                RDOAddressEntry e = rdoDistListItem.GetMember(j);
                                zAssert.IsTrue(((string)csvEntry["dlist"]).Contains(e.Address.ToString()), "Verify that the Dist List " + rdoDistListItem.Subject + " contains the member " + e.Address.ToString());
                            }
                        }
                    }
                }

                #endregion

                #region Setting default upload size
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().
                                                                      ModifyAttribute(SoapAdmin.ConfigAttributes.zimbraFileUploadMaxSize, uploadSize));
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);
                #endregion
        }

        [Test, Description("when sending group contacts in outlook zimbra corrupts them and render them useless")]
        [Category("Contact")]
        [Bug("20692")]
        [SyncDirection(SyncDirection.TOZCS)]
        [TestSteps("Create a DL in ZCO", "Send mail to account1 from ZCO with DL as an attachment", "sync", "Login as account1 in ZCS", "Verify the message is received correctly")]
        public void ContactBugs_20692()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string messageId;
            const int numberOfContacts = 2;
            String[] contactEmails = new string[numberOfContacts];
            #endregion

            #region Outlook Block to Create Contact,DistList and Send Mail to the Account1 with DistList as attachment.

            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);

            for (int i = 0; i < numberOfContacts; i++)
            {

                // Create the email address
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                // Create a contact
                RDOContactItem rdoContactItem = OutlookMailbox.Instance.CreateContact();
                zAssert.IsNotNull(rdoContactItem, "Verify that the rdo contact item is created correctly");

                // Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
                rdoContactItem.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.Email1Address = contactEmails[i];

                rdoContactItem.Save();

            }

            // Create a DistList
            RDODistListItem rdoDistListItem = OutlookMailbox.Instance.CreateDistList();
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");

            // Set the DL Nickname
            rdoDistListItem.DLName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();

            // Add the contact as a member
            for (int i = 0; i < numberOfContacts; i++)
            {
                rdoDistListItem.AddMember(contactEmails[i]);
            }

            rdoDistListItem.Save();

            RDOMail rMail = OutlookMailbox.Instance.CreateMail();
            rMail.To = zAccount.AccountA.emailAddress;
            rMail.Recipients.ResolveAll(null, null);
            rMail.Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            rMail.Body = UtilFunctions.RandomUpperLowerStringGenerator(50);

            rMail.Attachments.Add(rdoDistListItem, OlAttachmentType.olEmbeddeditem, 1, "DistlistAttachment");

            rMail.Save();
            rMail.Send();

            OutlookCommands.Instance.Sync();
            #endregion

            #region Download the VCF file and Verify the checksum

            // Find the new message
            RDOFolder sentFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderSentMail);
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage(rMail.Subject, sentFolder, false);
            zAssert.IsNotNull(rdoMail, "Check that the message exists in the sent folder");

            // Verify the message contains the attachment
            zAssert.AreEqual(1, rdoMail.Attachments.Count, "Verify that the message contains one attachment");
            
            //now we are checking the contents of the distribution list. So below code is not needed. So commenting out.
            //string savedAttachment = GlobalProperties.ZimbraQARoot.Replace("\\","/") + @"/" + GlobalProperties.getProperty("attachment.download.location") + @"/" + rMail.Attachments[1].FileName;
            //rdoMail.Attachments[1].SaveAsFile(savedAttachment);

            // Check the distribution list is in the message. 
            RDODistListItem distList = (RDODistListItem)rdoMail.Attachments[1].EmbeddedMsg;
            zAssert.AreEqual(rdoDistListItem.DLName,distList.DLName,  "Verify the distribution list name is correct");
           
            // verify each email address item in the list.
            for (int i = 1; i <= numberOfContacts; i++)
            {
                String emailAddress = distList.GetMember(i).Address;
                zAssert.AreEqual(contactEmails[i-1], emailAddress, "Verify each email address in distribution list");
            }
         

            #endregion

            #region soap

            zAccount.AccountA.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + rMail.Subject + ")"));

            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountA.sendSOAP(new GetMsgRequest().Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountA.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" +
                messageId + "']", null, null, null, 1);

            string partID;
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:content", null, rMail.Body, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp[@cd='attachment']", "part", null, out partID, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "filename", rdoDistListItem.DLName, null, 1);
            zAccount.AccountA.selectSOAP(mailMessage, "//mail:mp", "ct", "message/rfc822", null, 1);

            // Get the mime part
            // HTTP GET http://server.com/service/home/~/?id=123&part=2
            //
            RestClient restClient = new RestClient(RestClient.MethodGet);
            restClient.account = zAccount.AccountA;
            restClient.setUrlQuery("id", messageId);
            restClient.setUrlQuery("part", partID);
            restClient.DoMethod();
            zAssert.IsTrue(restClient.responseMatch("BEGIN:VCARD"), "Verify the attachment is a VCARD");
            zAssert.IsTrue(restClient.responseMatch("NICKNAME:" + rdoDistListItem.DLName), "Verify the attachment is a Group by checking the NICKNAME");
            zAssert.IsTrue(restClient.responseMatch("EMAIL;TYPE=internet:" + contactEmails[0]), "Verify the attachment contains contact #1");
            zAssert.IsTrue(restClient.responseMatch("EMAIL;TYPE=internet:" + contactEmails[1]), "Verify the attachment contains contact #1");


            #endregion
        }

        [Test, Description("Flagging a contact in ZCS does not flag it in ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("46578")]
        public void ContactBugs_46578()
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
            zAccount.AccountZCO.sendSOAP(new ContactActionRequest().FlagContactbyID(contactID, "flag"));
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(0, rdoContactItem.FlagStatus, "Check the contact is flagged");
            #endregion

        }
    }
}
