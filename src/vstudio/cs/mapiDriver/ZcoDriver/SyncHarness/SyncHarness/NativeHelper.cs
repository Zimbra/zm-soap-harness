using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
using log4net;
using System.Diagnostics;
using Microsoft.Office.Core;
using System.Text.RegularExpressions;

namespace SyncHarness
{
    public class NativeWIN32
    {

        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        private static ILog logger = LogManager.GetLogger(TestCaseLog.tcLogName);
        private static bool ShouldExecute = true;
        public static bool profileCreated;

        public const int DefaultWindowWaitTime = 30;
        
        #region Basic Windows Functions


        public enum TitleComparison
        {
            //Regex,
            //ContainsIgnoreCase,
            Contains,
            //EqualsIgnoreCase,
            Equals
        };

        /// <summary>
        /// Return true if a window exits (visible or not) with title bar set to windowTitle
        /// </summary>
        /// <param name="windowTitle">The window title (see comparison)</param>
        /// <param name="timeoutSeconds">How long to wait for the window (seconds).  Specify 0 for immediate.</param>
        /// <param name="comparison">Equals, Contains, Regex, etc</param>
        /// 
        public static bool WindowExists(string windowTitle, int timeoutSeconds, TitleComparison comparison)
        {
            logger.InfoFormat("WindowExists: Check for title ({0}) comparison ({1})", windowTitle, comparison);

            do
            {

                if (NativeWIN32.FindWindowHandles(null, windowTitle, comparison).Count > 0)
                {
                    logger.Info("WindowExists: found!");
                    return (true); // Found it!
                }

                System.Threading.Thread.Sleep(1000);

            }
            while (timeoutSeconds-- > 0);

            // Window was never found
            logger.Info("WindowExists: not found!");
            return (false);
        }

        /// <summary>
        /// Return true if a window exists and is visible with the title bar set to windowTitle
        /// </summary>
        /// <param name="windowTitle">The window title (see comparison)</param>
        /// <param name="timeoutSeconds">How long to wait for the window (seconds).  Specify 0 for immediate.</param>
        /// <param name="comparison">Equals, Contains, Regex, etc</param>
        /// 
        public static bool WindowVisible(string windowTitle, int timeoutSeconds, TitleComparison comparison)
        {
            logger.InfoFormat("WindowVisible: Check for title ({0}) comparison ({1})", windowTitle, comparison);

            do
            {

                List<IntPtr> list = NativeWIN32.FindWindowHandles(null, windowTitle, comparison);
                if ( list.Count > 0)
                {

                    foreach (IntPtr handle in list)
                    {
                        if (IsWindowVisible(handle))
                        {
                            logger.InfoFormat("WindowVisible: found and visible.  handle({0:X})", handle.ToInt64());
                            return (true);
                        }
                        else
                        {
                            log.DebugFormat("WindowVisible: found, but invisible.  handle({0:X})", handle.ToInt64());
                        }
                    }

                    logger.Info("WindowVisible: found, but all are invisible.");

                    // Should we return now?  or wait for the entire 30 seconds for the window to become visible?
                    // return (false);

                }

                System.Threading.Thread.Sleep(1000);

            }
            while (timeoutSeconds-- > 0);

            // Window was never found
            logger.Info("WindowVisible: not found!");
            return (false);
        }

        public enum DialogBoxMessages // http://senapi.blogspot.com/2007/11/all-windows-messages-c-enum.html
        {
            WM_SETTEXT = 0x000c,
            BM_CLICK = 0x00F5,
            WM_SYSCOMMAND = 0x0112
        };

        public enum DialogBoxSysCommandParams // http://msdn.microsoft.com/en-us/library/ms646360(VS.85).aspx
        {
            //SC_SIZE = 0xF000,
            //SC_MOVE = 0xF010,
            //SC_MINIMIZE = 0xF020,

            /////<summary>
            ///// Sent when form maximizes
            /////</summary>
            //SC_MAXIMIZE = 0xF030,

            /////<summary>
            ///// Sent when form maximizes because of doubcle click on caption
            /////</summary>
            //SC_MAXIMIZE2 = 0xF032,
            //SC_NEXTWINDOW = 0xF040,
            //SC_PREVWINDOW = 0xF050,

            /////<summary>
            ///// Closes the form
            /////</summary>
            SC_CLOSE = 0xF060,
            //SC_VSCROLL = 0xF070,
            //SC_HSCROLL = 0xF080,
            //SC_MOUSEMENU = 0xF090,
            //SC_KEYMENU = 0xF100,
            //SC_ARRANGE = 0xF110,

            /////<summary>
            ///// Sent when form is maximized from the taskbar
            /////</summary>
            //SC_RESTORE = 0xF120,
            /////<summary>
            ///// Sent when form maximizes because of doubcle click on caption
            /////</summary>
            //SC_RESTORE2 = 0xF122,
            //SC_TASKLIST = 0xF130,
            //SC_SCREENSAVE = 0xF140,
            //SC_HOTKEY = 0xF150,
            SC_DEFAULT = 0xF160,
            //SC_MONITORPOWER = 0xF170,
            //SC_CONTEXTHELP = 0xF180,
            //SC_SEPARATOR = 0xF00F
        };

