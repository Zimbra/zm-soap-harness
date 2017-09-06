using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using log4net;
using System.IO;

namespace SyncHarness.SyncHarness
{
    class StafProcess
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);
        private static string server= GlobalProperties.getProperty("zimbraServer.name");
        
         StafProcess()
        {
            //string server = GlobalProperties.getProperty("zimbraServer.name");
        }
        public static string ProcessCommand(string command)
        {
            ProcessStartInfo processStartInfo = new ProcessStartInfo("staf", server + command);
            processStartInfo.UseShellExecute = false;
            processStartInfo.RedirectStandardOutput = true;

            Process process = new Process();
            process.StartInfo = processStartInfo;
            process.Start();

            string output = process.StandardOutput.ReadToEnd();
                        
            tcLog.Info("staf " + server + command);
            tcLog.Info(output);
            return output;
        }


    }
}
