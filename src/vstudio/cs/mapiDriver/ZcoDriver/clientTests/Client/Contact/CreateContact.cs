using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using SyncHarness;
using System.Xml;

namespace clientTests.Client.Contact
{
    [TestFixture]
    public class CreateContact : BaseTestFixture
    {
        [Test, Description("Verify that Contact created in ZCO synced to ZWC")]
        [Category("SMOKE"), Category("Contact")]
        public void CreateContact_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

            string contactId;

            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;

            rContact.Save();

            #endregion

            //Sync ZCO
            OutlookCommands.Instance.Sync();

            #region SOAP Block for Verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>"+ firstname +@"</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(
                @"  <GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='"+ contactId +@"'/>
                    </GetContactsRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);

            #endregion

        }

        [Test, Description("Verify that Contact created with picture in ZCO synced to ZWC")]
        [Category("Contact")]
        public void CreateContact_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string filename = GlobalProperties.TestMailRaw + "photos/Picture1.jpg";
            string contactId;

            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.AddPicture(filename);
            rContact.Save();

            #endregion

            //Sync ZCO
            OutlookCommands.Instance.Sync();

            #region SOAP Block for Verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + firstname + @"</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(
                @"  <GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
                    </GetContactsRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='image']", "filename","ContactPicture.jpg", null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='image']", "ct", "image/jpeg", null, 1);
            #endregion

        }

        [Test, Description("Verify that ZWC can sync a Contact with Correct 'FileAs' Option")]
        [Category("Contact")]
        public void CreateContact_04()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            Dictionary<string, string> EmailAddressList = new Dictionary<string, string>();
            Dictionary<string, string> fileAsList = new Dictionary<string, string>();
            string contactId;
            #endregion

            #region Outlook block to create contacts
            int i = 1;
            for (i = 1; i <= 7; i++)
            {
                RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
                zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

                rContact.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.Email1Address = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rContact.CompanyName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                switch (i)
                {
                    case 1:
                        rContact.FileAs = (string)(rContact.CompanyName + rContact.LastName + ", " + rContact.FirstName);
                        break;
                    case 2:
                        rContact.FileAs = (string)(rContact.CompanyName + rContact.FirstName + " " + rContact.LastName);
                        break;

                    case 3:
                        rContact.FileAs = (string)(rContact.CompanyName);
                        break;

                    case 4:
                        rContact.FileAs = (string)(rContact.LastName + ", " + rContact.FirstName + rContact.CompanyName);
                        break;

                    case 5:
                        rContact.FileAs = (string)(rContact.FirstName + " " + rContact.LastName);
                        break;

                    case 6:
                        rContact.FileAs = (string)(rContact.LastName + ", " + rContact.FirstName);
                        break;

                    case 7:
                        rContact.FileAs = (string)(rContact.FirstName + " " + rContact.LastName + "\n" + rContact.CompanyName);
                        break;

                }
                rContact.Save();
                string j = "" + i + "";
                EmailAddressList.Add(j, (string)rContact.Email1Address);
                fileAsList.Add(j, (string)rContact.FileAs);
                OutlookCommands.Instance.Sync();
                #endregion

                #region SOAP Block for Verification of Contacts
                foreach (string key in EmailAddressList.Keys)
                {
                    zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(EmailAddressList[key]));
                    zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);
                    zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
                    zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, (string)EmailAddressList[key], null, 1);
                    zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='fileAs']", null, "8:" + fileAsList[key], null, 1);
                }
                #endregion


            }

        }

        [Test, Description("Verify that Adding IM addr in ZCO does not cause any misleading behavior")]
        [Bug("40102")]
        [Category("Contact")]
        public void CreateContact_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailAddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string imAddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contactId;

            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailAddress;
            rContact.IMAddress = imAddress;
            rContact.Save();

            #endregion

            //Sync ZCO
            OutlookCommands.Instance.Sync();

            #region SOAP Block for Verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + firstname + @"</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(
                @"  <GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
                    </GetContactsRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, emailAddress, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='imAddress1']", null, imAddress, null, 1);
            #endregion

        }

        [Test, Description("Verify that outlook user-defined fields are synced correctly to the server")]
        [Bug("13551")]
        [Category("Contact")]
        public void CreateContact_06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailAddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string userDefinedField1 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string userDefinedField2 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string userDefinedField3 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string userDefinedField4 = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contactId;

            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailAddress;
            rContact.User1 = userDefinedField1;
            rContact.User2 = userDefinedField2;
            rContact.User3 = userDefinedField3;
            rContact.User4 = userDefinedField4;
            rContact.Save();

            #endregion

            //Sync ZCO
            OutlookCommands.Instance.Sync();

            #region SOAP Block for Verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + firstname + @"</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(
                @"  <GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
                    </GetContactsRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, emailAddress, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='outlookUserField1']", null, userDefinedField1, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='outlookUserField2']", null, userDefinedField2, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='outlookUserField3']", null, userDefinedField3, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='outlookUserField4']", null, userDefinedField4, null, 1);
            #endregion

        }

        [Test, Description("Verify that radio contact number field is synced correctly to the server")]
        [Bug("27905")]
        [Category("Contact")]
        public void CreateContact_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailAddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string radioTelephoneNumber = "408 - 555 - 1212";
            string contactId;

            #endregion

            #region Outlook Block to create contact

            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailAddress;
            rContact.RadioTelephoneNumber = radioTelephoneNumber;
            rContact.Save();

            #endregion

            //Sync ZCO
            OutlookCommands.Instance.Sync();

            #region SOAP Block for Verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + firstname + @"</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(
                @"  <GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
                    </GetContactsRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, emailAddress, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='Radio']", null, radioTelephoneNumber, null, 1);
            #endregion
        }

        [Test, Description("Verify that Contact created with HTML notes in ZCO synced to ZWC")]
        [Bug("23233")] //Enhancement bug
        [Category("SMOKE"), Category("Contact")]
        public void CreateContact_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables

            string firstname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string lastname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string emailaddress = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string note = "note" + UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string contactId;

            #endregion

            #region Outlook Block to create contact
            //RDONoteItem rNote = OutlookMailbox.Instance.CreateObject(OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts), "IPM.StickyNote") as RDONoteItem;
            //rNote.Subject = "note1";
            //rNote.Body = "Sample subject";
            //rNote.Color = rdoNoteColor.olPink;
            //rNote.Save();
            RDOContactItem rContact = OutlookMailbox.Instance.CreateContact();
            zAssert.IsNotNull(rContact, "Verify that the rdo contact item is created correctly");

            //Outlook saves first character of contact to Uppercase,so firstname is written as Firstname
            rContact.FirstName = firstname;
            rContact.LastName = lastname;
            rContact.Email1Address = emailaddress;
            rContact.HTMLBody = "<html><body>my <b>" + note + "</b> is here</body></html>";
            //rContact.Body = "bold";
            //rContact.BodyFormat = 2;
            rContact.Save();

            #endregion

            //Sync ZCO
            OutlookCommands.Instance.Sync();

            #region SOAP Block for Verification


            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(
                @"  <SearchRequest xmlns='urn:zimbraMail' types='contact'>
                        <query>" + firstname + @"</query>
                    </SearchRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out contactId, 1);

            zAccount.AccountZCO.sendSOAP(
                @"  <GetContactsRequest xmlns='urn:zimbraMail'>
                        <cn id='" + contactId + @"'/>
                    </GetContactsRequest>");

            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='firstName']", null, firstname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='lastName']", null, lastname, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='email']", null, emailaddress, null, 1);
            XmlNode notesHTML = zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='notesHtml']", null, null, null, 1);
            string notesContent=notesHTML.InnerText;
            zAssert.IsTrue(notesContent.Contains(note), "notes contain html formated text");
            //zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn/mail:a[@n='BodyFormat']", null, "2", null, 1);
            #endregion

        }
    }
}
