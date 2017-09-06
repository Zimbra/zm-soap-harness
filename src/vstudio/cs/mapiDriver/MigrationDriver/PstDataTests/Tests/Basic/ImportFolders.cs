using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace PstDataTests.Basic
{
    public class ImportFolders : BaseTestFixture
    {
        public ImportFolders()
        {
            this.PstFilename = "/general/folders/folders.pst";
        }

        [Test, Description("Import a PST file with lots of folders in it.")]
        [TestSteps("1. Create a new account.", "2. Using PST Import tool import the pst with folders to the account.", "3. Verify using soap that all the folders are migrated")]
        public void ImportFolders01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case ImportFolder01");
            #region Test case variables
            string rootFolder = Harness.GlobalProperties.getProperty("globals.root");
            string startFolder = "start";
            string subtree1 = "tree7";
            string subtree2 = "tree8";
            string subtree3 = "tree9";
            #endregion

            TargetAccount.sendSOAP(
                "<GetFolderRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:GetFolderResponse/mail:folder[@name='" + rootFolder + "']", null, null, null, 1);
            m = TargetAccount.selectSOAP(m, "//mail:folder", "name", Harness.GlobalProperties.getProperty("globals.inbox"), null, 1);
            XmlNode m1 = TargetAccount.selectSOAP(m, "//mail:folder", "name", startFolder, null, 1);
            TargetAccount.selectSOAP(m1, "//mail:folder", "name", "0", null, 1);
            //tree7 folder is under the start folder and under that there are 250 folders
            XmlNode m2 = TargetAccount.selectSOAP(m1, "//mail:folder", "name", subtree1, null, 1);
            TargetAccount.selectSOAP(m2, "//mail:folder", "name", "0", null, 1);
            TargetAccount.selectSOAP(m2, "//mail:folder", "name", "1", null, 1);
            TargetAccount.selectSOAP(m2, "//mail:folder", "name", "100", null, 1);
            TargetAccount.selectSOAP(m2, "//mail:folder", "name", "175", null, 1);
            TargetAccount.selectSOAP(m2, "//mail:folder", "name", "249", null, 1);
            //tree8 folder is under the start folder and under that there are 250 folders
            XmlNode m3 = TargetAccount.selectSOAP(m1, "//mail:folder", "name", subtree2, null, 1);
            TargetAccount.selectSOAP(m3, "//mail:folder", "name", "0", null, 1);
            TargetAccount.selectSOAP(m3, "//mail:folder", "name", "1", null, 1);
            TargetAccount.selectSOAP(m3, "//mail:folder", "name", "100", null, 1);
            TargetAccount.selectSOAP(m3, "//mail:folder", "name", "175", null, 1);
            TargetAccount.selectSOAP(m3, "//mail:folder", "name", "249", null, 1);
            //tree9 folder is under the start folder and under that there are 250 folders
            XmlNode m4 = TargetAccount.selectSOAP(m1, "//mail:folder", "name", subtree3, null, 1);
            TargetAccount.selectSOAP(m4, "//mail:folder", "name", "0", null, 1);
            TargetAccount.selectSOAP(m4, "//mail:folder", "name", "1", null, 1);
            TargetAccount.selectSOAP(m4, "//mail:folder", "name", "100", null, 1);
            TargetAccount.selectSOAP(m4, "//mail:folder", "name", "175", null, 1);
            TargetAccount.selectSOAP(m4, "//mail:folder", "name", "249", null, 1);

        }
    }
}
