using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Task
{
    public class TaskContent : BaseTestFixture
    {

        public TaskContent()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }
        [Test, Description("Verify a task with content is migrated correctly")]
        public void Task01_Content()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task24";
            string taskId = null;
            string content = "Another task with high importance";
            string text = "";
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
            TargetAccount.selectSOAP(m, "//mail:desc", null, null, out text, 1);
            ZAssert.IsTrue((text.ToLower()).Contains((content.ToLower())), "task content is migrated successfully");
            #endregion

        }

        [Test, Description("Verify a task with text content is migrated correctly")]
        public void Task02_TextContent()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task9";
            string taskId = null;
            string content = "Task with category category100";
            string text = "";
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
            TargetAccount.selectSOAP(m, "//mail:desc", null, null, out text, 1);
            ZAssert.IsTrue((text.ToLower()).Contains((content.ToLower())), "task content is migrated successfully");
            #endregion

        }

        [Test, Description("Verify a task with html content is migrated correctly")]
        public void Task03_HtmlContent()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task4";
            string taskId = null;
            string content = "\n<HTML>\n<HEAD>\n\n\n<TITLE>task4</TITLE>\n</HEAD>\n<BODY>\n\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><FONT face=\"Calibri\">Html notes:</FONT></SPAN></P>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><B><FONT face=\"Calibri\">Bold</FONT></B></SPAN><SPAN lang=\"en-us\"><B><FONT face=\"Calibri\"> tag</FONT></B></SPAN></P>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><B><U><FONT face=\"Calibri\">Underline</FONT></U></B></SPAN><SPAN lang=\"en-us\"><B><U><FONT face=\"Calibri\"></FONT></U></B></SPAN><SPAN lang=\"en-us\"> <FONT face=\"Calibri\">tag</FONT></SPAN></P>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><I><FONT face=\"Calibri\">Italic</FONT></I></SPAN><SPAN lang=\"en-us\"><FONT face=\"Calibri\"> tag</FONT></SPAN></P>\n<BR>\n<BR>\n<BR>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"><FONT face=\"Calibri\">Task with high priority</FONT></SPAN><SPAN lang=\"en-us\"><FONT face=\"Calibri\"></FONT></SPAN><SPAN lang=\"en-us\"> </SPAN></P>\n\n<P dir=\"LTR\"><SPAN lang=\"en-us\"></SPAN></P>\n\n</BODY>\n</HTML>";
            string text = "";
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
            TargetAccount.selectSOAP(m, "//mail:descHtml", null, null, out text, 1);
            ZAssert.IsTrue((text.ToLower()).Contains((content.ToLower())), "task content is migrated successfully");
            #endregion

        }
    }
}