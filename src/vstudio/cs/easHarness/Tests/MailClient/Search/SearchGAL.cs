using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Search
{

    #region Notes/Comments
    /*
     * Note:
     * Searching the Global Address List (GAL)
       The Search command is used to find contacts and recipients in the GAL, and to retrieve information about them. 
     * When a search query matches more than one GAL entry, the Search command MUST return as many entries as requested, up to a total of 100 entries by default
     * 
     * Testcases:
     * Search user account
     * Search resource type location
     * Search resource type equipment
     * Other possible testcases??
     * - Search contact
     * - Search Alias
     * - Search when multiple match results are retuned. Remember, query is for all non empty properties indexed by online Ambiguous Name Resolution (ANR)
     * 
     * iPhone 5s (iOS 8.1) request
     * <Search xmlns="Search">
    <Store>
        <Name>GAL</Name>
        <Query>equipment</Query>
        <Options>
            <Range>0-50</Range>
        </Options>
    </Store>
</Search>
     * 
     * iPhone 5s (iOS 8.1) response
     * <Search xmlns="Search">
    <Status>1</Status>
    <Response>
        <Store>
            <Status>1</Status>
            <Result>
                <Properties>
                    <GAL:DisplayName>equipment</GAL:DisplayName>
                    <GAL:LastName>equipment</GAL:LastName>
                    <GAL:EmailAddress>equipment@zqa-061.eng.zimbra.com</GAL:EmailAddress>
                </Properties>
            </Result>
            <Range>0-0</Range>
            <Total>1</Total>
        </Store>
    </Response>
</Search>
     * 
     */
    #endregion

    [TestFixture]
    public class SearchGAL : Tests.BaseTestFixture
    {
        
        [Test, Description("Create new User, Sync GAL and check if user can be searched on device"),
        Property("TestSteps", "1. Create an account to search for, 2. On device type username in compose mail To or Calendar invite To and verify the email address is auto completed")]
        [Category("Smoke")]
        [Category("Search")]
        [Category("L1")] 
        public void SearchGAL01()
        {

            #region TEST SETUP

            ZimbraAccount userAccount = new ZimbraAccount().provisionFullName().authenticate();
            String displayName = userAccount.FirstName + " " + userAccount.LastName;
            
            #endregion


            #region TEST ACTION

            // Send the SearchRequest for GAL user account
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search'>
    <Store>
        <Name>GAL</Name>
        <Query>" + userAccount.UserName + @"</Query>
        <Options>
            <Range>0-50</Range>
        </Options>
    </Store>
</Search>");

            // Send the request
            ZSearchResponse searchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(searchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(searchResponse.XmlElement, "//Search:Result", "//GAL:EmailAddress[text() = '" + userAccount.EmailAddress + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//GAL:DisplayName", null, displayName, "Verify the User DisplayName is correct");
            ZAssert.XmlXpathMatch(Result, "//GAL:FirstName", null, userAccount.FirstName, "Verify the User FirstName is correct");
            ZAssert.XmlXpathMatch(Result, "//GAL:LastName", null, userAccount.LastName, "Verify the User LastName is correct");

            //Add validation that, <Total> is 1
            XmlElement Store = ZSearchResponse.getMatchingElement(searchResponse.XmlElement, "//Search:Store", "//Search:Status[text() = '" + "1" + "']");
            ZAssert.XmlXpathMatch(Store, "//Search:Total", null, "1", "Verify the Search command retrieves only user account record in result");
            
            #endregion

        }

        [Test, Description("Create new Resource - type Location, Sync GAL and check if location can be searched on device"),
        Property("TestSteps", "1. Create a new location to search for, 2. On device type location in compose mail To or Calendar invite To and verify the email address is auto completed")]
        [Category("Functional")]
        [Category("Search")]
        [Category("L2")]
        public void SearchGAL02()
        {

            #region TEST SETUP

            ZimbraAccount resLocation = new ZimbraAccount().provisionLocation().authenticate();

            #endregion

            #region TEST ACTION

            // Send the SearchRequest for GAL user account
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search'>
    <Store>
        <Name>GAL</Name>
        <Query>" + resLocation.UserName + @"</Query>
        <Options>
            <Range>0-50</Range>
        </Options>
    </Store>
</Search>");

            // Send the request
            ZSearchResponse searchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(searchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(searchResponse.XmlElement, "//Search:Result", "//GAL:EmailAddress[text() = '" + resLocation.EmailAddress + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//GAL:DisplayName", null, resLocation.UserName, "Verify the Resource (Location) DisplayName is correct");
            ZAssert.XmlXpathMatch(Result, "//GAL:LastName", null, resLocation.UserName, "Verify the Resource (Location) LastName is correct");

            //Add validation that, <Total> is 1
            XmlElement Store = ZSearchResponse.getMatchingElement(searchResponse.XmlElement, "//Search:Store", "//Search:Status[text() = '" + "1" + "']");
            ZAssert.XmlXpathMatch(Store, "//Search:Total", null, "1", "Verify the Search command retrieves only user account record in result");

            #endregion

        }

        [Test, Description("Create new Resource - type Equipment, Sync GAL and check if equipment can be searched on device"),
        Property("TestSteps", "1. Create a new equipment to search for, 2. On device type username in compose mail To or Calendar invite To and verify the email address is auto completed")]
        [Category("Functional")]
        [Category("Search")]
        [Category("L2")]
        public void SearchGAL03()
        {

            #region TEST SETUP

            ZimbraAccount resEquipment = new ZimbraAccount().provisionEquipment().authenticate();

            #endregion

            #region TEST ACTION

            // Send the SearchRequest for GAL user account
            ZSearchRequest searchRequest = new ZSearchRequest(TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Search xmlns='Search'>
    <Store>
        <Name>GAL</Name>
        <Query>" + resEquipment.UserName + @"</Query>
        <Options>
            <Range>0-50</Range>
        </Options>
    </Store>
</Search>");

            // Send the request
            ZSearchResponse searchResponse = TestClient.sendRequest(searchRequest) as ZSearchResponse;
            ZAssert.IsNotNull(searchResponse, "Verify the Search response was received");

            #endregion


            #region TEST VERIFICATION

            XmlElement Result = ZSearchResponse.getMatchingElement(searchResponse.XmlElement, "//Search:Result", "//GAL:EmailAddress[text() = '" + resEquipment.EmailAddress + "']");
            ZAssert.IsNotNull(Result, "Verify the Result was returned in the Search Response");

            // Verify the <Result/> element contents match the message
            ZAssert.XmlXpathMatch(Result, "//GAL:DisplayName", null, resEquipment.UserName, "Verify the Resource (Equipment) DisplayName is correct");
            ZAssert.XmlXpathMatch(Result, "//GAL:LastName", null, resEquipment.UserName, "Verify the Resource (Equipment) LastName is correct");

            //Add validation that, <Total> is 1
            XmlElement Store = ZSearchResponse.getMatchingElement(searchResponse.XmlElement, "//Search:Store", "//Search:Status[text() = '" + "1" + "']");
            ZAssert.XmlXpathMatch(Store, "//Search:Total", null, "1", "Verify the Search command retrieves only user account record in result");

            #endregion

        }

    }
}
