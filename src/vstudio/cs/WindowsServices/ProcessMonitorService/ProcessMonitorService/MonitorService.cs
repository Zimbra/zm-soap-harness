using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using System.Configuration;

namespace ProcessMonitorService
{
    public partial class MonitorService : ServiceBase
    {
        String processToKill = null; //ConfigurationSettings.AppSettings.Get("Process");
        int sleepTime = 0;//Convert.ToInt32(ConfigurationSettings.AppSettings.Get("Time"));
        double maxRunTime = 0;
        Thread thread;
       public MonitorService()
        {

            processToKill = "nunit-console";//System.Configuration.ConfigurationSettings.AppSettings.Get("ProcessToKill");
            sleepTime = 1800000;  // 30 mins    //Convert.ToInt32(System.Configuration.ConfigurationSettings.AppSettings.Get("SleepTime"));
            maxRunTime = 21600000; // 6 hrs             //Convert.ToDouble(System.Configuration.ConfigurationSettings.AppSettings.Get("MaxRunTime"));
            
            InitializeComponent();
            if (!System.Diagnostics.EventLog.SourceExists("ProcessMonitorService"))
                System.Diagnostics.EventLog.CreateEventSource("ProcessMonitorService",
                                                                      "Application");

            eventLog1.Source = "ProcessMonitorService";
            // the event log source by which the application is registered on the computer

            eventLog1.Log = "Application";

        }

        

        protected override void OnStart(string[] args)
        {

            
            eventLog1.WriteEntry("Process Monitor service started to monitor " + processToKill ); 
     
           thread = new Thread(new ParameterizedThreadStart(DoWork));
           eventLog1.WriteEntry("Thread to execute DoWork started!!!");
            thread.Start(processToKill);
            
        }

        protected override void OnStop()
        {
            
            thread.Abort();
        }

        //This is the Function that will look for the Process from the Running Processes and Kill the Process.
        public void FindAndKillProcess(String name)
        {
            Process[] procList = Process.GetProcessesByName(name);
            for (int i = procList.Length - 1; i >= 0; i--)
            {
                eventLog1.WriteEntry(processToKill + " process started at : " + procList[i].StartTime.ToString());
                // if process has been waiting for more than 6hrs kill it.
                if ((System.DateTime.Now.ToUniversalTime() - procList[i].StartTime.ToUniversalTime()).TotalMilliseconds > maxRunTime) //> 21600000)
                {
                    procList[i].Kill();

                    eventLog1.WriteEntry("process - " + name + " is killed after run time of : " + maxRunTime + "milliseconds");
                }
            }
            
        }



        //This is the Function that will call FindAndKillProcess() once in every "IntervalTime" time

        public void DoWork(object data)
        {
            if (data == null)
                return;
            string Process_Kill = data as string;
            if (data == null)
                return;
            while (true)
            {
                FindAndKillProcess(Process_Kill);
                eventLog1.WriteEntry("Going to sleep for " + sleepTime + " seconds");
                System.Threading.Thread.Sleep(sleepTime); //Sleep for 30 mins 
                eventLog1.WriteEntry("Waking up after sleep!!!");
            }
        }

    }
}
