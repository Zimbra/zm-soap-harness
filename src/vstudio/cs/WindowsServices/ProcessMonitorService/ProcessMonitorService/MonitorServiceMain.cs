using System.Collections.Generic;
using System.ServiceProcess;
using System.Text;
using System;

namespace ProcessMonitorService
{
    static class MonitorServiceMain
    {


        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        static void Main()
        {
            ServiceBase[] ServicesToRun;

            // More than one user Service may run within the same process. To add
            // another service to this process, change the following line to
            // create a second service object. For example,
            //
            //   ServicesToRun = new ServiceBase[] {new Service1(), new MySecondUserService()};
            //
            //ProcessMonitorServiceMain mainClass = new ProcessMonitorServiceMain();
            //mainClass.processName = args[0];
            //mainClass.sleepTime = args[1];
            //mainClass.runTime=args[2];

            ServicesToRun = new ServiceBase[] { new MonitorService() };

            ServiceBase.Run(ServicesToRun);
        }
    }
}