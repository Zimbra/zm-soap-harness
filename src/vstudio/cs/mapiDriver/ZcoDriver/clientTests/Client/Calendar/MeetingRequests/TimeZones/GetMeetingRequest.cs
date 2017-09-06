using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using Soap;
using SoapWebClient;
using System.Collections.ObjectModel;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace clientTests.Client.Calendar.MeetingRequests.TimeZones
{
    [TestFixture]
    public class GetMeetingRequest : BaseTestFixture
    {

        private const int TestYear = 2009;
        private string CurrentTimeZone = null;
        private TimeZoneInfo CurrentTimeZoneInfo = null;
        private DateTime startTimeUTC = new DateTime(TestYear, 1, 1, 12, 0, 0);

        private void ReceiveMeetingRequest(ref ArrayList errorMessageList)
        {
            tcLog.Info("ReceiveMeetingRequest: " + CurrentTimeZone);


            #region SOAP: test account sends meeting request to sync user

            // Add a message to the account mailbox

            // [sramarao] As of 08/25/10 , zTimeZoneInfo.GetTimeZoneInfo() method throws exception "Unable to match TimeZone ID: xxx". 
            // the reason is timezones.ics file contains many time zones which does not have equivalent time zones in Windows. 
            // So wrote code to even look for aliases for the time zones in .ics file and see if mathing windows time zone is found. 
            // This works. However, ics file does not even contain aliases for many zones. Hence throws exception. So for now, 
            // I do not have any way to make the test cases which references this method ReceiveMeetingRequest() execute successfully. 
            DateTime startTimeTimeZone = TimeZoneInfo.ConvertTimeFromUtc(startTimeUTC, zTimeZoneInfo.GetTimeZoneInfo(CurrentTimeZone));

            string meetingSubject = "meeting " + GlobalProperties.time() + GlobalProperties.counter() + " " + startTimeUTC.ToLongDateString();
            string meetingContent = "content" + GlobalProperties.time() + GlobalProperties.counter();

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(meetingSubject).
                            AddAddress(MessageObject.AddressType.To, (zAccount.AccountZCO.emailAddress)).
                            BodyTextPlain(meetingContent).
                            AddInv(new InvObject().
                                    Summary(meetingSubject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeTimeZone, CurrentTimeZone).
                                    EndTime(startTimeTimeZone.AddHours(1), CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeTimeZone.AddDays(-2), startTimeTimeZone.AddDays(2)).
                                        Query("subject:(" + meetingSubject + ")"));

            #endregion

            #region ZCO: sync user verifies start/end times

            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(meetingSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment is synced");

            if (rdoAppointmentItem.Start.ToUniversalTime() != startTimeUTC)
            {
                string err = String.Format("{0} failed.  The meeting start time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            if (rdoAppointmentItem.End.ToUniversalTime() != startTimeUTC.AddHours(1))
            {
                string err = String.Format("{0} failed.  The meeting end time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC.AddHours(1), rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            #endregion

        }

        [Ignore] //Because of bug 50923
        [Test, Description("Create meeting in all time zones.  Verify start/end times are UTC correct.")]
        [Category("Calendar")]
        [Bug ("50923")] [Bug ("19438")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Send a meeting from test account to ZCO",
            "Verify the meeting start/end time is the correct GMT time for ZCO user")
        ]
        public void GetMeetingRequest_TimeZones_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            ReadOnlyCollection<string> timeZones = zTimeZoneInfo.GetZimbraTimeZones();
            ArrayList errorList = new ArrayList();

            foreach (string timeZone in timeZones)
            {
                if (timeZone.Equals("(GMT+02.00) Windhoek"))
                {
                    // Seems that the (GMT+02.00) Windhoek definition is buggy on Windows.
                    // Skip this time zone.
                    continue;
                }


                // Don't create the appointments at the same time
                startTimeUTC = startTimeUTC.AddHours(3);

                CurrentTimeZone = timeZone;
                ReceiveMeetingRequest(ref errorList);

            }

            // Build the error message (if applicable)
            string errorMsg = "Determine the number of time zones that failed" + Environment.NewLine;
            if (errorList.Count > 0)
            {
                foreach (string error in errorList)
                {
                    errorMsg += error + Environment.NewLine;
                }
            }
            zAssert.AreEqual(0, errorList.Count, errorMsg);

        }

        [Ignore] //Because of bug 50923
        [Test, Description("Receive meeting request around all timezone's daylight transition dates (Zimbra default time zones).  Verify start/end times.")]
        [Category("Calendar")]
        [Bug("50923")] [Bug("32729")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Loop in all timezones (Zimbra default timezones from timezones.ics)",
            "If the timezone supports daylight savings time, execute these steps:",
            "SOAP: create an meeting request on the day before daylight savings time starts.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day after daylight savings time starts.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day before daylight savings time ends.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day after daylight savings time ends.  ZCO: Verify the start/end times")
        ]
        public void GetMeetingRequest_TimeZones_02()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            ReadOnlyCollection<string> timeZones = zTimeZoneInfo.GetZimbraTimeZones();
            ArrayList errorList = new ArrayList();

            foreach (string timeZone in timeZones)
            {
                if (
                    timeZone.Equals("(GMT+02.00) Windhoek") ||
                    timeZone.Equals("(GMT-04.00) Manaus")
                    )
                {
                    // Seems that these definitions are buggy on Windows.
                    // Skip them
                    continue;
                }

                TimeZoneInfo.TransitionTime transitionTime;
                DateTime transitionDateTime;

                TimeZoneInfo timeZoneInfo = zTimeZoneInfo.GetTimeZoneInfo(timeZone);
                if (timeZoneInfo.SupportsDaylightSavingTime)
                {

                    foreach (TimeZoneInfo.AdjustmentRule rule in timeZoneInfo.GetAdjustmentRules())
                    {
                        transitionTime = rule.DaylightTransitionStart;
                        if (transitionTime.IsFixedDateRule)
                        {
                           tcLog.Info("Timezone " + timeZone + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            // Only apply current rules
                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue;
                            }

                            CurrentTimeZone = timeZone;

                            // Test a day before Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-2), timeZoneInfo);
                            ReceiveMeetingRequest(ref errorList);

                            // Test a day after Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(2), timeZoneInfo);
                            ReceiveMeetingRequest(ref errorList);
                        }

                        transitionTime = rule.DaylightTransitionEnd;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZone + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            // Only apply current rules
                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue;
                            }

                            CurrentTimeZone = timeZone;

                            // Test a day before Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-2), timeZoneInfo);
                            ReceiveMeetingRequest(ref errorList);

                            // Test a day after Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(2), timeZoneInfo);
                            ReceiveMeetingRequest(ref errorList);
                        }

                    }

                }

            }

            // Build the error message (if applicable)
            string errorMsg = "Determine the number of time zones that failed" + Environment.NewLine;
            if (errorList.Count > 0)
            {
                foreach (string error in errorList)
                {
                    errorMsg += error + Environment.NewLine;
                }
            }
            zAssert.AreEqual(0, errorList.Count, errorMsg);


        }


        private void ReceiveMeetingRequestSystemTimezone(ref ArrayList errorMessageList)
        {
            tcLog.Info("ReceiveMeetingRequestSystemTimezone: " + CurrentTimeZoneInfo);


            #region SOAP: test account sends meeting request to sync user

            // Add a message to the account mailbox
            DateTime startTimeTimeZone = TimeZoneInfo.ConvertTimeFromUtc(startTimeUTC, CurrentTimeZoneInfo);

            string meetingSubject = "meeting " + GlobalProperties.time() + GlobalProperties.counter() + " " + startTimeUTC.ToLongDateString();
            string meetingContent = "content" + GlobalProperties.time() + GlobalProperties.counter();

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(meetingSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(meetingContent).
                            AddInv(new InvObject().
                                    Summary(meetingSubject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddTimeZoneDef(CurrentTimeZoneInfo, startTimeUTC).
                                    StartTime(startTimeTimeZone, CurrentTimeZoneInfo.DisplayName).
                                    EndTime(startTimeTimeZone.AddHours(1), CurrentTimeZoneInfo.DisplayName))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeTimeZone.AddDays(-2), startTimeTimeZone.AddDays(2)).
                                        Query("subject:(" + meetingSubject + ")"));

            #endregion


            #region ZCO: sync user verifies start/end times

            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(meetingSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment is synced");

            if (rdoAppointmentItem.Start.ToUniversalTime() != startTimeUTC)
            {
                string err = String.Format("{0} failed.  The meeting start time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            if (rdoAppointmentItem.End.ToUniversalTime() != startTimeUTC.AddHours(1))
            {
                string err = String.Format("{0} failed.  The meeting end time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC.AddHours(1), rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            #endregion

        }

        // See bug 32815
        private static string[] _TimeZoneExceptions = {
                "(GMT+02:00) Amman",
                "(GMT+02:00) Cairo",
                "(GMT-01:00) Azores",
                "(GMT) Casablanca"

        };

        private static ArrayList TimeZoneExceptions = new ArrayList(_TimeZoneExceptions);

        [Test, Description("Receive meeting request around all timezone's daylight transition dates (System Time Zones).  Verify start/end times.")]
        [Ignore("Ignore this test case - determine method to convert new timezone string (e.g. America/Los_Angeles) to Windows timezone object")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Loop in all timezones (System Time Zones)",
            "If the timezone supports daylight savings time, execute these steps:",
            "SOAP: create an meeting request on the day before daylight savings time starts.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day after daylight savings time starts.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day before daylight savings time ends.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day after daylight savings time ends.  ZCO: Verify the start/end times")
        ]
        public void GetMeetingRequest_TimeZones_03()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            ReadOnlyCollection<string> timeZones = zTimeZoneInfo.GetZimbraTimeZones();
            ArrayList errorList = new ArrayList();

            foreach (TimeZoneInfo timeZoneInfo in TimeZoneInfo.GetSystemTimeZones())
            {
                if (
                    timeZoneInfo.DisplayName.Equals("(GMT+02:00) Windhoek") ||
                    timeZoneInfo.DisplayName.Equals("(GMT-04:00) Manaus")
                    )
                {
                    // Seems that these definitions are buggy on Windows.
                    // Skip them
                    continue;
                }

                if (TimeZoneExceptions.Contains(timeZoneInfo.DisplayName))
                {
                    // See: bug 32815 and GetMeetingRequest_TimeZones_04
                    continue;
                }


                TimeZoneInfo.TransitionTime transitionTime;
                DateTime transitionDateTime;

                if (timeZoneInfo.SupportsDaylightSavingTime)
                {

                    foreach (TimeZoneInfo.AdjustmentRule rule in timeZoneInfo.GetAdjustmentRules())
                    {

                        transitionTime = rule.DaylightTransitionStart;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZoneInfo.DisplayName + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue; // This adjustment rule does not apply to this test year.
                            }

                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);

                            // Test a day after Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);
                        }

                        transitionTime = rule.DaylightTransitionEnd;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZoneInfo.DisplayName + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue; // This adjustment rule does not apply to this test year.
                            }

                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);

                            // Test a day after Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);
                        }

                    }

                }

            }

            // Build the error message (if applicable)
            string errorMsg = "Determine the number of time zones that failed" + Environment.NewLine;
            if (errorList.Count > 0)
            {
                foreach (string error in errorList)
                {
                    errorMsg += error + Environment.NewLine;
                }
            }
            zAssert.AreEqual(0, errorList.Count, errorMsg);
        }

        [Test, Description("Amman, Cairo, Azores, Casablanca - Receive meeting request around all timezone's daylight transition dates (System Time Zones).  Verify start/end times.")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [Bug("32815")]
        [TestSteps(
            "Use timezone: Amman",
            "SOAP: create an meeting request on the day before daylight savings time starts.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day after daylight savings time starts.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day before daylight savings time ends.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request on the day after daylight savings time ends.  ZCO: Verify the start/end times")
        ]
        public void GetMeetingRequest_TimeZones_04()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            ReadOnlyCollection<string> timeZones = zTimeZoneInfo.GetZimbraTimeZones();
            ArrayList errorList = new ArrayList();

            foreach (TimeZoneInfo timeZoneInfo in TimeZoneInfo.GetSystemTimeZones())
            {

                if (!(TimeZoneExceptions.Contains(timeZoneInfo.DisplayName)))
                {
                    // Only execute this test for these timezones
                    continue;
                }



                TimeZoneInfo.TransitionTime transitionTime;
                DateTime transitionDateTime;

                if (timeZoneInfo.SupportsDaylightSavingTime)
                {

                    foreach (TimeZoneInfo.AdjustmentRule rule in timeZoneInfo.GetAdjustmentRules())
                    {

                        transitionTime = rule.DaylightTransitionStart;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZoneInfo.DisplayName + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue; // This adjustment rule does not apply to this test year.
                            }

                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);

                            // Test a day after Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);
                        }

                        transitionTime = rule.DaylightTransitionEnd;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZoneInfo.DisplayName + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue; // This adjustment rule does not apply to this test year.
                            }

                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);

                            // Test a day after Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(2), timeZoneInfo);
                            ReceiveMeetingRequestSystemTimezone(ref errorList);
                        }

                    }

                }

            }

            // Build the error message (if applicable)
            string errorMsg = "Determine the number of time zones that failed" + Environment.NewLine;
            if (errorList.Count > 0)
            {
                foreach (string error in errorList)
                {
                    errorMsg += error + Environment.NewLine;
                }
            }
            zAssert.AreEqual(0, errorList.Count, errorMsg);


        }

        private void ReceiveAllDayMeetingRequest(ref ArrayList errorMessageList)
        {
            tcLog.Info("ReceiveMeetingRequest: " + CurrentTimeZone);

            #region SOAP: test account sends meeting request to sync user

            // Add a message to the account mailbox
            DateTime startTimeTimeZone = TimeZoneInfo.ConvertTimeFromUtc(startTimeUTC, zTimeZoneInfo.GetTimeZoneInfo(CurrentTimeZone));

            string meetingSubject = "meeting " + GlobalProperties.time() + GlobalProperties.counter() + " " + startTimeUTC.ToLongDateString();
            string meetingContent = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string apptInvId;
            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(meetingSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(meetingContent).
                            AddInv(new InvObject().
                                    setAllDay().
                                    Summary(meetingSubject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    StartTime(startTimeTimeZone.ToString("yyyyMMdd"), CurrentTimeZone).
                                    EndTime(startTimeTimeZone.AddDays(1).ToString("yyyyMMdd"), CurrentTimeZone))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeTimeZone.AddDays(-2), startTimeTimeZone.AddDays(2)).
                                        Query("subject:(" + meetingSubject + ")"));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));

            #endregion

            #region ZCO: sync user verifies start/end times

            OutlookCommands.Instance.Sync();

            // Added delay and re-sync as outlook takes time to set exact datetime of different tz events
            System.Threading.Thread.Sleep(15000);
            OutlookCommands.Instance.Sync();
            
            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(meetingSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment is synced");

            if (rdoAppointmentItem.Start.ToUniversalTime() != startTimeUTC)
            {
                string err = String.Format("{0} failed.  The meeting start time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            if (rdoAppointmentItem.End.ToUniversalTime() != startTimeUTC.AddDays(1).AddHours(-1))
            {
                string err = String.Format("{0} failed.  The meeting end time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC.AddDays(1).AddHours(-1), rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            #endregion

        }

        [Test, Description("Receive meeting request allday meeting request that spans the transition time around all timezone's daylight transition dates (Zimbra default time zones).")]
        [Ignore("Ignore this test case - determine method to convert new timezone string (e.g. America/Los_Angeles) to Windows timezone object")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Loop in all timezones (Zimbra default timezones from timezones.ics)",
            "If the timezone supports daylight savings time, execute these steps:",
            "SOAP: create an meeting request that is allday and spans the transition dates during daylight savings starts.  ZCO: Verify the start/end times",
            "SOAP: create an meeting request that is allday and spans the transition dates during daylight savings ends.  ZCO: Verify the start/end times")
        ]
        public void GetMeetingRequest_TimeZones_05()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            ReadOnlyCollection<string> timeZones = zTimeZoneInfo.GetZimbraTimeZones();
            ArrayList errorList = new ArrayList();

            foreach (string timeZone in timeZones)
            {
                if (
                    // As per new timezone definitions Windhoek is GMT+1.00 and not GMT+2.00
                    timeZone.Equals("(GMT+01.00) Windhoek") ||
                    timeZone.Equals("(GMT-04.00) Manaus") || timeZone.Equals("(GMT-04.00) Georgetown")
                    )
                {
                    // Seems that these definitions are buggy on Windows.
                    // Skip them
                    continue;
                }


                TimeZoneInfo.TransitionTime transitionTime;
                DateTime transitionDateTime;

                TimeZoneInfo timeZoneInfo = zTimeZoneInfo.GetTimeZoneInfo(timeZone);
                if (timeZoneInfo.SupportsDaylightSavingTime)
                {

                    foreach (TimeZoneInfo.AdjustmentRule rule in timeZoneInfo.GetAdjustmentRules())
                    {
                        transitionTime = rule.DaylightTransitionStart;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZone + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            // Only apply current rules
                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue;
                            }

                            CurrentTimeZone = timeZone;
                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-1), timeZoneInfo);
                            ReceiveAllDayMeetingRequest(ref errorList);

                        }

                        transitionTime = rule.DaylightTransitionEnd;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZone + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            // Only apply current rules
                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue;
                            }

                            CurrentTimeZone = timeZone;
                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-1), timeZoneInfo);
                            //startTimeUTC = DateTime.ParseExact(startTimeUTC.ToString("yyyyMMdd"), "yyyyMMdd", CultureInfo.InvariantCulture);
                            ReceiveAllDayMeetingRequest(ref errorList);

                        }

                    }

                }

            }

            // Build the error message (if applicable)
            string errorMsg = "Determine the number of time zones that failed" + Environment.NewLine;
            if (errorList.Count > 0)
            {
                foreach (string error in errorList)
                {
                    errorMsg += error + Environment.NewLine;
                }
            }
            zAssert.AreEqual(0, errorList.Count, errorMsg);


        }

        private void ReceiveAllDayMeetingRequestSystemTimeZone(ref ArrayList errorMessageList)
        {
           tcLog.Info("ReceiveAllDayMeetingSystemTimeZone: " + CurrentTimeZone);

            #region SOAP: test account sends meeting request to sync user

            // Add a message to the account mailbox
            DateTime startTimeTimeZone = TimeZoneInfo.ConvertTimeFromUtc(startTimeUTC, CurrentTimeZoneInfo);

            string meetingSubject = "meeting " + GlobalProperties.time() + GlobalProperties.counter() + " " + startTimeUTC.ToLongDateString();
            string meetingContent = "content" + GlobalProperties.time() + GlobalProperties.counter();

            zAccount.AccountA.sendSOAP(new CreateAppointmentRequest().
                AddMessage(new MessageObject().
                            Subject(meetingSubject).
                            AddAddress(MessageObject.AddressType.To, zAccount.AccountZCO.emailAddress).
                            BodyTextPlain(meetingContent).
                            AddInv(new InvObject().
                                    setAllDay().
                                    Summary(meetingSubject).
                                    AddAttendee(zAccount.AccountZCO.emailAddress).
                                    AddOrganizer(zAccount.AccountA.emailAddress).
                                    AddTimeZoneDef(CurrentTimeZoneInfo, startTimeUTC).
                                    StartTime(startTimeTimeZone.ToString("yyyyMMdd"), CurrentTimeZoneInfo.DisplayName).
                                    EndTime(startTimeTimeZone.AddDays(1).ToString("yyyyMMdd"), CurrentTimeZoneInfo.DisplayName))));

            zAccount.AccountA.selectSOAP("//mail:CreateAppointmentResponse", null, null, null, 1);

            zAccount.AccountZCO.sendSOAP(new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeTimeZone.AddDays(-2), startTimeTimeZone.AddDays(2)).
                                        Query("subject:(" + meetingSubject + ")"));

            #endregion

            #region ZCO: sync user verifies start/end times

            OutlookCommands.Instance.Sync();

            // Added delay and re-sync as outlook takes time to set exact datetime of different tz events
            System.Threading.Thread.Sleep(15000);
            OutlookCommands.Instance.Sync();

            RDOAppointmentItem rdoAppointmentItem = OutlookMailbox.Instance.findAppointment(meetingSubject);
            zAssert.IsNotNull(rdoAppointmentItem, "Verify the appointment is synced");

            if (rdoAppointmentItem.Start.ToUniversalTime() != startTimeUTC)
            {
                string err = String.Format("{0} failed.  The meeting start time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC, rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            if (rdoAppointmentItem.End.ToUniversalTime() != startTimeUTC.AddDays(1).AddHours(-1))
            {
                string err = String.Format("{0} failed.  The meeting end time did not match: Expected: {1}  Was: {2} ", CurrentTimeZoneInfo.DisplayName, startTimeUTC.AddDays(1).AddHours(-1), rdoAppointmentItem.Start.ToUniversalTime());
                tcLog.Error(err);
                errorMessageList.Add(err);
            }

            #endregion
        }

        [Test, Description("Receive all day meeting request around all timezone's daylight transition dates (System Time Zones).  Verify start/end times.")]
        [Ignore("Ignore this test case - determine method to convert new timezone string (e.g. America/Los_Angeles) to Windows timezone object")]
        [Category("Calendar")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps(
            "Loop in all timezones (System Time Zones)",
            "If the timezone supports daylight savings time, execute these steps:",
            "SOAP: create an all day meeting request that spans DST start and is of 2 days.  ZCO: Verify the start/end times",
           "SOAP: create an all day meeting request that spans DST end and is of 2 days.  ZCO: Verify the start/end times")
        ]
        public void GetMeetingRequest_TimeZones_06()
        {

            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            ReadOnlyCollection<string> timeZones = zTimeZoneInfo.GetZimbraTimeZones();
            ArrayList errorList = new ArrayList();

            foreach (TimeZoneInfo timeZoneInfo in TimeZoneInfo.GetSystemTimeZones())
            {
                if (
                    // As per new TZ definitions Windhoek is not GMT+1.00
                    timeZoneInfo.DisplayName.Equals("(GMT+01:00) Windhoek") ||
                    timeZoneInfo.DisplayName.Equals("(GMT-04:00) Manaus") || timeZoneInfo.DisplayName.Equals("(GMT-04.00) Georgetown")
                    )
                {
                    // Seems that these definitions are buggy on Windows.
                    // Skip them
                    continue;
                }

                if (TimeZoneExceptions.Contains(timeZoneInfo.DisplayName))
                {
                    // See: bug 32815 and GetMeetingRequest_TimeZones_04
                    continue;
                }


                TimeZoneInfo.TransitionTime transitionTime;
                DateTime transitionDateTime;

                if (timeZoneInfo.SupportsDaylightSavingTime)
                {

                    foreach (TimeZoneInfo.AdjustmentRule rule in timeZoneInfo.GetAdjustmentRules())
                    {

                        transitionTime = rule.DaylightTransitionStart;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZoneInfo.DisplayName + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue; // This adjustment rule does not apply to this test year.
                            }

                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight Start
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-1), timeZoneInfo);
                            ReceiveAllDayMeetingRequestSystemTimeZone(ref errorList);

                        }

                        transitionTime = rule.DaylightTransitionEnd;
                        if (transitionTime.IsFixedDateRule)
                        {
                            tcLog.Info("Timezone " + timeZoneInfo.DisplayName + " uses a FixedDateRule, which is not supported");
                        }
                        else
                        {
                            transitionDateTime = zTimeZoneInfo.GetDaylightTransitionDateTime(transitionTime, TestYear);

                            // Some transitions happen at HH:59:59 ... just round those times down to HH:00:00.
                            transitionDateTime = new DateTime(transitionDateTime.Year, transitionDateTime.Month, transitionDateTime.Day, transitionDateTime.Hour, 0, 0);

                            if (!((rule.DateStart < transitionDateTime) && (rule.DateEnd > transitionDateTime)))
                            {
                                continue; // This adjustment rule does not apply to this test year.
                            }

                            CurrentTimeZoneInfo = timeZoneInfo;

                            // Test a day before Daylight End
                            startTimeUTC = TimeZoneInfo.ConvertTimeToUtc(transitionDateTime.AddDays(-1), timeZoneInfo);
                            ReceiveAllDayMeetingRequestSystemTimeZone(ref errorList);


                        }

                    }

                }

            }

            // Build the error message (if applicable)
            string errorMsg = "Determine the number of time zones that failed" + Environment.NewLine;
            if (errorList.Count > 0)
            {
                foreach (string error in errorList)
                {
                    errorMsg += error + Environment.NewLine;
                }
            }
            zAssert.AreEqual(0, errorList.Count, errorMsg);


        }

    }
}
