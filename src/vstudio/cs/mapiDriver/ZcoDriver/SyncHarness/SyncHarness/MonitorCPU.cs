using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using System.Collections;
using System.Diagnostics;
using System.Threading;

namespace SyncHarness
{

    /// <summary>
    /// CpuMonitor - monitors the process CPU usages during test execution
    /// 1. Starts a background thread that logs CPU usage to the console (DEBUG) every 5 seconds
    /// 2. Creates objects that measure the CPU usage between two points
    /// </summary>
    public class CpuMonitor //: IDisposable
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        // A list of process names to monitor
        private static string[] ProcessNames = {
            "OUTLOOK",
            "nunit",
            "nunit-console",
            "ProcessInvocation"
        };

       //#region "Implement IDisposable"
       // //Implement IDisposable interface to release resources at the end. 
       // //This may help with issue of nunit-console hangs after execution of all test cases.

       // // Pointer to an external unmanaged resource.
       // private IntPtr objHandle;

       // // Track whether Dispose has been called.
       // private bool disposed = false;

       // // The class constructor.
       // //public AppointmentReminders(IntPtr handle)
       // //{
       // //    this.objHandle = handle;

       // //}

       // // Implement IDisposable.
       // // Do not make this method virtual.
       // // A derived class should not be able to override this method.
       // public void Dispose()
       // {
       //     log.Info("Entering Dispose() in MonitorCPU");
       //     Dispose(true);
       //     // This object will be cleaned up by the Dispose method.
       //     // Therefore, you should call GC.SupressFinalize to
       //     // take this object off the finalization queue
       //     // and prevent finalization code for this object
       //     // from executing a second time.
       //     GC.SuppressFinalize(this);
       // }

       // // Dispose(bool disposing) executes in two distinct scenarios.
       // // If disposing equals true, the method has been called directly
       // // or indirectly by a user's code. Managed and unmanaged resources
       // // can be disposed.
       // // If disposing equals false, the method has been called by the
       // // runtime from inside the finalizer and you should not reference
       // // other objects. Only unmanaged resources can be disposed.
       // protected virtual void Dispose(bool disposing)
       // {
       //     log.Info("Entering Dispose(bool disposing) in MonitorCPU");
       //     // Check to see if Dispose has already been called.
       //     if (!this.disposed)
       //     {
       //         // If disposing equals true, dispose all managed
       //         // and unmanaged resources.
       //         if(disposing)
       //         {
       //         //    // Dispose managed resources.
       //             log.Info("Aborting LoggingThread in MonitorCPU!!!");
       //             LoggingThread.Abort();
       //         }

       //         // Call the appropriate methods to clean up
       //         // unmanaged resources here.
       //         // If disposing is false,
       //         // only the following code is executed.
                

       //         // In Harness as for as I know, we use only one unmanaged code, ie, NativeDll.
       //         // So far we have not found any issue related to clean of nativedll related resources.
       //         // Since we do not know how to explicitly get handle of nativeDLL and since it does not
       //         // have any issue currently, releasing of unmanaged code is not implemented here.
       //         // When needed, we need to uncomment below code and figure out how to get hangle of unmanaged code.
       //         //CloseHandle(objHandle);
       //         //objHandle = IntPtr.Zero;

       //         // Note disposing has been done.
       //         disposed = true;

       //     }
       // }

       // // Use interop to call the method necessary
       // // to clean up the unmanaged resource.
       // //[System.Runtime.InteropServices.DllImport(("Kernel32")]
       // //private extern static Boolean CloseHandleIntPtr handle);

       // // Use C# destructor syntax for finalization code.
       // // This destructor will run only if the Dispose method
       // // does not get called.
       // // It gives your base class the opportunity to finalize.
       // // Do not provide destructors in types derived from this class.
       // ~CpuMonitor()
       // {
       //     // Do not re-create Dispose clean-up code here.
       //     // Calling Dispose(false) is optimal in terms of
       //     // readability and maintainability.
       //     Dispose(false);
       // }

       //#endregion "End Implement IDisposable"
        /// <summary>
        /// Start measuring CPU usage for OUTLOOK
        /// </summary>
        /// <returns>cpu token to be used with delta() method</returns>
        public static object start()
        {
            Process[] processList = null;