        /// <summary>
        /// Send the specified command to all windows with the title bar set to windowTitle
        /// </summary>
        /// <param name="windowTitle">The window title (see comparison)</param>
        /// <param name="command">Windows System Command to Send.  (close, minimize, restore, maximize, etc.)</param>
        /// <param name="comparison">Equals, Contains, Regex, etc</param>
        /// 
        public static void ProcessDialogBoxByCommand(string windowTitle, DialogBoxSysCommandParams command, TitleComparison comparison)
        {
            logger.InfoFormat("ProcessDialogBox: title({0}) command({1})", windowTitle, command);

            const uint WM_SYSCOMMAND = 0x0112;
            
            List<IntPtr> handles = NativeWIN32.FindWindowHandles(null, windowTitle, comparison);

            zAssert.Greater(handles.Count, 0, "Verify ProcessDialogBoxByCommand finds at least one handle - use WindowExists first to confirm existence");

            foreach (IntPtr handle in handles)
            {
                NativeWIN32.SendMessageZimbra(handle, WM_SYSCOMMAND, (int)command, (int)IntPtr.Zero);
            }

        }
        public static void ClickOK()
        {
            while (ShouldExecute)
            {
                string windowTitle = "Error";
                if (NativeWIN32.WindowExists(windowTitle, 30, NativeWIN32.TitleComparison.Contains))
                {
                    IntPtr windowHandle = NativeWIN32.FindWindow(null, windowTitle);
                    IntPtr hChild = IntPtr.Zero;
                    do
                    {

                        hChild = NativeWIN32.FindWindowEx(windowHandle, hChild, null, IntPtr.Zero);
                        if (!hChild.Equals(IntPtr.Zero))
                        {

                            int ctrlId = NativeWIN32.GetWindowLong(hChild, (int)NativeWIN32.GetWindowLongIndexs.GWL_ID);
                            if (ctrlId == 2)
                            {
                                NativeWIN32.SendMessageZimbra(hChild, (uint)NativeWIN32.DialogBoxMessages.BM_CLICK, 0, 0);
                                ShouldExecute = false;
                            }
                        }
                    } while (!hChild.Equals(IntPtr.Zero));
                }
            }
        }
        public enum ButtonLabel
        {
            Ok,
            Apply,
            Cancel
        }

        /// <summary>
        /// Click on the specified button in all windows with the title bar set to windowTitle.
        /// Use ProcessDialogBoxByButtonLabel for non-standard buttons.
        /// </summary>
        /// <param name="windowTitle">The window title (see comparison)</param>
        /// <param name="button">Standard buttons (Ok, Apply, Cancel, etc.)</param>
        /// <param name="comparison">Equals, Contains, Regex, etc</param>
        /// 
        public static void ProcessDialogBoxByButton(string windowTitle, ButtonLabel button, TitleComparison comparison)
        {
            zAssert.IsTrue(WindowExists(windowTitle, DefaultWindowWaitTime, comparison), "Verify that the dialog box exists");

            throw new HarnessException("ProcessDialogBoxByButton: implement me");
        }

        /// <summary>
        /// Click on the button with the specified label in all windows with the title bar set to windowTitle.
        /// Use ProcessDialogBoxByButtonLabel for standard buttons (Ok, Apply, Cancel, etc.)
        /// </summary>
        /// <param name="windowTitle">The window title (see comparison)</param>
        /// <param name="label">The label text</param>
        /// <param name="comparison">Equals, Contains, Regex, etc</param>
        /// 
        public static int ProcessDialogBoxByButtonLabel(string windowTitle, string buttonLabel, TitleComparison comparison)
        {
            logger.InfoFormat("ProcessDialogBoxByButtonLabel: title({0}) label({1})", windowTitle, buttonLabel);

            // Remember how many buttons we clicked
            int clickCount = 0;
            
            // Find all matching windows
            List<IntPtr> handles = NativeWIN32.FindWindowHandles(null, windowTitle, comparison);

            zAssert.Greater(handles.Count, 0, "Verify ProcessDialogBoxByButtonLabel finds at least one handle - use WindowExists first to confirm existence");

            // Click on the button in each handle
            foreach (IntPtr handle in handles)
            {
                IntPtr hButton = IntPtr.Zero;
                IntPtr hChild = IntPtr.Zero;
                do
                {

                    hChild = NativeWIN32.FindWindowEx(handle, hChild, null, IntPtr.Zero);
                    if (!hChild.Equals(IntPtr.Zero))
                    {
                        const int size = 512;
                        StringBuilder sb = new StringBuilder(size);
                        NativeWIN32.GetWindowText(hChild, sb, size);
                        string label = sb.ToString().ToLower();
                        
                        if ( label.Length == 0 )
                            continue;       // skip any buttons without labels

                        log.Debug("ProcessDialogBoxByButtonLabel: label " + sb.ToString() + " ("+ buttonLabel +")");

                        if (label.Equals(buttonLabel.ToLower()))
                        {
                            log.Info("ProcessDialogBoxByButtonLabel: Found it!");
                            hButton = hChild;
                            break;
                        }

                    }

                } while (!hChild.Equals(IntPtr.Zero));

                if (!hButton.Equals(IntPtr.Zero))
                {
                    // We have the button handle
                    // CLICK it!
                    NativeWIN32.SendMessageZimbra(hButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);

                    clickCount++;

                }

            }

            return (clickCount);

        }

