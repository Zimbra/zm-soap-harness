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

namespace ExchangeDataTests
{
    public class ExchangeMigrationDriver : MigrationDriver
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected String Executable = null;


        public ExchangeMigrationDriver()
        {
            log.Info("new " + typeof(ExchangeMigrationDriver));
        }

        public override void migrate()
        {
            log.Info("Migrating account from exchange");
            log.Info("Starting the migration using " + Executable);

            //TO DO: there should be a method which looks though zimbra server for zma1,zma2, etc accounts.If they exists, delete them.
            
            string xmlFilePath = string.Empty;//GlobalProperties.ZimbraQARoot + "/exchange2007-zimbra-mig-config_IM.xml";
            string csvFilePath = string.Empty;//GlobalProperties.ZimbraQARoot + "/exchange2007_users_3.csv";

            //Parse through list of config xml, users csv, file names.
            //The file contains rows of xml and csv file name comma separated pairs.
            //For example,
            //exchange2007-zimbra-mig-config_IM.xml,exchange2007_users_3.csv
            //exchange2003-zimbra-mig-config_IM.xml,exchange2003_users_3.csv
            string configAndUserListFilePath = GlobalProperties.ZimbraQARoot + @"\conf\SyncClient\ZimbraMigration\" + GlobalProperties.getProperty("XMLCSVListFile"); //xml_and_csv_list.txt";
            if (!File.Exists(configAndUserListFilePath))
            {
                log.Error("File containing list of config xml and csv file names is not found!!!");
                return;
            }
            List<string[]> list = Harness.FileParser.Parse(configAndUserListFilePath);
            // Parse will return list of rows. These rows contains xml and csv file names pair.
            // Migrate each pair at a time.
            foreach (string[] row in list)
            {
                if (row[0].Equals(String.Empty) || row[1].Equals(String.Empty))
                {
                    log.Error("did not file config file or user file name. Config file : " + row[0] + " User file : " + row[1]);
                }

                xmlFilePath = GlobalProperties.ZimbraQARoot + @"\conf\SyncClient\ZimbraMigration\" + row[0].Trim();
                csvFilePath = GlobalProperties.ZimbraQARoot + @"\conf\SyncClient\ZimbraMigration\" + row[1].Trim();

                //Set server name and domain in csvFilePath as both of them changes depending on which server automation is running on.
                SetMigrationConfigXMLProperties(xmlFilePath);

                bool runMigration = true;
                bool results = false;
                
                bool inDesigner = false;
                // If running from VS, the process that is running the harness is processinvocation86(TestDriven.net)
                // If automation is run from TMS or from individual client machine, it runs directly under nunit .
                // So to check if code is run from VS, check if the current process is processinvocation86
                Process process = System.Diagnostics.Process.GetCurrentProcess();
                if (process.ProcessName.ToLower().Trim()== "processinvocation86")
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
            // Run the import wizard with the given settings
            //this.RunWizard();
        }

        /// <summary>
        /// This method sets the HostName and domain properties in config.xml file which is used by ZimbraMigrationConsole.exe.
        /// The value for these properties comes from migration.properties file.
        /// </summary>
        private void SetMigrationConfigXMLProperties(string xmlFilePath)
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
            XmlNodeList list = xmlDoc.GetElementsByTagName("Hostname");
            //list.Item(0).InnerText = GlobalProperties.getProperty("zimbraServer.name");
            foreach (XmlNode node in list)
            {
                if (node.ParentNode.Name.Equals("ZimbraServer"))
                {
                    node.InnerText = GlobalProperties.getProperty("zimbraServer.name");
                }
            }

            XmlNodeList list1 = xmlDoc.GetElementsByTagName("DestinationDomain");
            foreach (XmlNode node in list1)
            {
                if (node.ParentNode.Name.Equals("UserProvision"))
                {
                    node.InnerText = GlobalProperties.getProperty("zimbraServer.name");
                }
            }

            //Save the file
            xmlDoc.Save(xmlFilePath);
            

            //list1.Item(0).InnerText = GlobalProperties.getProperty("defaultdomain.name");
            //foreach (XmlNode node in list1)
            //{
            //    node.InnerText = GlobalProperties.getProperty("defaultdomain.name");

            //}

        }


        // csv file contains exchange account name and corresponding zimbra account name list. 
        // Zimbra account names are hard coded in test cases. Hence they cannot be changed (unless you change the test case too.)
        // This method, check if zimbra user names in csv file is already present in zimbra server.
        // If they are present, it means account is already migrated.
        public bool CheckIfAccountsExists(string csvFilePath)
        {
            log.Info("In CheckIfAccountsExists() ");
            if (!File.Exists(csvFilePath))
            {
                log.Info(csvFilePath + " File does not exists!!!!");
                return (false);

            }

            List<string[]> list = Harness.FileParser.Parse(csvFilePath);
            bool result=true;
            foreach (string[] row in list)
            {
                // Skip the first row as it is header
                if (row[1].ToLower().Contains("mappedname"))
                {
                    continue;
                }
                if (!row[1].Equals(String.Empty))
                {
                    string user = row[1].Trim().ToString();

                    if (!ZAccount.IsAccountExist(user, GlobalProperties.getProperty("defaultdomain.name")))
                    {
                        result = false;
                        break;
                    }
                    
                }
                else
                    result = false;
            }
            return result;
        }

