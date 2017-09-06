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
using System.IO;

namespace clientTests.Client.Stores.PST
{

    [TestFixture]
    public class PstAddBasic : BaseTestFixture
    {
        [Test, Description("Add a PST to a ZCO profile")]
        [Ignore("AddPstStore seems to hang intermittently.  Need to resolve that issue before submitting")]
        public void PstAddBasic_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            // Copy PST to temp file
            FileInfo fileInfoPST = new FileInfo(GlobalProperties.ZimbraQARoot + @"\data\migrationWizard\pst\general\mailbox\mail1\mail_one.pst");
            zAssert.IsTrue(fileInfoPST.Exists, "Verify the PST file exists");
            FileInfo fileInfo = fileInfoPST.CopyTo(fileInfoPST.FullName + GlobalProperties.time() + GlobalProperties.counter() + ".pst");
            zAssert.IsTrue(fileInfo.Exists, "Verify the PST file exists");

            string pstSubject = "Microsoft Office Outlook Test Message";
            string zcoSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxFolderId;
            #endregion

            #region Add a message to the ZCO store

            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxFolderId, 1);

            zAccount.AccountZCO.sendSOAP(
                                new AddMsgRequest().
                                        AddMessage(new MessageObject().
                                                        SetParent(inboxFolderId).
                                                        AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + zcoSubject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body


")));
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse", null, null, null, 1);

            #endregion

            #region Add store

            RDOStores rdoStores = OutlookRedemption.Instance.rdoSession.Stores;
            RDOPstStore rdoPstStore = rdoStores.AddPSTStore(fileInfo.FullName, null, null);
            zAssert.IsNotNull(rdoPstStore, "Verify the PST store is added correctly");

            RDOFolder pstInboxFolder = rdoPstStore.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(pstInboxFolder, "Verify the PST store has an inbox");

            #endregion

            #region Verify messages in the PST and ZCO exist

            OutlookCommands.Instance.Sync();
            RDOMail pstMail = OutlookMailbox.Instance.findMessage(pstSubject, pstInboxFolder, true);
            zAssert.IsNotNull(pstMail, "Verify the PST message exists");

            RDOMail zcoMail = OutlookMailbox.Instance.findMessage(zcoSubject); 
            zAssert.IsNotNull(zcoMail, "Verify the message exists in the ZCO store");

            #endregion
        }
        [Test, Description("ZCO: Move a message from PST to ZCO store")]
        [Bug("6089")]
        [Ignore("AddPstStore seems to hang intermittently.  Need to resolve that issue before submitting")]
        public void PstAddBasic_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            // Copy PST to temp file
            FileInfo fileInfoPST = new FileInfo(GlobalProperties.ZimbraQARoot + @"\data\migrationWizard\pst\general\mailbox\mail1\mail_one.pst");
            zAssert.IsTrue(fileInfoPST.Exists, "Verify the PST file exists");
            FileInfo fileInfo = fileInfoPST.CopyTo(fileInfoPST.FullName + GlobalProperties.time() + GlobalProperties.counter() + ".pst");
            zAssert.IsTrue(fileInfo.Exists, "Verify the PST file exists");

            string pstSubject = "Microsoft Office Outlook Test Message";
            string zcoSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region Get the ZCO inbox folder

            RDOFolder rdoFolderInbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(rdoFolderInbox, "Verify the inbox folder exists");

            #endregion

            #region Add store

            RDOStores rdoStores = OutlookRedemption.Instance.rdoSession.Stores;
            RDOPstStore rdoPstStore = rdoStores.AddPSTStore(fileInfo.FullName, null, null);
            zAssert.IsNotNull(rdoPstStore, "Verify the PST store is added correctly");

            RDOFolder pstInboxFolder = rdoPstStore.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(pstInboxFolder, "Verify the PST store has an inbox");

            #endregion

            #region Copy the PST message to the ZCO store

            // Sync the mailbox
            OutlookCommands.Instance.Sync();

            // Find the message in the PST
            RDOMail pstMail = OutlookMailbox.Instance.findMessage(pstSubject, pstInboxFolder, true);
            zAssert.IsNotNull(pstMail, "Verify the PST message exists");

            // Move the message from the PST to ZCO
            pstMail.Move(rdoFolderInbox);

            // Find the copy in ZCO
            RDOMail zcoMail = OutlookMailbox.Instance.findMessage(pstMail.Subject, rdoFolderInbox, true);
            zAssert.IsNotNull(zcoMail, "Verify the message exists in the ZCO store");

            // Mark the message as flagged
            zcoMail.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            zcoMail.Save();

            OutlookCommands.Instance.Sync();

            #endregion

        }

