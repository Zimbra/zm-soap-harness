using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Task
{
    public class GetTask : BaseTestFixture
    {

        public GetTask()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }

        [Test, Description("Verify a basic task is migrated correctly")]
        public void GetTask01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task22";
            string taskId = null;
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
            TargetAccount.selectSOAP(m,"//mail:comp", "name", subject, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with normal priority is migrated correctly")]
        public void GetTask02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task16";
            string taskId = null;
            string taskPriority = "5";
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
            TargetAccount.selectSOAP(m, "//mail:comp[@priority='" + taskPriority + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with high priority is migrated correctly")]
        public void GetTask03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task4";
            string taskId = null;
            string taskPriority = "1";
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
            TargetAccount.selectSOAP(m, "//mail:comp[@priority='" + taskPriority + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with low priority is migrated correctly")]
        public void GetTask04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task5";
            string taskId = null;
            string taskPriority = "9";
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
            TargetAccount.selectSOAP(m, "//mail:comp[@priority='" + taskPriority + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with category is migrated correctly")]
        public void GetTask05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task9";
            string taskId = null;
            string category = "category100";
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
            TargetAccount.selectSOAP(m, "//mail:m", "tn", category, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            #endregion

        }

        [Test, Description("Verify a task without category is migrated correctly")]
        public void GetTask06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task23";
            string taskId = null;
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
            TargetAccount.selectSOAP(m, "//mail:m", "tn", null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with private status is migrated correctly")]
        public void GetTask07()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task16";
            string taskId = null;
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
            TargetAccount.selectSOAP(m, "//mail:comp", "class", "PRI", null, 1);
            #endregion

        }

        [Test, Description("Verify a task without private status is migrated correctly")]
        public void GetTask08()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task23";
            string taskId = null;
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
            TargetAccount.selectSOAP(m, "//mail:comp", "class", "PUB", null, 1);
            #endregion

        }

        [Test, Description("Verify a task with flag is migrated correctly")]
        [Bug("71570")]
        public void GetTask09()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task17";
            string taskId = null;
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
            TargetAccount.selectSOAP(m, "//mail:m", "f", "f", null, 1);
            #endregion

        }

        [Test, Description("Verify a task without flag is migrated correctly")]
        public void GetTask10()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task27";
            string taskId = null;
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
            TargetAccount.selectSOAP(m, "//mail:m", "f", "", null, 1);
            #endregion

        }
    }
}

