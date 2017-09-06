using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Task
{
    public class TaskStatus : BaseTestFixture
    {

        public TaskStatus()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }

        [Test, Description("Verify a 0% completed task is migrated correctly")]
        public void Task01_0_Percent()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task17";
            string taskId = null;
            string percentComplete = "0";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@percentComplete='" + percentComplete + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a 25% completed task is migrated correctly")]
        public void Task02_25_Percent()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task26";
            string taskId = null;
            string percentComplete = "25";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@percentComplete='" + percentComplete + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a 100% completed task is migrated correctly")]
        public void Task03_100_Percent()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task27";
            string taskId = null;
            string percentComplete = "100";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@percentComplete='" + percentComplete + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a in-progress task is migrated correctly")]
        public void Task04_InProgress()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task26";
            string taskId = null;
            string status = "INPR";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@status='" + status + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a completed task is migrated correctly")]
        public void Task05_Completed()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task27";
            string taskId = null;
            string status = "COMP";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@status='" + status + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a not-started task is migrated correctly")]
        public void Task06_NotStarted()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task5";
            string taskId = null;
            string status = "NEED";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@status='" + status + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a waiting on others task is migrated correctly")]
        public void Task07_WaitingOnOthers()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task17";
            string taskId = null;
            string status = "WAITING";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@status='" + status + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a deferred task is migrated correctly")]
        public void Task08_Deferred()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task18";
            string taskId = null;
            string status = "DEFERRED";
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
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp[@status='" + status + "']", null, null, null, 1);
            #endregion

        }
    }
}