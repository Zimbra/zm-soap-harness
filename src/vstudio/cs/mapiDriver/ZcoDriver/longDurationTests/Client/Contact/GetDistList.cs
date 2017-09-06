using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Collections;
using Redemption;
using SoapWebClient;
using SyncHarness;

namespace longDurationTests.Client.Contact
{
    [TestFixture]
    public class GetDistList : clientTests.BaseTestFixture
    {
        [Test, Description("Verify that a DistList (100 contacts) created in ZWC synced to ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetDistList_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            const int numberOfContacts = 100;
            String[] contactEmails = new string[numberOfContacts];
            string dlMembers = null;
            #endregion

            #region SOAP block to create an 100 contacts and DL
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

        [Test, Description("Verify that 100 random DistLists (with a random number of members) can be created in ZCS and synced correctly to ZCO")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCO)]
        public void GetDistList_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            const int numberOfContacts = 100;
            const int numberOfDistLists = 100;
            string comma = " , ";
            String[] contactEmails = new string[numberOfContacts];
            String[] contactDLs = new string[numberOfDistLists];
            String[] memberofDLs = new string[numberOfContacts];
            #endregion

            #region SOAP block to create an 100 contacts and DL
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

            for (int i = 0; i < numberOfDistLists; i++)
            {
                int j = 0;
                string dlmembers = null;
                contactDLs[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();

                int startRandomContact = UtilFunctions.RandomNumberGenerator();
                int endRandomContact = UtilFunctions.RandomNumberGenerator(startRandomContact);

                for (j = startRandomContact; j < endRandomContact - 1; j++)
                {
                    dlmembers += (contactEmails[j] + comma);
                }
                dlmembers = dlmembers + contactEmails[j];

                memberofDLs[i] = dlmembers;

                zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                                AddContact(new ContactObject().
                                    AddContactAttribute("fileAs", "8:" + contactDLs[i]).
                                    AddContactAttribute("nickname", contactDLs[i]).
                                    AddContactAttribute("dlist", memberofDLs[i]).
                                    AddContactAttribute("type", "group")));

                zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse", null, null, null, 1);
            }
            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify contacts folder is found");

            for (int i = 0; i < numberOfDistLists; i++)
            {
                RDODistListItem rdoDistListItem = contacts.Items.Find("[subject] = '" + contactDLs[i] + "'") as RDODistListItem;
                zAssert.IsNotNull(rdoDistListItem, "Verify that the dist list was found in the contacts folder");
                zAssert.AreEqual(rdoDistListItem.Subject, contactDLs[i], "Verify that the Dist List name matches");

                for (int j = 1; j <= rdoDistListItem.Members.Count; j++)
                {
                    RDOAddressEntry e = rdoDistListItem.GetMember(j);
                    zAssert.IsTrue(memberofDLs[i].Contains(e.Address.ToString()), "Verify that the Dist List " + rdoDistListItem.Subject + " contains the member " + e.Address.ToString());
                }
            }
            #endregion

        }
    }
}
