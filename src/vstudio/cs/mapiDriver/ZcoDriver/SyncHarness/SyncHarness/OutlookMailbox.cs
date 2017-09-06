using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using Microsoft.Win32;
using Redemption;
using Microsoft.Office.Interop.Outlook;
using Microsoft.Office.Core;
using System.Collections;
using System.IO;
using System.Diagnostics;
using System.Threading;

namespace SyncHarness
{
    public class OutlookMailbox
    {
        private static ILog log = LogManager.GetLogger(typeof(OutlookMailbox));
        private static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);
        
        // http://msdn.microsoft.com/en-us/library/bb415630.aspx
        public enum olMailRecipientType :int
        {
            olTo = 1,
            olCC = -1,
            olBCC = -1,
            olOriginator = -1
        };


        
        public enum ConnectionStatus
        {
            Online = 2,
            Offline = 1
        };

        public enum mailReplyType :int
        {
            reply = 0,
            replyAll = 1,
            forward = 2,
        };


        public bool isGalSyncInProgress()
        {

            long namedPropertySync = OutlookRedemption.Instance.mapiUtils.GetIDsFromNames(OutlookRedemption.Instance.rdoSession.Stores.DefaultStore, "{20022104-6842-430D-B19C-8739BFDB9188}", 0x8004, false);
            namedPropertySync = ((namedPropertySync & 0xFFFF0000) | 0x0000000b);
            log.DebugFormat("getGalSyncValue: namedPropertySync {0}(0x{1:x8})", namedPropertySync, namedPropertySync);

            bool syncBool = false;

            object syncObject = OutlookRedemption.Instance.mapiUtils.HrGetOneProp(OutlookRedemption.Instance.rdoSession.Stores.DefaultStore, (int)namedPropertySync);

            if (syncObject == null)
            {
                log.Debug("getGalSyncValue: syncObject does not exist.  Using value '0'");
                syncBool = true;
            }
            else
            {
                syncBool = (bool)syncObject;
            }

            log.Debug("getGalSyncValue: syncBool " + syncBool);
            return (syncBool);
        }

        public int GetZimbraId(object OutlookItem)
        {

            if (OutlookItem == null)
            {
                throw new HarnessException("RedemptionSafeObject cannot be null");
            }

            long namedPropertySync = OutlookRedemption.Instance.mapiUtils.GetIDsFromNames(OutlookRedemption.Instance.rdoSession.Stores.DefaultStore, "{20022104-6842-430D-B19C-8739BFDB9188}", 0x8100, false);
            namedPropertySync = ((namedPropertySync & 0xFFFF0000) | 0x00000003);
            log.DebugFormat("GetZimbraId: namedPropertySync {0}(0x{1:x8})", namedPropertySync, namedPropertySync);

            int ZimbraID = 0;

            object syncObject = OutlookRedemption.Instance.mapiUtils.HrGetOneProp(OutlookItem, (int)namedPropertySync);

            if (syncObject == null)
            {
                log.Debug("GetZimbraId: OutlookItem does not exist.  Using value '0'");
            }
            else
            {
                ZimbraID = (int)syncObject;
            }


            log.Debug("GetZimbraId: ZimbraID " + ZimbraID);
            return (ZimbraID);
        }


        #region Mail

