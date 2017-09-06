using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.MeetingRequests.TimeZones.FreeBusy
{
    [TestFixture]
    public class GetFreeBusy_RecurringDaily : BaseTestFixture
    {

        [Test, Description("Verify a meeting request (recurring daily) is translated to the correct GMT time over DST transition dates")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCS)]
        [Bug("50026")]
        [TestSteps(
            "Send a meeting from ZCO to test account (recurring daily)",
            "Verify the meeting start/end time is correct GMT time before DST transition (the second Sunday in March)")
        ]
        public void GetFreeBusyRequest_TimeZones_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string apptSubject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string apptContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            //Made code changes to use current datetime while creating meeting request and making freebusy request during meeting's start and end date. freebusy request was not returning information for "t" attribute in past.
            DateTime startTimeTemp = DateTime.Now.AddHours(2);
            DateTime startTimeLocal = new DateTime(startTimeTemp.Year, startTimeTemp.Month, startTimeTemp.Day, startTimeTemp.Hour, 0, 0); 
            int currentYear = startTimeLocal.Year;
            int currentMonth = startTimeLocal.Month;
            int currentDate = startTimeLocal.Day;
            int currentHour = startTimeLocal.Hour;
            int currentMinute = startTimeLocal.Minute;
            int adjustedYear = currentYear;
            #endregion

            #region Outlook Block

            // Create a new appointment
            RDOAppointmentItem rAppt = OutlookMailbox.Instance.CreateAppointment();
            rAppt.MeetingStatus = rdoMeetingStatus.olMeeting;
            rAppt.Subject = apptSubject;
            rAppt.Body = apptContent;
            rAppt.Location = "";
            rAppt.Start = startTimeLocal;
            rAppt.Duration = 60;
            RDORecurrencePattern recurrencePattern = rAppt.GetRecurrencePattern();
            recurrencePattern.RecurrenceType = rdoRecurrenceType.olRecursDaily;
            recurrencePattern.Occurrences = 730;
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

            DateTime instanceStart, instanceEnd;
            string apptStart, apptEnd;

            #region Test Account verifies the F/B time of account1

            #region Instance before Daylight Savings transition

            if (currentMonth > 3)
                adjustedYear = currentYear + 1;
            else if (currentMonth == 3)
            {   
                if (currentDate > 1)
                    adjustedYear = currentYear + 1;
            }

            instanceStart = new DateTime(adjustedYear, 3, 1, currentHour, currentMinute, 0);
            instanceEnd = new DateTime(adjustedYear, 3, 1, currentHour + 1, currentMinute, 0);

            apptStart = (instanceStart.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            apptEnd = (instanceEnd.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            zAccount.AccountA.sendSOAP(
                            new GetFreeBusyRequest().
                                    Start(instanceStart.AddHours(-1).ToUniversalTime()).
                                    End(instanceEnd.AddHours(1).ToUniversalTime()).
                                    Email(zAccount.AccountA.emailAddress)
                        );

            zAccount.AccountA.selectSOAP("//mail:t[@s='" + apptStart + "']", "e", apptEnd, null, 1);

            #endregion

            #region Instance after Daylight Savings transition
            adjustedYear = currentYear;
            if (currentMonth > 3)
                adjustedYear = currentYear + 1;
            
            instanceStart = new DateTime(adjustedYear, 3, 31, currentHour, currentMinute, 0);
            instanceEnd = new DateTime(adjustedYear, 3, 31, currentHour + 1, currentMinute, 0);
            apptStart = (instanceStart.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            apptEnd = (instanceEnd.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            zAccount.AccountA.sendSOAP(
                            new GetFreeBusyRequest().
                                    Start(instanceStart.AddHours(-1).ToUniversalTime()).
                                    End(instanceEnd.AddHours(1).ToUniversalTime()).
                                    Email(zAccount.AccountA.emailAddress)
                        );

            zAccount.AccountA.selectSOAP("//mail:t[@s='" + apptStart + "']", "e", apptEnd, null, 1);

            #endregion

            #region Instance before Standart Time transition

            adjustedYear = currentYear;
            if (currentMonth > 10)
                adjustedYear = currentYear + 1;

            instanceStart = new DateTime(adjustedYear, 10, 31, currentHour, currentMinute, 0);
            instanceEnd = new DateTime(adjustedYear, 10, 31, currentHour + 1, currentMinute, 0);
            apptStart = (instanceStart.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            apptEnd = (instanceEnd.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            zAccount.AccountA.sendSOAP(
                            new GetFreeBusyRequest().
                                    Start(instanceStart.AddHours(-1).ToUniversalTime()).
                                    End(instanceEnd.AddHours(1).ToUniversalTime()).
                                    Email(zAccount.AccountA.emailAddress)
                        );

            zAccount.AccountA.selectSOAP("//mail:t[@s='" + apptStart + "']", "e", apptEnd, null, 1);

            #endregion

            #region Instance after Standard Time transition

            adjustedYear = currentYear;
            if (currentMonth > 11)
                adjustedYear = currentYear + 1;

            instanceStart = new DateTime(adjustedYear, 11, 30, currentHour, currentMinute, 0);
            instanceEnd = new DateTime(adjustedYear, 11, 30, currentHour + 1, currentMinute, 0);

            apptStart = (instanceStart.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();
            apptEnd = (instanceEnd.ToUniversalTime() - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            zAccount.AccountA.sendSOAP(
                            new GetFreeBusyRequest().
                                    Start(instanceStart.AddHours(-1).ToUniversalTime()).
                                    End(instanceEnd.AddHours(1).ToUniversalTime()).
                                    Email(zAccount.AccountA.emailAddress)
                        );

            zAccount.AccountA.selectSOAP("//mail:t[@s='" + apptStart + "']", "e", apptEnd, null, 1);

            #endregion

            #endregion

        }
    }
}
