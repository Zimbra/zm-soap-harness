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
    public class CreateDistList : clientTests.BaseTestFixture
    {
        [Test, Description("Verify that a DistList (100 contacts) created in ZCO synced to ZWC")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateDistList_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            string dlName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
            string dlId;
            const int numberOfContacts = 100;
            String[] contactEmails = new string[numberOfContacts];
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

                RDOContactItem rdoContactItem = contacts.Items.Add("IPM.Contact") as RDOContactItem;
                zAssert.IsNotNull(rdoContactItem, "Verify that the rdo contact item is created correctly");

                rdoContactItem.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.Email1Address = contactEmails[i];
                rdoContactItem.Save();
            }

            RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
            zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");
            rdoDistListItem.DLName = dlName;

            for (int i = 0; i < numberOfContacts; i++)
            {
                rdoDistListItem.AddMember(contactEmails[i]);
            }

            rdoDistListItem.Save();

            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for Verification
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dlName));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "id", dlId, null, 1);
            zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
            for (int i = 0; i < numberOfContacts; i++)
            {

                zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, contactEmails[i], null, 1);
            }

            #endregion

        }

        [Test, Description("Verify that 100 random DistLists (with a random number of members) can be created and synced")]
        [Category("Contact")]
        [SyncDirection(SyncDirection.TOZCS)]
        public void CreateDistList_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Variables
            const int numberOfContacts = 100;
            const int numberOfDistLists = 100;
            String[] contactEmails = new string[numberOfContacts];
            string dlId, dlList;
            ArrayList distlistNames = new ArrayList(numberOfDistLists);
            #endregion

            #region Outlook Block to create contact group
            RDOFolder contacts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(Redemption.rdoDefaultFolders.olFolderContacts);
            zAssert.IsNotNull(contacts, "Verify the contacts folder is found");

            for (int i = 0; i < numberOfContacts; i++)
            {
                contactEmails[i] = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
                RDOContactItem rdoContactItem = contacts.Items.Add("IPM.Contact") as RDOContactItem;
                zAssert.IsNotNull(rdoContactItem, "Verify that the rdo contact item is created correctly");
                rdoContactItem.FirstName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.LastName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                rdoContactItem.Email1Address = contactEmails[i];
                rdoContactItem.Save();
            }

            for (int i = 0; i < numberOfDistLists; i++)
            {
                RDODistListItem rdoDistListItem = contacts.Items.Add("IPM.DistList") as RDODistListItem;
                zAssert.IsNotNull(rdoDistListItem, "Verify that the rdo distlist item is created correctly");
                rdoDistListItem.DLName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter();
                distlistNames.Add(rdoDistListItem.DLName);

                int numMembers = UtilFunctions.RandomNumberGenerator(0, numberOfContacts);
                for (int j = 0; j < numMembers; j++)
                {
                    int index = UtilFunctions.RandomNumberGenerator(1, numberOfContacts);
                    rdoDistListItem.AddMember(contactEmails[index - 1]);
                }
                rdoDistListItem.Save();
                rdoDistListItem = null;
            }
            OutlookCommands.Instance.Sync();
            #endregion

            #region SOAP Block for Verification
            for (int i = 1; i < contacts.Items.Count; i++)
            {
                RDODistListItem dl = contacts.Items[i] as RDODistListItem;
                if (dl == null)
                {
                    continue;   
                }

                if (!distlistNames.Contains(dl.Subject))
                {
                    continue; 
                }

                zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("contact").Query(dl.DLName));

                zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:cn", "id", null, out dlId, 1);
                zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(dlId));
                zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "id", dlId, null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='type']", null, "group", null, 1);
                zAccount.AccountZCO.selectSOAP("//mail:a[@n='nickname']", null, dl.DLName, null, 1);


                if (dl.Members.Count > 0)
                {
                    zAccount.AccountZCO.selectSOAP("//mail:a[@n='dlist']", null, null, out dlList, 1);
                    foreach (RDOAddressEntry member in dl.Members)
                    {
                        zAssert.IsTrue(dlList.Contains(member.Address), "Verify that the Dist List " + dl.DLName + " contains the member " + member.Address);
                    }
                }
                dl = null;
            }

            #endregion
        }

    }
}