        public RDOMail CreateMail()
        {
            return (CreateObject(OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts), "IPM.Note") as RDOMail);
        }

        public RDOMail CreateObject(RDOFolder rdoFolder, string type)
        {
            return (rdoFolder.Items.Add(type));
        }

        public RDOMail findMessage(string subject)
        {
            return (findMessage(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox).Parent, true));
        }

        public RDOMail findMessage(string subject, RDOFolder rdoFolder, Boolean recursive)
        {
            if (rdoFolder == null)
            {
                log.Warn("rdoFolder was null");
                return (null);
            }
            if (subject == null)
            {
                log.Warn("subject was null");
                return (null);
            }

            if (rdoFolder.Items != null)
            {
                foreach (RDOMail m in rdoFolder.Items)
                {
                    if (m.Subject != null && m.Subject.Contains(subject))
                    {
                        tcLog.Info(PrintMailToString(m));
                        return (m);
                    }
                }
            }
            if ((recursive) && (rdoFolder.Folders != null))
            {
                foreach (RDOFolder f in rdoFolder.Folders)
                {
                    RDOMail m = findMessage(subject, f, recursive);
                    if (m != null)
                        return (m);
                }
            }
            return (null);
        }

        //Find message based on message subject and body
        public RDOMail findMessage(string subject, RDOFolder rdoFolder, string body)
        {
            if (rdoFolder == null)
            {
                log.Warn("rdoFolder was null");
                return (null);
            }
            if (subject == null)
            {
                log.Warn("subject was null");
                return (null);
            }

            if (rdoFolder.Items != null)
            {
                foreach (RDOMail m in rdoFolder.Items)
                {
                    if (m.Subject != null && m.Subject.Contains(subject))
                    {
                        if (m.Body.Contains(body))
                        {
                            tcLog.Info(PrintMailToString(m));
                            return (m);
                        }
                    }
                }
            }
            return (null);
        }

        // This searches and returns multiple mails with same subject. For eg, there may be multiple Local Failure messages with same subject. 

        public List<RDOMail> findMessages(string subject, RDOFolder rdoFolder, Boolean recursive)
        {
            if (rdoFolder == null)
            {
                log.Warn("rdoFolder was null");
                return (null);
            }
            if (subject == null)
            {
                log.Warn("subject was null");
                return (null);
            }

            if (rdoFolder.Items != null)
            {
               List<RDOMail> mails = new List<RDOMail>();//=new RDOMail();
                int i=0;
                foreach (RDOMail m in rdoFolder.Items)
                {
                    if (m.Subject != null && m.Subject.Contains(subject))
                    {
                        tcLog.Info(PrintMailToString(m));
                        mails.Add(m);
                        
                    }
                }
                if (mails.Count > 0)
                    return (mails);
                else
                    return null;
            }
            if ((recursive) && (rdoFolder.Folders != null))
            {
                foreach (RDOFolder f in rdoFolder.Folders)
                {
                    List<RDOMail> m = findMessages(subject, f, recursive);
                    if (m != null && m.Count > 0)
                        return (m);
                }
            }
            return (null);
        }

        public RDOMail queryMessage(string query)
        {
            return (queryMessage(query, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox).Parent, true));
        }

        public RDOMail queryMessage(string query, RDOFolder rdoFolder, Boolean recursive)
        {
            RDOItems items = rdoFolder.Items;
            RDOMail rdoMail = items.Find(query);

            if ((rdoMail == null) && (recursive))
            {
                foreach (RDOFolder f in rdoFolder.Folders)
                {
                    rdoMail = queryMessage(query, f, recursive);
                    if (rdoMail != null)
                        return (rdoMail);
                }
            }

            return (rdoMail);
        }

        public string PrintMailToString(RDOMail m)
        {

            StringBuilder sb = new StringBuilder();

            sb.AppendLine();
            sb.AppendLine("Mail:");
            sb.AppendLine("EntryID: [" + m.EntryID + "]");
            sb.AppendLine("Store: [" + m.Store.Name + "]");
            sb.AppendLine("Subject: [" + m.Subject + "]");
            sb.AppendLine("From: [" + m.SenderEmailAddress + "]");
            if ((m.Recipients != null) && (m.Recipients.Count > 0))
            {
                foreach (RDORecipient r in m.Recipients)
                {
                    sb.AppendLine("Recipient: [" + r.Name + "]");
                }
            }

            return (sb.ToString());


        }

        public RDOMail mailReply(RDOMail rdoMail, mailReplyType replyType)
        {
            // The harness used OOM to send mail reply in the past, I believe due to the fact that RDO
            // doesn't formulate the response mail correctly.  However, recent execution using OOM also
            // doesn't formulate the response mail correctly.
            //
            // Basically, the problem is that the message in the Sent folder is created in OLK, but
            // ZCO must not be tracking the change, and therefore doesn't sync the change to ZCS.
            // In ZCS, the Sent folder remains empty.
            //
            // For now, switch back to RDO, since it has the same broken behavior as OOM.
            //
            // See:
            // https://bugzilla.zimbra.com/show_bug.cgi?id=30907#c2
            // https://bugzilla.zimbra.com/show_bug.cgi?id=30907#c9
            //

            if (rdoMail == null)
            {
                log.Warn("rdoMail was null");
                return (null);
            }
           
            RDOMail rdoReply = null;

            switch (replyType)
            {
                // Create a reply mail object and send reply
                case mailReplyType.reply:
                    rdoReply = rdoMail.Reply();
                    zAssert.IsNotNull(rdoReply, "mailReply: verify reply mail object is created");
                    rdoReply.Subject = "RE: " + rdoMail.Subject;
                    break;
                case mailReplyType.replyAll:
                    rdoReply = rdoMail.ReplyAll();
                    zAssert.IsNotNull(rdoReply, "mailReply: verify reply mail object is created");
                    rdoReply.Subject = "RE: " + rdoMail.Subject;
                    break;
                case mailReplyType.forward:
                    rdoReply = rdoMail.Forward();
                    zAssert.IsNotNull(rdoReply, "mailReply: verify reply mail object is created");
                    rdoReply.Subject = "FW: " + rdoMail.Subject;
                    break;
                default:
                    throw new HarnessException("mailReply: unhandled reply type: " + replyType);
            }


            // Need to save the original.  Otherwise, the 'reply' or 'forwarded' flag is not saved.
            rdoMail.Save();

            // Make sure to save to sent
            rdoReply.DeleteAfterSubmit = false;

            return (rdoReply);

        }


        /// <summary>
        /// method to convert the message to OOM and then reply.
        /// </summary>
        /// <param name="rdoMail"></param>
        /// <param name="replyType"></param>
        public RDOMail mailReplyOOM(RDOMail rdoMail, mailReplyType replyType)
        {
            // mailReply() Method is not working when zco replies to an email present in mounted inbox.The reply mail gets stuck in the Drafts folder.
            // So will try to use this method in  clientTests.Client.Mail.Delegation.MailAction.MailAction_02() method to see if it can send the reply.


            //[Mar 8 2011] AFter more modification ot this method, now the reply mail is going to sent folder. However, the replied mail is not reaching the receipient as there is a undeliverable message:
            //            Error: This message could not be sent.
            //Subject:	RE: subject12996108794
            //To:	account12996108807@zqa-061.eng.vmware.com, account12996108796@zqa-061.eng.vmware.com
            //CC:	account12996108818@zqa-061.eng.vmware.com


            //Note: You are trying to send on behalf of a person whose address is not found.  Perhaps the GAL has not been downloaded.

            if (rdoMail == null)
            {
                log.Warn("rdoMail was null");
                return rdoMail;
            }

            _MailItem oMail = (_MailItem)OutlookConnection.Instance.nameSpace.Session.GetItemFromID(rdoMail.EntryID, OutlookRedemption.Instance.rdoSession.Stores.GetStoreFromID(rdoMail.Store.EntryID, null).EntryID);


            zAssert.IsNotNull(oMail, "appointmentRespond: verify the RDO to OOM conversion succeeds");
            _MailItem oReply = null;

            switch (replyType)
            {
                // Create a reply mail object and send reply
                case mailReplyType.reply:
                    oReply = oMail.Reply();
                    zAssert.IsNotNull(oReply, "mailReply: verify reply mail object is created");
                    oReply.Subject = "RE: " + oMail.Subject;
                    break;
                case mailReplyType.replyAll:
                    oReply = oMail.ReplyAll();
                    zAssert.IsNotNull(oReply, "mailReply: verify reply mail object is created");
                    oReply.Subject = "RE: " + oMail.Subject;
                    break;
                case mailReplyType.forward:
                    oReply = oMail.Forward();
                    zAssert.IsNotNull(oReply, "mailReply: verify reply mail object is created");
                    oReply.Subject = "FW: " + oMail.Subject;
                    break;
                default:
                    throw new HarnessException("mailReply: unhandled reply type: " + replyType);
            }
            // Need to save the original.  Otherwise, the 'reply' or 'forwarded' flag is not saved.
            oMail.Save();

            //save in drafts folder
            oReply.Save();

            // Make sure to save to sent
            oReply.DeleteAfterSubmit = false;


            OutlookCommands.Instance.Sync();

            // Find the draft folder and retrieve the mail as RDOMail.
            RDOFolder rdoFolderDrafts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts);
            zAssert.IsNotNull(rdoFolderDrafts, "appointmentRespond: verify drafts folder is found");
            foreach (object o in rdoFolderDrafts.Items)
            {
                RDOMail reply = o as RDOMail;
                if (reply != null)
                {
                    string s = rdoMail.Subject;
                    if (reply.Subject.Contains(s))
                    {
                        return (reply);
                    }
                }
            }
            return null;
        }
        #endregion

        #region GAL

        private RDOAddressList galAddressList = null;

        public RDOAddressList getGalAddressList()
        {
            RDOAddressBook addressbook = OutlookRedemption.Instance.rdoSession.AddressBook;
            foreach (RDOAddressList list in addressbook.AddressLists(false))
            {
                if (list.Name.Equals("Global Address List"))
                {
                    return (galAddressList = list);
                }
            }

            return (galAddressList = null);
        }

        #endregion


        #region Calendar

        public RDOAppointmentItem CreateAppointment()
        {
            return (CreateObject(OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar), "IPM.Appointment") as RDOAppointmentItem);
        }

        public RDOAppointmentItem findAppointment(string subject)
        {
            return (findAppointment(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderCalendar).Parent, true));
        }

        public RDOAppointmentItem findAppointment(string subject, RDOFolder rdoFolder, Boolean recursive)
        {
            if (rdoFolder == null)
            {
                log.Warn("rdoFolder was null");
                return (null);
            }
            if (rdoFolder.Items != null)
            {
                foreach (RDOMail m in rdoFolder.Items)
                {
                    RDOAppointmentItem a = m as RDOAppointmentItem;
                    if (a == null)
                    {
                        log.Warn("Found non-appointment item in the folder");
                        continue;
                    }
                    if (a.Subject != null  && a.Subject.Contains(subject))
                    {
                        tcLog.Info(PrintAppointmentToString(a));
                        return (a);
                    }
                }
            }
            if ((recursive) && (rdoFolder.Folders != null))
            {
                foreach (RDOFolder f in rdoFolder.Folders)
                {
                    RDOAppointmentItem a = findAppointment(subject, f, recursive);
                    if (a != null)
                        return (a);
                }
            }
            return (null);
        }

        public string PrintAppointmentToString(RDOAppointmentItem a)
        {

            StringBuilder sb = new StringBuilder();

            sb.AppendLine();
            sb.AppendLine("Appointment:");
            sb.AppendLine("EntryID: [" + a.EntryID + "]");
            sb.AppendLine("Store: [" + a.Store.Name + "]");
            sb.AppendLine("Subject: [" + a.Subject + "]");
            sb.AppendLine("Start: [" + a.Start.ToString() + " - " + a.StartTimeZone.Name + "]");
            sb.AppendLine("End: [" + a.End.ToString() + " - " + a.EndTimeZone.Name + "]");
            sb.AppendLine("Organizer: [" + a.Organizer + "]");
            if ((a.Recipients != null) && (a.Recipients.Count > 0))
            {
                foreach (RDORecipient r in a.Recipients)
                {
                    sb.AppendLine("Recipient: [" + r.Name + "]");
                }
            }

            return (sb.ToString());


        }

        /**
         * Respond to a meeting request
         * 
         * @param response          How to respond to the meeting
         * @param rdoAppointment    The appointment to respond to
         * @return                  The resulting meeting item that is created
         **/ 
        public RDOMeetingItem appointmentRespond(rdoMeetingResponse response, RDOAppointmentItem rdoAppointment)
        {

            // Save the subject for a later search
            string subject = rdoAppointment.Subject;
  
            // Create an OOM object                
            
            _AppointmentItem oAppointment = (_AppointmentItem)OutlookConnection.Instance.nameSpace.Session.GetItemFromID(rdoAppointment.EntryID, OutlookRedemption.Instance.rdoSession.Stores.GetStoreFromID(rdoAppointment.Store.EntryID, null).EntryID);
           

            zAssert.IsNotNull(rdoAppointment, "appointmentRespond: verify the RDO to OOM conversion succeeds");

            // Convert the rdoMeetingResponse to an olMeetingResponse
            OlMeetingResponse olMeetingResponse = OlMeetingResponse.olMeetingAccepted;
            switch (response)
            {
                case rdoMeetingResponse.olMeetingAccepted:
                    olMeetingResponse = OlMeetingResponse.olMeetingAccepted;
                    break;
                case rdoMeetingResponse.olMeetingDeclined:
                    olMeetingResponse = OlMeetingResponse.olMeetingDeclined;
                    break;
                case rdoMeetingResponse.olMeetingTentative:
                    olMeetingResponse = OlMeetingResponse.olMeetingTentative;
                    break;
                default:
                    throw new HarnessException("appointmentRespond: unhandled response type: " + response);

            }

            // Create a reply mail object and send reply
            // TODO: Security dialog
            MeetingItem meetingItem = oAppointment.Respond(olMeetingResponse, null, null);
            zAssert.IsNotNull(meetingItem, "appointmentRespond: verify response object is created");

            // Save the reply to drafts
            meetingItem.Save();
           
            // Find the draft file
            RDOFolder rdoFolderDrafts = OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderDrafts);
            zAssert.IsNotNull(rdoFolderDrafts, "appointmentRespond: verify drafts folder is found");
            foreach (object o in rdoFolderDrafts.Items)
            {
                RDOMeetingItem rdoMeetingItem = o as RDOMeetingItem;
                if (rdoMeetingItem != null)
                {
                    string s = rdoMeetingItem.Subject;
                    if (rdoMeetingItem.Subject.Contains(subject))
                    {
                        return (rdoMeetingItem);
                    }
                }
            }

            // Never found the draft response
            return (null);


        }

        // converts Rdo appointment to OOM appointment. 
        public void updateAppointment(RDOAppointmentItem rdoAppointment)
        {

 
            // Create an OOM object                
            
            _AppointmentItem oAppointment = (_AppointmentItem)OutlookConnection.Instance.nameSpace.Session.GetItemFromID(rdoAppointment.EntryID, OutlookRedemption.Instance.rdoSession.Stores.GetStoreFromID(rdoAppointment.Store.EntryID, null).EntryID);


            zAssert.IsNotNull(rdoAppointment, "appointmentRespond: verify the RDO to OOM conversion succeeds");
            // If start and end dates are changed then update them to OOM appointment
            oAppointment.Start = rdoAppointment.Start;
            oAppointment.End = rdoAppointment.End;
            
            oAppointment.Save();
            // Send the notification
            oAppointment.Send();
            //object obj = oAppointment;
            //RDOAppointmentItem rdoApptItem = obj as RDOAppointmentItem;
            //return rdoApptItem;
            
        }
        public int ConvertMeetingResponse(ref RDOMeetingItem m, ref RDOAppointmentItem a)
        {
            int count = 0;

            PropList aProps = a.GetPropList(0, true);
            PropList mProps = m.GetPropList(0, true);

            System.Collections.Hashtable exceptions = new System.Collections.Hashtable();
            exceptions.Add(0x1000001E, "PR_BODY");
            exceptions.Add(0x1000001F, "description?");
            exceptions.Add(0x10130102, "PR_HTML");
            exceptions.Add(0x10090102, "PR_RFT_COMPRESSED");
            //exceptions.Add(0x806A000B, "ReminderSet");  //skip alarm properties
            //add importance and priority

            System.Collections.Hashtable h = new System.Collections.Hashtable();
            for (int i = 1; i <= mProps.Count; i++)
            {
                h[mProps[i]] = 1;
            }

            for (int i = 1; i <= aProps.Count; i++)
            {
                Int32 key = aProps[i];

                if ((UInt32)key < (UInt32)0x00BF0000)
                {
                    log.DebugFormat("ConvertMeetingResponse: skipping: {0:x} {1} {2}", key, exceptions[key], a.get_Fields(key));
                    continue;
                }

                if (exceptions.ContainsKey(key))
                {
                    log.DebugFormat("ConvertMeetingResponse: skipping: {0:x} {1} {2}", key, exceptions[key], a.get_Fields(key));
                    continue;
                }

                if ((UInt32)key == (UInt32)0x805F0003)
                {
                    m.set_Fields(key, OlMeetingStatus.olNonMeeting);
                    log.DebugFormat("ConvertMeetingResponse: setting : {0:x} {1} {2}", key, OlMeetingStatus.olNonMeeting, count++);
                    continue;
                }

                if ((UInt32)key == (UInt32)0x80610003)
                {
                    m.set_Fields(key, OlResponseStatus.olResponseNone);
                    log.DebugFormat("ConvertMeetingResponse: setting : {0:x} {1} {2}", key, OlResponseStatus.olResponseNone, count++);
                    continue;
                }

                if (!h.ContainsKey(key))
                {
                    object o = a.get_Fields(key);
                    m.set_Fields(key, o);
                    log.DebugFormat("ConvertMeetingResponse: setting : {0:x} {1} {2}", key, o, count++);
                }
            }

            m.Importance = 1;
            m.set_Fields(0x00260003, 5);

            return (count);

        }

        #endregion


        #region Contacts

        public RDOContactItem CreateContact()
        {
            return (CreateObject(OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts), "IPM.Contact") as RDOContactItem);
        }


        public RDOContactItem findContact(string email)
        {
            return (findContact(email,OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts).Parent,true));
        }
        public RDOContactItem findContact(string email, RDOFolder rdoFolder, Boolean recursive)
        {
            if (rdoFolder == null)
            {
                log.Warn("rdoFolder was null");
                return (null);
            }
            //sanity check on email
            if (email == null)
            {
                log.Warn("email was null");
                return null;
            }

            if (rdoFolder.Items != null)
            {
                foreach (RDOMail m in rdoFolder.Items)
                {
                    RDOContactItem c = m as RDOContactItem;
                    if (c == null)
                    {
                        log.Warn("Found non-contact item in the folder ");
                        continue;
                    }
                    if (c.Email1Address != null && c.Email1Address.Equals(email))
                    {
                        tcLog.Info(PrintContactToString(c));
                        return (c);
                    }
                }
            }
            if ((recursive) && (rdoFolder.Folders != null))
            {
                foreach (RDOFolder f in rdoFolder.Folders)
                {
                    RDOContactItem c = findContact(email, f, recursive);
                    if (c != null)
                        return (c);
                }
            }
            return (null);          
        }

        public string PrintContactToString(RDOContactItem c)
        {

            StringBuilder sb = new StringBuilder();

            sb.AppendLine();
            sb.AppendLine("Contact:");
            sb.AppendLine("EntryID: [" + c.EntryID + "]");
            sb.AppendLine("Store: [" + c.Store.Name + "]");
            sb.AppendLine("Email: [" + c.Email1Address + "]");
            sb.AppendLine("First Name: [" + c.FirstName + "]");
            sb.AppendLine("Last Name: [" + c.LastName + "]");

            return (sb.ToString());


        }

        #endregion

        #region Distribution Lists

        public RDODistListItem CreateDistList()
        {
            return (CreateObject(OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderContacts), "IPM.DistList") as RDODistListItem);
        }

        #endregion

        #region Tasks

        public RDOTaskItem CreateTask()
        {
            return(CreateObject(OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks),"IPM.Task") as RDOTaskItem);
        }

        public RDOTaskItem findTask(string subject)
        {
            return (findTask(subject, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderTasks).Parent, true));
        }

        public RDOTaskItem findTask(string subject, RDOFolder rdoFolder, Boolean recursive)
        {
            if (rdoFolder == null)
            {
                log.Warn("rdoFolder was null");
                return null;
            }
            //sanity check on subject
            if (subject == null)
            {
                log.Warn("Subject was null");
                return null;
            }

            if (rdoFolder.Items != null)
            {
                foreach (RDOMail m in rdoFolder.Items)
                {
                    RDOTaskItem t = m as RDOTaskItem;
                    if (t == null)
                    {
                        tcLog.Warn("Found non-task item in the folder");
                        continue;
                    }
                    if (t.Subject != null && t.Subject.Equals(subject))
                    {
                        tcLog.Info(PrintTaskToString(t));
                        return (t);
                    }
                }
            }

            if ((recursive) && (rdoFolder.Folders != null))
            {
                foreach (RDOFolder f in rdoFolder.Folders)
                {
                    RDOTaskItem t = findTask(subject, f, recursive);
                    if (t != null)
                        return (t);
                }
            }
            return (null);
        }

        public string PrintTaskToString(RDOTaskItem t)
        {

            StringBuilder sb = new StringBuilder();

            sb.AppendLine();
            sb.AppendLine("Task:");
            sb.AppendLine("EntryID: [" + t.EntryID + "]");
            sb.AppendLine("Store: [" + t.Store.Name + "]");
            sb.AppendLine("Subject: [" + t.Subject + "]");
            sb.AppendLine("Status: [" + t.Status.ToString() + "]");
            sb.AppendLine("% Complete: [" + t.PercentComplete + "]");
            sb.AppendLine("Owner: [" + t.Owner + "]");

            return (sb.ToString());


        }

        #endregion


        #region Folders

        public RDOFolder findFolder(string name)
        {
            log.Debug("Before actual findFolder()!!!");
            return (findFolder(name, OutlookRedemption.Instance.rdoSession.GetDefaultFolder(rdoDefaultFolders.olFolderInbox).Parent, true));
        }

        public RDOFolder findFolder(string name, RDOFolder root, bool recursive)
        {
            log.Debug("In findFolder()!!!");
            if (root == null)
            {
                log.Warn("root was null");
                return (null);
            }
            //sanity check on name
            if (name == null)
            {
                log.Warn("name was null");
                return null;
            }

            if (root.Folders == null)
                return (null);

            foreach (object o in root.Folders)
            {

                RDOFolder f = o as RDOFolder;
                if (f == null)
                    continue;

                try
                {
                    if (f.Name != null && f.Name.Equals(name))
                    {
                        tcLog.Info(PrintFolderToString(f));
                        log.Debug("Folder names!!!");
                        log.Debug(PrintFolderToString(f));
                        return (f);
                    }

                    if (recursive)
                    {
                        RDOFolder j = findFolder(name, f, recursive);
                        if (j != null)
                            return (j);
                    }
                }
                catch (System.Runtime.InteropServices.COMException e)
                {
                    log.Warn("Skipping: Some folder's subfolders can't be accessed", e);
                }

            }


            // Not found
            return (null);

        }

        public string PrintFolderToString(RDOFolder f)
        {

            StringBuilder sb = new StringBuilder();

            sb.AppendLine();
            sb.AppendLine("Folder:");
            sb.AppendLine("EntryID: [" + f.EntryID + "]");
            sb.AppendLine("Name: [" + f.Name + "]");
            sb.AppendLine("Items: [" + f.Items.Count + "]");
            sb.AppendLine("Unread Items: [" + f.UnReadItemCount + "]");
            sb.AppendLine("Parent Folder: [" + f.Parent.Name + "]");
            sb.AppendLine("Store: [" + f.Store.Name + "]");

            return (sb.ToString());

        }


        #endregion

        public ArrayList HasConflictItems()
        {
            // TODO: need to set outputDirectoryInfo to the tcLog folder
            DirectoryInfo outputDirectoryInfo = null;

            ArrayList fileNameList = new ArrayList();
            DirectoryInfo destination =
                (outputDirectoryInfo != null) ? outputDirectoryInfo : new DirectoryInfo(System.Environment.GetEnvironmentVariable("TEMP"));

            string[] folderNames = { "Conflicts", "Local Failures", "Server Failures" };
            foreach (string folderName in folderNames)
            {

                log.Debug("Check for conflicts in " + folderName);

                RDOFolder conflictsFolder = findFolder(folderName);
                if (conflictsFolder != null)
                {
                    foreach (RDOMail m in conflictsFolder.Items)
                    {
                        if (m.UnRead)       // Only unred items need to be processed
                        {
                            log.Error(folderName + ": " + m.Body);

                            m.UnRead = false;           // Mark it read so it won't be processed again

                            // Save it to the output folder for debugging later
                            string fileName = String.Format(@"{0}\{1}.msg", destination.FullName, m.EntryID);
                            m.SaveAs(fileName, 3); // olMSG = 3 (http://www.dimastr.com/redemption/rdo/RDOMail.htm#properties)
                            fileNameList.Add(fileName);

                        }
                    }
                }

            }

            return (fileNameList);
        }

        /// <summary>
        /// Open another users Mailbox in ZCO
        /// 
        /// Always sync GAL before using this method
        /// </summary>
        /// <param name="address">the other user's email address</param>
        /// <returns>An RDOStore pointer to the other user's mailbox mountpoint</returns>
        public RDOStore OpenMailbox(zAccount account)
        {
            log.Debug("OpenMailbox " + account.emailAddress);

            string mountpointName = account.emailAddress.Substring(0, account.emailAddress.IndexOf('@'));



            try
            {

                #region check if the mountpoint already exists

                foreach (RDOStore store in OutlookRedemption.Instance.rdoSession.Stores)
                {
                    log.Info("Store: " + store.Name);
                    if (store.Name.Contains(mountpointName))
                    {
                        tcLog.Info("OpenMailbox: Found existing store");
                        tcLog.Info(PrintStoreToString(store));
                        return (store);
                    }
                }

                #endregion

                #region mountpoint doesn't exist.  add it

                // Make sure the account exists in the GAL
                OutlookCommands.Instance.SyncGAL();
                Thread.Sleep(2000);


                MountMailboxNative(account);


                foreach (RDOStore store in OutlookRedemption.Instance.rdoSession.Stores)
                {
                    log.Info("Store: " + store.Name);
                    if (store.Name.Contains(mountpointName))
                    {
                        tcLog.Info("OpenMailbox: Added new store");
                        tcLog.Info(PrintStoreToString(store));
                        return (store);
                    }
                }

                #endregion


                tcLog.Info("OpenMailbox: Couldn't find store: " + mountpointName);
                return (null);

            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                throw new HarnessException("OpenMailbox threw COMException, skipping", e);
            }
            catch (System.OutOfMemoryException e)
            {
                throw new HarnessException("OpenMailbox threw OOME", e);
            }
            finally
            {
                // Sync the mounted mailbox
                OutlookCommands.Instance.Sync();
            }
        }

        private void MountMailboxNative(zAccount otherAccount)
        {
            log.Info("MountMailboxNative");

            log.Info("OpenOtherUsersMailbox: " +
                OutlookProcess.Instance.CurrentProfile.profileName + " " +
                OutlookRedemption.Instance.getRootGlobalAddressList().EntryID + " " +
                otherAccount.emailAddress + " " +
                otherAccount.zimbraId);

            NativeHelper.OpenOtherUsersMailbox(otherAccount);

            log.Info("MountMailboxNative ... done");
        }

        //OpenMailboxD() is implemented for users not in GAL account, searches in Contacts folder
        public RDOStore OpenMailboxD(zAccount account)
        {
            log.Debug("OpenMailbox " + account.emailAddress);

            string mountpointName = account.emailAddress.Substring(0, account.emailAddress.IndexOf('@'));

            try
            {
                #region check if the mountpoint already exists

                foreach (RDOStore store in OutlookRedemption.Instance.rdoSession.Stores)
                {
                    log.Info("Store: " + store.Name);
                    if (store.Name.Contains(mountpointName))
                    {
                        tcLog.Info("OpenMailbox: Found existing store");
                        tcLog.Info(PrintStoreToString(store));
                        return (store);
                    }
                }

                #endregion

                #region mountpoint doesn't exist.  add it

                MountMailboxDNative(account);

                foreach (RDOStore store in OutlookRedemption.Instance.rdoSession.Stores)
                {
                    log.Info("Store: " + store.Name);
                    if (store.Name.Contains(mountpointName))
                    {
                        tcLog.Info("OpenMailbox: Added new store");
                        tcLog.Info(PrintStoreToString(store));
                        return (store);
                    }
                }

                #endregion


                tcLog.Info("OpenMailbox: Couldn't find store: " + mountpointName);
                return (null);
            }
            catch (System.Runtime.InteropServices.COMException e)
            {
                throw new HarnessException("OpenMailbox threw COMException, skipping", e);
            }
            catch (System.OutOfMemoryException e)
            {
                throw new HarnessException("OpenMailbox threw OOME", e);
            }
            finally
            {
                // Sync the mounted mailbox
                OutlookCommands.Instance.Sync();
            }
        }

        //MountMailboxDNative() is implemented for users not in GAL account, searches in Contacts folder
        private void MountMailboxDNative(zAccount otherAccount)
        {
            log.Info("MountMailboxNative");

            log.Info("OpenOtherUsersMailbox: " +
                OutlookProcess.Instance.CurrentProfile.profileName + " " +
                OutlookRedemption.Instance.getRootContacts().EntryID + " " +
                otherAccount.emailAddress + " " +
                otherAccount.zimbraId);

            NativeHelper.OpenOtherUsersMailboxD(otherAccount);

            log.Info("MountMailboxNative ... done");
        }

        public string PrintStoreToString(RDOStore s)
        {

            StringBuilder sb = new StringBuilder();

            sb.AppendLine();
            sb.AppendLine("Store:");
            sb.AppendLine("EntryID: [" + s.EntryID + "]");
            sb.AppendLine("Name: [" + s.Name + "]");

            return (sb.ToString());


        }


        #region Singleton

        private static OutlookMailbox instance;

        private static readonly Object mutex = new Object();

        private OutlookMailbox()
        {
        }

        public static OutlookMailbox Instance
        {
            get
            {
               lock(mutex)
                   return (instance == null ? (instance = new OutlookMailbox()) : instance);
            }
        }

        #endregion






    }
}
