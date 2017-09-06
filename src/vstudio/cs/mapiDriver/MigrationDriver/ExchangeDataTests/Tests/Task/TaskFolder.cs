using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Task
{
    public class TaskFolder : BaseTestFixture
    {

        public TaskFolder()
        {
            TargetAccount = ZAccount.GetAccount("zma1", GlobalProperties.getProperty("defaultdomain.name"));
        }

        [Test, Description("Verify a task in non-default folder is migrated correctly")]
        public void Task01_NonDefaultFolder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task6";
            string taskId = null;
            string foldername = "Folder17";
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderId, 1);

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
            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);
            #endregion

        }

        [Test, Description("Verify a task in trash folder is migrated correctly")]
        [Bug("77539")]
        public void Task02_TrashFolder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task7";
            string taskId = null;
            string foldername = "Trash";
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderId, 1);

            // Search for the Task ID
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                      + "<query> in:trash " + subject + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "invId", null, out taskId, 1);

            // Get the Task
            TargetAccount.sendSOAP(
                "<GetMsgRequest xmlns='urn:zimbraMail'>"
                 + "<m id='" + taskId + @"'/>"
              + "</GetMsgRequest>");
            XmlNode m = TargetAccount.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:comp", "name", subject, null, 1);
            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);
            #endregion

        }

        [Test, Description("Verify a task in sub-folder is migrated correctly")]
        public void Task03_SubFolder()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject = "task26";
            string taskId = null;
            string foldername = "Folder4";
            string folderId = null;
            #endregion

            #region SOAP Block

            //Search for Folder ID
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", "id", null, out folderId, 1);

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
            TargetAccount.selectSOAP(m, "//mail:m", "l", folderId, null, 1);
            #endregion

        }

        [Test, Description("Verify that a non-default task folder is migrated correctly")]
        public void Task04()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject1 = "task5";
            string subject2 = "task6";
            string subject3 = "task13";
            string foldername = "Folder17";
            #endregion

            #region SOAP Block

            // Search for the Tasks
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                + "<query>in:" + foldername + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "name", subject1, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "name", subject2, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "name", subject3, null, 1);
            #endregion

        }

        [Test, Description("Verify that a task sub-folder is migrated correctly")]
        public void Task05()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string subject1 = "task14";
            string subject2 = "task26";
            string foldername = "Folder4";
            #endregion

            #region SOAP Block

            // Search for the Tasks
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                + "<query>in:tasks/" + foldername + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "name", subject1, null, 1);
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "name", subject2, null, 1);
            #endregion

        }

        [Test, Description("Verify that a empty task folder is migrated correctly")]
        public void Task06()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "Folder6";
            #endregion

            #region SOAP Block

            // Search for the Tasks
            TargetAccount.sendSOAP(
                "  <SearchRequest xmlns='urn:zimbraMail' types='task'>"
                + "<query>in:tasks/" + foldername + @"</query>"
                    + "</SearchRequest>");
            TargetAccount.selectSOAP("//mail:SearchResponse/mail:task", "name", null, null, 0);
            #endregion

        }

        [Test, Description("Verify a task folder with a backslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void task07_backslash()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "task\\backslash";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a task folder with a forwardslash in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void task08_forwardslash()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "task_forwardslash";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

        [Test, Description("Verify a task folder with a asterisk in subfolder name is migrated correctly")]
        [Bug("77385")]
        public void task09_asterisk()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables
            string foldername = "task*asterisk";
            #endregion

            #region SOAP Block

            //Search for Folder 
            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");
            TargetAccount.selectSOAP("//mail:folder[@name='" + foldername + "']", null, null, null, 1);
            #endregion

        }

    }
}