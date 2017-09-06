using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using log4net;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;

namespace Harness
{


    public class WindowMonitor
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private static AWindowDefinition TheFoundWindow = null;

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
            const string UncheckButton = "Restart Microsoft Office Outlook";
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
                "VMware Zimbra Connector for Microsoft Outlook",
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
                // The window must be visible, but this handle is not visible
                return (false);
            }

            #endregion

            #region Text Check

            if ((_Text == null) || (_Text.Equals("")))
            {
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
                    log.Debug("text: " + text);
                    if (text != null)
                    {
                        if (text.Contains(_Text))   // TODO: Instead use regex?
                        {
                            log.Debug(ClassTag + ": Found Text Match");
                            foundText = true;
                            break;
                        }
                    }

                }

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
                    if (title.Contains(_Title))   // TODO: Instead use regex?
                    {
                        log.Debug(ClassTag + ": Found Title Match");
                        foundTitle = true;
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
