using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Xml;
using Soap;
using SoapAdmin;
using Redemption;
using SoapWebClient;
using SyncHarness;
using Microsoft.Office.Interop.Outlook;
using System.Text.RegularExpressions;

namespace clientTests.Client.GAL.Bugs
{
    public class GALBugs : BaseTestFixture
    {
        [Test, Description("Bug 16479 / 20693: Some GAL edits not synced on Outlook restart / GAL not syncing automatically")]
        [Category("GAL")]
        [Bug("16479"), Bug("20693")]
        [TestSteps(
            "1.Create 10 Accounts(Most of the accounts are created during test execution)",
            "2.Sync to ZCO and Verify GAL sync correctly",
            "3.Delete Account on Server",
            "4.SyncGAL",
            "5.Checked that Deleted Account is not reflect in GAL",
            "6. Modify Account on Server",
            "7. SyncGAL",
            "8. Checked that GAL shows Modified Account")]
        public void GALBugs_16479()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase Varibles

            timestampTestCaseMaximum = 90;
            const int minGALAccounts = 5;
            const int NoofGALAccounts = 10;
            
            String[] GALAccounts = new string[NoofGALAccounts];
            String[] GALAccountIds = new string[NoofGALAccounts];
            
            #endregion

            #region Account Creation

            for (int i = 0; i < NoofGALAccounts; i++)
            {
                zAccount account = new zAccount();
                account.createAccount();
                GALAccounts[i] = (string)account.emailAddress;
                GALAccountIds[i] = (string)account.zimbraId;
            }

            #endregion

            #region Outlook Block: Sync GAL to Outlook

            System.Threading.Thread.Sleep(10000);

            OutlookCommands.Instance.SyncGAL();

            System.Threading.Thread.Sleep(10000);

            #endregion

            #region Check whether all the GAL members are synced correctly

            // Send SyncGALRequest
            zAccount.AccountZCO.sendSOAP(new SyncGalRequest());
            XmlNode SyncGalResponse = zAccount.AccountZCO.selectSOAP("//acct:SyncGalResponse", null, null, null, 1);
            
            RDOAddressList galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");

            for (int i = 0; i < NoofGALAccounts; i++)
            {
                try
                {
                    tcLog.Info("GAL Account: " + GALAccounts[i]);
                    RDOAddressEntry rdoAddressEntry = galAddressList.ResolveName(GALAccounts[i]);
                    zAssert.IsNotNull(rdoAddressEntry, "Verify that the address " + GALAccounts[i] + " exists in the GAL");
                }
                catch (System.Runtime.InteropServices.COMException e)
                {
                   throw new HarnessException("galAddressList.ResolveName() threw exception", e);
                }
            }

            #endregion

            /*PA: Commenting this section:
             * We use LDAP based GAL sync, and as per http://bugzilla.zimbra.com/show_bug.cgi?id=78139#c2, deleted records are not removed with "Update GAL" action in ZCO 
             * I can switch to use GSA for gal sync, but min gal polling interval is 1 min, which will require to put sleep of 90 secs after add/mod/del contact. This can be handled in different test
            #region Delete the Account on Server.

            int randomGALMember = UtilFunctions.RandomNumberGenerator(minGALAccounts, NoofGALAccounts);

            string IDAccounttobeDeleted = GALAccountIds[randomGALMember];
            string AccounttobeDeleted = GALAccounts[randomGALMember];

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new DeleteAccountRequest().zId(IDAccounttobeDeleted));

            #endregion

            #region Outlook Sync and GAL Sync

            System.Threading.Thread.Sleep(5000);

            OutlookCommands.Instance.SyncGAL();

            //System.Threading.Thread.Sleep(000);

            #endregion

            #region Verification on ZCO Side

            galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");

            for (int j = 1; j <= galAddressList.AddressEntries.Count; j++)
            {

                string Address = galAddressList.AddressEntries.Item(j).Address;

                if (Address.Equals(AccounttobeDeleted))
                {
                    addressFound = true;
                    break;
                }
            }

            zAssert.IsFalse(addressFound, "Verify that deleted account is removed from ZCO GAL");

            #endregion
            */

            #region Modify the Account on Server.

            int randomGALMember = UtilFunctions.RandomNumberGenerator(1, minGALAccounts);

            string IDAccounttobeModified = GALAccountIds[randomGALMember];
            string AccounttobeModified = GALAccounts[randomGALMember];

            string newAccountName = UtilFunctions.RandomStringGenerator() + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new RenameAccountRequest().zId(IDAccounttobeModified).zNewName(newAccountName));

            #endregion

            #region Outlook Sync and GAL Sync

            System.Threading.Thread.Sleep(5000);

            OutlookCommands.Instance.SyncGAL();

            System.Threading.Thread.Sleep(10000);

            #endregion

            #region Verification on ZCO Side

            galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");
            try
            {
                tcLog.Info("GAL Account: " + newAccountName);
                RDOAddressEntry rdoAddressEntry1 = galAddressList.ResolveName(newAccountName);
                zAssert.IsNotNull(rdoAddressEntry1, "Verify that the address " + newAccountName + " exists in the GAL");
            }
            catch (System.Exception e)
            {
                throw new HarnessException("galAddressList.ResolveName() threw exception", e);
            }