        // Get window handle using Win32 FindWindow function
        public static IntPtr GetWindowHandle(string className, string windowTitle)
        {
            return NativeWIN32.FindWindow(className, windowTitle);

        }

        // Close window provided window class name and title/caption
        public static void CloseWindow(string className, string windowTitle)
        {
            IntPtr hwnd = FindWindow(className, windowTitle);

            if (hwnd != IntPtr.Zero)
                SendMessage(hwnd, 0x0010, 0, 0); //WM_CLOSE action on the window
        }

        //Click button provided window's title and button's caption
        public static void ClickWindowButton(string windowTitle, string buttonCaption)
        {
            IntPtr parentHwnd = NativeWIN32.FindWindow(null, windowTitle);

            if (parentHwnd != IntPtr.Zero)
            {
                IntPtr childHwnd = IntPtr.Zero;
                do
                {
                     childHwnd = NativeWIN32.FindWindowEx(parentHwnd, childHwnd, null, IntPtr.Zero);

                     if (!childHwnd.Equals(IntPtr.Zero))
                     {
                        const int size = 512;
                        StringBuilder sb = new StringBuilder(size);
                        NativeWIN32.GetWindowText(childHwnd, sb, size);

                        string title = sb.ToString();
                        if (title.ToLower().Contains(buttonCaption.ToLower()))
                        {
                            log.DebugFormat("ClickWindowButton: found title({0}) handle({1:X})", title, childHwnd.ToInt64());
                            NativeWIN32.SendMessageZimbra(childHwnd, (uint)DialogBoxMessages.BM_CLICK, 0, 0);
                            childHwnd = IntPtr.Zero;
                        }
                    }
                       
                } while (!childHwnd.Equals(IntPtr.Zero));
            }
        }

        #endregion

        #region Helper functions for common windows

        #region Title: "Zimbra Authorization"