        public void CleanupAccounts(string csvFilePath)
        {
            log.Info("In CheckIfAccountsExists() ");
            if (!File.Exists(csvFilePath))
            {
                log.Info(csvFilePath + " File does not exists!!!!");
                return;

            }

            List<string[]> list = Harness.FileParser.Parse(csvFilePath);
            bool result = true;
            foreach (string[] row in list)
            {
                // Skip the first row as it is header
                if (row[1].ToLower().Contains("mappedname"))
                {
                    continue;
                }
                if (!row[1].Equals(String.Empty))
                {
                    string user = row[1].Trim().ToString();

                    if (ZAccount.IsAccountExist(user, GlobalProperties.getProperty("defaultdomain.name")))
                    {
                        ZAccount.DeleteAccount(user, GlobalProperties.getProperty("defaultdomain.name"));
                    }

                }
                
            }
            
        }

        public bool RunCommandLineConsole(string xmlFilePath, string csvFilePath)
        {
            log.Info("Running RunCommandLineConsole()");
            if (File.Exists(Executable))
            {

                ProcessStartInfo startInfo = new ProcessStartInfo(Executable);
                //string xmlFilePath = "c:/Program Files/ZimbraQA/exchange2007-zimbra-mig-config_IM.xml";
                //string csvFilePath = "c:/Program Files/ZimbraQA/exchange2007_users_3.csv";
                //string logFilePath = "c:/Program Files/ZimbraQA/log.txt";
               
                if (!File.Exists(xmlFilePath))
                {
                    log.Info(xmlFilePath + " File does not exists!!!!");
                    return(false);

                }
                if (!File.Exists(csvFilePath))
                {
                    log.Info(csvFilePath + " File does not exists!!!!");
                    return(false);

                }

               
                
                //This works
                
                ProcessStartInfo info = new ProcessStartInfo(Executable);
                info.UseShellExecute = true;
                info.Arguments += @"""ConfigxmlFile=" + Path.GetFullPath(xmlFilePath) + @"""" + " ";
                info.Arguments += @"""Users=" + Path.GetFullPath(csvFilePath) + @"""" + " " + @"""Silent=true """;
                //info.RedirectStandardInput = false;
                //info.RedirectStandardOutput = true;
                //info.RedirectStandardError = true;
                info.WorkingDirectory = Path.GetDirectoryName(Executable);
                Process process = Process.Start(info);
                process.WaitForExit();
                //try
                //{
                    ////Read from console output
                    //StreamReader sr = process.StandardOutput;
                    
                    //StreamWriter sw=new StreamWriter(Path.GetFullPath(logFilePath));
                    ////Writing to log file
                    //sw.Write(sr.ReadToEnd());
                    //sr.Close();
                    //sw.Close();

                    
                    //process.Close();
                //}
                //catch(HarnessException ex)
                //{
                //    log.Error("error while migrating: " + ex.Message);
                //}
                
                
                return true; 

            }
            else
            {
                throw new HarnessException("Cannot find ZimbraMigrationConsole.exe under path : " + Executable);
            }

        }
        public bool RunWizard()
        {

            // Open the PST import wizard
            ProcessStartInfo startInfo = new ProcessStartInfo(Executable);
            startInfo.WorkingDirectory = Path.GetDirectoryName(Executable);
            Process wizardProcess = Process.Start(startInfo);
            log.Info("Started Exchange wizard using " + Executable);

            // Loop for 10 minutes (600 seconds) or until the PST importer exits
            for (int i = 0; i < 600; i++)
            {

                // Make sure the PST Wizard is still running
                if (wizardProcess.HasExited)
                {
                    log.Info("Exchange wizard exited");
                    break;
                }

                // Discard cached information about the process.
                wizardProcess.Refresh();

                #region "ZCS Migration Wizard for Exchange"/"This wizard will guide you ...": 
                if (WelcomePageWindow.instance.exists() && !WelcomePageWindow.instance.HasBeenProcessed)
                {
                    WelcomePageWindow.instance.process();
                }

                #endregion 

                #region "ZCS Migration Wizard for Exchange"/"Enter the hostname and port of the admin service on the Zimbra server" 

                if (DestinationFormWindow.instance.exists() && !DestinationFormWindow.instance.HasBeenProcessed)
                {
                    DestinationFormWindow.instance.adminname = GlobalProperties.getProperty("admin.user");
                    DestinationFormWindow.instance.adminpassword = GlobalProperties.getProperty("admin.password");
                    DestinationFormWindow.instance.adminport = GlobalProperties.getProperty("admin.port");
                    DestinationFormWindow.instance.servername = GlobalProperties.getProperty("zimbraServer.name");
                    DestinationFormWindow.instance.servermode = GlobalProperties.getProperty("soapservice.mode");

                    DestinationFormWindow.instance.process();
                }

                #endregion

                #region "Invalid Certificate"/""

                if (InvalidCertificateWindow.instance.exists() && !InvalidCertificateWindow.instance.HasBeenProcessed)
                {
                    InvalidCertificateWindow.instance.process();
                }

                #endregion

                #region "ZCS Migration Wizard for Exchange"/"Destination Domain"
                if (SelectDomainWindow.instance.exists() && !SelectDomainWindow.instance.HasBeenProcessed)
                {
                    Thread.Sleep(1000);
                    string targetDomainName = GlobalProperties.getProperty("zimbraServer.name");
                    SelectDomainWindow.instance.TargetDomainName = targetDomainName;

                    SelectDomainWindow.instance.process();
                }

                #endregion

                #region ZCS Migration Wizard for Exchange"/"Select the MAPI Profile"
                if (MAPIProfileWindow.instance.exists() && !MAPIProfileWindow.instance.HasBeenProcessed)
                {
                    Thread.Sleep(1000);
                    string profileName = "Outlook";
                    MAPIProfileWindow.instance.profileName = profileName;
                    MAPIProfileWindow.instance.process();
                }

                #endregion

                #region "ZCS Migration Wizard for Exchange"/"Use the Object Picker or Query Builder to identify which users to migrate to Zimbra.":
                if (SourceMailboxWindow.instance.exists() && !SourceMailboxWindow.instance.HasBeenProcessed)
                {
                    SourceMailboxWindow.instance.process();
                }

                #endregion 

                #region "ZCS Migration Wizard for Exchange"/"Verifying Account: Verification completed. 0 accounts exists and 1 accounts do not exist."
                if (TargetVerificationWindow.instance.exists() && !TargetVerificationWindow.instance.HasBeenProcessed)
                {
                    TargetVerificationWindow.instance.process();
                }

                #endregion 

                #region "ZCS Migration Wizard for Exchange"/"Do not provision any users"
                if (AccountProvisionWindow.instance.exists() && !AccountProvisionWindow.instance.HasBeenProcessed)
                {
                    AccountProvisionWindow.instance.process();
                }

                #endregion 

                #region "ZCS Migration Wizard for Exchange"/"Provisioning Accounts: Completed: 1 accounts created and 0 failed to be created."
                if (ProvisionedAccountWindow.instance.exists() && !ProvisionedAccountWindow.instance.HasBeenProcessed)
                {
                    ProvisionedAccountWindow.instance.process();
                }

                #endregion 

                #region "ZCS Migration Wizard for Exchange"/"Select Items"
                if (ImportItemsWindow.instance.exists() && !ImportItemsWindow.instance.HasBeenProcessed)
                {
                    ImportItemsWindow.instance.process();
                }

                #endregion 

                #region "ZCS Migration Wizard for Exchange"/"Folder Options"
                if (ImportOptionsWindow.instance.exists() && !ImportOptionsWindow.instance.HasBeenProcessed)
                {
                    ImportOptionsWindow.instance.process();
                }

                #endregion 

                #region "Begin Import Process?"/"Click OK to begin importing or Cancel to review import options."
                if (BeginImportWindow.instance.exists() && !BeginImportWindow.instance.HasBeenProcessed)
                {
                    BeginImportWindow.instance.process();
                }

                #endregion

                #region "ZCS Migration Wizard for Outlook", "Overall Progress: ": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen8.JPG

                if (ImportInProgress.instance.exists() && !ImportInProgress.instance.HasBeenProcessed)
                {
                    ImportInProgress.instance.process();
                }

                #endregion

                #region "Import Completed", " Import Completed"

                if (ImportCompleteAlert.instance.exists() && !ImportCompleteAlert.instance.HasBeenProcessed)
                {
                    ImportCompleteAlert.instance.process();
                }

                #endregion

                #region "ZCS Migration Wizard for Exchange", "All errors and warnings are displayed below"

                if (ImportComplete.instance.exists() && !ImportComplete.instance.HasBeenProcessed)
                {
                    ImportComplete.instance.process();
                }

                #endregion




                // Wait for the next window to come up
                Thread.Sleep(1000);

            }
            // Close wizard process window
            wizardProcess.Close();
            wizardProcess = null;

            return (true);
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
    }
}
