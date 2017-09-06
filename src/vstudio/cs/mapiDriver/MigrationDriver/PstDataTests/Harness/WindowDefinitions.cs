using System;
using System.Collections.Generic;
using System.Text;
using Harness;
using System.Threading;
using log4net;
using System.Runtime.InteropServices;

namespace PstDataTests
{


    /**
     * Welcome Page:  https://wiki.eng.vmware.com/File:ZimbraQAPSTScreen1.JPG
     **/
    public class WelcomePageWindow : AbstractWindow
    {
        #region Singleton

        private static WelcomePageWindow window = new WelcomePageWindow();

        private WelcomePageWindow()
            : base("ZCS Import Wizard for Outlook", "This wizard will guide you through the process", Button.Next)
        {
        }

        public static WelcomePageWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen2.JPG
     **/
    public class DestinationFormWindow : AbstractWindow
    {
        protected String AccountName;
        protected String AccountPassword = GlobalProperties.getProperty("defaultpassword.value");
        protected String ServerName = GlobalProperties.getProperty("zimbraServer.name");
        protected String ServerMode = GlobalProperties.getProperty("soapservice.mode");

        public String accountname
        {
            set { AccountName = value; }
        }

        public String accountpassword
        {
            set { AccountPassword = value; }
        }

        public String servername
        {
            set { ServerName = value; }
        }

        public String servermode
        {
            set { ServerMode = value; }
        }

        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the DestinationForm window");

            // Get the child window/field of the 'Destination' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {

                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the controlID of the fields and set text
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    log.Info(this.GetType() + ".process(): ctrlId = "+ ctrlId);

