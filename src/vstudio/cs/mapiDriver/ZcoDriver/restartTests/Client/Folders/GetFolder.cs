using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using Outlook = Microsoft.Office.Interop.Outlook;
using System.Collections;
using Redemption;
using System.Xml;
using SoapAdmin;

namespace restartTest.Client.Folders
{

    [TestFixture]
    public class GetFolder : restartTests.RestartTestFixture
    {
        [Test, Description("Verify that ZCO can sync a folder")]
        [Category("Folder")]
        public void GetFolder_09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region SOAP Block
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new GetAccountRequest().UserName(zAccount.AccountZCO.displayName));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:GetAccountResponse/admin:account/admin:a[@n='zimbraFeatureIMEnabled']", null, "FALSE", null, 1);
            #endregion

            #region Outlook Block

            OutlookCommands.Instance.Sync();

            // Find the inbox
            RDOFolder chatFolder = OutlookMailbox.Instance.findFolder(GlobalProperties.getProperty("globals.chats"));
            zAssert.IsNotNull(chatFolder, "Check that the chats folder exists");

            #region Shutdown ZCO
            OutlookProcess.Instance.StopApplication("Kill Outlook");
            #endregion

            #region Start ZCO
            OutlookProfile profile = new OutlookProfile(zAccount.AccountZCO);
            OutlookProcess.Instance.StartApplication(profile);
            //tcLog.Debug("Initialized the default Sync Client user");

            #endregion
            OutlookCommands.Instance.Sync();
            chatFolder = OutlookMailbox.Instance.findFolder(GlobalProperties.getProperty("globals.chats"));
            zAssert.IsNull(chatFolder, "Check that the chats folder exists");

            #endregion
        }

    }
}

