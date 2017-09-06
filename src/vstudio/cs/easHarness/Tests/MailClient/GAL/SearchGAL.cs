using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;

namespace Tests.MailClient.GAL
{
    [TestFixture]
    public class SearchGAL : Tests.BaseTestFixture
    {


        [Test, Description("Search for an account in the GAL (using username of username@domain.com)"),
        Property("TestSteps", "1. Create an account to search for, 2. On device type username in compose mail To or Calendar invite To and verify the email address is auto completed")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L1")]
        public void SearchGAL01()
        {

            /*
             * Search for an account in the GAL (using username of username@domain.com)
             */



            #region TEST SETUP

            // Create an account to search for
            //
            ZimbraAccount account = new ZimbraAccount();
            account.provision();
            account.authenticate();


            #endregion



            #region TEST ACTION

            ZResponse response = TestClient.sendRequest(
                TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
                    <Search xmlns='Search'>
                        <Store>
                            <Name>GAL</Name>
                            <Query>" + account.UserName + @"</Query>
                            <Options>
                                <Range>0-50</Range>
                            </Options>
                        </Store>
                </Search>");
            ZAssert.IsNotNull(response, "Verify the response is correctly received");

            #endregion



            #region TEST VERIFICATION


            // Verify the system folders exist
            ZAssert.XmlXpathMatch(response.XmlElement, "//Search:Result//GAL:EmailAddress", null, account.EmailAddress, "Verify the account is returned in the search response");

            #endregion


        }


        [Test, Description("Search for an account in the GAL (using email address of username@domain.com)"),
        Property("TestSteps", "1. Create an account to search for, 2. On device type email address in compose mail To or Calendar invite To and verify the email address is auto completed")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L1")]
        public void SearchGAL02()
        {

            /*
             * Search for an account in the GAL (using email address of username@domain.com)
             */



            #region TEST SETUP

            // Create an account to search for
            //
            ZimbraAccount account = new ZimbraAccount();
            account.provision();
            account.authenticate();


            #endregion



            #region TEST ACTION

            ZResponse response = TestClient.sendRequest(
                TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
                    <Search xmlns='Search'>
                        <Store>
                            <Name>GAL</Name>
                            <Query>" + account.EmailAddress + @"</Query>
                            <Options>
                                <Range>0-50</Range>
                            </Options>
                        </Store>
                </Search>");

            #endregion



            #region TEST VERIFICATION


            ZAssert.IsNotNull(response, "Verify the Search Response was received");

            // Verify the system folders exist
            ZAssert.XmlXpathMatch(response.XmlElement, "//Search:Result//GAL:EmailAddress", null, account.EmailAddress, "Verify the account is returned in the search response");

            #endregion


        }

        [Test, Description("Search for an account in the GAL (using first name)"),
        Property("TestSteps", "1. Create an account to search for, 2. On device type first name in compose mail To or Calendar invite To and verify the email address is auto completed")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L1")]
        public void SearchGAL03()
        {

            /*
             * Search for an account in the GAL (using first name);
             */



            #region TEST SETUP

            String givenName = "first" + HarnessProperties.getUniqueString();
            String sn = "last" + HarnessProperties.getUniqueString();
            List<String> displayName = new List<String>();
            displayName.Add(givenName + " " + sn);

            // Create an account to search for
            //
            ZimbraAccount account = new ZimbraAccount();
            account.AccountAttributes.Add("displayName", displayName);
            account.AccountAttributes.Add("givenName", new List<String>(givenName.Split()));
            account.AccountAttributes.Add("sn", new List<String>(sn.Split()));
            account.provision();
            account.authenticate();


            #endregion



            #region TEST ACTION

            ZResponse response = TestClient.sendRequest(
                TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
                    <Search xmlns='Search'>
                        <Store>
                            <Name>GAL</Name>
                            <Query>" + givenName + @"</Query>
                            <Options>
                                <Range>0-50</Range>
                            </Options>
                        </Store>
                </Search>");

            #endregion



            #region TEST VERIFICATION


            ZAssert.IsNotNull(response, "Verify the Search Response was received");

            // Verify the system folders exist
            ZAssert.XmlXpathMatch(response.XmlElement, "//Search:Result//GAL:EmailAddress", null, account.EmailAddress, "Verify the account is returned in the search response");

            #endregion


        }

    }
}
