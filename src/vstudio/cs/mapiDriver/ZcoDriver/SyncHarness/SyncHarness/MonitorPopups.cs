using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using log4net;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;

namespace SyncHarness
{
    public class WindowMonitor //: IDisposable
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private static AWindowDefinition TheFoundWindow = null;
    
//        #region "Implement IDisposable"
//        //Implement IDisposable interface to release resources at the end. 
//        //This may help with issue of nunit-console hangs after execution of all test cases.

//        // Pointer to an external unmanaged resource.
//        private IntPtr objHandle;

//        // Track whether Dispose has been called.
//        private bool disposed = false;

//        // The class constructor.
//        //public AppointmentReminders(IntPtr handle)
//        //{
//        //    this.objHandle = handle;

//        //}

//        // Implement IDisposable.
//        // Do not make this method virtual.
//        // A derived class should not be able to override this method.
//        public void Dispose()
//        {
//            log.Info("Entering Dispose() in MonitorPopups");
//            Dispose(true);
//            // This object will be cleaned up by the Dispose method.
//            // Therefore, you should call GC.SupressFinalize to
//            // take this object off the finalization queue
//            // and prevent finalization code for this object
//            // from executing a second time.
//            GC.SuppressFinalize(this);
//        }

//        // Dispose(bool disposing) executes in two distinct scenarios.
//        // If disposing equals true, the method has been called directly
//        // or indirectly by a user's code. Managed and unmanaged resources
//        // can be disposed.
//        // If disposing equals false, the method has been called by the
//        // runtime from inside the finalizer and you should not reference
//        // other objects. Only unmanaged resources can be disposed.
//        protected virtual void Dispose(bool disposing)
//        {
//            log.Info("Entering Dispose(bool disposing) in MonitorPopups");
//            // Check to see if Dispose has already been called.
//            if (!this.disposed)
//            {
//                // If disposing equals true, dispose all managed
//                // and unmanaged resources.
//                if(disposing)
//                {
//                //    // Dispose managed resources.

//                    log.Info("Aborting MonitoringThread in WindowMonitor!!!");
//                    MonitoringThread.Abort();
//                }

//                // Call the appropriate methods to clean up
//                // unmanaged resources here.
//                // If disposing is false,
//                // only the following code is executed.
                

//                // In Harness as for as I know, we use only one unmanaged code, ie, NativeDll.
//                // So far we have not found any issue related to clean of nativedll related resources.
//                // Since we do not know how to explicitly get handle of nativeDLL and since it does not
//                // have any issue currently, releasing of unmanaged code is not implemented here.
//                // When needed, we need to uncomment below code and figure out how to get hangle of unmanaged code.
//                //CloseHandle(objHandle);
//                //objHandle = IntPtr.Zero;

//                // Note disposing has been done.
//                disposed = true;

//            }
//        }

//        // Use interop to call the method necessary
//        // to clean up the unmanaged resource.
//        //[System.Runtime.InteropServices.DllImport(("Kernel32")]
//        //private extern static Boolean CloseHandleIntPtr handle);

//        // Use C# destructor syntax for finalization code.
//        // This destructor will run only if the Dispose method
//        // does not get called.
//        // It gives your base class the opportunity to finalize.
//        // Do not provide destructors in types derived from this class.
//        ~WindowMonitor()
//        {
//            // Do not re-create Dispose clean-up code here.
//            // Calling Dispose(false) is optimal in terms of
//            // readability and maintainability.
//            Dispose(false);
//        }
//#endregion "End Implement IDisposable"


        public static void Initialize()
        {
            if (!IsInitialized)
            {
                IsInitialized = true;

                #region Build a table of all windows to watch for

                WindowDefinitionList = new List<AWindowDefinition>();

                TestAssembly = Assembly.GetExecutingAssembly();
                foreach (Type t in TestAssembly.GetTypes())
                {
                    object[] attributes = t.GetCustomAttributes(typeof(WindowMonitorAttribute), false);
                    if (attributes.Length > 0)
                    {
                        AWindowDefinition o = (AWindowDefinition)TestAssembly.CreateInstance(t.FullName);
                        WindowDefinitionList.Add(o);
                    }
                }

                #endregion

                #region Start the Window Monitoring thread

                MonitoringThread = new Thread(new ThreadStart(LookForWindowsFunction));
                MonitoringThread.Start();
                while (!MonitoringThread.IsAlive)
                    Thread.Sleep(250);

                #endregion

            }

        }

        /// <summary>
        /// Return "true" if a window was closed since the last check
        /// </summary>
        public static void CheckWindows()
        {
            if (TheFoundWindow != null)
            {
                try
                {

                    if (TheFoundWindow.IsFatal)
                        throw new HarnessException("CheckWindows: A window was processed: " + TheFoundWindow.GetDetails());
                    else
                        log.Warn("CheckWindows: A non-fatal window was processed: " + TheFoundWindow.GetDetails());


                }
                finally
                {
                    TheFoundWindow = null;
                }

            }

        }

        public static void Destroy()
        {
            log.Warn("Destroying MonitorPopups thread!!!");
            MonitoringThread.Abort();

        }
        #region Private methods


        private static bool IsInitialized = false;

        private static Thread MonitoringThread = null;

        private static Assembly TestAssembly = null;
        private static List<AWindowDefinition> WindowDefinitionList = null;

