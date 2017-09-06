using System;
using System.Collections.Generic;
using System.Text;
using Harness;
using System.Threading;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using log4net;


namespace PstDataTests
{
    public class PstMigrationDriver : MigrationDriver
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected String PstFilename = null;
        protected ZAccount TargetAccount = null;
        protected String Executable = null;

        public PstMigrationDriver()
        {
            logger.Info("new " + typeof(PstMigrationDriver));
        }

        public override void migrate()
        {

            if (TargetAccount == null)
                throw new HarnessException("TargetAccount cannot be null");
            if (PstFilename == null)
                throw new HarnessException("PstFilename cannot be null");

            PstFilename = GlobalProperties.ZimbraQARoot + "/data/migrationWizard/pst" + PstFilename;

            log.Info("migrating PST " + PstFilename + " to account " + TargetAccount.emailAddress);
            log.Info("Starting the migration using " + Executable);

            // Run the import wizard with the given settings
            this.RunWizard();

        }

        public bool RunWizard()
        {


            // Open the PST import wizard
            ProcessStartInfo startInfo = new ProcessStartInfo(Executable);
            startInfo.WorkingDirectory = Path.GetDirectoryName(Executable);
            Process wizardProcess = Process.Start(startInfo);
            log.Info("Started PST wizard using " + Executable);

            // Loop for 10 minutes (600 seconds) or until the PST importer exits
            for (int i = 0; i < 600; i++)
            {

                // Make sure the PST Wizard is still running
                if (wizardProcess.HasExited)
                {
                    log.Info("PST wizard exited");
                    break;
                }

                // Discard cached information about the process.
                wizardProcess.Refresh();




                #region "ZCS Import Wizard for Outlook"/"This wizard will guide you ...": https://wiki.eng.vmware.com/File:ZimbraQAPSTScreen1.JPG

                if (WelcomePageWindow.instance.exists() && !WelcomePageWindow.instance.HasBeenProcessed)
                {
                    WelcomePageWindow.instance.process();
                }

                #endregion


                #region "ZCS Import Wizard for Outlook"/"Enter the hostname and port of the Zimbra server": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen2.JPG

                if (DestinationFormWindow.instance.exists() && !DestinationFormWindow.instance.HasBeenProcessed)
                {

                    DestinationFormWindow.instance.accountname = TargetAccount.emailAddress;
                    DestinationFormWindow.instance.accountpassword = GlobalProperties.getProperty("defaultpassword.value");
                    DestinationFormWindow.instance.servername = GlobalProperties.getProperty("zimbraServer.name");
                    DestinationFormWindow.instance.servermode = GlobalProperties.getProperty("soapservice.mode");

                    DestinationFormWindow.instance.process();
                }

                #endregion

                #region "ZCS Import Wizard for Outlook"/"PST Filename": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen3.JPG
                if (BrowsePstWindow.instance.exists() && !BrowsePstWindow.instance.HasBeenProcessed)
                {
                    BrowsePstWindow.instance.pstfilename = PstFilename;

                    BrowsePstWindow.instance.process();
                }

                #endregion

                #region "ZCS Import Wizard for Outlook"/"SelectItems": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen5.JPG
                if (ImportItemsWindow.instance.exists() && !ImportItemsWindow.instance.HasBeenProcessed)
                {
                    ImportItemsWindow.instance.process();
                }

                #endregion

                #region "ZCS Import Wizard for Outlook"/"Folder Options": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen6.JPG
                if (ImportOptionsWindow.instance.exists() && !ImportOptionsWindow.instance.HasBeenProcessed)
                {
                    ImportOptionsWindow.instance.process();
                }

                #endregion

                #region "Begin Import Process?"/"Click OK to begin importing or Cancel to review import options.": https://wiki.eng.vmware.com/File:ZimbraQAPSTScreen7.JPG

                if (BeginImportWindow.instance.exists() && !BeginImportWindow.instance.HasBeenProcessed)
                {
                    BeginImportWindow.instance.process();
                }

                #endregion


                #region "ZCS Import Wizard for Outlook", "Importing data from PST to Zimbra.": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen8.JPG

                if (ImportInProgress.instance.exists() && !ImportInProgress.instance.HasBeenProcessed)
                {
                    ImportInProgress.instance.process();
                }

                #endregion


                #region "Import Complete", "PST Import Complete": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen9.JPG

                if (ImportCompleteAlert.instance.exists() && !ImportCompleteAlert.instance.HasBeenProcessed)
                {
                    ImportCompleteAlert.instance.process();
                }

                #endregion


                #region "ZCS Import Wizard for Outlook", "All errors and warnings are displayed below": https://wiki.eng.vmware.com/File:ZimbraQAPstScreen10.JPG

                if (ImportComplete.instance.exists() && !ImportComplete.instance.HasBeenProcessed)
                {
                    ImportComplete.instance.process();
                }

                #endregion


                #region Error dialogs

                if (DefaultMailClientWarningWindow.instance.exists() && DefaultMailClientWarningWindow.instance.isForeground())
                {
                    DefaultMailClientWarningWindow.instance.process();
                }

                if (OpenFileSecurityWarningWindow.instance.exists() && OpenFileSecurityWarningWindow.instance.isForeground())
                {
                    OpenFileSecurityWarningWindow.instance.process();
                }

                if (RuntimeErrorWindow.instance.exists() && RuntimeErrorWindow.instance.isForeground())
                {
                    RuntimeErrorWindow.instance.process();
                }

                if (ErrorsOrWarnings.instance.exists() && !ErrorsOrWarnings.instance.HasBeenProcessed)
                {
                    ErrorsOrWarnings.instance.process();
                }

                if (ErrorRunningInAnotherProcess.instance.exists() && !ErrorRunningInAnotherProcess.instance.HasBeenProcessed)
                {
                    ErrorRunningInAnotherProcess.instance.process();
                }

                if (ImportInProgressPopup.instance.exists() && !ImportInProgressPopup.instance.HasBeenProcessed)
                {
                    ImportInProgressPopup.instance.process();
                    Thread.Sleep(15000);
                }

                if (ExchangeAddressFoundPopup.instance.exists() && !ExchangeAddressFoundPopup.instance.HasBeenProcessed)
                {
                    ExchangeAddressFoundPopup.instance.process();
                    Thread.Sleep(5000);
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



        //static void clickInvalidCertYesButton()
        //{
        //    runThread4 = true;
        //    while (runThread4)                             //loop while this thread should execute
        //    {
        //        // Monitor window with these titles and click 'Yes'
        //        string invalidCertTitle = "Invalid Certificate";
        //        if (WindowExists(invalidCertTitle, 30, TitleComparison.Contains))
        //        {
        //            IntPtr InvalidCertHandle = User32.ZFindWindow(null, invalidCertTitle);
        //            log.Info("Found window for invalid ceritificate with title " + invalidCertTitle);
        //            IntPtr hChild = IntPtr.Zero;
        //            do
        //            {
        //                hChild = User32.ZFindWindowEx(InvalidCertHandle, hChild, null, IntPtr.Zero);
        //                if (!hChild.Equals(IntPtr.Zero))
        //                {
        //                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
        //                    if (ctrlId == 6)
        //                    {
        //                        User32.ZSendMessageSlow(hChild, (uint)DialogBoxMessages.BM_CLICK, 0, 0);
        //                        log.Info("Clicked the Yes button to continue with invalid certificate.");
        //                        runThread4 = false;
        //                    }
        //                }
        //            } while (!hChild.Equals(IntPtr.Zero));
        //        }
        //        Thread.Sleep(50);
        //    }
        //}

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