            Hashtable token = new Hashtable();

            // Remember when this token started
            token.Add("starttime", DateTime.Now);

            // Save the original milliseconds on the CPU per process name
            //
            // If the process isn't yet running, fudge it to zero
            foreach (string name in ProcessNames)
            {
                processList = Process.GetProcessesByName(name);
                if (processList.Length == 0)
                {
                    token.Add(name, (double)0);
                }
                else if (processList.Length == 1)
                {
                    token.Add(name, processList[0].TotalProcessorTime.TotalMilliseconds);
                }
                else
                {
                    log.Warn("Too many processes for process name " + name);
                }
            }

            return (token);

        }

        /// <summary>
        /// Log the CPU usage for OUTLOOK to the given logger (INFO)
        /// </summary>
        /// <param name="logger">the logger object to write the usage</param>
        /// <param name="token">the last cpu token</param>
        /// <returns>cpu token to be used with delta() method</returns>
        public static object delta(ILog logger, object token)
        {
            Process[] processList = null;

            Hashtable data = token as Hashtable;

            // Determine how many milliseconds since the last time stamp token
            double duration = ((TimeSpan)(DateTime.Now - (DateTime)data["starttime"])).TotalMilliseconds;

            // Print a log for each process
            foreach (string name in ProcessNames)
            {
                processList = Process.GetProcessesByName(name);
                if (processList.Length == 0)
                {
                    logger.InfoFormat("Average CPU Usage: ({0}) no longer running", name);
                }
                else if (processList.Length == 1)
                {
                    double nUsage = processList[0].TotalProcessorTime.TotalMilliseconds;    // The current CPU usage
                    double oUsage = (double)data[name];                                   // The original CPU usage
                    double tUsage = (nUsage - oUsage) / duration;                           // The average CPU usage
                    double mUsage = processList[0].PrivateMemorySize64 / 1000;              // The current memory usage
                    logger.InfoFormat("Average CPU Usage: ({0}) {1:0%} {2} kb", name, tUsage, mUsage);
                }
                else
                {
                    logger.WarnFormat("Average CPU Usage: Too many processes for process name ({0})", name);
                }
            }

            // Return a new token.  You can continue to use the old token as well.
            return (start());
        }

        // StartCpuLogging objects
        private static Thread LoggingThread = null;
        private static int LoggingInterval = 5000; // milliseconds
        private static Hashtable CpuDataPerProcess = null;

        /// <summary>
        /// Start a background thread that logs the process CPU usage every 5 seconds
        /// </summary>
        public static void StartCpuLogging()
        {
            // Only start one thread
            if (CpuDataPerProcess != null)
                return;

            CpuDataPerProcess = new Hashtable();
            foreach (string name in ProcessNames)
            {
                CpuDataPerProcess.Add(name, (double)0);
            }


            LoggingThread = new Thread(new ThreadStart(ExecuteJob));
            LoggingThread.Start();
            while (!LoggingThread.IsAlive)
                System.Threading.Thread.Sleep(250);


        }

        private static void ExecuteJob()
        {
            Process[] processList = null;

            while (true)
            {
                foreach (string name in ProcessNames)
                {
                    processList = Process.GetProcessesByName(name);
                    if (processList.Length == 0) 
                    {
                        CpuDataPerProcess[name] = (double)0;
                    }
                    else if (processList.Length == 1)
                    {
                        double nUsage = processList[0].TotalProcessorTime.TotalMilliseconds;
                        double oUsage = (double)CpuDataPerProcess[name];
                        double tUsage = (nUsage - oUsage) / LoggingInterval;
                        double mUsage = processList[0].PrivateMemorySize64 / 1000;
                        log.DebugFormat("CPU Usage: ({0}) {1:0%} {2} kb", name, tUsage, mUsage);
                        CpuDataPerProcess[name] = nUsage;
                    }
                    else if (processList.Length > 1)
                    {
                        log.Warn("Too many processes matched " + name);
                    }
                }

                // Wait before logging again
                System.Threading.Thread.Sleep(LoggingInterval);
            }
        }


        public static void Destroy()
        {
            log.Warn("Destroying MonitorCPU thread!!!");
            LoggingThread.Abort();

        }

    }


}
