using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Xml;
using Soap;
using SoapAdmin;
using Redemption;
using SoapWebClient;
using SyncHarness;
using System.Text.RegularExpressions;
using System.Collections;

namespace clientTests.Client.Tags
{
    [TestFixture]
    public class TagAction : BaseTestFixture
    {


        [Test, Description("Verify that Tag modified assign to Items modified in ZWC,get modify in ZCO too")]
        [Bug("5579")]
        public void TagAction_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string account1Name = "account1" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string newTagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();


            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            DateTime startDateLocal = new DateTime(2012, 10, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);

            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string task1Status = "INPR"; //status=INPR - In Progress Task
            string task1PercentComplete = "87";
            string task1Content = "Content " + GlobalProperties.time() + GlobalProperties.counter();
            string task1Location = "Location " + GlobalProperties.time() + GlobalProperties.counter();
            string task1Subject = "Subject " + GlobalProperties.time() + GlobalProperties.counter();
            string task1Priority = "1"; // priority=1 - High
            string contact1Firstname = "FirstName" + GlobalProperties.time() + GlobalProperties.counter();
            string contact1Lastname = "LastName" + GlobalProperties.time() + GlobalProperties.counter();
            string contact1Email = "primaryemail" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1Id, tagId, folderInboxId, messageId, taskId;
            #endregion

            #region Account Setup

            // Create the test account
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                UserName(account1Name).
                UserPassword(GlobalProperties.getProperty("defaultpassword.value")));

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:account", "id", null, out account1Id, 1);
            #endregion

