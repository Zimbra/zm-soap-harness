using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Redemption;
using SoapWebClient;
using SoapAdmin;
using System.IO;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Xml;

namespace clientTests.Client.Mail.Drafts
{
    [TestFixture]
    public class SaveDraft : BaseTestFixture
    {
        [Test, Description("Verify that a draft message with 'Contents Only' can be saved.")]
        [Category("Mail")]
        public void SaveDraft_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Draft a email with Content Only
            // 3. Login as sync user (SOAP)
            // 4. Verify the message is received with proper Content
            // 5. Verify that the "FROM", "TO", "CC" fields shows nothing.

            #region Testcase variables
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message 

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Body = content;

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("content:(" + content + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            // Verify the absence of subject
            zAccount.AccountZCO.selectSOAP("//mail:su", null, null, null, 0);

            // Verify the content
            zAccount.AccountZCO.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the absence of "FROM", "TO", "CC" fields
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='f']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='t']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='c']", null, null, null, 0);

            //Verify that the message is on drafts folder
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:m[@id='" + draftId + "']"), "l", draftsFolderId, null, 1);

            #endregion
        }

        [Test, Description("Verify that a draft message with 'Subject & Content Only' can be saved.")]
        [Category("Mail")]
        public void SaveDraft_02()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Draft a email with Subject & Content Only
            // 3. Login as sync user (SOAP)
            // 4. Verify the message is received with proper Subject & Content
            // 5. Verify that the "FROM", "TO", "CC" fields shows nothing.

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Body = content;
            rdoMail.Subject = subject;

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            // Verify the absence of subject
            zAccount.AccountZCO.selectSOAP("//mail:su", null, subject, null, 1);

            // Verify the content
            zAccount.AccountZCO.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the absence of "FROM", "TO", "CC" fields
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='f']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='t']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='c']", null, null, null, 0);

            //Verify that the message is on drafts folder
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:m[@id='" + draftId + "']"), "l", draftsFolderId, null, 1);

            #endregion

        }

        [Test, Description("Verify that a draft message with 'To'(Cannonical Name: Unresolved), 'Subject' & 'Content fields can be saved.")]
        [Category("Mail")]
        public void SaveDraft_03()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Draft a email with fields "TO", "Subject" & "Content" Only
            // 3. Login as sync user (SOAP)
            // 4. Verify the message is received with proper Subject & Content
            // 5. Verify that the "TO" field shows the correct recipient.
            // 6. Verify that the "FROM" and "CC" fields shows nothing.

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Body = content;
            rdoMail.Subject = subject;

            //Add recepient
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            // Verify the absence of subject
            zAccount.AccountZCO.selectSOAP("//mail:su", null, subject, null, 1);

            // Verify the content
            zAccount.AccountZCO.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the absence of "FROM", "CC" fields
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='f']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='c']", null, null, null, 0);

            // Verify the presence of "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            //Verify that the message is on drafts folder
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:m[@id='" + draftId + "']"), "l", draftsFolderId, null, 1);

            #endregion
        }

        [Test, Description("Verify that a draft message with 'To' & 'CC' (Cannonical Name: Unresolved), 'Subject' & 'Content fields can be saved.")]
        [Category("Mail")]
        public void SaveDraft_04()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Draft a email with fields "TO", "CC", "Subject" & "Content"
            // 3. Login as sync user (SOAP)
            // 4. Verify the message is received with proper Subject & Content
            // 5. Verify that the "TO" and "CC "field shows the correct recipient.
            // 6. Verify that the "FROM" fields shows nothing.

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Body = content;
            rdoMail.Subject = subject;

            //Add recepient
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.CC = zAccount.AccountB.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            // Verify the absence of subject
            zAccount.AccountZCO.selectSOAP("//mail:su", null, subject, null, 1);

            // Verify the content
            zAccount.AccountZCO.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the absence of "FROM" field
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='f']", null, null, null, 0);

            // Verify the presence of "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            // Verify the presence of "CC" field
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "d", zAccount.AccountB.cn, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountB.emailAddress + "']"), "t", "c", null, 1);

            //Verify that the message is on drafts folder
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:m[@id='" + draftId + "']"), "l", draftsFolderId, null, 1);

            #endregion
        }

        [Test, Description("Verify that a draft message with Importance: HIGH can be saved.")]
        [Category("Mail")]
        public void SaveDraft_05()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Draft a message to account1 using IMPORTANCE: HIGH
            // 3. Login as sync user (SOAP)
            // 4. Verify the message is saved in ZCO & synced to ZCS with proper Subject & Content
            // 5. Verify that the "TO" shows the correct recipient.
            // 6. Verify that the IMPORTANCE shows "HIGH"
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Body = content;
            rdoMail.Subject = subject;

            //Add recepient
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);
            
            //Set the importance as high
            rdoMail.Importance = (int)OlImportance.olImportanceHigh;

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            // Verify the absence of subject
            zAccount.AccountZCO.selectSOAP("//mail:su", null, subject, null, 1);

            // Verify the content
            zAccount.AccountZCO.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the absence of "FROM", "CC" fields
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='f']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='c']", null, null, null, 0);

            // Verify the presence of "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            //Verify that the message is on drafts folder
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:m[@id='" + draftId + "']"), "l", draftsFolderId, null, 1);

            // Verify that the message is marked IMPORTANTANCE: HIGH
            zAccount.AccountZCO.selectSOAP("//mail:m", "f", "sd!", null, 1);

            #endregion
        }

        [Test, Description("Verify that a draft message with Importance: LOW can be saved.")]
        [Category("Mail")]
        public void SaveDraft_06()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Draft a message to account1 using IMPORTANCE: LOW
            // 3. Login as sync user (SOAP)
            // 4. Verify the message is saved in ZCO & synced to ZCS with proper Subject & Content
            // 5. Verify that the "TO" shows the correct recipient.
            // 6. Verify that the IMPORTANCE shows "LOW"

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Body = content;
            rdoMail.Subject = subject;

            //Add recepient
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            //Set the importance as high
            rdoMail.Importance = (int)OlImportance.olImportanceLow;

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            // Verify the absence of subject
            zAccount.AccountZCO.selectSOAP("//mail:su", null, subject, null, 1);

            // Verify the content
            zAccount.AccountZCO.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the absence of "FROM", "CC" fields
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='f']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='c']", null, null, null, 0);

            // Verify the presence of "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            //Verify that the message is on drafts folder
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:m[@id='" + draftId + "']"), "l", draftsFolderId, null, 1);

            // Verify that the message is marked IMPORTANTANCE: NORMAL
            zAccount.AccountZCO.selectSOAP("//mail:m", "f", "sd?", null, 1);

            #endregion
        }

        [Test, Description("Verify that a draft message with Importance: NORMAL can be saved.")]
        [Category("Mail")]
        public void SaveDraft_07()
        {
            // Steps:
            // 1. Login as sync user (ZCO)
            // 2. Draft a message to account1 using IMPORTANCE: NORMAL
            // 3. Login as sync user (SOAP)
            // 4. Verify the message is saved in ZCO & synced to ZCS with proper Subject & Content
            // 5. Verify that the "TO" shows the correct recipient.
            // 6. Verify that the IMPORTANCE shows "NORMAL"

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Testcase variables
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string draftId, draftsFolderId;
            #endregion

            #region Outlook Block: Create & Save a Draft Message

            // Create an Outlook mail item
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Body = content;
            rdoMail.Subject = subject;

            //Add recepient
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);

            //Set the importance as high
            rdoMail.Importance = (int)OlImportance.olImportanceNormal;

            //Save draft
            rdoMail.Save();
            OutlookCommands.Instance.Sync();

            #endregion

            #region SOAP Block

            // Search for the Message ID
            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                Types("message").Query("subject:(" + subject + ")"));
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out draftId, 1);

            //Get the id of sent and drafts folder
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.drafts") + "']", "id", null, out draftsFolderId, 1);

            // Get the message
            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(draftId));

            // Verifications
            XmlNode mailMessage = zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + draftId + "']", null, null, null, 1);

            // Verify the absence of subject
            zAccount.AccountZCO.selectSOAP("//mail:su", null, subject, null, 1);

            // Verify the content
            zAccount.AccountZCO.selectSOAP("//mail:content", null, content, null, 1);

            // Verify the absence of "FROM", "CC" fields
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='f']", null, null, null, 0);
            zAccount.AccountZCO.selectSOAP(mailMessage, "//mail:e[@t='c']", null, null, null, 0);

            // Verify the presence of "TO" field
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "d", zAccount.AccountA.cn, null, 1);
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:e[@a='" + zAccount.AccountA.emailAddress + "']"), "t", "t", null, 1);

            //Verify that the message is on drafts folder
            zAccount.AccountZCO.selectSOAP(mailMessage, ("//mail:m[@id='" + draftId + "']"), "l", draftsFolderId, null, 1);

            // Verify that the message is marked IMPORTANTANCE: HIGH
            zAccount.AccountZCO.selectSOAP("//mail:m", "f", "sd", null, 1);

            #endregion
        }
    }
}