                    // Set the HostName field using its ControlID
                    if (ctrlId == 1010)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.ServerName);
                        log.Debug("Set the hostname to " + this.ServerName);
                    }
                    else if (ctrlId == 1046)
                    {
                        if (this.ServerMode == "https")
                        {
                            User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.BM_CLICK, 0, 0);
                            log.Debug("Set the mode to "+ this.ServerMode);
                        }
                    }
                    // Set the Username field using its ControlID
                    else if (ctrlId == 1002)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.AccountName);
                        log.Debug("Set the username field to " + this.AccountName);
                    }
                    // Set the Password field using its ControlID
                    else if (ctrlId == 1003)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.AccountPassword);
                        log.Debug("Set the password field to " + this.AccountPassword);
                    }

                }
            } while (!hChild.Equals(IntPtr.Zero));

            // Click Next
            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static DestinationFormWindow window = new DestinationFormWindow();

        private DestinationFormWindow()
            : base("ZCS Import Wizard for Outlook", "Enter the hostname and port of the Zimbra server.", Button.Next)
        {
        }

        public static DestinationFormWindow instance
        {
            get { return window; }
        }

        #endregion

    }


    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen3.JPG
     **/
    public class BrowsePstWindow : AbstractWindow
    {
        protected String PstFileName;

        public String pstfilename
        {
            set { PstFileName = value; }
        }

        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the BrowsePst window");

            // Get the child window/field of the 'Browse PST' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the controlID of the fields and set text
                    // Get the control ID of PST file field
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
                    // Set the PST Path using its control id
                    if (ctrlId == 1049)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.PstFileName);
                        log.Debug("Set the pst path field to " + this.PstFileName);
                    }

                }
            } while (!hChild.Equals(IntPtr.Zero));

            // Click Next
            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static BrowsePstWindow window = new BrowsePstWindow();

        private BrowsePstWindow()
            : base("ZCS Import Wizard for Outlook", "PST Filename", Button.Next)
        {
        }

        public static BrowsePstWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen5.JPG
     **/
    public class ImportItemsWindow : AbstractWindow
    {
        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the Import Items window");

            // Get the child window/field of the 'Browse PST' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the control ID and uncheck the 'Old orgnaizer address'
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
                   
                    if (ctrlId == 1064)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.BM_CLICK, 0, 0);
                        log.Debug("Unchecked the Old organizer address checkbox");
                    }

                }
            } while (!hChild.Equals(IntPtr.Zero));

            // Click Next
            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static ImportItemsWindow window = new ImportItemsWindow();

        private ImportItemsWindow()
            : base("ZCS Import Wizard for Outlook", "Select Items", Button.Next)
        {
        }

        public static ImportItemsWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen6.JPG
     **/
    public class ImportOptionsWindow : AbstractWindow
    {
        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the Import Items window");

            // Get the child window/field of the 'Browse PST' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the control ID and check the 'Log messages on failure' checkbox'
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
          
                    if (ctrlId == 1064)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.BM_CLICK, 0, 0);
                        log.Debug("Checked the Log messages on failure checkbox");
                    }

                }
            } while (!hChild.Equals(IntPtr.Zero));

            // Click Next
            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static ImportOptionsWindow window = new ImportOptionsWindow();

        private ImportOptionsWindow()
            : base("ZCS Import Wizard for Outlook", "Folder Options", Button.Next)
        {
        }

        public static ImportOptionsWindow instance
        {
            get { return window; }
        }

        #endregion

    }


    /**
   * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen7.JPG
   **/
    public class BeginImportWindow : AbstractWindow
    {

        #region Singleton

        private static BeginImportWindow window = new BeginImportWindow();

        private BeginImportWindow()
            : base("Begin Import Process?", "Click OK to begin importing or Cancel to review import options.", Button.OkNoShortcut)
        {
        }

        public static BeginImportWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
    * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen8.JPG
    **/
    public class ImportInProgress : AbstractWindow
    {
        public new void process()
        {
            log.Info("ImportInProgress: waiting ...");
            Thread.Sleep(1000);
        }

        #region Singleton

        private static ImportInProgress window = new ImportInProgress();

        private ImportInProgress()
            : base("ZCS Import Wizard for Outlook", "Importing data from PST to Zimbra.", Button.Ok)
        {
        }

        public static ImportInProgress instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
    * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen9.JPG
    **/
    public class ImportCompleteAlert : AbstractWindow
    {
        #region Singleton

        private static ImportCompleteAlert window = new ImportCompleteAlert();

        private ImportCompleteAlert()
            : base("Import Complete", "PST Import Complete", Button.OkNoShortcut)
        {
        }

        public static ImportCompleteAlert instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
    * https://wiki.eng.vmware.com/File:ZimbraQAPstScreen10.JPG
    **/
    public class ImportComplete : AbstractWindow
    {
        #region Singleton

        private static ImportComplete window = new ImportComplete();

        private ImportComplete()
            : base("ZCS Import Wizard for Outlook", "All errors and warnings are displayed below", Button.Finish)
        {
        }

        public static ImportComplete instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreenOther7.JPG
     **/
    public class OpenFileSecurityWarningWindow : AbstractWindow
    {

        #region Singleton

        private static OpenFileSecurityWarningWindow window = new OpenFileSecurityWarningWindow();

        private OpenFileSecurityWarningWindow()
            : base("Open File - Security Warning", null, Button.Run)
        {
        }

        public static OpenFileSecurityWarningWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreenOther6.JPG
     **/
    public class DefaultMailClientWarningWindow : AbstractWindow
    {

        #region Singleton

        private static DefaultMailClientWarningWindow window = new DefaultMailClientWarningWindow();

        private DefaultMailClientWarningWindow()
            : base("Microsoft Office Outlook", null, Button.OkNoShortcut)
        {
        }

        public static DefaultMailClientWarningWindow instance
        {
            get { return window; }
        }

        #endregion

    }


    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreenOther8.JPG
     **/
    public class RuntimeErrorWindow : AbstractWindow
    {

        #region Singleton

        private static RuntimeErrorWindow window = new RuntimeErrorWindow();

        private RuntimeErrorWindow()
            : base("Runtime Error", null, Button.OkNoShortcut)
        {
        }

        public static RuntimeErrorWindow instance
        {
            get { return window; }
        }

        #endregion

    }


    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreenOther3.JPG
     **/
    public class ErrorsOrWarnings : AbstractWindow
    {
        #region Singleton

        private static ErrorsOrWarnings window = new ErrorsOrWarnings();

        private ErrorsOrWarnings()
            : base("Errors or Warnings", "PST Import had Errors or Warnings", Button.OkNoShortcut)
        {
        }

        public static ErrorsOrWarnings instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreenOther4.JPG
     **/
    public class ErrorRunningInAnotherProcess : AbstractWindow
    {
        #region Singleton

        private static ErrorRunningInAnotherProcess window = new ErrorRunningInAnotherProcess();

        private ErrorRunningInAnotherProcess()
            : base("Error", "ZCS Import Wizard for Outlook is running in another process", Button.OkNoShortcut)
        {
        }

        public static ErrorRunningInAnotherProcess instance
        {
            get { return window; }
        }

        #endregion

    }

    /**
     * https://wiki.eng.vmware.com/File:ZimbraQAPstScreenOther4.JPG
     **/
    public class ImportInProgressPopup : AbstractWindow
    {
        #region Singleton

        private static ImportInProgressPopup window = new ImportInProgressPopup();

        private ImportInProgressPopup()
            : base("Import In Progress", "Import In Progress, Cancel Import?", Button.OkNoShortcut)
        {
        }

        public static ImportInProgressPopup instance
        {
            get { return window; }
        }

        #endregion

    }

    public class ExchangeAddressFoundPopup : AbstractWindow
    {
        #region Singleton

        private static ExchangeAddressFoundPopup window = new ExchangeAddressFoundPopup();

        private ExchangeAddressFoundPopup()
            : base("Exchange Specific Addresses Found", "", Button.CancelNoShortcut)
        {
        }

        public static ExchangeAddressFoundPopup instance
        {
            get { return window; }
        }

        #endregion

    }


 
}
