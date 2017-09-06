using System;
using System.Collections.Generic;
using System.Text;
using log4net;

namespace Harness
{
    public class WindowUtils
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public enum DialogBoxMessages // http://senapi.blogspot.com/2007/11/all-windows-messages-c-enum.html
        {
            WM_SETTEXT = 0x000c,
            BM_CLICK = 0x00F5,
            WM_SYSCOMMAND = 0x0112,
            WM_GETTEXT = 0x000D,
            CB_SHOWDROPDOWN = 0x014F,
            CB_SELECTSTRING = 0x014D
        };

        public enum TitleComparison
        {
            //Regex,
            //ContainsIgnoreCase,
            Contains,
            //EqualsIgnoreCase,
            Equals
        };

        // A debug method to spit out all relevant information for a window
        public static void TraceHandle(IntPtr handle)
        {
            // Only debug if Info level is enabled
            if (!log.IsInfoEnabled)
            {
                return;
            }

            // Make sure the handle is valid
            if (handle == IntPtr.Zero)
            {
                return;
            }


            IntPtr hNext = IntPtr.Zero;
            do
            {

                hNext = User32.ZFindWindowEx(handle, hNext, null, IntPtr.Zero);

                if (!hNext.Equals(IntPtr.Zero))
                {
                    string title = User32.ZGetWindowText(hNext);
                    string clazz = User32.ZGetClassName(hNext);
                    log.Info("DebugHandle: " + handle + " " + hNext + " (" + clazz + ") " + title);

                    // Recursive
                    TraceHandle(hNext);
                }

            } while (!hNext.Equals(IntPtr.Zero));

        }

        public static List<IntPtr> FindWindowChildren(IntPtr hParent, string childTitle, TitleComparison comparison)
        {
            List<IntPtr> list = new List<IntPtr>();

            IntPtr hNext = IntPtr.Zero;
            do
            {

                hNext = User32.ZFindWindowEx(hParent, hNext, null, IntPtr.Zero);
                if (!hNext.Equals(IntPtr.Zero))
                {

                    string title = User32.ZGetWindowText(hNext);

                    if (title.Length != 0)
                    {

                        switch (comparison)
                        {
                            case TitleComparison.Contains:
                                if (title.ToLower().Contains(childTitle.ToLower()))
                                {
                                    log.Debug("FindWindowChildren: Looking for " + childTitle + " found " + title);
                                    list.Add(hNext);
                                }
                                break;

                            case TitleComparison.Equals:
                                if (title.ToLower().Equals(childTitle.ToLower()))
                                {
                                    log.Debug("FindWindowChildren: Looking for " + childTitle + " found " + title);
                                    list.Add(hNext);
                                }
                                break;
                        }
                    }

                }

            } while (!hNext.Equals(IntPtr.Zero));

            return (list);

        }

        public static List<IntPtr> FindWindowHandles(string lpClassName, string windowTitle, TitleComparison comparison)
        {
            List<IntPtr> list = new List<IntPtr>();

            IntPtr hParent = IntPtr.Zero;
            IntPtr hNext = IntPtr.Zero;

            do
            {

                hNext = User32.ZFindWindowEx(hParent, hNext, lpClassName, IntPtr.Zero);

                if (!hNext.Equals(IntPtr.Zero))
                {

                    string title = User32.ZGetWindowText(hNext);

                    if (title.Length != 0)
                    {

                        switch (comparison)
                        {
                            case TitleComparison.Contains:
                                if (title.ToLower().Contains(windowTitle.ToLower()))
                                {
                                    log.Debug("FindWindowHandles: Looking for " + windowTitle + " found " + title);
                                    list.Add(hNext);
                                }
                                break;

                            case TitleComparison.Equals:
                                if (title.ToLower().Equals(windowTitle.ToLower()))
                                {
                                    log.Debug("FindWindowHandles: Looking for " + windowTitle + " found " + title);
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

        /**
         * Find a child handle inside this parent handle
         * @param hParent The parent handle
         * @param childContent The content of the child handle to match
         * @param lpClassName The class of the child.  null=any, #32770=Title, Static=Text, SysTabControl32, msctls_updown32, Button
         **/
        public static IntPtr FindChildHandle(IntPtr hParent, String childContent, String lpClassName)
        {
            if (hParent == IntPtr.Zero)
            {
                throw new HarnessException("hParent cannot be null");
            }

            if (childContent == null || childContent.Trim().Length == 0)
            {
                throw new HarnessException("childContent cannot be null or blank");
            }

            IntPtr hNext = IntPtr.Zero;
            do
            {

                hNext = User32.ZFindWindowEx(hParent, hNext, lpClassName, IntPtr.Zero);

                if (!hNext.Equals(IntPtr.Zero))
                {
                    string title = User32.ZGetWindowText(hNext);
                    if (title.Trim().Length == 0)
                        continue;

                    if (title.ToLower().Contains(childContent.ToLower()))
                    {
                        // Found it
                        return (hNext);
                    }

                    // Recursive
                    IntPtr recursive = FindChildHandle(hNext, childContent, null);
                    if (recursive != IntPtr.Zero)
                    {
                        // The recursive search found it
                        return (recursive);
                    }
                }

            } while (!hNext.Equals(IntPtr.Zero));

            // Not found!
            return (IntPtr.Zero);

        }

        public static IntPtr FindWindowHandle(String windowTitle, String windowContent)
        {
            if ((windowTitle == null) || (windowTitle.Trim().Length == 0))
                throw new HarnessException("WindowTitle cannot be null or blank");

            List<IntPtr> list = new List<IntPtr>();
            IntPtr hNext = IntPtr.Zero;

            do
            {

                hNext = User32.ZFindWindowEx(IntPtr.Zero, hNext, null, IntPtr.Zero);

                if (!hNext.Equals(IntPtr.Zero))
                {

                    string title = User32.ZGetWindowText(hNext);
                    if (title.Trim().Length == 0)
                        continue;

                    if (title.ToLower().Contains(windowTitle.ToLower()))
                    {
                        log.Debug("FindWindowHandle: Looking for " + windowTitle + " found " + title);
                        list.Add(hNext);
                    }
                }

            }
            while (!hNext.Equals(IntPtr.Zero));

            if (list.Count < 1)
            {
                log.Debug("FindWindowHandle: Unable to find " + windowTitle);
                return (IntPtr.Zero);
            }

            if (list.Count > 1)
            {
                throw new HarnessException("Too many results for window with title " + windowTitle + " (" + list.Count + ")");
            }

            // Get the found handle
            IntPtr hParent = list[0];

            if ((windowContent == null) || (windowContent.Trim().Length == 0))
            {
                // No content specified, just return the handle
                return (hParent);
            }

            // Make sure the handle has the content
            IntPtr hChild = FindChildHandle(hParent, windowContent, null);
            if (hChild == IntPtr.Zero)
            {
                // Not found!
                return (IntPtr.Zero);
            }

            // Found the title and found the child
            return (hParent);
        }


    }
}
