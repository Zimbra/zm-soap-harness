using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using NUnit.Framework;

namespace Tests.MailClient.Mail.RSS
{


    [TestFixture]
    public class GetRssFeed : Tests.BaseTestFixture
    {

        [Test, Description("Sync RSS messages to the RSS Feed folder on device"),
        Property("TestSteps", "1. Create a folder on the server that points to an RSS feed, 2. Sync to the device, 3. Verify the RSS messages are synced")]
        [Category("Functional")]
        [Category("Mail")]
        [Category("L3")]
        public void GetRssFeed01()
        {

            /*
             * Get an RSS feed folder
             */

            /*
             * 1. Create a folder on the server that points to an RSS feed
             * 2. Sync to the device
             * 3. Verify the RSS messages are synced
             */


            #region TEST SETUP

            String subject = "RssItemNumberOneTitle";
            String foldername = "folder" + HarnessProperties.getUniqueString();
            String folderRootId = this.TestAccount.soapSelectValue(this.TestAccount.soapSend(@"<GetFolderRequest xmlns='urn:zimbraMail'/>"), "//mail:folder[@name='USER_ROOT']", "id");

            // Create the new folder
            XmlDocument CreateFolderResponse = this.TestAccount.soapSend(
                    "<CreateFolderRequest xmlns='urn:zimbraMail'>" +
                        "<folder url='" + HarnessProperties.getString("feed.rss") + "/Basic/basic.xml' name='" + foldername + "' l='" + folderRootId + "'/>" +
                    "</CreateFolderRequest>");

            String folderId = this.TestAccount.soapSelectValue(CreateFolderResponse, "//mail:folder", "id");

            // Sync the new feed
            this.TestAccount.soapSend(
                    "<FolderActionRequest xmlns='urn:zimbraMail'>" +
                        "<action op='sync' id='" + folderId + "'/>" +
                    "</FolderActionRequest>");


            // Wait a few seconds for the feed to load
            bool found = false;
            for (int i = 0; i < 10; i++)
            {

                XmlDocument SearchResponse = this.TestAccount.soapSend(
                    @"<SearchRequest xmlns='urn:zimbraMail' types='message' >
				        <query>inid:" + folderId + @"</query>
			        </SearchRequest>");
                XmlNodeList nodes = SearchResponse.SelectNodes("//mail:m", ZAssert.NamespaceManager);
                if (nodes.Count > 0)
                {
                    found = true;
                    break;
                }

                // Wait a second for the feed to load
                System.Threading.Thread.Sleep(1000);

            }
            ZAssert.IsTrue(found, "Verify that search results are found in the RSS folder");


            #endregion



            #region TEST ACTION

            // Sync the folders
            ZFolderSyncResponse folderSyncResponse = TestClient.sendRequest(new ZFolderSyncRequest(this.TestAccount)) as ZFolderSyncResponse;
            ZAssert.IsNotNull(folderSyncResponse, "Verify the Folder Sync response was received");

            // Verify the new folder is resturned
            ZAssert.XmlXpathMatch(folderSyncResponse.XmlElement, "//FolderHierarchy:Add//FolderHierarchy:ServerId", null, folderId, "Verify the new folder is returned");


            /**
             * 4/28/2014 ... Multiple SyncRequests may be required for the message to appear, so send a few until the new message shows up
             * The harness probably needs a way to send a translaction like this, but I'm not quite sure at this moment what parameters
             * would make the most sense for a transaction call.  Maybe rename sendSyncTransaction() to sendInitialSyncTransaction() and 
             * create a sendSyncTransaction(String collectionId) method?
             **/

            ZSyncRequest syncRequest = new ZSyncRequest(this.TestAccount,
                @"<Sync xmlns='AirSync'>
<Collections>
        <Collection>
            <Class>Email</Class>
            <SyncKey>0</SyncKey>
            <CollectionId>" + folderId + @"</CollectionId>
        </Collection>
    </Collections>
</Sync>");
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            // Samsung S4 sends a GetItemEstimate requets.  Not sure if it is required.
            ZGetItemEstimateRequest getItemEstimateRequest = new ZGetItemEstimateRequest(this.TestAccount);
            getItemEstimateRequest.CollectionId = folderId;

            ZGetItemEstimateResponse getItemEstimateResponse = TestClient.sendRequest(getItemEstimateRequest) as ZGetItemEstimateResponse;
            ZAssert.IsNotNull(getItemEstimateResponse, "Verify the GetItemEstimate response was received");



            // Send the SyncRequest for the folder to pick up the RSS messages
            // The 'FilterType' seems to be important.  Messages don't sync unless 
            // the Options are specified as below
            //
            syncRequest = new ZSyncRequest(this.TestAccount,
                @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync'>
    <Collections>
        <Collection>
            <Class>Email</Class>
            <SyncKey>" + this.TestAccount.Device.SyncKeys[folderId] + @"</SyncKey>
            <CollectionId>" + folderId + @"</CollectionId>
            <DeletesAsMoves/>
            <GetChanges/>
            <WindowSize>5</WindowSize>
            <Options>
                <FilterType>0</FilterType>
                <MIMESupport>2</MIMESupport>
                <MIMETruncation>6</MIMETruncation>
            </Options>
        </Collection>
    </Collections>
</Sync>");

            // Send the SyncRequest
            syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion




            #region TEST VERIFICATION


            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//email:Subject[text() = '" + subject + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");


            #endregion



        }

    }
}
