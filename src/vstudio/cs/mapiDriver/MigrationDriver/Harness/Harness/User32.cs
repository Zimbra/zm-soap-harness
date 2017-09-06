using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
using log4net;
using System.Threading;

namespace Harness
{
    /**
     * A class that wraps the external DLL User32 methods.  Wrap each method with trace logging 
     **/
    public class User32
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        #region Public interface methods

        public static IntPtr ZFindWindow(string lpClassName, string lpWindowName)
        {
            IntPtr value = FindWindow(lpClassName, lpWindowName);
            log.Debug("User32::FindWindow(" + lpClassName + ", " + lpWindowName + ") = " + value);
            return (value);
        }

        public static IntPtr ZFindWindowEx(IntPtr parent, IntPtr next, string sClassName, IntPtr sWindowTitle)
        {
            IntPtr value = FindWindowEx(parent, next, sClassName, sWindowTitle);
            log.Debug("User32::FindWindowEx(" + parent + ", " + next + ", " + sClassName + ", " + sWindowTitle + ") = " + value);
            return (value);
        }

        public static IntPtr ZFindWindowEx(IntPtr parent, IntPtr next, string sClassName, string sWindowTitle)
        {
            log.Debug("User32::FindWindowEx(" + parent + ", " + next + ", " + sClassName + ", " + sWindowTitle + ")");
            IntPtr value = FindWindowEx(parent, next, sClassName, sWindowTitle);
            log.Debug("User32::FindWindowEx = " + value);
            return (value);
        }


        private struct StructSendMessage
        {
            public IntPtr hWnd;
            public uint msg;
            public int wParam;
            public int lParam;
        }

        private static void StartSendMessage(object o)
        {
            StructSendMessage s = (StructSendMessage)o;

            log.Info("User32::SendMessage(" + s.hWnd + ", " + s.msg + ", " + s.wParam + ", " + s.lParam + ")");
            IntPtr value = SendMessage(s.hWnd, s.msg, s.wParam, s.lParam);
            log.Info("User32::SendMessage(" + s.hWnd + ", " + s.msg + ", " + s.wParam + ", " + s.lParam + ") = " + value);

        }

        private static List<Thread> clickThreads = new List<Thread>();

        public static void ZSendMessageSlow(IntPtr hWnd, uint msg, int wParam, int lParam)
        {
            System.Threading.Thread.Sleep(1000);
            ZSendMessage(hWnd, msg, wParam, lParam);
            System.Threading.Thread.Sleep(1000);
        }

        public static void ZSendMessage(IntPtr hWnd, uint msg, int wParam, int lParam)
        {
            log.Info("ZSendMessage() ... start");

            StructSendMessage s;
            s.hWnd = hWnd;
            s.msg = msg;
            s.wParam = wParam;
            s.lParam = lParam;

            ThreadPool.QueueUserWorkItem(new WaitCallback(StartSendMessage), s);

            log.Info("ZSendMessage() ... end");
        }

        public static IntPtr ZSendMessageSlow(IntPtr hWnd, uint msg, int wParam, string lParam)
        {
            System.Threading.Thread.Sleep(1000);
            IntPtr value = ZSendMessage(hWnd, msg, wParam, lParam);
            System.Threading.Thread.Sleep(1000);
            return (value);
        }

        public static IntPtr ZSendMessage(IntPtr hWnd, uint msg, int wParam, string lParam)
        {
            IntPtr value = SendMessage(hWnd, msg, wParam, lParam);
            log.Debug("User32::SendMessage(" + hWnd + ", " + msg + ", " + wParam + ", " + lParam + ") = " + value);
            return (value);
        }

        public static IntPtr ZSendMessage(HandleRef hWnd, uint msg, IntPtr wParam, string lParam)
        {
            IntPtr value = SendMessage(hWnd, msg, wParam, lParam);
            log.Debug("User32::SendMessage(" + hWnd + ", " + msg + ", " + wParam + ", " + lParam + ") = "+ value);
            return (value);
        }

        public static int ZGetWindowLong(IntPtr handle, int index)
        {
            int value = GetWindowLong(handle, index);
            log.Debug("User32::GetWindowLong(" + handle + ", " + index + ") = " + value);
            return (value);
        }

