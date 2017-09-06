using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Tasks
{
    public class Tasks : BaseTestFixture
    {
        public Tasks()
        {
            this.PstFilename = "/general/tasks/task.pst";
        }

        [Test, Description("Verify properties of task like subject, start and end date, percent complete are imported")]
        [TestSteps("1. Create few tasks and export it to PST.",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP the owner, subject, start and end date, perc. complete of the task ")]
        public void Tasks01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Tasks01");

            #region Test case variables
            string timeZone = "(GMT-06.00) Central Time (US &amp; Canada)";
            string subject = "SimpleTask";
            #endregion


            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='task'>"
                 +   "<tz id='" + timeZone + "'/>"
                + "<query>subject:" + subject + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "percentComplete", "25", null, 1);
            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:inst", "dueDate", "1189573200000", null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport3@gmail.com", null, 1);
        }

        [Test, Description("Verify that non started task are imported")]
        [TestSteps("1. Create few tasks and export it to PST.",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP that the unstarted task are imported.")]
        public void Tasks02()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Tasks02");

            #region Test case variables
            string subject = "NotStartedTask";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='task'>"
                + "<query>subject:" + subject + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "percentComplete", "0", null, 1);
            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport3@gmail.com", null, 1);
        }

        [Test, Description("Verify that completed task are imported")]
        [TestSteps("1. Create few tasks and export it to PST.",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP that the completed task are imported.")]
        public void Tasks03()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Tasks03");

            #region Test case variables
            string subject = "CompletedTask";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='task'>"
                + "<query>subject:" + subject + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "percentComplete", "100", null, 1);
            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport3@gmail.com", null, 1);
        }

        [Test, Description("Verify that task with attachment are imported")]
        [TestSteps("1. Create few tasks and export it to PST.",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP that the task with attachement are imported.")]
        public void Tasks04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Tasks04");

            #region Test case variables
            string subject = "AttachTask";
            string taskId = null;
            string attachmentName = "Attachment.txt";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='task'>"
                + "<query>subject:" + subject + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "percentComplete", "50", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);
            XmlNode m = TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:or", "a", "pstimport3@gmail.com", null, 1);

            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                + "<m id='" + taskId + "' read='1' html='1'/>"
                + "</GetMsgRequest>");

            XmlNode m1 = TargetAccount.selectSOAP("//mail:GetMsgResponse/mail:m/mail:mp", null, null, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:mp", "filename", attachmentName, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:mp", "cd", "attachment", null, 1);

        }

        [Test, Description("Verify that private task are imported")]
        [TestSteps("1. Create few tasks and export it to PST.",
		            "2. use the PST Import tool to import the PST file.",
		            "3. Verify using SOAP that the private task are imported.")]
        public void Tasks05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case Tasks05");

            #region Test case variables
            string subject = "PrivateTask";
            #endregion

            TargetAccount.sendSOAP(
                "<SearchRequest xmlns='urn:zimbraMail' types='task'>"
                + "<query>subject:" + subject + "</query>"
                + "</SearchRequest>");

            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "percentComplete", "0", null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "class", "PRI", null, 1);
        }

    }
}
