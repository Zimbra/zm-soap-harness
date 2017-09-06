using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Task
{
    public class RecurringTask : BaseTestFixture
    {

        public RecurringTask()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }

        [Test, Description("Verify a daily recurring task is migrated correctly")]
        [Bug("77574")]
        public void Task01_DailyRecurring()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task19";
            string taskId = null;
            DateTime startDate = new DateTime(2012, 08, 28, 8, 0, 0);
            DateTime endDate = new DateTime(2012, 08, 29, 8, 30, 0);
            string frequency = "DAI";
            string count = "5";
            string day1 = "MO";
            string day2 = "TU";
            string day3 = "WE";
            string day4 = "TH";
            string day5 = "FR";
            #endregion

            #region SOAP Block

            // Search for the Task ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                      + "<query>" + subject + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            // Get the Task
            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + taskId + @"'/>"
              + "</GetMsgRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startDate.ToString("yyyyMMdd"), null, 1); 
            TargetAccount.selectSOAP(m, "//mail:e", "d", endDate.ToString("yyyyMMdd"), null, 1); 
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", count, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day1, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day2, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day3, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day4, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day5, null, 1);
            #endregion

        }

        [Test, Description("Verify a weekly recurring task is migrated correctly")]
        public void Task02_WeeklyRecurring()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task20";
            string taskId = null;
            DateTime startDate = new DateTime(2012, 08, 28, 8, 0, 0);
            DateTime endDate = new DateTime(2012, 08, 29, 8, 30, 0);
            string frequency = "WEE";
            string occurrences = "5";
            string day = "WE";
            string interval = "1";
            #endregion

            #region SOAP Block

            // Search for the Task ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                      + "<query>" + subject + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            // Get the Task
            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + taskId + @"'/>"
              + "</GetMsgRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startDate.ToString("yyyyMMdd"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endDate.ToString("yyyyMMdd"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:wkday", "day", day, null, 1);
            #endregion

        }

        [Test, Description("Verify a monthly recurring task is migrated correctly")]
        public void Task03_MonthlyRecurring()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task8";
            string taskId = null;
            DateTime startDate = new DateTime(2012, 03, 13, 8, 0, 0);
            DateTime endDate = new DateTime(2012, 03, 13, 8, 30, 0);
            string frequency = "MON";
            string interval = "1";
            string monthDay = "13";
            string occurrences = "7";
            #endregion

            #region SOAP Block

            // Search for the Task ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                      + "<query>" + subject + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            // Get the Task
            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + taskId + @"'/>"
              + "</GetMsgRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startDate.ToString("yyyyMMdd"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endDate.ToString("yyyyMMdd"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:bymonthday", "modaylist", monthDay, null, 1);
            #endregion

        }

        [Test, Description("Verify a yearly recurring task is migrated correctly")]
        public void Task04_YearlyRecurring()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task21";
            string taskId = null;
            DateTime startDate = new DateTime(2013, 08, 06, 8, 0, 0);
            DateTime endDate = new DateTime(2013, 08, 07, 8, 30, 0);
            string monthNumber = "8";
            string occurrences = "3";
            string frequency = "YEA";
            string interval = "1";
            #endregion

            #region SOAP Block

            // Search for the Task ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                      + "<query>" + subject + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            // Get the Task
            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + taskId + @"'/>"
              + "</GetMsgRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m[@id='" + taskId + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:s", "d", startDate.ToString("yyyyMMdd"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:e", "d", endDate.ToString("yyyyMMdd"), null, 1);
            TargetAccount.selectSOAP(m, "//mail:count", "num", occurrences, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:interval", "ival", interval, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule", "freq", frequency, null, 1);
            TargetAccount.selectSOAP(m, "//mail:rule/mail:bymonth", "molist", monthNumber, null, 1); //which month
            #endregion

        }

    }
}
