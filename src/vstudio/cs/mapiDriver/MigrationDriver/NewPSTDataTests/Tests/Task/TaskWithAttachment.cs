using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace NewPSTDataTests.Task
{
    public class TaskWithAttachment : BaseTestFixture
    {
        public TaskWithAttachment()
        {
            this.PstFilename = "/general/tasks/task_attachment.pst";
        }

        [Test, Description("Verify a task with pptx attachment is migrated correctly")]
        public void Task01_pptx()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task12";
            string taskId = null;
            string attachment = "marketing_strategy.pptx";
            string ct = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            string cd = "attachment";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "ct", ct, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "cd", cd, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with doc attachment is migrated correctly")]
        public void Task02_docx()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task10";
            string taskId = null;
            string attachment = "migration_items_list.docx";
            string ct = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            string cd = "attachment";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "ct", ct, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "cd", cd, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with jpeg attachment is migrated correctly")]
        public void Task03_jpg()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task15";
            string taskId = null;
            string attachment = "Frangipani Flowers.jpg";
            string ct = "image/jpeg";
            string cd = "attachment";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "ct", ct, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "cd", cd, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with xlsx attachment is migrated correctly")]
        public void Task04_xlsx()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task25";
            string taskId = null;
            string attachment = "Book1.xlsx";
            string ct = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            string cd = "attachment";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "ct", ct, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "cd", cd, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with pdf attachment is migrated correctly")]
        public void Task05_pdf()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task13";
            string taskId = null;
            string attachment = "SecurIDToken_release_notes.pdf";
            string ct = "application/pdf";
            string cd = "attachment";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "ct", ct, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "cd", cd, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with png attachment is migrated correctly")]
        public void Task06_png()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task14";
            string taskId = null;
            string attachment = "octopus_dotx_preview.png";
            string ct = "image/png";
            string cd = "attachment";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "ct", ct, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "cd", cd, null, 1);
            #endregion

        }

        [Test, Description("Verify a task with text attachment is migrated correctly")]
        [Bug("77518")]
        public void Task07_txt()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task17";
            string taskId = null;
            string attachment = "test.txt";
            string ct = "text/plain";
            string cd = "attachment";
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
            TargetAccount.selectSOAP(m, "//mail:mp", "filename", attachment, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "ct", ct, null, 1);
            TargetAccount.selectSOAP(m, "//mail:mp", "cd", cd, null, 1);
            #endregion

        }

        [Test, Description("Verify a task without attachment is migrated correctly")]
        public void Task08_withoutAttchment()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task9";
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
            TargetAccount.selectSOAP(m, "//mail:mp", null, null, null, 0);
            #endregion

        }

    }
}