            #region SOAP Block

            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);
            //#############################################################################################################################################


            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                AddContactAttribute("firstName", contact1Firstname).
                AddContactAttribute("lastName", contact1Lastname).
                AddContactAttribute("email", contact1Email)));
            //#############################################################################################################################################



            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new AddMsgRequest().
                                         AddMessage(new MessageObject().
                                         SetParent(folderInboxId).
                                         AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + messageSubject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body


")));
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);
            //#############################################################################################################################################


            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(account1Name).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);
            //#############################################################################################################################################

            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateTaskRequest().
                                    Subject(task1Subject).
                                    StartDate(startDateLocal).
                                    DueDate(dueDate).
                                    Status(task1Status).
                                    PercentComplete(task1PercentComplete).
                                    Content(task1Content).
                                    Priority(task1Priority).
                                    Location(task1Location)
                                    );

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            //#############################################################################################################################################

            #endregion

            #region Apply tag in ZCO
            OutlookCommands.Instance.Sync();

            RDOContactItem rContact = OutlookMailbox.Instance.findContact(contact1Email);
            RDOAppointmentItem rAppointment = OutlookMailbox.Instance.findAppointment(message1Subject);
            RDOMail rMail = OutlookMailbox.Instance.findMessage(messageSubject);
            RDOTaskItem rTaskItem = OutlookMailbox.Instance.findTask(task1Subject);

            zAssert.IsNotNull(rContact, "Check that the Contact is in the account");
            zAssert.IsNotNull(rAppointment, "Check that the Appt is in the account");
            zAssert.IsNotNull(rMail, "Check that the Mail is in the account");
            zAssert.IsNotNull(rTaskItem, "Check that the Task is in the account");


            rContact.Categories = tagName;
            rContact.Save();

            rAppointment.Categories = tagName;
            rAppointment.Save();

            rMail.Categories = tagName;
            rMail.Save();

            rTaskItem.Categories = tagName;
            rTaskItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Modify the Tag in ZWC

            zAccount.AccountZCO.sendSOAP(new ItemActionRequest().
                                   SetAction(tagId, ItemActionRequest.ActionOperation.rename, newTagName));

            #endregion

            #region Verification at ZCO
            OutlookCommands.Instance.Sync();
            rContact = OutlookMailbox.Instance.findContact(contact1Email);
            rAppointment = OutlookMailbox.Instance.findAppointment(message1Subject);
            rMail = OutlookMailbox.Instance.findMessage(messageSubject);
            rTaskItem = OutlookMailbox.Instance.findTask(task1Subject);

            zAssert.IsNotNull(rContact, "Check that the Contact is in the account");
            zAssert.IsNotNull(rContact.Categories, "Check that at least one category is saved in the Contact");

            ArrayList categoryList = new ArrayList();
            foreach (string s in rContact.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.DoesNotContain(tagName, categoryList, "Check that the old tag name is not listed within the Contact's categories");
            zAssert.Contains(newTagName, categoryList, "Check that the new tag name is listed within the Contact's categories");

            zAssert.IsNotNull(rMail, "Check that the message is in the inbox");
            zAssert.IsNotNull(rMail.Categories, "Check that at least one category is saved in the message");

            categoryList = new ArrayList();
            foreach (string s in rMail.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.DoesNotContain(tagName, categoryList, "Check that the old tag name is not listed within the message's categories");
            zAssert.Contains(newTagName, categoryList, "Check that the new tag name is listed within the message's categories");

            zAssert.IsNotNull(rAppointment, "Check that the appointment exist in account");
            zAssert.IsNotNull(rAppointment.Categories, "Check that at least one category is saved in the appointment");

            categoryList = new ArrayList();
            foreach (string s in rAppointment.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.DoesNotContain(tagName, categoryList, "Check that the old tag name is not listed within the Appt's categories");
            zAssert.Contains(newTagName, categoryList, "Check that the new tag name is listed within the Appt's categories");

            zAssert.IsNotNull(rTaskItem, "Check that the Task is in the Account");
            zAssert.IsNotNull(rTaskItem.Categories, "Check that at least one category is saved in the Task");

            categoryList = new ArrayList();
            foreach (string s in rTaskItem.Categories.Split(",".ToCharArray()))
            {
                categoryList.Add(s);
            }
            zAssert.DoesNotContain(tagName, categoryList, "Check that the old tag name is not listed within the Task's categories");
            zAssert.Contains(newTagName, categoryList, "Check that the new tag name is listed within the Task's categories");

            #endregion
        }

        [Test, Description("Verify that Tag assign to Items deleted in ZCO(Outlook 2003),does not get delete in ZWC but get deleted when deleted using Outlook 2007 in ZCO.")]
        public void TagAction_02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string account1Name = "account1" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");

            string tagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();
            string newTagName = "tag" + GlobalProperties.time() + GlobalProperties.counter();


            DateTime startTimeLocal = new DateTime(2010, 12, 25, 12, 0, 0);
            DateTime startTimeUTC = startTimeLocal.ToUniversalTime();
            DateTime startDateLocal = new DateTime(2012, 10, 25, 12, 0, 0);
            DateTime dueDate = new DateTime(2012, 10, 30, 12, 0, 0);

            string message1Subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string messageSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string message1Content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string task1Status = "INPR"; //status=INPR - In Progress Task
            string task1PercentComplete = "87";
            string task1Content = "Content " + GlobalProperties.time() + GlobalProperties.counter();
            string task1Location = "Location " + GlobalProperties.time() + GlobalProperties.counter();
            string task1Subject = "Subject " + GlobalProperties.time() + GlobalProperties.counter();
            string task1Priority = "1"; // priority=1 - High
            string contact1Firstname = "FirstName" + GlobalProperties.time() + GlobalProperties.counter();
            string contact1Lastname = "LastName" + GlobalProperties.time() + GlobalProperties.counter();
            string contact1Email = "primaryemail" + GlobalProperties.time() + GlobalProperties.counter() + "@" + GlobalProperties.getProperty("defaultdomain.name");
            string account1Id, tagId, folderInboxId, messageId, taskId, contactId, apptId;
            #endregion

            #region Account Setup

            // Create the test account
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                UserName(account1Name).
                UserPassword(GlobalProperties.getProperty("defaultpassword.value")));

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:account", "id", null, out account1Id, 1);
            #endregion

            #region SOAP Block

            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateTagRequest().AddName(tagName));

            XmlNode CreateTagResponse = zAccount.AccountZCO.selectSOAP("//mail:CreateTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(CreateTagResponse, "//mail:tag", "id", null, out tagId, 1);
            //#############################################################################################################################################


            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateContactRequest().
                AddContact(new ContactObject().
                AddContactAttribute("firstName", contact1Firstname).
                AddContactAttribute("lastName", contact1Lastname).
                AddContactAttribute("email", contact1Email)));

            zAccount.AccountZCO.selectSOAP("//mail:CreateContactResponse/mail:cn", "id", null, out contactId, 1);
            //#############################################################################################################################################



            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new GetFolderRequest());
            zAccount.AccountZCO.selectSOAP("//mail:folder[@name='" + GlobalProperties.getProperty("globals.inbox") + "']", "id", null, out folderInboxId, 1);

            // Search for the message ID
            zAccount.AccountZCO.sendSOAP(new AddMsgRequest().
                                         AddMessage(new MessageObject().
                                         SetParent(folderInboxId).
                                         AddContent(
@"From: foo@example.com 
To: bar@example.com 
Subject: " + messageSubject + @"
MIME-Version: 1.0 
Content-Type: text/plain; charset=utf-8 
Content-Transfer-Encoding: 7bit

simple text string in the body


")));
            zAccount.AccountZCO.selectSOAP("//mail:AddMsgResponse/mail:m", "id", null, out messageId, 1);
            //#############################################################################################################################################


            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(message1Subject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(message1Content).
                            AddInv(new InvObject().
                                    Summary(message1Subject).
                                    AddAttendee(account1Name).
                                    AddOrganizer(zAccount.AccountZCO.emailAddress).
                                    StartTime(startTimeLocal, System.TimeZone.CurrentTimeZone).
                                    EndTime(startTimeLocal.AddHours(1), System.TimeZone.CurrentTimeZone))));

            zAccount.AccountZCO.selectSOAP("//mail:CreateAppointmentResponse", "invId", null, out apptId, 1);
            //#############################################################################################################################################

            //#############################################################################################################################################
            zAccount.AccountZCO.sendSOAP(new CreateTaskRequest().
                                    Subject(task1Subject).
                                    StartDate(startDateLocal).
                                    DueDate(dueDate).
                                    Status(task1Status).
                                    PercentComplete(task1PercentComplete).
                                    Content(task1Content).
                                    Priority(task1Priority).
                                    Location(task1Location)
                                    );

            zAccount.AccountZCO.selectSOAP("//mail:CreateTaskResponse", "invId", null, out taskId, 1);
            //#############################################################################################################################################

            #endregion

            #region Apply tag in ZCO
            OutlookCommands.Instance.Sync();

            RDOContactItem rContact = OutlookMailbox.Instance.findContact(contact1Email);
            RDOAppointmentItem rAppointment = OutlookMailbox.Instance.findAppointment(message1Subject);
            RDOMail rMail = OutlookMailbox.Instance.findMessage(messageSubject);
            RDOTaskItem rTaskItem = OutlookMailbox.Instance.findTask(task1Subject);

            zAssert.IsNotNull(rContact, "Check that the Contact is in the account");
            zAssert.IsNotNull(rAppointment, "Check that the Appt is in the account");
            zAssert.IsNotNull(rMail, "Check that the Mail is in the account");
            zAssert.IsNotNull(rTaskItem, "Check that the Task is in the account");


            rContact.Categories = tagName;
            rContact.Save();

            rAppointment.Categories = tagName;
            rAppointment.Save();

            rMail.Categories = tagName;
            rMail.Save();

            rTaskItem.Categories = tagName;
            rTaskItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Verify tag is created and associated with Item in ZWC.

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn", "t", tagId, null, 1);

            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(apptId));
            zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt", "t", tagId, null, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m", "t", tagId, null, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m", "t", tagId, null, 1);

            #endregion

            #region Deleting tag in ZCO
            OutlookCommands.Instance.Sync();

            rContact = OutlookMailbox.Instance.findContact(contact1Email);
            rAppointment = OutlookMailbox.Instance.findAppointment(message1Subject);
            rMail = OutlookMailbox.Instance.findMessage(messageSubject);
            rTaskItem = OutlookMailbox.Instance.findTask(task1Subject);

            zAssert.IsNotNull(rContact, "Check that the Contact is in the account");
            zAssert.IsNotNull(rAppointment, "Check that the Appt is in the account");
            zAssert.IsNotNull(rMail, "Check that the Mail is in the account");
            zAssert.IsNotNull(rTaskItem, "Check that the Task is in the account");


            rContact.Categories = null;
            rContact.Save();

            rAppointment.Categories = null;
            rAppointment.Save();

            rMail.Categories = null;
            rMail.Save();

            rTaskItem.Categories = null;
            rTaskItem.Save();
            OutlookCommands.Instance.Sync();
            #endregion

            #region Verify the tag still exists and the tag is no longer associated with the item

            zAccount.AccountZCO.sendSOAP(new SoapWebClient.GetTagRequest());
            XmlNode GetTagResponse = zAccount.AccountZCO.selectSOAP("//mail:GetTagResponse", null, null, null, 1);
            zAccount.AccountZCO.selectSOAP(GetTagResponse, "//mail:tag[@name='" + tagName + "']", "id", null, out tagId, 1);

            zAccount.AccountZCO.sendSOAP(new GetContactRequest().GetContactbyId(contactId));
            zAccount.AccountZCO.selectSOAP("//mail:GetContactsResponse/mail:cn[@t]", null, null, null, 0);

            zAccount.AccountZCO.sendSOAP(new GetAppointmentRequest().Message(apptId));
            zAccount.AccountZCO.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@t]", null, null, null, 0);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(messageId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m[@t]", null, null, null, 0);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(taskId));
            //For task having no category/tag, t attribute is present with no value, so modified SelectSoap line to verify one occurence of t attribute with "" value
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse/mail:m", "t", "", out tagId, 1);

            #endregion

        }
    }


        
    }