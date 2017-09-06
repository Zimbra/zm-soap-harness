using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using SyncHarness;

namespace clientTests.Client.Contact
{
    [TestFixture]
    public class GetDistList : BaseTestFixture
    {
        [Test, Description("Verify that ZCO can sync a distribution List (empty)")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetDistList_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region SOAP block to create an empty distribution list
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", "").
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook block to move contact group to trash
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);

            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the distribution list was found in the contacts folder");
            #endregion
 
        }

        [Test, Description("Verify that ZCO can sync a distribution List (with one Contact)")]
        [Category("SMOKE"), Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetDistList_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string email = "email" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            #endregion

            #region SOAP block to create distribution list with one contact
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().AddContact(new ContactObject().AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", email).
                                            AddContactAttribute("type", "group")));
            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook block to move contact group to trash
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);

            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
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
            #endregion
 
        }

        [Test, Description("Verify that a DistList (10 contacts) created in ZWC synced to ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetDistList_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            const int numberOfContacts = 10;
            String[] contactEmails = new string[numberOfContacts];
            string dlMembers = null;
            #endregion

            #region SOAP block to create 10 contacts and DL
            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                        AddContact(new ContactObject().
                        AddContactAttribute("firstName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("lastName", UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter()).
                        AddContactAttribute("email", contactEmails[i])));
                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            }

            int j = 0;
            for (j = 0; j < numberOfContacts - 1; j++)
            {
                dlMembers = dlMembers + (contactEmails[j] + ",");
            }
            dlMembers = dlMembers + contactEmails[j];

            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                                        AddContact(new ContactObject().
                                            AddContactAttribute("fileAs", "8:" + dlName).
                                            AddContactAttribute("nickname", dlName).
                                            AddContactAttribute("dlist", dlMembers).
                                            AddContactAttribute("type", "group")));

            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            #endregion

            #region Outlook block for verification
            OutlookCommands.Instance.Sync();
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            RDODistListItem rdoDistList = contacts.Items.Find("[subject] = '" + dlName + "'") as RDODistListItem;
            zAssert.IsNotNull(rdoDistList, "Verify that the dist list was found in the trash folder");
            zAssert.AreEqual(rdoDistList.Subject, dlName, "Verify that the Dist List name matches");
            bool found = false;
            for (int i = 1; i <= rdoDistList.Members.Count; i++)
            {
                RDOAddressEntry e = rdoDistList.GetMember(i);
                if (e.Address.Equals((string)contactEmails[i - 1], StringComparison.InvariantCultureIgnoreCase))
                {
                    found = true;
                    zAssert.IsTrue(found, "Verify that Dist List member " + e.Address + " name matched with " + contactEmails[i - 1] + "");
                }
                else
                {
                    found = false;
                    break;
                }
            }
            zAssert.IsTrue(found, "Verify that All Dist List members name matched");
            #endregion

 
        }

    }
}
