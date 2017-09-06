using System;
using System.Collections.Generic;
using System.Text;
using Harness;
using System.Threading;
using log4net;
using System.Runtime.InteropServices;
using System.Data;



namespace ExchangeDataTests
{
    public class WelcomePageWindow : AbstractWindow
    {
        #region Singleton

        private static WelcomePageWindow window = new WelcomePageWindow();

        private WelcomePageWindow()
            : base("ZCS Migration Wizard for Exchange", "This wizard will guide you through the process", Button.Next)
        {
        }

        public static WelcomePageWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class DestinationFormWindow : AbstractWindow
    {
        protected String AdminName = GlobalProperties.getProperty("admin.user");
        protected String AdminPassword = GlobalProperties.getProperty("admin.password");
        protected String AdminPort = GlobalProperties.getProperty("admin.port");
        protected String ServerName = GlobalProperties.getProperty("zimbraServer.name");
        protected String ServerMode = GlobalProperties.getProperty("soapservice.mode");

        public String adminname
        {
            set { AdminName = value; }
        }

        public String adminpassword
        {
            set { AdminPassword = value; }
        }

        public String adminport
        {
            set { AdminPort = value; }
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
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);

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
                            log.Debug("Set the mode to " + this.ServerMode);
                        }
                    }
                    // Set the Username field using its ControlID
                    else if (ctrlId == 1002)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.AdminName);
                        log.Debug("Set the username field to " + this.AdminName);
                    }
                    // Set the Password field using its ControlID
                    else if (ctrlId == 1003)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.AdminPassword);
                        log.Debug("Set the password field to " + this.AdminPassword);
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
            : base("ZCS Migration Wizard for Exchange", "Enter the hostname and port of the admin service on the Zimbra server.", Button.Next)
        {
        }

        public static DestinationFormWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class InvalidCertificateWindow : AbstractWindow
    {
        #region Singleton

        private static InvalidCertificateWindow window = new InvalidCertificateWindow();

        private InvalidCertificateWindow()
            : base("Invalid Certificate", null, Button.Yes)
        {
        }

        public static InvalidCertificateWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class SelectDomainWindow : AbstractWindow
    {
        protected String targetDomainName;

        public String TargetDomainName
        {
            set { targetDomainName = value; }
        }

        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the Destination Domain window");

            // Get the child window/field of the 'Destination Domain' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the controlID of the fields and set text
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
                    // Set the target domain
                    if (ctrlId == 1038)
                    {   
                        User32.ZSendMessage(hChild, (uint)WindowUtils.DialogBoxMessages.CB_SHOWDROPDOWN, 1, 0);
                        User32.ZSendMessage(hChild, (uint)WindowUtils.DialogBoxMessages.CB_SELECTSTRING, -1, this.targetDomainName);
                        Thread.Sleep(1000);
                        log.Debug("Set the pst path field to " + this.targetDomainName);
                    }

                }
            } while (!hChild.Equals(IntPtr.Zero));

            // Click Next
            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static SelectDomainWindow window = new SelectDomainWindow();

        private SelectDomainWindow()
            : base("ZCS Migration Wizard for Exchange", "Destination Domain", Button.Next)
        {
        }

        public static SelectDomainWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class MAPIProfileWindow : AbstractWindow
    {
        protected String ProfileName;

        public String profileName
        {
            set { ProfileName = value; }
        }

        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the MAPIProfile Window");

            // Get the child window/field of the 'MAPIProfile' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the controlID of the fields and set text
                    // Set the profile name
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
                    // Set the PST Path using its control id
                    if (ctrlId == 1021)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.ProfileName);
                        log.Debug("Set the pst path field to " + this.ProfileName);
                    }

                }
            } while (!hChild.Equals(IntPtr.Zero));

            // Click Next
            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static MAPIProfileWindow window = new MAPIProfileWindow();

        private MAPIProfileWindow()
            : base("ZCS Migration Wizard for Exchange", "Select the MAPI Profile", Button.Next)
        {
        }

        public static MAPIProfileWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class SourceMailboxWindow : AbstractWindow
    {
        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the Source and Destination mailbox Window");

            // Get the child window/field of the 'MAPIProfile' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the controlID of the fields and set text
                    // Click the object picker button.
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
                    // Set the PST Path using its control id
                    if (ctrlId == 1026)
                    {
                    User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.BM_CLICK, 0, 0);
                    Thread.Sleep(1000);
                    if (SelectUsersWindow.instance.exists() && !SelectUsersWindow.instance.HasBeenProcessed)
                    {
                        string targetAccountName = "pshelke@exchange.lab";
                        SelectUsersWindow.instance.targetAccountName = targetAccountName;
                        SelectUsersWindow.instance.process();
                    }

                    log.Debug("Clicked the object picker. ");
                    }
                }
            } while (!hChild.Equals(IntPtr.Zero));

            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static SourceMailboxWindow window = new SourceMailboxWindow();

        private SourceMailboxWindow()
            : base("ZCS Migration Wizard for Exchange", "Use the Object Picker or Query Builder to identify which users to migrate to Zimbra.", Button.Next)
        {
        }

        public static SourceMailboxWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class SelectUsersWindow : AbstractWindow
    {
        protected String TargetAccountName;

        public String targetAccountName
        {
            set { TargetAccountName = value; }
        }

        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the Select users, computers, or Groups window");

            // Get the child window/field of the 'MAPIProfile' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindow(null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the controlID of the fields and set text
                    // Click the object picker button.
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);

                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
                    // Set the PST Path using its control id
                    if (ctrlId == 214)
                    {
                        User32.ZSendMessageSlow(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 0, this.TargetAccountName);
                        log.Debug("Set the target account name.");
                    }
                }
            } while (!hChild.Equals(IntPtr.Zero));

            this.button(Button.OkNoShortcut);

            this.isProcessed = true;

        }

        #region Singleton

        private static SelectUsersWindow window = new SelectUsersWindow();

        private SelectUsersWindow()
            : base("Select Users, Computers, or Groups", "Select this object type:", Button.OkNoShortcut)
        {
        }

        public static SelectUsersWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class TargetVerificationWindow : AbstractWindow
    {
        #region Singleton

        private static TargetVerificationWindow window = new TargetVerificationWindow();

        private TargetVerificationWindow()
            : base("ZCS Migration Wizard for Exchange", "Verifying Accounts: ", Button.Next)
        {
        }

        public static TargetVerificationWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class AccountProvisionWindow : AbstractWindow
    {

        public new void process()
        {
            log.Info(this.GetType() + ".process()");

            IntPtr hDestinationwnd = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (hDestinationwnd.Equals(IntPtr.Zero))
                throw new HarnessException("Unable to find the Destination Domain window");

            // Get the child window/field of the 'Destination Domain' window
            IntPtr hChild = IntPtr.Zero;
            hDestinationwnd = User32.ZFindWindowEx(hDestinationwnd, IntPtr.Zero, null, this.Title);
            do
            {
                hChild = User32.ZFindWindowEx(hDestinationwnd, hChild, null, IntPtr.Zero);
                if (!hChild.Equals(IntPtr.Zero))
                {
                    // Get the controlID of the fields and set text
                    int ctrlId = User32.ZGetWindowLong(hChild, (int)User32.GetWindowLongIndexs.GWL_ID);
                    log.Info(this.GetType() + ".process(): ctrlId = " + ctrlId);
                    // Set the target domain
                    if (ctrlId == 1042)
                    {
                        User32.ZSendMessage(hChild, (uint)WindowUtils.DialogBoxMessages.CB_SHOWDROPDOWN, 1, 0);
                        User32.ZSendMessage(hChild, (uint)WindowUtils.DialogBoxMessages.CB_SELECTSTRING, -1, "default");
                        Thread.Sleep(1000);
                        log.Debug("Set the COS to default.");
                    }

                    if (ctrlId == 1049)
                    {
                        User32.ZSendMessage(hChild, (uint)WindowUtils.DialogBoxMessages.WM_SETTEXT, 1, GlobalProperties.getProperty("defaultpassword.value"));
                        log.Debug("Set the COS to default.");
                    }

                }
            } while (!hChild.Equals(IntPtr.Zero));

            // Click Next
            this.button(Button.Next);

            this.isProcessed = true;

        }

        #region Singleton

        private static AccountProvisionWindow window = new AccountProvisionWindow();

        private AccountProvisionWindow()
            : base("ZCS Migration Wizard for Exchange", "Do not provision any users", Button.Next)
        {
        }

        public static AccountProvisionWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class ProvisionedAccountWindow : AbstractWindow
    {
        #region Singleton

        private static ProvisionedAccountWindow window = new ProvisionedAccountWindow();

        private ProvisionedAccountWindow()
            : base("ZCS Migration Wizard for Exchange", "Provisioning Accounts: ", Button.Next)
        {
        }

        public static ProvisionedAccountWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class ImportItemsWindow : AbstractWindow
    {

        #region Singleton

        private static ImportItemsWindow window = new ImportItemsWindow();

        private ImportItemsWindow()
            : base("ZCS Migration Wizard for Exchange", "Select Items", Button.Next)
        {
        }

        public static ImportItemsWindow instance
        {
            get { return window; }
        }

        #endregion

    }

    public class ImportOptionsWindow : AbstractWindow
    {

        #region Singleton

        private static ImportOptionsWindow window = new ImportOptionsWindow();

        private ImportOptionsWindow()
            : base("ZCS Migration Wizard for Exchange", "Folder Options", Button.Next)
        {
        }

        public static ImportOptionsWindow instance
        {
            get { return window; }
        }

        #endregion

    }

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
            : base("ZCS Migration Wizard for Outlook", "Overall Progress: ", Button.Next)
        {
        }

        public static ImportInProgress instance
        {
            get { return window; }
        }

        #endregion

    }

    public class ImportCompleteAlert : AbstractWindow
    {
        #region Singleton

        private static ImportCompleteAlert window = new ImportCompleteAlert();

        private ImportCompleteAlert()
            : base("Import Completed", "Import Completed", Button.OkNoShortcut)
        {
        }

        public static ImportCompleteAlert instance
        {
            get { return window; }
        }

        #endregion

    }

    public class ImportComplete : AbstractWindow
    {
        #region Singleton

        private static ImportComplete window = new ImportComplete();

        private ImportComplete()
            : base("ZCS Migration Wizard for Exchange", "All errors and warnings are displayed below", Button.Finish)
        {
        }

        public static ImportComplete instance
        {
            get { return window; }
        }

        #endregion

    }

    







}
