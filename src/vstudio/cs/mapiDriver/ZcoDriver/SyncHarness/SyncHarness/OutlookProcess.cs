using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.IO;
using log4net;


namespace SyncHarness
{

    public class OutlookProcess : IProcess
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        protected const string Outlook2003exe = @"C:\Program Files\Microsoft Office\Office11\OUTLOOK.EXE";
        protected const string Outlook2007exe = @"C:\Program Files\Microsoft Office\Office12\OUTLOOK.EXE";
        protected const string Outlook2010exe = @"C:\Program Files\Microsoft Office\Office14\OUTLOOK.EXE";
        //protected const string Outlook2010_64exe = @"C:\Program Files (x86)\Microsoft Office\Office14\OUTLOOK.EXE";
        protected const string Outlook2003_64exe = @"C:\Program Files (x86)\Microsoft Office\Office11\OUTLOOK.EXE";
        protected const string Outlook2007_64exe = @"C:\Program Files (x86)\Microsoft Office\Office12\OUTLOOK.EXE";
        protected const string Outlook2010_64exe = @"C:\Program Files (x86)\Microsoft Office\Office14\OUTLOOK.EXE";

        protected string ProcessName = "OUTLOOK";
        protected string ProcessPath = null;

        protected OutlookProfile _Profile = null;



        #region IProcess Members

        public OutlookProfile CurrentProfile
        {
            get { return (_Profile); }
        }

        public string OutlookProcessPath
        {
            get { return (ProcessPath); }
        }