            #endregion     

        }

        [Test, Description("Bug 28399: Outlook GAL Mappings are not updated when changing display name")]
        [Category("GAL")]
        [Bug("28399")]
        [TestSteps(
            "1. ZCO: Sync GAL",
            "2. SOAP: Verify if all the GAL accounts are synced properly",
            "3. SOAP: Modify the display name for Account User",
            "4. ZCO: Sync GAL and verify that the display name is updated")]
        public void GALBugs_28399()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Varibles

            timestampTestCaseMaximum = 60;
            string galAccountDisplayName = "DisplayName" + GlobalProperties.time() + GlobalProperties.counter();

            string GALAccount = null;
            string GALAccountID = null;
            string GALAccountName = null;

            #endregion

            #region Account Creation

            zAccount galAccount = new zAccount();
            galAccount.createAccount();
            GALAccount = galAccount.emailAddress;
            GALAccountID = galAccount.zimbraId;
            GALAccountName = galAccount.displayName;

            #endregion

            #region Outlook Block: Sync GAL to Outlook

            System.Threading.Thread.Sleep(5000);

            OutlookCommands.Instance.SyncGAL();

            System.Threading.Thread.Sleep(10000);

            #endregion

            #region SOAP Block: Check whether all the GAL members are synced correctly

            // Send SyncGALRequest
            zAccount.AccountZCO.sendSOAP(new SyncGalRequest());
            XmlNode SyncGalResponse = zAccount.AccountZCO.selectSOAP("//acct:SyncGalResponse", null, null, null, 1);

            RDOAddressList galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");

            try
            {
                tcLog.Info("GAL Account: " + GALAccount);
                RDOAddressEntry rdoAddressEntry = galAddressList.ResolveName(GALAccount);
                zAssert.IsNotNull(rdoAddressEntry, "Verify that the address " + galAccount + " exists in the GAL");
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                throw new HarnessException("galAddressList.ResolveName() threw exception", e);
            }
            
            #endregion

            #region SOAP Block: Modify the galAccount on the ZCS.

            // Auth as Admin
            string galAccountDisplayName_new = GALAccountName + galAccountDisplayName + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string newDisplayName = galAccountDisplayName_new;
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new ModifyAccountRequest().SetAccountId(GALAccountID).ModifyAttribute("displayname", newDisplayName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);

            #endregion

            #region Outlook Block: Sync GAL & Verify that the display name is updated

            System.Threading.Thread.Sleep(5000);

            OutlookCommands.Instance.SyncGAL();

            System.Threading.Thread.Sleep(10000);

            // Find the GAL
            galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");

            try
            {
                // Verify the updates address
                RDOAddressEntry AddressEntry = galAddressList.ResolveName(newDisplayName);
                zAssert.IsNotNull(AddressEntry, "Verify that the address " + newDisplayName + " exists in the GAL");

            }
            catch (System.Exception e)
            {
                throw new HarnessException("galAddressList.ResolveName() threw exception", e);
            }
            #endregion
        }

        [Test, Description("Bug 48780: Multiple GAL entries with aliases in OLK address book")]
        [Ignore("Obsolete test - Bug#66826 enabled alias user visibility in GAL as default behavior. Added test for Bug#66826")]
        [Category("GAL")]
        [Bug("48780")]
        [TestSteps(
            "1. SOAP: Add alias to a account",
            "2. ZCO: Sync Gal",
            "3. ZCO: Verify that the alias does not appear in the gal entries")]
        public void GALBugs_48780()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Varibles
            string aliasName = "account" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string accountName = "account" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string accountId;
            #endregion

            #region SOAP block to create account and add alias
            // Create the test account
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                UserName(accountName).
                UserPassword(GlobalProperties.getProperty("defaultpassword.value")));

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:account", "id", null, out accountId, 1);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(accountId, aliasName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region Outlook block 
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();
            RDOAddressList galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");
            zAssert.IsFalse(galAddressList.ToString().Contains(aliasName), "Gal does not cotain alias address");
            #endregion

        }

        [Test, Description("Bug 66826: GAL search for aliases not working")]
        [Category("GAL")]
        [Bug("66826")]
        [TestSteps(
            "1. SOAP: Add alias to a account",
            "2. ZCO: Sync Gal",
            "3. ZCO: Verify that the alias appears in the gal entries")]
        public void GALBugs_66826()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Varibles
            string aliasName = "account" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string accountName = "account" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string accountId;
            bool addressFound = false;
            #endregion

            #region SOAP block to create account and add alias
            // Create the test account
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                UserName(accountName).
                UserPassword(GlobalProperties.getProperty("defaultpassword.value")));

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:account", "id", null, out accountId, 1);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(accountId, aliasName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);
            #endregion

            #region Outlook block
            System.Threading.Thread.Sleep(5000);

            OutlookCommands.Instance.SyncGAL();

            System.Threading.Thread.Sleep(10000);

            RDOAddressList galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");
            
            for (int j = 1; j <= galAddressList.AddressEntries.Count; j++)
            {

                string Address = galAddressList.AddressEntries.Item(j).Address;

                if (Address.Equals(accountName))
                {
                    addressFound = true;
                    break;
                }
            }

            zAssert.IsTrue(addressFound, "Verify that ZCO GAL contains alias address");

            #endregion

        }
    }
}