        // Look for windows and process them
        private static void LookForWindowsFunction()
        {

            // TODO: Should we broaden the scope to look for other processes windows?

            // Process mappings:
            // OUTLOOK: obvious
            // DW20: Dr. Watson
            // nunit-console: Nunit
            string[] ProcessNames = { "OUTLOOK", "DW20", "nunit-console" };


            while (true)
            {
                foreach (string processName in ProcessNames)
                {

                    Process[] processList = Process.GetProcessesByName(processName);
                    log.Debug("Found " + processList.Length + " " + processName + " processes");

                    foreach (Process p in processList)
                    {
                        log.Debug("Found " + p.Threads.Count + " threads");

                        foreach (ProcessThread t in p.Threads)
                        {
                            WindowsWIN32.ByThreadIdEnumThreadWindows(t.Id, EnumThreadProcCallback, IntPtr.Zero);
                        }

                    }

                }

                log.Debug("LookForWindowsFunction ...");

                // Wait before monitoring again
                Thread.Sleep(AWindowDefinition.Interval);

            }

        }

        private static bool EnumThreadProcCallback(IntPtr handle, IntPtr lparam)
        {
            // http://msdn.microsoft.com/en-us/library/ms633495(VS.85).aspx

            log.Debug("EnumThreadProcCallback " + handle + " starting ...");

            for (int i = 0; i < WindowDefinitionList.Count; i++)
            {
                AWindowDefinition w = WindowDefinitionList[i];
                if (w == null)
                {
                    return (false);
                }
                if (w.IsMatch(handle, lparam))
                {
                    log.Info("EnumThreadProcCallback: handle " + handle + " found Match with window " + w.ClassTag);

                    if (w.ProcessWindow(handle))
                    {
                        // The window was processed

                        // Remember the window for logging
                        TheFoundWindow = w;
                    }

                }
            }

            log.Debug("EnumThreadProcCallback " + handle + " done");
            return (true);
        }