        /// <summary>
        /// Enter the username, password, and confirmation into the "Zimbra Authorization" dialog box.
        /// Then click "OK".
        /// </summary>
        /// <param name="username">Text to be added to the username field (i.e. foo@example.com)</param>
        /// <param name="password">Text to be added to the password field (i.e. test123)</param>
        /// <param name="confirm">Text to be added to the confirm field (i.e. test123)</param>
        /// 
        public static void ProcessDialogBoxZimbraAuthorization(string username, string password, string confirm)
        {
            log.Info("ProcessDialogBoxZimbraAuthorization");

            // Zimbra dialog box definitions
            const string WindowTitle = "Zimbra Authorization";
            const int CONTROL_ID_OKBUTTON = 0x1;    // 1
            const int CONTROL_ID_USERNAME = 0x451;  // 1105
            const int CONTROL_ID_PASSWORD = 0x3F6;  // 1014
            const int CONTROL_ID_CONFIRM = 0x3F7;   // 1015


            #region Find the "Zimbra Auth" dialog box

            List<IntPtr> list = NativeWIN32.FindWindowHandles(null, WindowTitle, TitleComparison.Equals);
            zAssert.AreEqual(1, list.Count, "Too many Zimbra Authentication dialog boxes are available!  There should be exactly 1.");

            #endregion


            #region Set the text fields: username, password, confirm

            IntPtr hOkButton = IntPtr.Zero;
            IntPtr hChild = IntPtr.Zero;
            do
            {

                hChild = NativeWIN32.FindWindowEx(list[0], hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {

                    int ctrlId = NativeWIN32.GetWindowLong(hChild, (int)GetWindowLongIndexs.GWL_ID);

                    if (ctrlId == CONTROL_ID_USERNAME)
                    {
                        NativeWIN32.SendMessageZimbra(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, username);
                    }
                    else if (ctrlId == CONTROL_ID_PASSWORD)
                    {
                        NativeWIN32.SendMessageZimbra(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, password);
                    }
                    else if (ctrlId == CONTROL_ID_CONFIRM)
                    {
                        NativeWIN32.SendMessageZimbra(hChild, (uint)DialogBoxMessages.WM_SETTEXT, 0, confirm);
                    }
                    else if (ctrlId == CONTROL_ID_OKBUTTON)
                    {
                        hOkButton = hChild;
                    }

                }

            } while (!hChild.Equals(IntPtr.Zero));

            #endregion


            #region Click OK button

            
            zAssert.IsFalse(hOkButton.Equals(IntPtr.Zero), "Verify the OK button was found");

            NativeWIN32.SendMessageZimbra(hOkButton, (uint)DialogBoxMessages.BM_CLICK, 0, 0);


            #endregion

        }

        #endregion

        #region Private Functions

        /// <summary>
        /// Return a list of IntPtr to handles of matching windows
        /// </summary>
        /// <param name="lpClassName">See FindWindowEx documentation</param>
        /// <param name="windowTitle">The window title (see comparison)</param>
        /// <param name="comparison">Equals, Contains, Regex, etc</param>
        /// 
        private static List<IntPtr> FindWindowHandles(string lpClassName, string windowTitle, TitleComparison comparison)
        {
            List<IntPtr> list = new List<IntPtr>();
            
            IntPtr hParent = IntPtr.Zero;
            IntPtr hNext = IntPtr.Zero;

            do
            {

                hNext = NativeWIN32.FindWindowEx(hParent, hNext, lpClassName, IntPtr.Zero);

                if (!hNext.Equals(IntPtr.Zero))
                {

                    const int size = 512;
                    StringBuilder sb = new StringBuilder(size);
                    NativeWIN32.GetWindowText(hNext, sb, size);

                    string title = sb.ToString();

                    if (title.Length != 0)
                    {
                        switch (comparison)
                        {
                            case TitleComparison.Contains:
                                if (title.ToLower().Contains(windowTitle.ToLower()))
                                {
                                    log.DebugFormat("FindWindowHandles: found title({0}) handle({1:X})", title, hNext.ToInt64());
                                    list.Add(hNext);
                                }
                                break;

                            case TitleComparison.Equals:
                                if (title.ToLower().Equals(windowTitle.ToLower()))
                                {
                                    log.DebugFormat("FindWindowHandles: found title({0}) handle({1:X})", title, hNext.ToInt64());
                                    list.Add(hNext);
                                }
                                break;
                        }
                    }

                }

            }
            while (!hNext.Equals(IntPtr.Zero));

            return (list);
        }

        /// <summary>
        /// Use this function instead of the Win32.SendMessagefunction.
        /// This function wraps the SendMessage function with a log event and a 1 second delay before/after sending the message
        /// </summary>
        /// 
        private static void SendMessageZimbra(IntPtr handle, uint msg, int wParam, int lParam)
        {
            logger.InfoFormat("SendMessage({0:x}, {1}, {2}, {3})", handle.ToInt64(), msg, wParam, lParam);

            System.Threading.Thread.Sleep(1000);
            NativeWIN32.SendMessage(handle, msg, wParam, lParam);
            System.Threading.Thread.Sleep(1000);

        }

        /// <summary>
        /// Use this function instead of the Win32.SendMessagefunction.
        /// This function wraps the SendMessage function with a log event and a 1 second delay before/after sending the message
        /// </summary>
        /// 
        private static void SendMessageZimbra(IntPtr handle, uint msg, int wParam, string lParam)
        {
            logger.InfoFormat("SendMessage({0:x}, {1}, {2}, {3})", handle.ToInt64(), msg, wParam, lParam);

            System.Threading.Thread.Sleep(1000);
            NativeWIN32.SendMessage(handle, msg, wParam, lParam);
            System.Threading.Thread.Sleep(1000);

        }

        #endregion

        #endregion


        #region  Native function definitions


        private delegate bool EnumThreadProc(IntPtr hwnd, IntPtr lParam);
        private delegate bool EnumChildProc(IntPtr hwnd, IntPtr lParam);

        //BOOL EnumThreadWindows(
        //    DWORD dwThreadId,
        //    WNDENUMPROC lpfn,
        //    LPARAM lParam
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern bool EnumThreadWindows(int threadId, EnumThreadProc pfnEnum, IntPtr lParam);

        //BOOL EnumChildWindows(
        //    HWND hWndParent,
        //    WNDENUMPROC lpEnumFunc,
        //    LPARAM lParam
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern bool EnumChildWindows(IntPtr handle, EnumChildProc pfnEnum, IntPtr lParam);

        // used for an output LPCTSTR parameter on a method call

        //[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        //private struct STRINGBUFFER
        //{
        //    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
        //    public string szText;
        //}

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public Int32 left;
            public Int32 top;
            public Int32 right;
            public Int32 bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct WINDOWINFO
        {
            public UInt32 cbSize;
            public RECT rcWindow;
            public RECT rcClient;
            public UInt32 dwStyle;
            public UInt32 dwExStyle;
            public UInt32 dwWindowStatus;
            public UInt32 cxWindowBorders;
            public UInt32 cyWindowBorders;
            public UInt16 atomWindowType;
            public UInt16 wCreatorVersion;
        }

        //BOOL GetWindowInfo(
        //    HWND hwnd,
        //    PWINDOWINFO pwi
        //);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern Boolean GetWindowInfo(IntPtr hwnd, out WINDOWINFO pwi);
        
        //int GetWindowText(
        //    HWND hWnd,
        //    LPTSTR lpString,
        //    int nMaxCount
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder ClassName, int nMaxCount);

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

