using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using Redemption;
using System.Xml;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;

namespace clientTests.Client.Calendar.MeetingRequests.ProposeNewTime
{

   public class CreateMeetingRequest: BaseTestFixture
    {
         [Test, Description("Verify proposed new time sent from ZCS is synced in ZCO.")]
         [Category("SMOKE")]
        // [[jan 27th 2011. sramarao. When I manually test this case, New Time Proposed mail is recieved in ZCO correctly.
        // However, executing this test case fails. Most likely because CounterAppointmentRequest SOAP request is changed. 
        // Need to modify the code to make this work. 

       // [Apr 01st 2011]. sramarao. I fixed the code to create correct CounterAppointmentRequest. In my machine it passes. However in client machine it fails as the proposed new time mail has "****unchecked****" string in the subject line in OLK.
       //So added code to display what exactly the proposed new time mail sent to zco looks like.
         public void CreateMeetingRequest_01()
         {
             initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            DateTime startTimeLocal =  new DateTime(2013,12,25,10,0,0);
            string messageUId, seqId, messageInvId;
            #endregion

            #region Outlook Block to create meeting

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.End = startTimeLocal.AddHours(1);

            rAppt.ReminderSet = true;
            rAppt.ReminderMinutesBeforeStart = 15;
            rAppt.BusyStatus = rdoBusyStatus.olBusy;
            rAppt.IsOnlineMeeting = false;
            rAppt.AllDayEvent = false;
            rAppt.To = zAccount.AccountA.emailAddress;
            rAppt.Recipients.ResolveAll(null, null);
            // Save and Send the appointment
            rAppt.Save();
            rAppt.Send();
            
            // Close outlook
            OutlookCommands.Instance.Sync();
            #endregion
            #region SOAP Block to propose new time

            string newStart = (startTimeLocal.AddDays(1).ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            string newEnd = (startTimeLocal.AddDays(1).AddHours(1).ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            zAccount.AccountA.sendSOAP(new SearchRequest().Types("appointment").Query("subject:(" + apptSubject + ")")
                                               );
            zAccount.AccountA.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out messageInvId, 1);
            zAccount.AccountA.sendSOAP(new GetAppointmentRequest().Message(messageInvId));
            XmlNode appointmentMessage = zAccount.AccountA.selectSOAP("//mail:GetAppointmentResponse/mail:appt[@id='" + messageInvId + "']", null, null, null, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:GetAppointmentResponse/mail:appt/mail:inv/mail:comp", "uid", null, out messageUId, 1);
            zAccount.AccountA.selectSOAP(appointmentMessage, "//mail:GetAppointmentResponse/mail:appt/mail:inv/mail:comp", "seq", null, out seqId, 1);

            zAccount.AccountA.sendSOAP(@"<CounterAppointmentRequest xmlns='urn:zimbraMail'>

                <m>
                    <e a='" + zAccount.AccountA.emailAddress + @"' t='f'/>
                    <e a='" + zAccount.AccountZCO.emailAddress + @"' t='t'/>
                    <su>New Time Proposed: " + apptSubject +@"</su>                    
                    <inv>
                        <comp name='" + "New Time Proposed: " + apptSubject + @"' uid='" + messageUId + @"' seq='" + seqId + @"' >
                            <s d='" + startTimeLocal.AddDays(1).ToUniversalTime().ToString("yyyyMMddThhmmss") + @"Z'/>
                            <e d='" + startTimeLocal.AddDays(1).AddHours(1).ToUniversalTime().ToString("yyyyMMddThhmmss") + @"Z'/>
                            <or a='" + zAccount.AccountZCO.emailAddress+ @"'/>
                        </comp>
                    </inv>               
                    <mp ct='text/plain'>
                        <content>
                            New Time Proposed Subject: " + apptSubject + @" 
                        </content> 
                    </mp>             
                </m>
                </CounterAppointmentRequest>");
            zAccount.AccountA.selectSOAP("//mail:CounterAppointmentResponse", null, null, null, 1);
            System.Threading.Thread.Sleep(3000);
             //Check ZCO for all the mails to see if Proposed new time mail has arrived and what it looks like.
            zAccount.AccountZCO.sendSOAP(new SearchRequest().Types("message").Query("subject:(" + apptSubject + ")")
                                                  );
            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:m", "id", null, out messageInvId, 1);
            #endregion
            #region Outlook Block to accept proposed new time

            OutlookCommands.Instance.Sync();
            RDOMail rdoMail = OutlookMailbox.Instance.findMessage("New Time Proposed: " + apptSubject);
            zAssert.IsNotNull(rdoMail, "Check that message the received message exists in the inbox");
            zAssert.AreEqual(rdoMail.Subject, "New Time Proposed: " + apptSubject, "Check that the subject matched expected value");
            
           
            #endregion
        }



    }
}
