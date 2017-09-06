using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using System.IO;
using SoapAdmin;
using System.Collections;
using SyncHarness;

namespace clientTests.Client.Contact
{
    [TestFixture]
    public class GetContact : clientTests.BaseTestFixture
    {
        [Test, Description("Verify that ZCO can sync a Contact")]
        [Category("SMOKE"), Category("Contact")]
        public void GetContact_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("firstName", firstname).AddContactAttribute("lastName", lastname).AddContactAttribute("email", email)));
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItem.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname, rdoContactItem.FirstName, "Check contact firstname");
            #endregion

        }

        [Test, Description("Verify that ZCO can sync a Contact with Picture in it")]
        [TestSteps(
            "Upload an image to the upload servlet",
            "Create a contact with that image file",
            "Sync to OLK",
            "Find the contact.  Verify the photo is shown.")]
        [Category("SMOKE"), Category("Contact")]
        public void GetContact_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

            string UploadId;

            #endregion

            #region SOAP Block

            UploadServlet servlet = new UploadServlet(zAccount.AccountZCO);
            servlet.DoUploadFile(zAccount.AccountZCO.zimbraMailHost, GlobalProperties.TestMailRaw + "photos/Picture1.jpg", out UploadId);
            
            zAccount.AccountZCO.sendSOAP(
                @"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname + @"</a>
                        <a n='lastName'>" + lastname + @"</a>
                        <a n='email'>" + email + @"</a>
					    <a n='image' aid='" + UploadId + @"'/>
                    </cn>     
                </CreateContactRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);

            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();

            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;

            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItem.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname, rdoContactItem.FirstName, "Check contact firstname");
            zAssert.IsTrue(rdoContactItem.HasPicture, "Verify that the Contact has Picture Image");

            #endregion
        }

        [Test, Description("Send a message with auto-add contact (SOAP), verify contact(Email Only) is added to Emailed Contacts (ZCO)")]
        [Category("Contact")]
        public void GetContact_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block to send message
            zAccount.AccountZCO.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().Subject(subject).AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).AutoAdd().BodyTextPlain(content)));
            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);
            #endregion

            #region Outlook Block to verify that the contact was added to the emailed contacts
            OutlookCommands.Instance.Sync();
            RDOFolder emailedContacts = OutlookMailbox.Instance.findFolder("Emailed Contacts");
            zAssert.IsNotNull(emailedContacts, "Check that the contacts folder exists");
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(zAccount.AccountA.emailAddress, emailedContacts, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            #endregion
        }


        [Test, Description("Send a message with auto-add contact (SOAP), verify contact(FirstName,LastName and other fields) is added to Emailed Contacts (ZCO)")]
        [Category("Contact")]
        public void GetContact_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();

            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            zAccount contact1 = new zAccount();
            contact1.createAccount();
            contact1.login();

            #endregion

            #region SOAP Block to send message
            zAccount.AccountZCO.sendSOAP(new SendMsgRequest().AddMessage(new MessageObject().Subject(subject).AddAddress(MessageObject.AddressType.To, contact1.emailAddress).AutoAdd(firstname+ " " +lastname).BodyTextPlain(content)));
            zAccount.AccountZCO.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);
            #endregion

            #region Outlook Block to verify that the contact was added to the emailed contacts
            OutlookCommands.Instance.Sync();
            RDOFolder emailedContacts = OutlookMailbox.Instance.findFolder("Emailed Contacts");
            zAssert.IsNotNull(emailedContacts, "Check that the contacts folder exists");
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(contact1.emailAddress, emailedContacts, true) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(rdoContactItem.FirstName, firstname, "First name matches");
            zAssert.AreEqual(rdoContactItem.LastName, lastname, "last name matches");
            #endregion

        }

        [Test, Description("Verify that ZCO can sync a Contact(with MiddleName) with Correct 'FileAs' Option")]
        [Category("Contact")]
        public void GetContact_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            Dictionary<string, string> contactEmail = new Dictionary<string, string>();
            string email;
            #endregion

            #region SOAP Block
            for (int i = 1; i <= 7; i++)
            {
                email = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                    AddContactAttribute("firstName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("lastName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workFax", "1234561" + GlobalProperties.counter()).
                    AddContactAttribute("fileAs","" + i + "").
                    AddContactAttribute("company", UtilFunctions.RandomStringGenerator() + GlobalProperties.counter()).
                    AddContactAttribute("workPhone2", "1234562" + GlobalProperties.counter()).
                    AddContactAttribute("callbackPhone", "1234563" + GlobalProperties.counter()).
                    AddContactAttribute("carPhone", "1234564" + GlobalProperties.counter()).
                    AddContactAttribute("homePhone2", "1234565" + GlobalProperties.counter()).
                    AddContactAttribute("homeFax", "1234566" + GlobalProperties.counter()).
                    AddContactAttribute("otherPhone", "1234567" + GlobalProperties.counter()).
                    AddContactAttribute("otherFax", "1234568" + GlobalProperties.counter()).
                    AddContactAttribute("email2", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name")).
                    AddContactAttribute("middleName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("jobTitle", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workPhone", "1234569" + GlobalProperties.counter()).
                    AddContactAttribute("homePhone", "12345610" + GlobalProperties.counter()).
                    AddContactAttribute("mobilePhone", "12345611" + GlobalProperties.counter()).
                    AddContactAttribute("pager", "12345612" + GlobalProperties.counter()).
                    AddContactAttribute("email3", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name")).
                    AddContactAttribute("workStreet", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workCity", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workState", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workPostalCode", "12345613" + GlobalProperties.counter()).
                    AddContactAttribute("workURL", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homeStreet", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homeCity", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homeState", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homePostalCode", "12345613" + GlobalProperties.counter()).
                    AddContactAttribute("homeURL", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherStreet", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherCity", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherState", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherPostalCode", "12345613" + GlobalProperties.counter()).
                    AddContactAttribute("otherURL", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("notes", "This is an Imp Note for this Contact" + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("email", email)));

                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
                string j = "" + i + "";
                contactEmail.Add(j,email);
            }
            #endregion

            #region Outlook block for verification
            OutlookCommands.Instance.Sync();

            foreach (string key in contactEmail.Keys)
            {
                RDOContactItem rContact = OutlookMailbox.Instance.findContact(contactEmail[key]) as RDOContactItem;
                switch (key)
                {
                    case "1":
                        zAssert.AreEqual(rContact.LastName + ", " + rContact.FirstName, rContact.FileAs, "Synced Correctly FileAs:--LastName,Firstname MiddleName");
                        break;

                    case "2":
                        zAssert.AreEqual((rContact.FirstName + " " + rContact.LastName), rContact.FileAs, "Synced Correctly FileAs:--FirstName MiddleName LastName");
                        break;

                    case "3":
                        zAssert.AreEqual((rContact.CompanyName), rContact.FileAs, "Synced Correctly FileAs:--Company Name");
                        break;

                    case "4":
                        zAssert.AreEqual((rContact.LastName + ", " + rContact.FirstName + "\n" + rContact.CompanyName), rContact.FileAs, "Synced Correctly FileAs:--LastName,Firstname MiddleName (Company)");
                        break;

                    case "5":
                        zAssert.AreEqual((rContact.FirstName + " " + rContact.LastName + "\n" + rContact.CompanyName), rContact.FileAs, "Synced Correctly FileAs:--FirstName LastName (Company)");
                        break;

                    case "6":
                        zAssert.AreEqual((rContact.CompanyName + "\n" + rContact.LastName + ", " + rContact.FirstName), rContact.FileAs, "Synced Correctly FileAs:--Company(LastName,Firstname MiddleName)");
                        break;

                    case "7":
                        zAssert.AreEqual((rContact.CompanyName + "\n" + rContact.FirstName + " " + rContact.LastName), rContact.FileAs, "Synced Correctly FileAs:--Company(Firstname LastName)");
                        break;
                }
            }
            #endregion
        }

        [Test, Description("Verify that ZCO can sync a Contact(without MiddleName) with Correct 'FileAs' Option")]
        [Category("Contact")]
        public void GetContact_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            Dictionary<string, string> contactEmail = new Dictionary<string, string>();
            string email;
            #endregion

            #region SOAP Block
            for (int i = 1; i <= 7; i++)
            {
                email = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                    AddContactAttribute("firstName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("lastName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workFax", "1234561" + GlobalProperties.counter()).
                    AddContactAttribute("fileAs", "" + i + "").
                    AddContactAttribute("company", UtilFunctions.RandomStringGenerator() + GlobalProperties.counter()).
                    AddContactAttribute("workPhone2", "1234562" + GlobalProperties.counter()).
                    AddContactAttribute("callbackPhone", "1234563" + GlobalProperties.counter()).
                    AddContactAttribute("carPhone", "1234564" + GlobalProperties.counter()).
                    AddContactAttribute("homePhone2", "1234565" + GlobalProperties.counter()).
                    AddContactAttribute("homeFax", "1234566" + GlobalProperties.counter()).
                    AddContactAttribute("otherPhone", "1234567" + GlobalProperties.counter()).
                    AddContactAttribute("otherFax", "1234568" + GlobalProperties.counter()).
                    AddContactAttribute("email2", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name")).
                    AddContactAttribute("jobTitle", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workPhone", "1234569" + GlobalProperties.counter()).
                    AddContactAttribute("homePhone", "12345610" + GlobalProperties.counter()).
                    AddContactAttribute("mobilePhone", "12345611" + GlobalProperties.counter()).
                    AddContactAttribute("pager", "12345612" + GlobalProperties.counter()).
                    AddContactAttribute("email3", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name")).
                    AddContactAttribute("workStreet", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workCity", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workState", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("workPostalCode", "12345613" + GlobalProperties.counter()).
                    AddContactAttribute("workURL", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homeStreet", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homeCity", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homeState", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("homePostalCode", "12345613" + GlobalProperties.counter()).
                    AddContactAttribute("homeURL", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherStreet", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherCity", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherState", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("otherPostalCode", "12345613" + GlobalProperties.counter()).
                    AddContactAttribute("otherURL", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("notes", "This is an Imp Note for this Contact" + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("email", email)));

                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
                string j = "" + i + "";
                contactEmail.Add(j, email);
            }
            #endregion

            #region Outlook block for verification
            OutlookCommands.Instance.Sync();

            foreach (string key in contactEmail.Keys)
            {
                RDOContactItem rContact = OutlookMailbox.Instance.findContact(contactEmail[key]) as RDOContactItem;
                switch (key)
                {
                    case "1":
                        zAssert.AreEqual(rContact.LastName + ", " + rContact.FirstName, rContact.FileAs, "Synced Correctly FileAs:--LastName,Firstname");
                        break;

                    case "2":
                        zAssert.AreEqual((rContact.FirstName + " " + rContact.LastName), rContact.FileAs, "Synced Correctly FileAs:--FirstName LastName");
                        break;

                    case "3":
                        zAssert.AreEqual((rContact.CompanyName), rContact.FileAs, "Synced Correctly FileAs:--Company Name");
                        break;

                    case "4":
                        zAssert.AreEqual((rContact.LastName + ", " + rContact.FirstName + "\n" + rContact.CompanyName), rContact.FileAs, "Synced Correctly FileAs:--LastName,Firstname (Company)");
                        break;

                    case "5":
                        zAssert.AreEqual((rContact.FirstName + " " + rContact.LastName + "\n" + rContact.CompanyName), rContact.FileAs, "Synced Correctly FileAs:--FirstName LastName (Company)");
                        break;

                    case "6":
                        zAssert.AreEqual((rContact.CompanyName + "\n" + rContact.LastName + ", " + rContact.FirstName), rContact.FileAs, "Synced Correctly FileAs:--Company(LastName,Firstname)");
                        break;

                    case "7":
                        zAssert.AreEqual((rContact.CompanyName + "\n" + rContact.FirstName + " " + rContact.LastName), rContact.FileAs, "Synced Correctly FileAs:--Company(Firstname LastName)");
                        break;
                }
            }
            #endregion
 
        }

        [Test, Description("Verify that contact with HTML notes is sycned to ZCO")]
        [Bug("23233")] //Enhancement bug
        [ Category("Contact")]
        public void GetContact_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string firstname = "firstname" + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = "lastname" + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string note = "note" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP Block
            zAccount.AccountZCO.sendSOAP(
               @"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>" + firstname + @"</a>
                        <a n='lastName'>" + lastname + @"</a>
                        <a n='email'>" + email + @"</a>
					    <a n='notesHtml'>" + "&lt;html&gt;&lt;body&gt;my &lt;b&gt;" + note + "&lt;/b&gt; is here&lt;/body&gt;&lt;/html&gt;"+ @"</a>
                    </cn>     
                </CreateContactRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOContactItem rdoContactItem = OutlookMailbox.Instance.findContact(email) as RDOContactItem;
            zAssert.IsNotNull(rdoContactItem, "Check that contact exists in the contacts book");
            zAssert.AreEqual(lastname, rdoContactItem.LastName, "Check contact lastname");
            zAssert.AreEqual(firstname, rdoContactItem.FirstName, "Check contact firstname");
            zAssert.IsNotNull(rdoContactItem.HTMLBody, "Check that contact's HTML notes exists in the contacts book");
            zAssert.IsTrue(rdoContactItem.HTMLBody.Contains("<b>"+note+"</b>"), "Check contact notes contain HTML text");
            #endregion

        }
    }
}