        //HWND FindWindow(
        //    LPCTSTR lpClassName,
        //    LPCTSTR lpWindowName
        //);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        //HWND FindWindowEx(
        //    HWND hwndParent,
        //    HWND hwndChildAfter,
        //    LPCTSTR lpszClass,
        //    LPCTSTR lpszWindow
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr next, string sClassName, IntPtr sWindowTitle);

        //BOOL SetForegroundWindow(
        //    HWND hWnd
        //);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetForegroundWindow(IntPtr handle);

        //BOOL IsWindowVisible(
        //    HWND hWnd
        //);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool IsWindowVisible(IntPtr handle);

        
        private enum GetWindowLongIndexs
        {
            GWL_WNDPROC = (-4),
            GWL_HINSTANCE = (-6),
            GWL_HWNDPARENT = (-8),
            GWL_STYLE = (-16),
            GWL_EXSTYLE = (-20),
            GWL_USERDATA = (-21),
            GWL_ID = (-12)
        };

        //int GetWindowLong(
        //    HWND hWnd, 
        //    DWORD Index
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowLong(IntPtr handle, int index);

        // The harness cannot use SetWindowText, because OLK runs in a different process.
        // Use SendMessage instead
        //BOOL SetWindowText(
        //    HWND hWnd,
        //    LPCTSTR lpString
        //);
        //[DllImport("user32.dll", CharSet = CharSet.Auto)]
        //private static extern Boolean SetWindowText(IntPtr hwnd, string str);

