using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Text.RegularExpressions;
using Redemption;

namespace longDurationTests.Client.Mail.Delegation
{
    [TestFixture]
    public class GetMessage : clientTests.BaseTestFixture
    {
        [Test, Description("Verify ZCO action other than read are not allowed when the mailbox is shared as readonly (rwid) (rights=rightsZcoEditor)")]
        [Category("Mail")]
        [SyncDirection(SyncDirection.TOZCS)]
        [Ignore("21-Mar-11 At present Zimbra does not support Editor permission.")]
        [TestSteps(
            "1. Account1 shares mail folder to syncuser with author rights",
            "2. Syncuser mounts the shared folder",
            "3. Verify that all the action other than delegation are allowed on mail from shared folder")]
        public void OpenMailbox_Basic_04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test-case variables
            string subject1 = "subject1" + GlobalProperties.time() + GlobalProperties.counter();
            string content1 = "content1" + GlobalProperties.time() + GlobalProperties.counter();
            string subject2 = "subject2" + GlobalProperties.time() + GlobalProperties.counter();
            string content2 = "content2" + GlobalProperties.time() + GlobalProperties.counter();
            string subject3 = "subject3" + GlobalProperties.time() + GlobalProperties.counter();
            string content3 = "content3" + GlobalProperties.time() + GlobalProperties.counter();
            string inboxId, message1Id;
            #endregion

            #region SOAP Block: Delegate creates folder and shares it
            //Account A shares inbox to ZCO user
            zAccount.AccountA.sendSOAP(new GetFolderRequest());
            zAccount.AccountA.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out inboxId, 1);

            zAccount.AccountA.sendSOAP(new FolderActionRequest().
                                GrantFolderbyID(
                                    inboxId,
                                    FolderActionRequest.grantUser,
                                    zAccount.AccountZCO.emailAddress,
                                    FolderActionRequest.rightsZcoEditor));

            // Send Message 
            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject1).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content1)));

            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                            Subject(subject2).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountA.emailAddress).
                            BodyTextPlain(content2)));

            zAccount.AccountB.sendSOAP(new SendMsgRequest().
                AddMessage(new MessageObject().
                Subject(subject3).
                AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                BodyTextPlain(content3)));

            zAccount.AccountB.selectSOAP("//mail:SendMsgResponse", null, null, null, 1);

            //Account A get the message id
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + subject1 + ")"));
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out message1Id, 1);

            #endregion

            #region Outlook Block: Sync GAL, open message store, sync, verify shared folder and message in it.
            OutlookCommands.Instance.Sync();
            OutlookCommands.Instance.SyncGAL();

            RDOStore mountpoint = OutlookMailbox.Instance.OpenMailbox(zAccount.AccountA);
            zAssert.IsNotNull(mountpoint, "Verify that the delegate store appears in the ZCO mailbox after adding it");
            RDOFolder mountpointInbox = mountpoint.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);
            zAssert.IsNotNull(mountpointInbox, "Verify that the inbox folder in the store appears in the ZCO mailbox after adding it");

            RDOFolder inboxFolder = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox);

            OutlookCommands.Instance.Sync();
            //find the mail in the shared inbox
            RDOMail rMail1 = OutlookMailbox.Instance.findMessage(subject1, mountpointInbox, true);
            zAssert.IsNotNull(rMail1, "Verify that the mail appears in the delegate store");

            RDOMail rMail2 = OutlookMailbox.Instance.findMessage(subject2, mountpointInbox, true);
            zAssert.IsNotNull(rMail2, "Verify that the mail appears in the delegate store");
            #endregion

            #region Verification

            RDOMail rMail = null;
            UnauthorizedAccessException u = null;

            //Copy/Insert
            u = null;
            try
            {
                rMail = OutlookMailbox.Instance.findMessage(subject3, inboxFolder, true);
                rMail.CopyTo(mountpointInbox);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that syncuser can copy/insert the mail into the shared folder");

            //mark as read
            u = null;
            try
            {
                rMail1.MarkRead(true);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that syncuser can mark mail as read into the shared folder");

            //flag
            u = null;
            try
            {
                rMail1.FlagStatus = (int)OlFlagStatus.olFlagMarked;
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that syncuser can flag the mail in the shared folder");

            //Move the mail
            u = null;
            try
            {
                rMail1.Move(inboxFolder);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that syncuser can move the mail from the shared folder");

            //Delete Operation
            u = null;
            try
            {
                rMail2.Delete(redDeleteFlags.dfSoftDelete);
            }
            catch (UnauthorizedAccessException e)
            {
                u = e;
            }
            zAssert.IsNull(u, "Verify that syncuser can delete the mail");

            #endregion

        }

    }
}

