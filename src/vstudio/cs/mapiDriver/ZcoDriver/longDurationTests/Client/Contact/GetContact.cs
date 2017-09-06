using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using SoapAdmin;
using System.Collections;
using System.IO;
using SyncHarness;

namespace longDurationTests.Client.Contact
{
    [TestFixture]
    public class GetContact : clientTests.BaseTestFixture
    {
        [Test, Description("Verify that 100 Contact created in ZCS synced to ZCO correctly")]
        [Category("Contact")]
        public void GetContact_07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            Dictionary<string, string> emailArr = new Dictionary<string, string>();
            Dictionary<string, string> fnameArr = new Dictionary<string, string>();
            Dictionary<string, string> lnameArr = new Dictionary<string, string>();
            #endregion

            #region SOAP Block to create contacts
            for (int i = 1; i <= 100; i++)
            {
                string contactEmail = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
                string contactFname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                string contactLname = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().
                    AddContactAttribute("firstName", contactFname).
                    AddContactAttribute("lastName", contactLname).
                    AddContactAttribute("workFax", "1234561" + GlobalProperties.counter()).
                    AddContactAttribute("fileAs", "1").
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
                    AddContactAttribute("email",contactEmail).
                    AddContactAttribute("otherURL", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                    AddContactAttribute("notes", "This is an Imp Note for this Contact" + GlobalProperties.time() + GlobalProperties.counter())));

                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
                string j = "" + i + "";
                emailArr.Add(j, contactEmail);
                fnameArr.Add(j,contactFname);
                lnameArr.Add(j,contactLname);
            }

            #endregion

            #region Outlook Block for Verification

            OutlookCommands.Instance.Sync();

            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            foreach (string key in emailArr.Keys)
            {
                RDOContactItem rdoContact = OutlookMailbox.Instance.findContact(emailArr[key]) as RDOContactItem;
                zAssert.IsNotNull(rdoContact, "Verify that the Contact was found in the contacts folder");
                zAssert.AreEqual(rdoContact.FirstName, fnameArr[key], "Verify that the first name of Contact matches");
                zAssert.AreEqual(rdoContact.LastName, lnameArr[key], "Verify that the Last name of Contact matches");
            }

            #endregion


        }

        [Test, Description("Verify that ZCO can sync a contacts imported from CSV file.")]
        [Category("Contact")]
        public void GetContact_08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            #region Test Case variables
            const int Modified_Upload_Size = 52428800;
            string filename = GlobalProperties.TestMailRaw + "Contact/ZContacts5000.csv";
            string UploadId, uploadSize;
            Dictionary<string, string> csvEntry = new Dictionary<string, string>();
            #endregion

            #region SOAP Block to Change the default Upload Size Setting
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.GetConfigRequest().GetAttributeValue(ConfigAttributes.zimbraFileUploadMaxSize));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:GetConfigResponse/admin:a[@n='zimbraFileUploadMaxSize']", null, null, out uploadSize, 1);
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new SoapAdmin.ModifyConfigRequest().ModifyAttribute(ConfigAttributes.zimbraFileUploadMaxSize, Modified_Upload_Size.ToString()));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyConfigResponse", null, null, null, 1);
            zAccount.AccountZCO.sendSOAP(
                @"  <uploadServletRequest xmlns='urn:zimbraMail'>
                        <filename>" + filename + @"</filename>
                    </uploadServletRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:uploadServletResponse/mail:cn", "id", null, out UploadId, 1);
            #endregion

            #region Outlook Block
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");
            bool headerRow = true;
            int k;
            int minimumVerification = 5;
            int maximumVerification = 50;
            int randomNumberOfContactVerification = UtilFunctions.RandomNumberGenerator(minimumVerification, maximumVerification);
            int verificationCount = 0;
            using (StreamReader readFile = new StreamReader(GlobalProperties.ZimbraQARoot + filename))
            {
                string line;
                string[] row;
                string[] headerKeyArray = null;

                while ((line = readFile.ReadLine()) != null && verificationCount < randomNumberOfContactVerification)
                {
                    row = line.Split(',');

                    if (headerRow) //First Row of the CSV file
                    {
                        headerKeyArray = new string[row.Length];
                        for (k = 0; k < row.Length; k++)
                        {

                            string s = row[k].ToString();
                            s = s.Replace("\\", "");
                            s = s.Replace("\"", "");
                            headerKeyArray[k] = s;
                        }
                        headerRow = false;
                        verificationCount++;
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

                        RDOContactItem rdoContact = OutlookMailbox.Instance.findContact(csvEntry["firstName"], contacts, true);
                        zAssert.AreEqual(rdoContact.FirstName, csvEntry["firstName"], "Verify that the firstName of Contact matches");
                        zAssert.AreEqual(rdoContact.LastName, csvEntry["lastName"], "Verify that the lastName of Contact matches");
                        zAssert.AreEqual(rdoContact.Email1Address, csvEntry["email"], "Verify that the email of Contact matches");
                        verificationCount++;
                    }
                }
            }

            #endregion

        }
    }
}