        #endregion

    }

    class NativeHelper
    {

        private const UInt32 S_OK = 0;

        //currently logged on profile name
        private String profileName = null;

        /// <summary>
        /// private constructor only called by GetInstance
        /// </summary>
        public NativeHelper(String profileName)
        {
            this.profileName = profileName;
        }

        /// <summary>
        /// The name of the currenly logged on profile
        /// </summary>
        public String ProfileName
        {
            get
            {
                return this.profileName;
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="storeEntryId"></param>
        /// <returns></returns>
        public bool IsSyncInProgress(String storeEntryId)
        {
            Int32 inProgress = 0;
            if (Native_IsSyncInProgress(profileName, storeEntryId, out inProgress) == S_OK)
            {
                return inProgress == 1;
            }
            throw new Exception("Unable to get sync status");
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="itemEntryId"></param>
        /// <returns></returns>
        public Int32 GetZimbraId(String itemEntryId)
        {
            Int32 zimbraId = 0;
            if (Native_GetZimbraId(profileName, itemEntryId, out zimbraId) == S_OK)
            {
                return zimbraId;
            }
            throw new Exception("Unable to get zimbra id");
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="zimbraId"></param>
        /// <returns></returns>
        public String GetEntryId(String storeEntryId, UInt32 zimbraId)
        {
            StringBuilder sb = new StringBuilder(256);
            if (Native_GetEntryId(profileName, storeEntryId, zimbraId, sb, sb.Capacity) == S_OK)
            {
                return sb.ToString();
            }
            throw new Exception("Unable to get entry id");
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="status"></param>
        /// <returns></returns>
        public void SetConnectionStatus(OutlookMailbox.ConnectionStatus status)
        {
            if (Native_SetConnectionStatus(profileName, status) != S_OK)
            {
                throw new Exception("Unable to set connection status");
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="storeEid"></param>
        /// <returns></returns>
        public void InitiateSync(String storeEid)
        {
            if (Native_InitiateSync(profileName, storeEid) != S_OK)
            {
                throw new Exception("Unable to initiate sync");
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="profileName"></param>
        /// <param name="serverName"></param>
        /// <param name="serverPort"></param>
        /// <param name="serverSSL"></param>
        /// <param name="accountName"></param>
        /// <param name="accountPassword"></param>
        /// <returns></returns>
        public static void CreateProfile(String profileName, String serverName, String serverPort,
            String serverSSL, String accountName, String accountPassword)
        {
            try
            {
                NativeWIN32.profileCreated = true;
                uint ret = Native_CreateProfile(profileName, serverName, serverPort, serverSSL, accountName, accountPassword);
                if (ret != S_OK)
                {
                    // 0x8004010F = 2147746063 - MAPI_E_NOT_FOUND 
                    NativeWIN32.profileCreated = false;
                    throw new HarnessException("Failed to create profile.  Response code: " + ret);
                }
            }
            catch (System.AccessViolationException e)
            {
                throw new HarnessException("Native_CreateProfile threw exception", e);
            }
         }

        public static void OpenOtherUsersMailbox(zAccount otherAccount)
        {
            // Check that the required input is defined
            if (otherAccount == null)
            {
                throw new HarnessException("MountMailboxNative - otherAccount is null " + otherAccount);
            }


            try
            {

                UInt32 ret = Native_OpenOtherUsersMailbox(
                    OutlookProcess.Instance.CurrentProfile.profileName, 
                    OutlookRedemption.Instance.getRootGlobalAddressList().EntryID,
                    otherAccount.emailAddress, 
                    otherAccount.zimbraId);

                if (ret != S_OK)
                {
                    throw new HarnessException(String.Format("Failed to open other users mailbox.  Response code: {0:d} ({0:x})", ret));
                }
            }
            catch (System.AccessViolationException e)
            {
                throw new HarnessException("Native_OpenOtherUsersMailbox threw exception", e);
            }

        }

        //OpenOtherUsersMailboxD() is implemented for users not in GAL account, searches in Contacts folder: uses getRootContacts() instead of getRootGlobalAddressList
        public static void OpenOtherUsersMailboxD(zAccount otherAccount)
        {
            // Check that the required input is defined
            if (otherAccount == null)
            {
                throw new HarnessException("MountMailboxNative - otherAccount is null " + otherAccount);
            }

            try
            {

                UInt32 ret = Native_OpenOtherUsersMailbox(
                    OutlookProcess.Instance.CurrentProfile.profileName,
                    OutlookRedemption.Instance.getRootContacts().EntryID,
                    otherAccount.emailAddress,
                    otherAccount.zimbraId);

                if (ret != S_OK)
                {
                    throw new HarnessException(String.Format("Failed to open other users mailbox.  Response code: {0:d} ({0:x})", ret));
                }
            }
            catch (System.AccessViolationException e)
            {
                throw new HarnessException("Native_OpenOtherUsersMailbox threw exception", e);
            }

        }

        #region  Native function definitions

        [DllImport("NativeDLL.dll", CharSet = CharSet.Auto, EntryPoint = "IsSyncInProgress")]
        private static extern UInt32 Native_IsSyncInProgress(String profileName, [MarshalAs(UnmanagedType.LPStr)]String storeEid, out Int32 inProgress);

        [DllImport("NativeDLL.dll", CharSet = CharSet.Auto, EntryPoint = "GetZimbraId")]
        private static extern UInt32 Native_GetZimbraId(String profileName, [MarshalAs(UnmanagedType.LPStr)]String itemEntryId, out Int32 zimbraId);

        [DllImport("NativeDLL.dll", CharSet = CharSet.Auto, EntryPoint = "GetEntryId")]
        private static extern UInt32 Native_GetEntryId(String profileName, [MarshalAs(UnmanagedType.LPStr)]String storeEntryId, UInt32 zimbraId, StringBuilder sb, Int32 size);

        [DllImport("NativeDLL.dll", CharSet = CharSet.Auto, EntryPoint = "SetConnectionStatus")]
        private static extern UInt32 Native_SetConnectionStatus(String profileName, [MarshalAs(UnmanagedType.I4)] OutlookMailbox.ConnectionStatus status);

        [DllImport("NativeDLL.dll", CharSet = CharSet.Auto, EntryPoint = "InitiateSync")]
        private static extern UInt32 Native_InitiateSync(String profileName, [MarshalAs(UnmanagedType.LPStr)] String pszStoreEid);

        [DllImport("NativeDLL.dll", CharSet = CharSet.Auto, EntryPoint = "CreateZCOProfile")]
        private static extern UInt32 Native_CreateProfile(
            [MarshalAs(UnmanagedType.LPStr)] String profileName,
            [MarshalAs(UnmanagedType.LPStr)] String serverName,
            [MarshalAs(UnmanagedType.LPStr)] String serverPort,
            [MarshalAs(UnmanagedType.LPStr)] String serverSSL,
            [MarshalAs(UnmanagedType.LPStr)] String accountName,
            [MarshalAs(UnmanagedType.LPStr)] String accountPassword);

        [DllImport("NativeDLL.dll", CharSet = CharSet.Auto, EntryPoint = "OpenOtherUsersMailbox")]
        private static extern UInt32 Native_OpenOtherUsersMailbox(
            [MarshalAs(UnmanagedType.LPStr)] String userProfile,
            [MarshalAs(UnmanagedType.LPStr)] String galEntryID,
            [MarshalAs(UnmanagedType.LPWStr)] String otherEmailAddress,
            [MarshalAs(UnmanagedType.LPStr)] String otherGUID);

        #endregion

    }

    public class MSAAHelper
    {
        #region Accessibility Helper functions

        /// <summary>
        /// Gets the child accessible objects of the given container object.
        /// </summary>
        /// <param name="accContainer">
        /// The container object's IAccessible interface.
        /// </param>
        /// <returns>
        /// The child accessible objects of the given container object.
        /// </returns>
        public static IAccessible[] GetAccessibleChildren(IAccessible accContainer)
        {
            // Get the number of child interfaces that belong to this object. 
            int childNum = 0;
            try
            {
                childNum = accContainer.accChildCount;
            }
            catch (Exception ex)
            {
                childNum = 0;
                Debug.Print(ex.Message);
            }

            // Get the child accessible objects.
            IAccessible[] accObjects = new IAccessible[childNum];
            int count = 0;
            if (childNum != 0)
            {
                AccessibleChildren(accContainer, 0, childNum, accObjects, ref count);

            }
            return accObjects;
        }


        /// <summary>
        /// Gets the child accessible object by name and role text.
        /// </summary>
        /// <param name="accContainer">
        /// The container object's IAccessible interface.
        /// </param>
        /// <param name="name">The name of the object</param>
        /// <param name="roleText">The role text of the object</param>
        /// <param name="ignoreInvisible">
        /// Specifies if it's required to ignore the invisible objects.
        /// </param>
        /// <returns>
        /// The accessible object in the container that match the specified name and role. 
        /// </returns>
        public static IAccessible GetAccessibleObjectByNameAndRole(
            IAccessible accContainer, Regex name, string roleText,
            bool ignoreInvisible)
        {
            IAccessible objToReturn = null;
            if (accContainer != null)
            {
                // Get the child accessible objects.
                IAccessible[] children = GetAccessibleChildren(accContainer);
                foreach (IAccessible child in children)
                {
                    string childName = null;
                    string childState = string.Empty;
                    string childRole = string.Empty;
                    try
                    {
                        childName = child.get_accName(0);
                        childState = GetStateText((MSAAStateConstants)child.get_accState(0));
                        childRole = GetRoleText(Convert.ToUInt32(child.get_accRole(0)));
                        //Use below for debugging in case Zimbra controls are not properly accessed
                        //System.Console.WriteLine("Child Role: " + childRole + " Child name: " + childName);
                    }
                    catch (Exception ex)
                    {
                        // Record the error and continue.
                        Debug.Print(ex.Message);
                        continue;
                    }

                    // If the child is invisible and it's required to ignore the 
                    // invisible objects, continue to the next object.

                    if (ignoreInvisible && childState.Contains("invisible"))
                    {
                        continue;
                    }


                    // If the name and role match, return the object.
                    if (!string.IsNullOrEmpty(childName) &&
                         name.Match(childName).Success &&
                         childRole == roleText)
                    {
                        return child;
                    }

                    // Recursively look for the object among the children.
                    objToReturn = GetAccessibleObjectByNameAndRole(child, name,
                        roleText, ignoreInvisible);
                    if (objToReturn != null)
                    {
                        return objToReturn;
                    }
                }
            }
            return objToReturn;
        }


        /// <summary>
        /// Get the role text of an accesible object.
        /// </summary>
        /// <param name="role">
        /// One of the object role constants.
        /// http://msdn.microsoft.com/en-us/library/dd373608.aspx
        /// </param>
        /// <returns>The role text of an accessible object</returns>
        public static string GetRoleText(uint role)
        {
            StringBuilder roleText = new StringBuilder(1024);
            GetRoleText(role, roleText, (uint)roleText.Capacity);
            return roleText.ToString();
        }


        /// <summary>
        /// Get the state text of an accessible object.
        /// </summary>
        /// <param name="stateBit">
        /// One of the object state constants.
        /// http://msdn.microsoft.com/en-us/library/dd373609.aspx
        /// </param>
        /// <returns>The state text of an accessible object</returns>
        public static string GetStateText(MSAAStateConstants stateBit)
        {
            int maxLength = 1024;
            StringBuilder focusableStateText = new StringBuilder(maxLength);
            StringBuilder sizeableStateText = new StringBuilder(maxLength);
            StringBuilder moveableStateText = new StringBuilder(maxLength);
            StringBuilder invisibleStateText = new StringBuilder(maxLength);
            StringBuilder unavailableStateText = new StringBuilder(maxLength);
            StringBuilder hasPopupStateText = new StringBuilder(maxLength);

            if (stateBit == (MSAAStateConstants.STATE_SYSTEM_FOCUSABLE |
                MSAAStateConstants.STATE_SYSTEM_SIZEABLE |
                MSAAStateConstants.STATE_SYSTEM_MOVEABLE))
            {
                GetStateText(MSAAStateConstants.STATE_SYSTEM_FOCUSABLE,
                    focusableStateText, (uint)focusableStateText.Capacity);
                GetStateText(MSAAStateConstants.STATE_SYSTEM_SIZEABLE,
                    sizeableStateText, (uint)sizeableStateText.Capacity);
                GetStateText(MSAAStateConstants.STATE_SYSTEM_MOVEABLE,
                    moveableStateText, (uint)moveableStateText.Capacity);
                return (focusableStateText + "," + sizeableStateText + "," + moveableStateText);
            }

            if (stateBit == (MSAAStateConstants.STATE_SYSTEM_FOCUSABLE |
                MSAAStateConstants.STATE_SYSTEM_INVISIBLE))
            {
                GetStateText(MSAAStateConstants.STATE_SYSTEM_FOCUSABLE,
                    focusableStateText, (uint)focusableStateText.Capacity);
                GetStateText(MSAAStateConstants.STATE_SYSTEM_INVISIBLE,
                    invisibleStateText, (uint)invisibleStateText.Capacity);

                return (focusableStateText + "," + invisibleStateText);
            }
            if (stateBit == (MSAAStateConstants.STATE_SYSTEM_FOCUSABLE |
                MSAAStateConstants.STATE_SYSTEM_UNAVAILABLE))
            {
                GetStateText(MSAAStateConstants.STATE_SYSTEM_FOCUSABLE,
                    focusableStateText, (uint)focusableStateText.Capacity);
                GetStateText(MSAAStateConstants.STATE_SYSTEM_UNAVAILABLE,
                    unavailableStateText, (uint)unavailableStateText.Capacity);

                return (focusableStateText + "," + unavailableStateText);
            }
            if (stateBit == (MSAAStateConstants.STATE_SYSTEM_HASPOPUP |
                MSAAStateConstants.STATE_SYSTEM_UNAVAILABLE))
            {
                GetStateText(MSAAStateConstants.STATE_SYSTEM_HASPOPUP,
                    hasPopupStateText, (uint)hasPopupStateText.Capacity);
                GetStateText(MSAAStateConstants.STATE_SYSTEM_UNAVAILABLE,
                    unavailableStateText, (uint)unavailableStateText.Capacity);

                return (hasPopupStateText + "," + unavailableStateText);
            }

            StringBuilder stateText = new StringBuilder(maxLength);
            GetStateText(stateBit, stateText, (uint)stateText.Capacity);
            return stateText.ToString();
        }

        /// <summary>
        /// Gets the accessible object from a window handle.
        /// </summary>
        /// <param name="hWnd">The window handle</param>
        /// <returns>The accessible object from the window handle</returns>
        public static IAccessible GetAccessibleObjectFromHandle(IntPtr hWnd)
        {
            IAccessible objToReturn = null;
            if (hWnd != IntPtr.Zero)
            {
                Guid iid = typeof(IAccessible).GUID;
                objToReturn = AccessibleObjectFromWindow(hWnd, 0,
                    ref iid) as IAccessible;
            }
            return objToReturn;
        }

        #endregion

        #region Accessibility function definitions
        // Retrieves the child ID or IDispatch of each child within an accessible container object.
        [DllImport("oleacc.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern int AccessibleChildren(
            IAccessible paccContainer,
            int iChildStart,
            int cChildren,
            [Out()] [MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 4)] 
            object[] rgvarChildren,
            ref int pcObtained);

        // Retrieves the address of the specified interface for the object associated with the specified window.
        [DllImport("oleacc.dll", PreserveSig = false, CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Interface)]
        public static extern object AccessibleObjectFromWindow(
             IntPtr hwnd, uint id, ref Guid iid);

        // Retrieves the localized string that describes the object's role for the specified role value.
        [DllImport("oleacc.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern uint GetRoleText(uint dwRole,
            [Out] StringBuilder lpszRole, uint cchRoleMax);

        // Retrieves a localized string that describes an object's state for a single predefined state bit flag. 
        // Because state values are a combination of one or more bit flags, clients call this function more than once 
        // to retrieve all state strings.
        [DllImport("oleacc.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern uint GetStateText(MSAAStateConstants dwStateBit,
            [Out] StringBuilder lpszStateBit, uint cchStateBitMax);

        #endregion

        [Flags]
        public enum MSAAStateConstants
        {
            STATE_SYSTEM_NORMAL = 0,
            STATE_SYSTEM_UNAVAILABLE = 1,
            STATE_SYSTEM_SELECTED = 2,
            STATE_SYSTEM_FOCUSED = 4,
            STATE_SYSTEM_PRESSED = 8,
            STATE_SYSTEM_CHECKED = 0x10,
            STATE_SYSTEM_MIXED = 0x20,
            STATE_SYSTEM_READONLY = 0x40,
            STATE_SYSTEM_HOTTRACKED = 0x80,
            STATE_SYSTEM_DEFAULT = 0x100,
            STATE_SYSTEM_EXPANDED = 0x200,
            STATE_SYSTEM_COLLAPSED = 0x400,
            STATE_SYSTEM_BUSY = 0x800,
            STATE_SYSTEM_FLOATING = 0x1000,
            STATE_SYSTEM_MARQUEED = 0x2000,
            STATE_SYSTEM_ANIMATED = 0x4000,
            STATE_SYSTEM_INVISIBLE = 0x8000,
            STATE_SYSTEM_OFFSCREEN = 0x10000,
            STATE_SYSTEM_SIZEABLE = 0x20000,
            STATE_SYSTEM_MOVEABLE = 0x40000,
            STATE_SYSTEM_SELFVOICING = 0x80000,
            STATE_SYSTEM_FOCUSABLE = 0x100000,
            STATE_SYSTEM_SELECTABLE = 0x200000,
            STATE_SYSTEM_LINKED = 0x400000,
            STATE_SYSTEM_TRAVERSED = 0x800000,
            STATE_SYSTEM_MULTISELECTABLE = 0x1000000,
            STATE_SYSTEM_EXTSELECTABLE = 0x2000000,
            STATE_SYSTEM_ALERT_LOW = 0x4000000,
            STATE_SYSTEM_ALERT_MEDIUM = 0x8000000,
            STATE_SYSTEM_ALERT_HIGH = 0x10000000,
            STATE_SYSTEM_HASPOPUP = 0x40000000,
            STATE_SYSTEM_VALID = 0x1FFFFFFF
        }

    }
}
