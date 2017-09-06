using System;
using System.Collections.Generic;
using System.Text;
using Harness;
using System.Threading;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using log4net;
using System.Xml;
using Soap;

namespace NewPSTDataTests
{
    public class PSTMigrationDriver : MigrationDriver
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected String PstFilename = null;
        protected ZAccount TargetAccount = null;
        protected String Executable = null;
        protected int maxWaitTime = 300000; //Max wait time for migration to complete is 300 secs i.e. 5 mins. This can be increased if we have tests where migration time exceeds 5 mins

        public PSTMigrationDriver()
        {
            log.Info("new " + typeof(PSTMigrationDriver));
        }

        public override void migrate()
        {
            log.Info("Importing PST file data");

            PstFilename = GlobalProperties.ZimbraQARoot + "/data/migrationWizard/pst" + PstFilename;

            log.Info("Starting the PST import using " + Executable);

            string xmlFilePath = GlobalProperties.ZimbraQARoot + @"\conf\SyncClient\ZimbraMigration\" + @"zimbra-pst-mig-config.xml";
            
            //Set server name, pst data file, zimbra account in xml config file
            SetPSTMigrationConfigXMLProperties(xmlFilePath);

            //bool runMigration = true;
            bool results = false;

            #region Designer mode
            /*
             * Commenting this part - Check LATER
            bool inDesigner = false;
            // If running from VS, the process that is running the harness is processinvocation86(TestDriven.net)
            // If automation is run from TMS or from individual client machine, it runs directly under nunit .
            // So to check if code is run from VS, check if the current process is processinvocation86
            Process process = System.Diagnostics.Process.GetCurrentProcess();
            if (process.ProcessName.ToLower().Trim() == "processinvocation86")
                inDesigner = true;
            process.Dispose();
            if (inDesigner)
            {
                // If harness is running from VS and user/developer/QA is trying to develop test cases, 
                // for debugging purpose, engineer may not want to migrate every time he wants 
                // to run a test case. In that scenarios, it is prudent to skip running 
                // migration tool after first time. For this, one suggestion to follow is, 
                // keep number of users csv file to one and this user is the one relevent to 
                // your test case. 
                // In case, there are multiple users (also multiple exchange accounts) 
                // in the csv file, then, CheckIfAccountsExists() will see if all the zimbra users exist in the server. 
                // Otherwise, it will return false and migration tool will migrate all users in csv file.
                log.Info("In Debug mode!!!");
                if (CheckIfAccountsExists(csvFilePath))
                {
                    runMigration = false;

                }
            }
            else
            {
                this.CleanupAccounts(csvFilePath);
            }
            if (runMigration)
            {
                results = this.RunCommandLineConsole(xmlFilePath, csvFilePath);
            }

            if (results == false)
                logger.Info("Migration did not start");
        }
        }
        */
        #endregion  

            results = this.RunCommandLineConsole(xmlFilePath);

            if (results == false)
                logger.Info("Migration did not start");
          
        }

        /// <summary>
        /// This method sets the HostName, PST datafile related info in config.xml file which is used by ZimbraMigrationConsole.exe.
        /// The value for these properties comes from migration.properties file.
        /// </summary>
        private void SetPSTMigrationConfigXMLProperties(string xmlFilePath)
        {
            log.Info("In SetMigrationConfigXMLProperties()...");

            if (xmlFilePath == null || xmlFilePath.Trim().Equals(""))
            {
                log.Error("xmlFilePath does not exist");
            }

            if (!File.Exists(xmlFilePath))
            {
                log.Error(xmlFilePath + "does not exist");
            }

            XmlDocument xmlDoc = new XmlDocument();
            xmlDoc.Load(xmlFilePath);

            //Set Hostname is PST Config file
            XmlNodeList list = xmlDoc.GetElementsByTagName("Hostname");
            
            foreach (XmlNode node in list)
            {
                if (node.ParentNode.Name.Equals("ZimbraServer"))
                {
                    node.InnerText = GlobalProperties.getProperty("zimbraServer.name");
                }
            }

            //Set DataFile is PST Config file
            XmlNodeList list1 = xmlDoc.GetElementsByTagName("DataFile");
            list1.Item(0).InnerText = PstFilename;
            
            //Set UserAccount is PST Config file
            XmlNodeList list2 = xmlDoc.GetElementsByTagName("UserAccount");
            list2.Item(0).InnerText = TargetAccount.displayName;
            
            //Save the file
            xmlDoc.Save(xmlFilePath);

        }

        public bool RunCommandLineConsole(string xmlFilePath)
        {
            log.Info("Running RunCommandLineConsole()");
            if (File.Exists(Executable))
            {

                ProcessStartInfo startInfo = new ProcessStartInfo(Executable);
                
                if (!File.Exists(xmlFilePath))
                {
                    log.Info(xmlFilePath + " File does not exists!!!!");
                    return (false);
                }
                
                ProcessStartInfo info = new ProcessStartInfo(Executable);
                info.UseShellExecute = true;
                info.Arguments += @"""ConfigxmlFile=" + Path.GetFullPath(xmlFilePath) + @"""" + " ";
                info.Arguments += @"""Silent=true """;
                info.WorkingDirectory = Path.GetDirectoryName(Executable);
                Process process = Process.Start(info);

                // If migration process does not get closed in maxWaitTime ms, kill the process. 
                // This has to be introduced to take care of scenario in bug#80864 where migration app hanged and generated core dump. 
                // Below logic should kill migration app and continue with migration of remaining psts
                if (process.WaitForExit(maxWaitTime))            
                {
                    process.Close();                //Free the resources associated with the migration process
                }
                else
                {
                    process.Kill();                 //Kill the migration process 
                    process.WaitForExit();          //And wait for migration process to exit
                }
                
                return true;

            }
            else
            {
                throw new HarnessException("Cannot find ZimbraMigrationConsole.exe under path : " + Executable);
            }

        }

        public string pstfilename
        {
            get
            {
                return PstFilename;
            }
            set
            {
                PstFilename = value;
            }
        }

        public string executable
        {
            get
            {
                return Executable;
            }
            set
            {
                Executable = value;
            }
        }

        public ZAccount account
        {
            get
            {
                return (TargetAccount);
            }

            set
            {
                TargetAccount = value;
            }

        }

    }
}