        public static string ZGetWindowText(IntPtr hWnd)
        {
            const int size = 512;
            StringBuilder sb = new StringBuilder(size);
            int value = GetWindowText(hWnd, sb, size);
            string found = sb.ToString();
            log.Debug("User32::GetWindowText(" + hWnd + ") = " + found + " (" + value + ")");
            return (found);
        }

        public static string ZGetClassName(IntPtr hWnd)
        {
            const int size = 512;
            StringBuilder sb = new StringBuilder(size);
            int value = GetClassName(hWnd, sb, size);
            string found = sb.ToString();
            log.Debug("User32::GetClassName(" + hWnd + ") = " + found + " (" + value + ")");
            return (found);
        }

        public static IntPtr ZGetForegroundWindow()
        {
            IntPtr handle = GetForegroundWindow();
            log.Debug("User32::GetForegroundWindow() = " + handle); ;
            return (handle);
        }

        public static IntPtr ZGetParent(IntPtr hWnd)
        {
            IntPtr handle = GetParent(hWnd);
            log.Debug("User32::GetParent() = " + handle); ;
            return (handle);
        }

        #endregion



        #region  Native function definitions


        private delegate bool EnumThreadProc(IntPtr hwnd, IntPtr lParam);
        private delegate bool EnumChildProc(IntPtr hwnd, IntPtr lParam);

        //BOOL GetForegroundWindow(
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr GetForegroundWindow();

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

        [DllImport("User32.dll")]
        public static extern IntPtr SendDlgItemMessage(IntPtr hWnd, int IDDlgItem, int uMsg, int nMaxCount, StringBuilder lpString);

        // used for an output LPCTSTR parameter on a method call

        //[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        //private struct STRINGBUFFER
        //{
        //    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
        //    public string szText;
        //}

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public Int32 left;
            public Int32 top;
            public Int32 right;
            public Int32 bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct WINDOWINFO
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

            // Allows automatic initialization of "cbSize" with "new WINDOWINFO(null/true/false)".
            public WINDOWINFO(Boolean? filler)
                : this()
            {
                cbSize = (UInt32)(Marshal.SizeOf(typeof(WINDOWINFO)));
            }
        }

        public static String DebugWINDOWINFO(WINDOWINFO info)
        {
            StringBuilder sb = new StringBuilder();

            sb.Append(info.cbSize).Append(", ");
            sb.Append(info.dwStyle).Append(", ");
            sb.Append(info.dwExStyle).Append(", ");
            sb.Append(info.dwWindowStatus).Append(", ");
            sb.Append(info.cxWindowBorders).Append(", ");
            sb.Append(info.cyWindowBorders).Append(", ");
            sb.Append(info.atomWindowType).Append(", ");
            sb.Append(info.wCreatorVersion).Append(", ");

            return (sb.ToString());
        }


        //BOOL GetWindowInfo(
        //    HWND hwnd,
        //    PWINDOWINFO pwi
        //);
        [DllImport("user32.dll", SetLastError = true)]
        public static extern Boolean GetWindowInfo(IntPtr hwnd, ref WINDOWINFO pwi);

        //int GetWindowText(
        //    HWND hWnd,
        //    LPTSTR lpString,
        //    int nMaxCount
        //);
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder ClassName, int nMaxCount);

        //int GetWindowText(
        //    HWND hWnd,
        //    LPTSTR lpString,
        //    int nMaxCount
        //);
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

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

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = false)]
        public static extern IntPtr SendMessage(HandleRef hWnd, uint Msg, IntPtr wParam, string lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = false)]
        static extern int SendMessage(IntPtr hWnd, uint Msg, int wParam, StringBuilder lParam); 

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

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr next, string sClassName, string sWindowTitle);

        [DllImport("user32.dll")]
        static extern IntPtr GetDlgItem(IntPtr hDlg, int nIDDlgItem);


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


        public enum GetWindowLongIndexs
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

        [DllImport("User32.dll")]
        public static extern IntPtr GetParent(IntPtr hWnd);

        #endregion

    }
}
