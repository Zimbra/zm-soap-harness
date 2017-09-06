/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Collections;
using System.Collections.Generic;
using log4net;

namespace EASHarness.Harness
{
    /// <summary>
    /// CpuMonitor - monitors the process CPU usages during test execution
    /// 1. Starts a background thread that logs CPU usage to the console (DEBUG) every 5 seconds
    /// 2. Creates objects that measure the CPU usage between two points
    /// </summary>
    public class CpuMonitor
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        // A list of process names to monitor
        private static string[] ProcessNames = {
            "nunit",
            "nunit-console",
            "ProcessInvocation"
        };

        /// <summary>
        /// Start measuring CPU usage for the monitored processes
        /// </summary>
        /// <returns>cpu token to be used with delta() method</returns>
        public static object start()
        {
            Process[] processList = null;

            Hashtable token = new Hashtable();

            // Remember when this token started
            token.Add("starttime", DateTime.Now);

            // Save the original milliseconds on the CPU per process name
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
                    tcLog.Warn("Too many processes for process name " + name);
                }
            }

            return (token);
        }

        /// <summary>
        /// log the CPU usage for the monitored processes to the given logger (INFO)
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
                    double oUsage = (double)data[name];                                     // The original CPU usage
                    double tUsage = (nUsage - oUsage) / duration;                           // The average CPU usage
                    double mUsage = processList[0].PrivateMemorySize64 / 1000;              // The current memory usage
                    logger.InfoFormat("Average CPU Usage: ({0}) {1:0%} {2}kb", name, tUsage, mUsage);
                }
                else
                {
                    logger.WarnFormat("Average CPU Usage: Too many processes for process name ({0})", name);
                }
            }

            // Return a new token. You can continue to use the old token as well.
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
                        tcLog.DebugFormat("CPU Usage: ({0}) {1:0%} {2} kb", name, tUsage, mUsage);
                        CpuDataPerProcess[name] = nUsage;
                    }
                    else if (processList.Length > 1)
                    {
                        tcLog.Warn("Too many processes matched " + name);
                    }
                }

                // Wait before logging again
                System.Threading.Thread.Sleep(LoggingInterval);
            }
        }

        public static void Destroy()
        {
            tcLog.Warn("Destroying MonitorCPU thread!!!");
            LoggingThread.Abort();
        }
    }
}
