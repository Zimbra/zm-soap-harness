using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
using log4net;
using System.Diagnostics;

namespace Harness
{
    public class NativeWIN32
    {

        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        private static ILog logger = LogManager.GetLogger(TestCaseLog.tcLogName);

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
                if (list.Count > 0)
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

            ZAssert.Greater(handles.Count, 0, "Verify ProcessDialogBoxByCommand finds at least one handle - use WindowExists first to confirm existence");

            foreach (IntPtr handle in handles)
            {
                NativeWIN32.SendMessageZimbra(handle, WM_SYSCOMMAND, (int)command, (int)IntPtr.Zero);
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
            ZAssert.IsTrue(WindowExists(windowTitle, DefaultWindowWaitTime, comparison), "Verify that the dialog box exists");

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

            ZAssert.Greater(handles.Count, 0, "Verify ProcessDialogBoxByButtonLabel finds at least one handle - use WindowExists first to confirm existence");

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

                        if (label.Length == 0)
                            continue;       // skip any buttons without labels

                        log.Debug("ProcessDialogBoxByButtonLabel: label " + sb.ToString() + " (" + buttonLabel + ")");

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
            ZAssert.AreEqual(1, list.Count, "Too many Zimbra Authentication dialog boxes are available!  There should be exactly 1.");

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


            ZAssert.IsFalse(hOkButton.Equals(IntPtr.Zero), "Verify the OK button was found");

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

}
