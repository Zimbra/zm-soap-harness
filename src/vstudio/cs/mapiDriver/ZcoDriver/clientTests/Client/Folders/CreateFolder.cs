using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using Redemption;
using Microsoft.Office.Interop.Outlook;
using SoapWebClient;
using System.Xml;

namespace clientTests.Client.Folders
{
    [TestFixture]
    public class CreateFolder : BaseTestFixture
    {

        [Test, Description("Create Folder in ZCO and sync to ZWC")]
        [Category("SMOKE"), Category("Folder")]
        public void CreateFolder_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string foldername = "folder" + GlobalProperties.time() + GlobalProperties.counter();
            string folderInboxID;
            string folderParentID;
            string folderID;

            #endregion

            #region Creating folder in ZCO

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify the inbox folder is found");

            RDOFolder subfolder = inboxFolder.Folders.Add(foldername, OlDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(subfolder, "Verify the subfolder is created correctly");

            #endregion

            OutlookCommands.Instance.Sync();

            #region SOAP Verification of Folder synced in ZWC

            zAccount.AccountZCO.sendSOAP(@"<GetFolderRequest xmlns='urn:zimbraMail'/>");
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderID, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + foldername + "']", "l", null, out folderParentID, 1);
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxID, 1);
            zAssert.AreEqual(folderParentID, folderInboxID, "Parent folder id of the folder matched");

            #endregion


        }

        [Test, Description("Create folder with different charset names")]
        [Category("Folder")]
        //Execute tests in both directions (soap -> ZCO)
        //1. Create folder with characters such as French "

        public void CreateFolder_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            Dictionary<string, string> fNames = new Dictionary<string, string>();
            fNames.Add("Japanese", "\u30ed\u30fc\u30ab\u30eb\u306e\u5931\u6557" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("French", "\u00c0\u00e9\u00e9t\u00e9" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Italian", " Et\u00e0\u00e8\u00c8" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Russian", "\u041e\u0442\u043c\u0435\u043d\u0435" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Korian", "\uc11c\ubc84 \uc2e4\ud328" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Chinese Simplified", "\u670d\u52a1\u5668\u6545\u969c" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Chinese HongCong", "\u4f3a\u670d\u5668\u6545\u969c" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("German", "ung\u00fcltiger f\u00fcr" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Dutch", "\u00c6ndret" + GlobalProperties.time() + GlobalProperties.counter());
            fNames.Add("Spanish", "reuni\u00f3n petici\u00f3n\u00f3n" + GlobalProperties.time() + GlobalProperties.counter());

            #endregion

            #region Creating folder in ZCO

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify the inbox folder is found");

            RDOFolder subfolder = null;

            foreach (string key in fNames.Keys)
            {
                subfolder = inboxFolder.Folders.Add(fNames[key], OlDefaultFolders.olFolderInbox);
                zAssert.IsNotNull(subfolder, "Verify the subfolder with non-ascii name is created correctly");
            }

            #endregion

            OutlookCommands.Instance.Sync();

            #region SOAP Verification of Folder synced in ZWC

            // Auth as the end user
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            XmlNode inboxElement = zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", null, null, null, 1);

            foreach (string key in fNames.Keys)
            {
                zAccount.AccountZCO.selectSOAP(inboxElement, "//mail:folder[@name='" + fNames[key] + "']", null, null, null, 1);
            }

            #endregion


        }

        [Test, Description("ZWC to ZCO:Create Folder in ZCO(type=appointment) and sync to ZWC")]
        [Category("Folder")]
        public void CreateFolder_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = "folder" + GlobalProperties.time() + GlobalProperties.counter();

            #endregion



            #region Creating folder in ZCO

            RDOFolder calendarFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar);

            RDOFolder subFolder = calendarFolder.Folders.Add(folderName, OlDefaultFolders.olFolderCalendar);
            zAssert.IsNotNull(subFolder, "verify the calendar subfolder was created correctly");

            #endregion

            OutlookCommands.Instance.Sync();

            #region SOAP Verification of Folder synced in ZWC

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());

            XmlNode calendarElement = zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.calendar") + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(calendarElement, "//mail:folder[@name='" + folderName + "']", null, null, null, 1);

            #endregion
        }

        [Test, Description("Create Folder(Case Sensetive) in ZCO and sync to ZWC")]
        [Category("Folder")]
        public void CreateFolder_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string folderName = UtilFunctions.RandomUpperLowerStringGenerator();

            #endregion

            #region Creating folder in ZCO


            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            RDOFolder subfolder = inboxFolder.Folders.Add(folderName, OlDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(subfolder, "verify the inbox subfolder was created correctly");


            #endregion

            OutlookCommands.Instance.Sync();

            #region SOAP Verification of Folder synced in ZWC


            // Auth as the end user


            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            XmlNode inboxElement = zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(inboxElement, "//mail:folder[@name='" + folderName + "']", null, null, null, 1);

            #endregion


        }

        [Test, Description("Create Folder in ZCO with '/' in folder name")]
        [Category("Folder")]
        public void CreateFolder_05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "folder" + "/" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Creating folder in ZCO

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(inboxFolder, "Verify the inbox folder is found");

            System.ArgumentException u = null;
            try
            {
                RDOFolder subfolder = inboxFolder.Folders.Add(foldername, OlDefaultFolders.olFolderInbox);
            }
            catch (System.ArgumentException e)
            {
                u = e;
            }
            zAssert.IsNotNull(u, "Verify that UnauthorizedAccessException execption is thrown when trying create folder with '/'in folder name ");

            #endregion
        }
    }
}
