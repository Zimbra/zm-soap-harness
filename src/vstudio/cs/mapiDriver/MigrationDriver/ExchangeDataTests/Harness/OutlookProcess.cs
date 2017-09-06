using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.IO;
using log4net;
using Harness;


namespace ExchangeDataTests
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
        protected string ExchangeProcessName = "ZCSExchangeMigrationWizard";
        protected string ProcessPath = null;

     
        #region IProcess Members


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

        public bool KillExchangeApplication()
        {
            log.Debug("KillExchangeApplication ...");

            # region Kill Exchange process, since it won't exit

            Process[] killingExchangeProcesses = Process.GetProcessesByName(ExchangeProcessName);
            if (killingExchangeProcesses.Length > 0)
            {
                foreach (Process pr in killingExchangeProcesses)
                {
                    pr.Kill();
                    pr.WaitForExit(3000);
                }

                log.Warn("killingExchangeProcesses ... " + ExchangeProcessName + " had to be killed");
                System.Threading.Thread.Sleep(3000);
                return (true);
            }

            #endregion

            log.Debug("KillExchangeApplicationProcess ... already stopped.");
            return (false);

        }

        
        public bool IsApplicationRunning()
        {
            Process[] list = Process.GetProcessesByName(ProcessName);
            log.Debug("IsApplicationRunning ... "+ (list.Length > 0));
            return (list.Length > 0);

        }

        public bool IsExchangeApplicationRunning()
        {
            Process[] list = Process.GetProcessesByName(ExchangeProcessName);
            log.Debug("IsExchangeApplicationRunning ... " + (list.Length > 0));
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
        bool KillApplication();

        bool IsApplicationRunning();

    }



}
