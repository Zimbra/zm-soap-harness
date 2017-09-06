using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Calendar.Bugs
{
    public class CalendarBugs : BaseTestFixture
    {
        private string DefaultDomain;
        
        public CalendarBugs()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            this.TargetAccount = ZAccount.GetAccount("zma1", DefaultDomain);
        }

        [Test, Description("Migrate pst having multiple attendees and location, check if all attendees/location get migrated correctly")]
        [Bug("75758")]
        public void Bug75758()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Bug75758");

            #region Test Case variables
            string apptSubject = "Friday Product Meeting";
            string apptContent = "Looks like this may = have fallen off some calendars.";
            string attendee1 = "kevin";
            string attendee2 = "Marc";
            string attendee3 = "Ross";
            string attendee4 = "Matt";
            string attendee5 = "candace";
            string attendee6 = "jrobb";
            string location = "Room: Aquafront";
            string appointmentId = null;

            #endregion

            #region SOAP Block

            // Search for the Appointment ID
            TargetAccount.sendSOAP(
                        "<SearchRequest xmlns='urn:zimbraMail' types='appointment'>"
                + "<query> subject:(" + apptSubject + ") in:" + GlobalProperties.getProperty("globals.calendar") + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:appt", "id", null, out appointmentId, 1);

            TargetAccount.sendSOAP("<GetAppointmentRequest xmlns='urn:zimbraMail' id='" + appointmentId + "' />");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetAppointmentResponse/mail:appt/mail:inv", null, null, null, 1);
            //Verify organizer value
            TargetAccount.selectSOAP(m, "//mail:comp/mail:or", "a", "cboni@zimbra.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", "Copy: Friday Product Meeting", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "loc", location, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:fr", null, apptContent, null, 1);

            //Verify all attendees and location 
            TargetAccount.selectSOAP(m, "//mail:comp/mail:at[contains(@d, '" + attendee1 + "')]", "a", "kevin.kluge@zimbra.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:at[contains(@d, '" + attendee2 + "')]", "a", "marcmac@zimbra.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:at[contains(@d, '" + attendee3 + "')]", "a", "rossd@zimbra.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:at[contains(@d, '" + attendee4 + "')]", "a", "matt@zimbra.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:at[contains(@d, '" + attendee5 + "')]", "a", "candace@zimbra.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:at[contains(@d, '" + attendee6 + "')]", "a", "jrobb@zimbra.com", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:at[contains(@d, 'Aquafront')]", "a", "aquafront@zimbra.com", null, 1);

            //Verify the recurrence pattern
            TargetAccount.selectSOAP(m, "//mail:comp/mail:recur/mail:add/mail:rule", "freq", "WEE", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:recur/mail:add/mail:rule/mail:interval", "ival", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp/mail:recur/mail:add/mail:rule/mail:byday/mail:wkday", "day", "FR", null, 1);

            #endregion

        }

    }
}