        [Test, Description("ZCO: Move a message from PST to ZCO store - verify the received time")]
        [Bug("30291")]
        [Ignore("AddPstStore seems to hang intermittently.  Need to resolve that issue before submitting")]
        public void PstAddBasic_03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test case variables
            // Copy PST to temp file
            FileInfo fileInfoPST = new FileInfo(GlobalProperties.ZimbraQARoot + @"\data\migrationWizard\pst\general\mailbox\mail1\mail_one.pst");
            zAssert.IsTrue(fileInfoPST.Exists, "Verify the PST file exists");
            FileInfo fileInfo = fileInfoPST.CopyTo(fileInfoPST.FullName + GlobalProperties.time() + GlobalProperties.counter() + ".pst");
            zAssert.IsTrue(fileInfo.Exists, "Verify the PST file exists");

            string pstSubject = "Microsoft Office Outlook Test Message";
            DateTime pstReceivedDateGMT = new DateTime(2005, 12, 14, 18, 08, 28);
            DateTime epochGMT = new DateTime(1970, 1, 1, 0, 0, 0);
            TimeSpan diff = pstReceivedDateGMT - epochGMT;
            string pstReceivedMsecSinceEpoch = String.Format("{0}", Math.Floor(diff.TotalSeconds * 1000));
            string messageId;
            #endregion

            #region Get the ZCO inbox folder

            RDOFolder rdoFolderInbox = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(rdoFolderInbox, "Verify the inbox folder exists");

            #endregion

            #region Add store

            RDOStores rdoStores = OutlookRedemption.Instance.rdoSession.Stores;
            RDOPstStore rdoPstStore = rdoStores.AddPSTStore(fileInfo.FullName, null, null);
            zAssert.IsNotNull(rdoPstStore, "Verify the PST store is added correctly");

            RDOFolder pstInboxFolder = rdoPstStore.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(pstInboxFolder, "Verify the PST store has an inbox");

            #endregion

            #region Copy the PST message to the ZCO store

            // Sync the mailbox
            OutlookCommands.Instance.Sync();

            // Find the message in the PST
            RDOMail pstMail = OutlookMailbox.Instance.findMessage(pstSubject, pstInboxFolder, true);
            zAssert.IsNotNull(pstMail, "Verify the PST message exists");

            // Move the message from the PST to ZCO
            pstMail.Move(rdoFolderInbox);

            // Find the copy in ZCO
            RDOMail zcoMail = OutlookMailbox.Instance.findMessage(pstMail.Subject, rdoFolderInbox, true);
            zAssert.IsNotNull(zcoMail, "Verify the message exists in the ZCO store");

            // Mark the message as flagged
            zcoMail.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            zcoMail.Save();

            OutlookCommands.Instance.Sync();

            #endregion

            #region

            // Search for the messageID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                                Types("message").
                                                Query("subject:(" + pstSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().
                                                Message(messageId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + messageId + "']", null, null, null, 1);

            // Verify the Subject and Content
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:su", null, pstSubject, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:m", "d", pstReceivedMsecSinceEpoch, null, 1);

            #endregion

        }
    }
}