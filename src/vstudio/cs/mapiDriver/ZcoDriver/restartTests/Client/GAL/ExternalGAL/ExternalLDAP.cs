using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using Redemption;
using SoapWebClient;
using SoapAdmin;

namespace restartTests.Client.GAL.ExternalGAL
{
    public class ExternalLDAP : clientTests.BaseTestFixture
    {
        [Test, Description("Verify GAL can be accessed after initial sync (External LDAP)")]
        [Category("GAL")]
        [TestSteps(
            "Create domain with external GAL",
            "Create a new account",
            "Initial Sync",
            "Lookup external contact from the GAL")]
        public void ExternalLDAP_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Create new domain with external GAL

            string domainname = "externalgal." + GlobalProperties.time() + "." + GlobalProperties.counter() + ".com";

            zAccountAdmin.GlobalAdminAccount.sendSOAP(
                                                new CreateDomainRequest().
                                                    DomainName(domainname).
                                                    AddDomainAtribute("zimbraGalMode", "ldap").
                                                    AddDomainAtribute("zimbraGalMaxResults", "100").
                                                    AddDomainAtribute("zimbraGalLdapURL",
                                                        String.Format("ldap://{0}:{1}", GlobalProperties.getProperty("LDAP.url"), GlobalProperties.getProperty("LDAP.port"))).
                                                    AddDomainAtribute("zimbraGalLdapSearchBase", GlobalProperties.getProperty("LDAP.LDAPsearchBase")).
                                                    AddDomainAtribute("zimbraGalLdapBindDn", GlobalProperties.getProperty("LDAP.bindDN")).
                                                    AddDomainAtribute("zimbraGalLdapBindPassword", GlobalProperties.getProperty("LDAP.bindPassword")).
                                                    AddDomainAtribute("zimbraGalLdapFilter", GlobalProperties.getProperty("LDAP.GALfilter"))
                                            );

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:CreateDomainResponse", null, null, null, 1);

            #endregion

            #region Account Setup - get the folder list

            // Get the inbox id
            zAccount zcoAccount = new zAccount(domainname);
            zcoAccount.createAccount();
            zcoAccount.sendSOAP(new SyncGalRequest());
            zcoAccount.selectSOAP("//acct:SyncGalResponse", null, null, null, 0);

            #endregion

            #region Stop Outlook
            OutlookProcess.Instance.StopApplication("Kill Outlook");
            #endregion

            #region Initial Sync OLK
            OutlookProfile profile = new OutlookProfile(zcoAccount);
            OutlookProcess.Instance.StartApplication(profile);
            #endregion

            #region Verify the GAL includes the external accounts

            OutlookCommands.Instance.Sync();

            bool found = false;

            RDOAddressList galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify the GAL address list exists");

            RDOAddressEntries addressEntries = galAddressList.AddressEntries;
            RDOAddressEntry addressEntry = addressEntries.GetFirst();
            while (addressEntry != null)
            {
                tcLog.Info("GAL Address: " + addressEntry.Address);
                if (addressEntry.Address.Equals(GlobalProperties.getProperty("LDAP.GAL.account01.email")))
                {
                    found = true;
                    break;
                }

                addressEntry = addressEntries.GetNext();
            }

            zAssert.IsTrue(found, "Verify the GAL contains the correct address");

            #endregion

            #region Stop Outlook
            OutlookProcess.Instance.StopApplication("Kill Outlook");
            #endregion

        }
    }
}