        /**
         * Start OUTLOOK.EXE using the given profile
         * 
         * @param profile   The Profile to use during startup
         * @return          true if outlook is started correctly, false otherwise
         **/ 
        public bool StartApplication(OutlookProfile profile)
        {
            log.Debug("StartApplicationProcess ...");

            _Profile = profile;

            // Make sure OUTLOOK.EXE is not already running
            if (IsApplicationRunning())
                throw new HarnessException("During StartApplication, OUTLOOK.EXE was already running.  Call StopApplication() before starting!");

            // Start up OUTLOOK.EXE

            // Configure the Process
            ProcessStartInfo psi = new ProcessStartInfo(ProcessPath);

            psi.Arguments = "/profile " + profile.profileName;
            psi.RedirectStandardOutput = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.UseShellExecute = false;
            psi.WorkingDirectory = @"C:\";

            // Start the process (in the background)
            log.Info(String.Format("StartApplicationProcess Command=[{0} /profile {1}] in working directory {2}", ProcessPath, profile.profileName, @"C:\"));

            Process startOutlookProcess = Process.Start(psi);
            StreamReader myOutput = startOutlookProcess.StandardOutput;
            startOutlookProcess.WaitForExit(10000);

            log.Debug("StartApplicationProcess ... started.");

            return (IsApplicationRunning());

        }

        /**
         * Stop the OUTLOOK.EXE process.  Close all internal connections, but keep zAccountZCO, CurrentProfile, etc.
         * 
         * @param reason        The reason why OLK is being stopped
         * @return              true if OUTLOOK.EXE was stopped.  false if OUTLOOK.EXE was not stopped
         **/ 
        public bool StopApplication(string reason)
        {
            log.Info("StopApplicationProcess ... reason: "+ reason);

            #region Check if the process is running, return immediately if it is not

            if (!IsApplicationRunning())
            {
                log.Debug("StopApplicationProcess ... " + ProcessName + " was not running.");
                return (true);
            }

            #endregion

            #region Click on Exit menu bar

            try
            {
                OutlookCommands.Instance.Exit();
            }
            catch (Exception e)
            {
                log.Warn("Exception thrown while stopping the application: OutlookCommands.Instance.Exit", e);
            }

            #endregion

            #region Close down all connections

            try
            {
                OutlookRedemption.Destroy();
            }
            catch (Exception e)
            {
                log.Warn("Exception thrown while stopping the application: OutlookRedemption.Instance.Dispose", e);
            }

            try
            {
                OutlookConnection.Destroy();
            }
            catch (Exception e)
            {
                log.Warn("Exception thrown while stopping the application: OutlookConnection.Instance.Dispose", e);
            }

            GC.Collect();
            GC.WaitForPendingFinalizers();

            #endregion

            #region Wait until OUTLOOK.EXE exits

            int delay = int.Parse(GlobalProperties.getProperty("sync.harness.OutlookShutdownDelay", "60"));

            for (int i = 0; i < delay; i++ )
            {

                if (!IsApplicationRunning())
                {
                    log.Info("StopApplicationProcess ... " + ProcessName + " exited correctly after " + i + " seconds");
                    return (true);
                }

                log.Debug("StopApplicationProcess ... Waiting for " + ProcessName + " to exit.  " + (delay - i) + " seconds remain ...");

                System.Threading.Thread.Sleep(1000);

            }

            log.Warn("StopApplicationProcess ... " + ProcessName + " never exited after waiting "+ delay +" seconds");
            return (false);
            
            #endregion


        }

        /**
         * Stop the OUTLOOK.EXE process. Close all internal connections, but keep zAccountZCO, CurrentProfile, etc.
         * 
         * @param reason        The reason why OLK is being stopped
         * @return              true if OUTLOOK.EXE was stopped.  false if OUTLOOK.EXE was not stopped
         **/
        public bool ExitApplication(string reason)
        {
            log.Info("ExitApplicationProcess ... reason: " + reason);

            #region Check if the process is running, return immediately if it is not

            if (!IsApplicationRunning())
            {
                log.Debug("StopApplicationProcess ... " + ProcessName + " was not running.");
                return (true);
            }

            #endregion

            #region Click on Exit menu bar

            try
            {
                OutlookCommands.Instance.Exit();
            }
            catch (Exception e)
            {
                log.Warn("Exception thrown while stopping the application: OutlookCommands.Instance.Exit", e);
            }

            #endregion

            #region Close down all connections

            try
            {
                OutlookRedemption.Destroy();
            }
            catch (Exception e)
            {
                log.Warn("Exception thrown while stopping the application: OutlookRedemption.Instance.Dispose", e);
            }

            try
            {
                OutlookConnection.Destroy();
            }
            catch (Exception e)
            {
                log.Warn("Exception thrown while stopping the application: OutlookConnection.Instance.Dispose", e);
            }

            GC.Collect();
            GC.WaitForPendingFinalizers();

            #endregion

            System.Threading.Thread.Sleep(5000);
            return (false);

        }

        /**
         * Force kill the OUTLOOK.EXE process, but keep zAccountZCO, CurrentProfile, etc.
         * 
         * @return              true if OUTLOOK.EXE was killed.  false if OUTLOOK.EXE was already stopped
         **/
        public bool KillApplication()
        {
            log.Debug("KillApplicationProcess ...");

            # region Kill OUTLOOK.EXE, since it won't exit

            Process[] killingProcesses = Process.GetProcessesByName(ProcessName);
            if (killingProcesses.Length > 0)
            {
                foreach (Process pr in killingProcesses)
                {
                    pr.Kill();
                    pr.WaitForExit(5000);
                }

                log.Warn("KillApplicationProcess ... " + ProcessName + " had to be killed");
                System.Threading.Thread.Sleep(10000);
                return (true);
            }

            #endregion

            log.Debug("KillApplicationProcess ... already stopped.");
            return (false);

        }

        /**
         * Force kill the OUTLOOK.EXE process, and clear zAccountZCO, CurrentProfile, etc.
         **/
        public void ResetApplication()
        {
            log.Info("ResetApplicationProcess ...");

            try
            {
                OutlookProcess.Instance.KillApplication();
            }
            catch (Exception e)
            {
                LogManager.GetLogger(TestCaseLog.tcLogName).Error("Caught Exception during OutlookProcess.Instance.KillApplication()", e);
            }

            try
            {
                OutlookRedemption.Destroy();
            }
            catch (Exception e)
            {
                LogManager.GetLogger(TestCaseLog.tcLogName).Error("Caught Exception during OutlookRedemption.Instance.Dispose()", e);
            }

            try
            {
                OutlookConnection.Destroy();
            }
            catch (Exception e)
            {
                LogManager.GetLogger(TestCaseLog.tcLogName).Error("Caught Exception during OutlookConnection.Instance.Dispose()", e);
            }

            zAccount.AccountZCO = null;
            _Profile = null;

            zAccount.AccountA = null;
            zAccount.AccountB = null;
            zAccount.AccountC = null;
            zAccount.AccountD = null; 

            GC.Collect();
            GC.WaitForPendingFinalizers();

            // Set registry key to "Prompt for a profile" 
            OutlookProfile.SetProfileRegistry();

            log.Info("ResetApplicationProcess ... done");
        }

        
        public bool IsApplicationRunning()
        {
            Process[] list = Process.GetProcessesByName(ProcessName);
            log.Debug("IsApplicationRunning ... "+ (list.Length > 0));
            return (list.Length > 0);

        }

        #endregion


        #region Singleton methods

        private OutlookProcess()
        {
            if (File.Exists(Outlook2003exe))
            {
                ProcessPath = Outlook2003exe;
            }
            else if (File.Exists(Outlook2007exe))
            {
                ProcessPath = Outlook2007exe;
            }
            else if (File.Exists(Outlook2010exe))
            {
                ProcessPath = Outlook2010exe;
            }
            else if (File.Exists(Outlook2003_64exe))
            {
                ProcessPath = Outlook2003_64exe;
            }
            else if (File.Exists(Outlook2007_64exe))
            {
                ProcessPath = Outlook2007_64exe;
            }
            else if (File.Exists(Outlook2010_64exe))
            {
                ProcessPath = Outlook2010_64exe;
            }
            else
            {
                throw new HarnessException("OUTLOOK.EXE not found in " + Outlook2003exe + " or " + Outlook2007exe + " or " + Outlook2010exe + " or " + Outlook2003_64exe + " or " + Outlook2007_64exe + " or " + Outlook2010_64exe + ".  Is it installed?");
            }

        }

        private static OutlookProcess instance = null;

        private static readonly Object mutex = new Object();

        public static OutlookProcess Instance
        {
            get
            {
                lock (mutex)
                    return instance == null ? (instance = new OutlookProcess()) : instance;
            }
        }

        #endregion


    }


    public interface IProcess
    {

        bool StartApplication(OutlookProfile profile);

        bool StopApplication(string reason);

        bool KillApplication();

        bool IsApplicationRunning();

        bool  ExitApplication(string reason);

    }



}