        #endregion

    }

    [WindowMonitor]
    public class WindowMonitorZimbraServerConfigurationSettings : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=15233
        public WindowMonitorZimbraServerConfigurationSettings()
            : base(
                "ZimbraServerConfigurationSettings",
                "Zimbra Server Configuration Settings",
                "OK")
        {
        }

        //public override bool Dismiss(IntPtr handle)
        //{
        //    tcLog.InfoFormat(ClassTag + ": Dismiss");


            // I don't know why below code is written to provide user name and password as, when this window gets prompted, the profile which it tries to open may be stale one and hence no use providing username and password.
            // So commenting it out
            
            //// Zimbra dialog box definitions
            //const int CONTROL_ID_OKBUTTON = 0x409DC;    // 
            //const int CONTROL_ID_SERVERNAME = 0x409A8;  // 
            //const int CONTROL_ID_USESECURE = 0x409AE;  // 
            //const int CONTROL_ID_EMAILADDRESS = 0x409B0;   // 
            //const int CONTROL_ID_PASSWORD = 0x40988;   // 

            //// Use global.properties by default
            //// Otherwise, use the admin account
            //// TODO: this SHOULD use the current test account
            ////
            ////string servername = (zAccountAdmin.GlobalAdminAccount == null ? (string)Properties.GlobalProperties["zimbraServer.name"] : zAccountAdmin.GlobalAdminAccount.zimbraMailHost);
            ////string emailaddress = (zAccountAdmin.GlobalAdminAccount == null ? (string)Properties.GlobalProperties["admin.user"] : zAccountAdmin.GlobalAdminAccount.emailAddress);
            ////string password = (zAccountAdmin.GlobalAdminAccount == null ? (string)Properties.GlobalProperties["defaultpassword.value"] : zAccountAdmin.GlobalAdminAccount.password);
            ////bool useSecure = ((string)Properties.GlobalProperties["soapservice.mode"]).Equals("https");

            //IntPtr hButtonOk = IntPtr.Zero;
            //IntPtr hChild = IntPtr.Zero;

            //#region Find the UncheckButton

            //IntPtr hUncheckButton = IntPtr.Zero;
            //hChild = IntPtr.Zero;
            //while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            //{
            //    string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
            //    log.Info("WindowMonitorZimbraServerConfigurationSettings: button text: " + buttonText);

            //    int ctrlId = WindowsWIN32.zGetWindowLong(hChild, (int)GetWindowLongIndexs.GWL_ID);

            //    if (ctrlId == CONTROL_ID_SERVERNAME)
            //    {
            //        WindowsWIN32.zSendMessage(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, zAccount.AccountZCO.zimbraMailHost);
            //    }
            //    else if (ctrlId == CONTROL_ID_USESECURE)
            //    {
            //        if (zAccount.AccountZCO.zimbraMailModeSSL)
            //            WindowsWIN32.zSendMessage(hChild, (uint)DialogBoxMessages.BM_CLICK, 0, 0);
            //    }
            //    else if (ctrlId == CONTROL_ID_EMAILADDRESS)
            //    {
            //        WindowsWIN32.zSendMessage(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, zAccount.AccountZCO.emailAddress);
            //    }
            //    else if (ctrlId == CONTROL_ID_PASSWORD)
            //    {
            //        WindowsWIN32.zSendMessage(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, zAccount.AccountZCO.password);
            //    }
            //    else if (ctrlId == CONTROL_ID_OKBUTTON)
            //    {
            //        hButtonOk = hChild;
            //    }

            //}

            //if (hButtonOk.Equals(IntPtr.Zero))
            //    throw new HarnessException("Unable to find the hOkButton to dismiss dialog box (OK)");

            //WindowsWIN32.zSendMessage(hButtonOk, (uint)DialogBoxMessages.BM_CLICK, 0, 0);
        //}
        protected string DismissButton = "Cancel";
                

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            IntPtr hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            #endregion


            #region Click DismissButton button

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }

            


    }


    [WindowMonitor]
    public class WindowMonitorDW20PleaseTellMicrosoftAboutThisProblem : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=15232
        public WindowMonitorDW20PleaseTellMicrosoftAboutThisProblem()
            : base(
                "DW20PleaseTellMicrosoftAboutThisProblem",
                "Microsoft Office Outlook",
                "Microsoft Office Outlook has encountered a problem")
        {
            
        }
        
        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");

            // Zimbra dialog box definitions
            const string UncheckButton = "&Restart Microsoft Office Outlook";
            const string DismissButton = "&Don't Send";

            IntPtr hChild = IntPtr.Zero;

            #region Find the UncheckButton

            IntPtr hUncheckButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(UncheckButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found UncheckButton Match");
                        hUncheckButton = hChild;
                        break;
                    }
                }
            }

            if (hUncheckButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + UncheckButton + ")");

            WindowsWIN32.zSendMessage(hUncheckButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }


    [WindowMonitor]
    public class WindowMonitorDW20PleaseTellMicrosoftAboutThisProblem2 : AWindowDefinition
    {
        
        public WindowMonitorDW20PleaseTellMicrosoftAboutThisProblem2()
            : base(
                "DW20PleaseTellMicrosoftAboutThisProblem2",
                "Microsoft Outlook",
                "Microsoft Outlook has encountered a problem and needs to close.")
        {
            
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");

            // Zimbra dialog box definitions
            const string UncheckButton = "&Restart Microsoft Outlook";
            const string DismissButton = "&Don't Send";

            IntPtr hChild = IntPtr.Zero;

            #region Find the UncheckButton

            IntPtr hUncheckButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(UncheckButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found UncheckButton Match");
                        hUncheckButton = hChild;
                        break;
                    }
                }
            }

            if (hUncheckButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + UncheckButton + ")");

            WindowsWIN32.zSendMessage(hUncheckButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }

    [WindowMonitor]
    public class WindowMonitorEmailAddressFailure : AWindowDefinition
    {

        public WindowMonitorEmailAddressFailure()
            : base(
                "EmailAddressFailure",
                "Email address failure",
                "")
        {
            // This isn't a fatal issue
            IsFatal = false;
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");


            #region Find the DismissButton

            const string DismissButton = "OK";

            IntPtr hChild = IntPtr.Zero;

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            System.Threading.Thread.Sleep(3000);

            #endregion

            return (true);
        }

    }

    [WindowMonitor]
    public class WindowMonitorCannotStartMicrosoftOutlook: AWindowDefinition
    {

        public WindowMonitorCannotStartMicrosoftOutlook()
            : base(
                "CannotStartMicrosoftOutlook",
                "Microsoft Office Outlook",
                "Cannot start Microsoft Office Outlook. A program error occured. Quit Outlook")
        {
            
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");
          

            #region Find the DismissButton

            const string DismissButton = "&OK";

            IntPtr hChild = IntPtr.Zero;

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }

    [WindowMonitor]
    public class WindowMonitorPleaseRestartOutlook : AWindowDefinition
    {

        public WindowMonitorPleaseRestartOutlook()
            : base(
                "PleaseRestartOutlook",
                "Please Restart Outlook",
                "Outlook will now close for the changes to take effect. Please restart Outlook")
        {
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");


            #region Find the DismissButton

            const string DismissButton = "&OK";

            IntPtr hChild = IntPtr.Zero;

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the Dismiss button (" + DismissButton + ") to dismiss dialog box");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }

    [WindowMonitor]
    public class WindowMonitorLicenseFailure : AWindowDefinition
    {

        public WindowMonitorLicenseFailure()
            : base(
                "WindowMonitorLicenseFailure",
                "Zimbra Outlook Connector License Failure",
                "Your server's license has expired and the Connector for Outlook is operating in a grace period that may end soon.")
        {
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");

            // Zimbra dialog box definitions
          
            const string DismissButton = "OK";

            IntPtr hChild = IntPtr.Zero;

            


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the OK button to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }

     /*
     // Commenting below popup handler. It does not seem to be valid handler (I doubt there appears any window with title as "Microsoft Windows"
     // text as "Microsoft Office has stopped working" and dismiss button as "&Cancel"
     // In case, we come across such window in future, we should uncomment this block

    [WindowMonitor]
    public class WindowMonitorMicrosoftOfficeHasStopedWorking : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=15232
        public WindowMonitorMicrosoftOfficeHasStopedWorking()
            : base(
                "MicrosoftOfficeHasStopedWorking",
                "Microsoft Windows",
                "Microsoft Office has stopped working")
        {
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");

            // Zimbra dialog box definitions
            //const string UncheckButton = "Restart Microsoft Office Outlook";
            const string DismissButton = "&Cancel";

            IntPtr hChild = IntPtr.Zero;

            

            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }
    }
    */

    [WindowMonitor]
    public class WindowMonitorMicrosoftOfficeHasEncounteredAProblem : AWindowDefinition
    {
     public WindowMonitorMicrosoftOfficeHasEncounteredAProblem()
            : base(
                "MicrosoftOfficeHasEncounteredAProblem",
                "Microsoft Office Outlook",
                "Microsoft Office Outlook has encountered a problem and needs to close. We are sorry for the inconvenience")
        {
            
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");

            // Zimbra dialog box definitions
            //const string UncheckButton = "Restart Microsoft Office Outlook";
            const string DismissButton = "&Don't Send";

            IntPtr hChild = IntPtr.Zero;

            

            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hDismissButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }


    [WindowMonitor]
    public class WindowMonitorDoYouWantToSendMoreInformation : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=15232
        public WindowMonitorDoYouWantToSendMoreInformation()
            : base(
                "DoYouWantToSendMoreInformation",
                "Microsoft Windows",
                "Do you want to send more information about the problem?")
        {
            
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");

            // Zimbra dialog box definitions
            //const string UncheckButton = "Restart Microsoft Office Outlook";
            const string DismissButton = "&Cancel";

            IntPtr hChild = IntPtr.Zero;



            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }

    [WindowMonitor]
    public class WindowMonitorMSVisualCPPRuntimeLibrary : AWindowMonitorAssertion
    {
        // http://bugzilla.zimbra.com/attachment.cgi?id=15218
        public WindowMonitorMSVisualCPPRuntimeLibrary()
            : base(
                "AssertionFailed",
                "Microsoft Visual C++ Runtime Library",
                "")
        {
        }
    }

    [WindowMonitor]
    public class WindowMonitorMSVisualCPPDebugLibrary : AWindowMonitorAssertion
    {
        // http://bugzilla.zimbra.com/attachment.cgi?id=15218
        public WindowMonitorMSVisualCPPDebugLibrary()
            : base(
                "AssertionFailed",
                "Microsoft Visual C++ Debug Library",
                "")
        {
        }
    }


    public class AWindowMonitorAssertion : AWindowDefinition
    {
        public AWindowMonitorAssertion(string classTag, string title, string text)
            : base(classTag, title, text)
        {
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");


            // Zimbra dialog box definitions
            const string DismissButton = "&Abort";


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            IntPtr hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            #endregion


            #region Click DismissButton button

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");


            // There seems to be a problem with just sending a BM_CLICK event.
            // So, instead, set the foreground window, then focus on Abort, then click enter
            //
            WindowsWIN32.zSetForegroundWindow(handle);
            WindowsWIN32.zSetFocus(hDismissButton);
            WindowsWIN32.zSendKeys("{ENTER}");

            #endregion

            return (true);
        }


    }

    [WindowMonitor]
    public class WindowMonitorNunitConsolePleaseTellMicrosoftAboutThisProblem : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=15248
        public WindowMonitorNunitConsolePleaseTellMicrosoftAboutThisProblem()
            : base(
                "NunitConsolePleaseTellMicrosoftAboutThisProblem",
                "NUnit-Console",
                "NUnit-Console has encountered a problem and needs to close")
        {
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");

            // Zimbra dialog box definitions
            const string DismissButton = "&Don't Send";

            IntPtr hChild = IntPtr.Zero;

            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }

    [WindowMonitor]
    public class WindowMonitorCannotOpenYourDefaultEmailFolders : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/attachment.cgi?id=14054
        public WindowMonitorCannotOpenYourDefaultEmailFolders()
            : base(
                "CannotOpenYourDefaultEmailFolders",
                "Microsoft Office Outlook",
                "Cannot open your default e-mail folders")
        {
        }

    }

    [WindowMonitor]
    public class WindowMonitorWouldYouLikeToAutoArchiveYourOldItemsNow : AWindowDefinitionDismissWithNo
    {
        public WindowMonitorWouldYouLikeToAutoArchiveYourOldItemsNow()
            : base(
                "WouldYouLikeToAutoArchiveYourOldItemsNow",
                "Microsoft Office Outlook",
                "Would you like to AutoArchive your old items now")
        {
            // This isn't a fatal issue
            IsFatal = false;
        }
    }

    [WindowMonitor]
    public class WindowMonitorWouldYouLikeToSaveSpaceByCompactingYourDataFile : AWindowDefinitionDismissWithNo
    {
        public WindowMonitorWouldYouLikeToSaveSpaceByCompactingYourDataFile()
            : base(
                "WouldYouLikeToSaveSpaceByCompactingYourDataFile",
                "Zimbra Connector for Microsoft Outlook",
                "Would you like to save disk space by")
        {
            // See bug 46600, where this button was listed as "No" (without the &)
            DismissButton = "&No";

            // This isn't a fatal issue
            IsFatal = false;
        }
    }

   

    [WindowMonitor]
    public class WindowMonitorWouldYouLikeToDisableThisAddIn : AWindowDefinitionDismissWithNo
    {
        // http://bugzilla.zimbra.com/attachment.cgi?id=14053
        public WindowMonitorWouldYouLikeToDisableThisAddIn()
            : base(
                "WouldYouLikeToDisableThisAddIn",
                "Microsoft Office Outlook",
                "Would you like to disable this add-in?")
        {
        }

    }

    [WindowMonitor]
    public class WindowMonitorWouldYouLikeToEnableIt : AWindowDefinitionDismissWithYes
    {
        public WindowMonitorWouldYouLikeToEnableIt()
            : base(
                "WindowMonitorWouldYouLikeToEnableIt",
                "Zimbra Addin Disabled",
                "A required Zimbra add-in is disabled. Would you like to enable it?")
        {
        }

    }

    [WindowMonitor]
    public class WindowMonitorDoYouWantToStartOutlookInSafeMode : AWindowDefinitionDismissWithNo
    {
        public WindowMonitorDoYouWantToStartOutlookInSafeMode()
            : base(
                "WouldYouLikeToDisableThisAddIn",
                "Microsoft Office Outlook",
                "Do you want to start Outlook in safe mode?")
        {
        }

    }

    [WindowMonitor]
    public class WindowMonitorZimbraClientExtensionCannotBeLoaded : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/attachment.cgi?id=14052
        public WindowMonitorZimbraClientExtensionCannotBeLoaded()
            : base(
                "ZimbraClientExtensionCannotBeLoaded",
                "Microsoft Office Outlook",
                "cannot be loaded and has been disabled by Outlook")
        {
        }

    }

    [WindowMonitor]
    public class WindowMonitorZimbraPassword : AWindowDefinition
    {

        //string ContentText = "Unable to authorize your account with the Zimbra server.  Maybe your password has changed?";
        //string Label1 = "Password:";
        //string Button1 = "OK";
        //string Button2 = "Cancel";

        public WindowMonitorZimbraPassword()
            : base(
                "ZimbraPassword",
                "Zimbra Password",
                "Unable to authorize your account with the Zimbra server")
        {
        }

        // TODO: should probably enter the current zAccount's password into the field, then click ok

    }

    [WindowMonitor]
    public class WindowMonitorYCOInitialPopup : AWindowDefinition
    {
        public WindowMonitorYCOInitialPopup()
            : base(
                "YCOInitialPopup",
                "YCO",
                "Creating Yahoo Sync Personal Folders and Getting your contacts")
        {
        }


    }

    [WindowMonitor]
    public class WindowMonitorSharingAddingDLLCouldNotBeInstalled : AWindowDefinition
    {
        public WindowMonitorSharingAddingDLLCouldNotBeInstalled()
            : base(
                "SharingAddingDLLCouldNotBeInstalled",
                "Microsoft Office Outlook",
                "The add-in \"SharingAddin.DLL\" could not be installed or loaded.")
        {
        }


    }

    [WindowMonitor]
    public class WindowMonitorUnableToOpenDefaultEmailFolders : AWindowDefinition
    {
        public WindowMonitorUnableToOpenDefaultEmailFolders()
            : base(
                "UnableToOpenDefaultEmailFolders",
                "Microsoft Office Outlook",
                "Unable to open your default e-mail folders.")
        {
        }


    }

    [WindowMonitor]
    public class WindowMonitorTheConnectionIsUnavailable : AWindowDefinition
    {
        public WindowMonitorTheConnectionIsUnavailable()
            : base(
                "TheConnectionToMicrosoftExchangeIsUnavailable",
                "Microsoft Office Outlook",
                "The connection to the Microsoft Exchange Server is unavailable.")
        {
        }


    }

    [WindowMonitor]
    public class WindowMonitorAreYouSureYouWantToDismissAllTheseReminders : AWindowDefinitionDismissWithYes
    {
        public WindowMonitorAreYouSureYouWantToDismissAllTheseReminders()
            : base(
                "AreYouSureYouWantToDismissAllTheseReminders",
                "Microsoft Office Outlook",
                "Are you sure you want to dismiss all these reminders")
        {
            TimeToLiveMilliseconds = 60000;
        }


    }


    //ClickYes application does not handle popup appearing after dismissing reminder on OLK 2007
    //So, implementing below popup for OLK 2007
    [WindowMonitor]
    public class WindowMonitorReminderClickYes  : AWindowDefinitionDismissWithYes
    {
        public WindowMonitorReminderClickYes()
            : base(
                "ClickYes",
                "Microsoft Office Outlook",
                "&Yes")
        {
            IsFatal = false;
        }

    }
    
    //Click Yes button on delegate shared folder deletion popup - see bug#71567
    [WindowMonitor]
    public class WindowMonitorSharedFolderDeletionClickYes  : AWindowDefinitionDismissWithYes
    {
    	public WindowMonitorSharedFolderDeletionClickYes()
    	    : base(
    	    	"DeleteFolderClickYes",
    		"Folder deletion",
    		"&Yes")
    	{
    	    IsFatal = false;
    	}
    
    }

    [WindowMonitor]
    public class WindowMonitorDismissAuth : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=49117

        public WindowMonitorDismissAuth()
            : base(
                "DismissAuth",
                "Authentication Required",
                "Log In")
        {
            IsFatal = false;
        }

        public override bool Dismiss(IntPtr handle)
        {
            /* This dialog requires to populate user name and password edit fields and then click on "Log In" button
             *  Username and Password edit field dont have captions and their control ids are dynamic
             * So, the logic to populate user name and password edit fields is based on their relative positions wrt other controls
             */

            tcLog.InfoFormat(ClassTag + ": Dismiss");
            const string DismissButton = "Log In";
            const string StaticUserField = "User name";
            bool userNameStaticFieldFound = false;
            bool userNameEditFieldFound = false;

            IntPtr hChild = IntPtr.Zero;

            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {

                string fieldText = WindowsWIN32.ByHandleGetTitleBarText(hChild);

                if (userNameEditFieldFound)
                {
                    WindowsWIN32.zSendMessage(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, zAccount.AccountZCO.password);
                    userNameEditFieldFound = false;
                }

                if (userNameStaticFieldFound)
                {
                    WindowsWIN32.zSendMessage(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, zAccount.AccountZCO.displayName);
                    userNameStaticFieldFound = false;
                    userNameEditFieldFound = true;
                }

                if (fieldText.Contains(StaticUserField))
                {
                    userNameStaticFieldFound = true;
                }

            }

            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }

    } 

    [WindowMonitor]
    public class WindowMonitorMicrosoftOutlookHasStoppedWorking1 : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=34136

        public WindowMonitorMicrosoftOutlookHasStoppedWorking1()
            : base(
                "MicrosoftOutlookHasStoppedWorking1",
                "Microsoft Windows",
                "")
        {
            
        }

    }

     /* Commenting this popup class as it has been observed in the log file that below class wrongly acts on genuine Outlook windows
     * Will check for correct error dialog and implement the popup accordingly
    [WindowMonitor]
    public class WindowMonitorMicrosoftOutlookHasStoppedWorking2 : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=34678

        public WindowMonitorMicrosoftOutlookHasStoppedWorking2()
            : base(
                "MicrosoftOutlookHasStoppedWorking2",
                "Microsoft Outlook",
                "")
        {
            
        }
    
    }
      * */


    
//Previously, there was code to handle popup (above two methods) which displays when outlook stops working. However, it did not had any text. Now the harness stops when this pop-up is displayed. Looks like the earlier code is not working. Hence I have added another method which has specific text machining this pop-up. IF this does not work, the code needs to be removed.
    [WindowMonitor]
    public class WindowMonitorMicrosoftOutlookHasStoppedWorking3 : AWindowDefinition
    {
        
        public WindowMonitorMicrosoftOutlookHasStoppedWorking3()
            : base(
                "MicrosoftOutlookHasStoppedWorking2",
                "Microsoft Windows",
                "Microsoft Office Outlook has stopped working")
        {
            
        }

    }


    [WindowMonitor]
    public class WindowMonitorOutlookIsOffline : AWindowDefinition
    {
        // http://bugzilla.zimbra.com/show_bug.cgi?id=33925
        // http://bugzilla.zimbra.com/attachment.cgi?id=15233
        public WindowMonitorOutlookIsOffline()
            : base(
                "OutlookIsOffline",
                "Outlook is Offline",
                "Operation not supported because Outlook is set to Work Offline")
        {
        }

        protected string DismissButton = "OK"; //Button caption is OK


        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            IntPtr hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            #endregion


            #region Click DismissButton button

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the button (" + DismissButton + ") to dismiss dialog box");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }
    }
    /// <summary>
    /// A generic class that closes dialog boxes by clicking "&Yes"
    /// </summary>
    /// 
    public abstract class AWindowDefinitionDismissWithYes : AWindowDefinition
    {
        protected string DismissButton = "&Yes";

        public AWindowDefinitionDismissWithYes(string classTag, string title, string text)
            : base(classTag, title, text)
        {
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            IntPtr hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            #endregion


            #region Click DismissButton button

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }

    /// <summary>
    /// A generic class that closes dialog boxes by clicking "&No"
    /// </summary>
    /// 
    public abstract class AWindowDefinitionDismissWithNo : AWindowDefinition
    {
        protected string DismissButton = "&No";

        public AWindowDefinitionDismissWithNo(string classTag, string title, string text)
            : base(classTag, title, text)
        {
        }

        public override bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");


            #region Find the DismissButton

            IntPtr hDismissButton = IntPtr.Zero;
            IntPtr hChild = IntPtr.Zero;
            while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
            {
                string buttonText = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                log.Debug("buttonText: " + buttonText);
                if (buttonText != null)
                {
                    if (buttonText.Contains(DismissButton))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found DismissButton Match");
                        hDismissButton = hChild;
                        break;
                    }
                }
            }

            #endregion


            #region Click DismissButton button

            if (hDismissButton.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the hUncheckButton to dismiss dialog box (" + DismissButton + ")");

            WindowsWIN32.zSendMessage(hDismissButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

            #endregion

            return (true);
        }


    }



    /// <summary>
    /// A generic class the defines the 'default' behaviors of a window (i.e. click "close" to process the window)
    /// </summary>
    /// 
    public abstract class AWindowDefinition
    {
        protected static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        protected enum DialogBoxMessages // http://senapi.blogspot.com/2007/11/all-windows-messages-c-enum.html
        {
            WM_SETTEXT = 0x000c,
            BM_CLICK = 0x00F5,
            WM_SYSCOMMAND = 0x0112
        };

        protected enum GetWindowLongIndexs
        {
            GWL_WNDPROC = (-4),
            GWL_HINSTANCE = (-6),
            GWL_HWNDPARENT = (-8),
            GWL_STYLE = (-16),
            GWL_EXSTYLE = (-20),
            GWL_USERDATA = (-21),
            GWL_ID = (-12)
        };

        private string _ClassTag = "AWindowDefinition"; // Set this value to add to logging
        private string _Title = "AWindowDefinition";
        private string _Text = "AWindowDefinition";

        // Use this value to set how long (msec) the window should be visible before dismissing
        // For instance, some popups will be part of test cases (such as reminder dialogs, password dialogs, etc.)
        // Those classes can have a Time To Live setting, that will leave the popup for a minute or so, before
        // being automatically dismissed.  The extra minute allows the test case to process the window normally.
        //
        protected int TimeToLiveMilliseconds = -1;
        private static int IntervalMilliseconds = 10000;

        protected StringBuilder detailsBuilder = new StringBuilder("Window Details: ");

        // Set this to false if dismissing the dialog should not result in test case failure
        public bool IsFatal = true;


        public AWindowDefinition(string classTag, string title, string text)
        {
            ClassTag = classTag;
            Title = title;
            Text = text;
        }

        public string ClassTag
        {
            get
            {
                return (_ClassTag);
            }
            set
            {
                _ClassTag = value;
                detailsBuilder.Append("ClassTag: " + _ClassTag + " ");
            }

        }

        public string Title
        {
            get
            {
                return (_Title);
            }
            set
            {
                _Title = value;
                detailsBuilder.Append("Title: " + _Title + " ");
            }

        }

        public string Text
        {
            get
            {
                return (_Text);
            }
            set
            {
                _Text = value;
                detailsBuilder.Append("Text: " + _Text + " ");
            }

        }

        public virtual bool IsMatch(IntPtr handle, IntPtr param)
        {
            bool foundText = false;
            bool foundTitle = false;

            #region Visibility Check

            if (!WindowsWIN32.ByHandleIsVisible(handle))
            {
                log.Debug(" is invisible...");
                // The window must be visible, but this handle is not visible
                return (false);
            }

            #endregion

            #region Title Check

            if ((_Title == null) || (_Title.Equals("")))
            {
                foundTitle = true; // We don't care about the title
            }
            else
            {
                string title = WindowsWIN32.ByHandleGetTitleBarText(handle);
                if (title != null)
                {
                    log.Debug(" handle has title : " + title + ". Expected title is :  " + _Title );
                    // if (title.Contains(_Title))   // TODO: Instead use regex?
                    if (title.Trim().ToLower().Equals(_Title.Trim().ToLower()))// TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found Title Match");
                        foundTitle = true;
                    }
                    else
                    {
                        return (false);
                    }
                }
            }

            #endregion

            #region Text Check

            if ((_Text == null) || (_Text.Equals("")))
            {
                log.Debug(" _Text is null");
                foundText = true; // We don't care if the text is found
            }
            else
            {
                // Search for the "Text" in the window.  If it exists, then we have a match

                IntPtr hChild = IntPtr.Zero;
                while (!(hChild = WindowsWIN32.zFindWindowEx(handle, hChild, null, IntPtr.Zero)).Equals(IntPtr.Zero))
                {
                    //int ctrlId = WindowsWIN32.GetWindowLong(hChild, (int)GetWindowLongIndexs.GWL_ID);
                    //if (ctrlId == CONTROL_ID_OKBUTTON)
                    //{
                    //    hOkButton = hChild;
                    //}

                    string text = WindowsWIN32.ByHandleGetTitleBarText(hChild);
                    log.Debug("handle has text: " + text);
                    if (text != null)
                    {
                        if (text.Trim().ToLower().Contains(_Text.Trim().ToLower()))   // TODO: Instead use regex?
                        {
                            log.Debug(ClassTag + ": Found Text Match");
                            foundText = true;
                            break;
                        }
                    }

                }

            }
            #endregion

            if (foundTitle && foundText)
                tcLog.InfoFormat(ClassTag + ": IsMatch Found Match");

            return (foundTitle && foundText);
        }

        public virtual bool ProcessWindow(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": ProcessWindow");

            if ((TimeToLiveMilliseconds -= Interval) > 0)
            {
                tcLog.Info(ClassTag + ": Not processing yet ... " + TimeToLiveMilliseconds);
                return (false);
            }

            return (Dismiss(handle));
        }

        public virtual bool Dismiss(IntPtr handle)
        {
            tcLog.InfoFormat(ClassTag + ": Dismiss");
            WindowsWIN32.zSendMessage(handle, (uint)NativeWIN32.DialogBoxMessages.WM_SYSCOMMAND, (int)NativeWIN32.DialogBoxSysCommandParams.SC_CLOSE, (int)IntPtr.Zero);
            return (true);
        }

        public string GetDetails()
        {
            return (detailsBuilder.ToString());
        }

        /// <summary>
        /// Set the monitoring interval (msec)
        /// </summary>
        public static int Interval
        {
            get { return IntervalMilliseconds; }
            set { IntervalMilliseconds = value; }
        }


    }

    [AttributeUsage(AttributeTargets.Class)]
    public class WindowMonitorAttribute : System.Attribute
    {
        public WindowMonitorAttribute()
        {
        }
    }

    public class WindowsWIN32
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private static int Pause()
        {
            const int SleepDelay = 250;
            System.Threading.Thread.Sleep(SleepDelay);
            return (SleepDelay);
        }


        public static IntPtr zFindWindowEx(IntPtr parent, IntPtr next, string sClassName, IntPtr sWindowTitle)
        {
            return (FindWindowEx(parent, next, sClassName, sWindowTitle));
        }

        //public static IntPtr zFindWindowEx(IntPtr parent, IntPtr next, string sClassName, IntPtr sWindowTitle)
        //{
        //    return(WindowsWIN32.FindWindowEx(IntPtr parent, IntPtr next, string sClassName, IntPtr sWindowTitle));
        //}

        /**
         * 
            You'll probably want to use that in  conjunction with GetWindowTextLength:

            Code Snippet
            [DllImport("user32.dll", CharSet=CharSet.Auto)]
            public static extern int GetWindowTextLength(HandleRef hWnd);
            [DllImport("user32.dll", CharSet=CharSet.Auto)]
            public static extern int GetWindowText(HandleRef hWnd, StringBuilder lpString, int nMaxCount);
             
            //...
                        int capacity = GetWindowTextLength(new HandleRef(this, handle)) * 2;
                        StringBuilder stringBuilder = new StringBuilder(capacity);
                 GetWindowText(new HandleRef(this, handle), stringBuilder, stringBuilder.Capacity);

 

            If all you want is the name window text of all processes, you can
            use Process.GetProcesses() the use Process.MainWindowTitle; but 
            MainWindowTitle will not get the latest window text (just the text
            the first time it is called on a process).
         * 
         * **/
        public static string ByHandleGetTitleBarText(IntPtr handle)
        {
            const int size = 512;
            StringBuilder sb = new StringBuilder(size);
            WindowsWIN32.GetWindowText(handle, sb, size);
            return (sb.ToString());
        }

        public static bool ByHandleIsVisible(IntPtr handle)
        {
            return (WindowsWIN32.IsWindowVisible(handle));
        }

        /// <summary>
        /// Use this function instead of the Win32.SendMessagefunction.
        /// This function wraps the SendMessage function with a log event and a 1 second delay before/after sending the message
        /// </summary>
        /// 
        public static void zSendMessage(IntPtr hWnd, uint Msg, int wParam, int lParam)
        {
            // http://msdn.microsoft.com/en-us/library/ms644950(VS.85).aspx

            tcLog.InfoFormat("WindowsWIN32.zSendMessage( hWnd({0:x}), Msg({1}), wParam({2}), lParam({3}) )", hWnd.ToInt64(), Msg, wParam, lParam);

            Pause();
            WindowsWIN32.SendMessage(hWnd, Msg, wParam, lParam);
            Pause();

        }

        /// <summary>
        /// Use this function instead of the Win32.SendMessagefunction.
        /// This function wraps the SendMessage function with a log event and a 1 second delay before/after sending the message
        /// </summary>
        /// 
        public static void zSendMessage(IntPtr hWnd, uint Msg, int wParam, string lParam)
        {
            // http://msdn.microsoft.com/en-us/library/ms646312(VS.85).aspx

            tcLog.InfoFormat("WindowsWIN32.zSendMessage( hWnd({0:x}), Msg({1}), wParam({2}), lParam({3}) )", hWnd.ToInt64(), Msg, wParam, lParam);

            Pause();
            WindowsWIN32.SendMessage(hWnd, Msg, wParam, lParam);
            Pause();

        }

        public static void zSetFocus(IntPtr hWnd)
        {

            tcLog.InfoFormat("WindowsWIN32.zSendKeys( hWnd({0:x}) )", hWnd.ToInt64());

            Pause();
            WindowsWIN32.SetFocus(hWnd);
            Pause();

        }

        public static void zSetForegroundWindow(IntPtr hWnd)
        {

            tcLog.InfoFormat("WindowsWIN32.zSetForegroundWindow( hWnd({0:x}) )", hWnd.ToInt64());

            Pause();
            WindowsWIN32.SetForegroundWindow(hWnd);
            Pause();

        }

        public static void zSendKeys(string keys)
        {

            tcLog.InfoFormat("WindowsWIN32.zSendKeys( keys({0}) )", keys);

            Pause();
            System.Windows.Forms.SendKeys.SendWait(keys);
            Pause();

        }

        public static int zGetWindowLong(IntPtr hWnd, int Index)
        {
            return (WindowsWIN32.GetWindowLong(hWnd, Index));
        }

        public static void ByThreadIdEnumThreadWindows(int threadId, EnumThreadProc pfnEnum, IntPtr lParam)
        {

            WindowsWIN32.EnumThreadProc callback = new WindowsWIN32.EnumThreadProc(pfnEnum);
            WindowsWIN32.EnumThreadWindows(threadId, callback, lParam);

        }

        public delegate bool EnumThreadProc(IntPtr hwnd, IntPtr lParam);

        //BOOL EnumThreadWindows(
        //    DWORD dwThreadId,
        //    WNDENUMPROC lpfn,
        //    LPARAM lParam
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern bool EnumThreadWindows(int threadId, EnumThreadProc pfnEnum, IntPtr lParam);

        //LRESULT SendMessage(
        //    HWND hWnd,
        //    UINT Msg,
        //    WPARAM wParam,
        //    LPARAM lParam
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SendMessage(IntPtr hWnd, uint msg, int wParam, int lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SendMessage(IntPtr hWnd, uint msg, int wParam, string lParam);

        //int GetWindowText(
        //    HWND hWnd,
        //    LPTSTR lpString,
        //    int nMaxCount
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder ClassName, int nMaxCount);

        //BOOL IsWindowVisible(
        //    HWND hWnd
        //);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool IsWindowVisible(IntPtr handle);

        //HWND FindWindowEx(
        //    HWND hwndParent,
        //    HWND hwndChildAfter,
        //    LPCTSTR lpszClass,
        //    LPCTSTR lpszWindow
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr next, string sClassName, IntPtr sWindowTitle);

        //http://msdn.microsoft.com/en-us/library/ms646312(VS.85).aspx
        //HWND SetFocus(
        //    HWND hWnd
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SetFocus(IntPtr hWnd);

        //http://msdn.microsoft.com/en-us/library/ms633539(VS.85).aspx
        //BOOL SetForegroundWindow(      
        //    HWND hWnd
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        //int GetWindowLong(
        //    HWND hWnd, 
        //    DWORD Index
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowLong(IntPtr hWnd, int Index);


    }


}
