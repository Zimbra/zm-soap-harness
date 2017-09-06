using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Xml;
using Soap;
using Redemption;
using SoapWebClient;
using SyncHarness;
using Microsoft.Office.Interop.Outlook;
using System.Text.RegularExpressions;

namespace clientTests.Client.GAL
{
    [TestFixture]
    public class SyncGAL : BaseTestFixture
    {

        [Test, Description("Verify that basic SyncGAL action works")]
        [Ignore("GALBugs_16479 test already covers this use case")]
        [Category("SMOKE"), Category("GAL")]
        public void SyncGAL_Basic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case Varibles

            string account1 = zAccount.AccountA.emailAddress;
            string account2 = zAccount.AccountB.emailAddress;
            string account3 = zAccount.AccountC.emailAddress;
            string account4 = zAccount.AccountD.emailAddress; 

            #endregion

            #region SOAP: SyncGAL request

            zAccount.AccountZCO.sendSOAP(new SyncGalRequest());
            XmlNode SyncGalResponse = zAccount.AccountZCO.selectSOAP("//acct:SyncGalResponse", null, null, null, 1);

            #endregion

            #region ZCO: sync GAL, check known users are resolved in GAL address list
            // Sync any changes
            OutlookCommands.Instance.Sync();

            // Sync the GAL so that the address is now in the GAL.
            OutlookCommands.Instance.SyncGAL();

            // TODO: Workaround while waiting for bug 30728 to be implemented
            System.Threading.Thread.Sleep(5000);

            RDOAddressList galAddressList = OutlookMailbox.Instance.getGalAddressList();
            zAssert.IsNotNull(galAddressList, "Verify that the GAL was found");

            try
            {
                RDOAddressEntry rdoAddressEntry = galAddressList.ResolveName(account1);
                zAssert.IsNotNull(rdoAddressEntry, "Verify that the address " + account1 + " exists in the GAL");

                rdoAddressEntry = galAddressList.ResolveName(account2);
                zAssert.IsNotNull(rdoAddressEntry, "Verify that the address " + account2 + " exists in the GAL");

                rdoAddressEntry = galAddressList.ResolveName(account3);
                zAssert.IsNotNull(rdoAddressEntry, "Verify that the address " + account3 + " exists in the GAL");

                rdoAddressEntry = galAddressList.ResolveName(account4);
                zAssert.IsNotNull(rdoAddressEntry, "Verify that the address " + account4 + " exists in the GAL");

                rdoAddressEntry = galAddressList.ResolveName(zAccount.AccountZCO.emailAddress);
                zAssert.IsNotNull(rdoAddressEntry, "Verify that the address " + zAccount.AccountZCO.emailAddress + " exists in the GAL");
                
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                throw new HarnessException("galAddressList.ResolveName() threw exception", e);
            }
            
            #endregion
        }
    }
}