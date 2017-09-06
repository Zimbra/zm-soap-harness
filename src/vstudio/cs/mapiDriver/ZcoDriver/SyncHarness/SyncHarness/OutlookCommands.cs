using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Office.Core;
using Microsoft.Office.Interop.Outlook;
using log4net;
using Microsoft.Win32;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Threading;
using System.Security.AccessControl;

namespace SyncHarness
{
    public class OutlookCommands
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        private static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        public void Exit()
        {
            ClickOnControl("E&xit");
        }

        public bool Sync()
        {
            return (Sync(Int32.Parse(GlobalProperties.getProperty("deltasyncdelay.sec"))/*, null*/));
        }

        /*
        public bool Sync(Redemption.RDOStore store)
        // This overload tells ZCO to sync, and then waits until the sync token changes on 'store'
        {
            return (Sync(Int32.Parse(GlobalProperties.getProperty("deltasyncdelay.sec")), store));
        }
         */

        public bool Sync(int maximumDelaySeconds/*, Redemption.RDOStore store*/)
        {
            ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

            tcLog.Info("Sync ...");

            // Enable syncing
            RegistryKey_SyncDisabled oldValue = SetSyncDisabledRegistry(RegistryKey_SyncDisabled.Enabled);

            try
            {

                // Is the initial sync still pending?
                if (OutlookRedemption.Instance.getInitialSyncValue() < 2)
                {
                    InitialSync(maximumDelaySeconds);
                }
                else
                {
                    DeltaSync(maximumDelaySeconds/*, store*/);
                }
            }
            finally
            {
                // Toggle the sync registry key back
                SetSyncDisabledRegistry(oldValue);
            }

            tcLog.Info("Sync ... done");

            // ZCO may have sent a message, invite, etc.
            // So, also check that the queue is empty
            int delay = Int32.Parse(GlobalProperties.getProperty("postfixdelay.msec"));
            string defaultServer = GlobalProperties.getProperty("zimbraServer.name");
            MailInject.waitForPostfixQueue(delay / 1000, defaultServer);

            // Synced
            return (true);
        }

        public bool SyncGAL()
        {
            return (SyncGAL(Int32.Parse(GlobalProperties.getProperty("deltasyncdelay.sec"))));
        }

        public bool SyncGAL(int maximumDelaySeconds)
        {
            ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

            tcLog.Info("Sync GAL ...");

            bool synced = false;

            // Enable syncing
            RegistryKey_SyncDisabled oldValue = SetSyncDisabledRegistry(RegistryKey_SyncDisabled.Enabled);

            try
            {

                // Press the Update Global Address List button
                UpdateGlobalAddressList();

                // Wait for a second to let the GAL sync start
                System.Threading.Thread.Sleep(5000);

                // Wait for the bit to change
                while (maximumDelaySeconds > 0)
                {
                    if (OutlookRedemption.Instance.isGalSyncInProgress() == false)
                    {
                        log.Debug("SyncGAL: sync completed");
                        synced = true;
                        break; // while(maximumDelaySeconds ...
                    }

                    log.Debug("DeltaSync - sleeping for " + maximumDelaySeconds + " more seconds ...");
                    System.Threading.Thread.Sleep(1000);
                    maximumDelaySeconds--;
                }
            }
            finally
            {
                // Toggle the sync registry key back
                SetSyncDisabledRegistry(oldValue);
            }


            zAssert.IsTrue(synced, "Verify that the GAL synced");


            tcLog.Info("Sync GAL ... done");


            // Synced
            return (true);
        }

        public bool SetWorkOffline(bool workOffline)
        {

            tcLog.Info("SetWorkOffline ...");

            // Localization - Must convert Wor&k Offline (US/EN) to the current localization value
            string caption = outlookCaptions["Wor&k Offline"];

            CommandBarControl commandBarControl = findCommandBarControlFromCaption(MsoControlType.msoControlButton, caption);
            if (commandBarControl == null)
            {
                throw new HarnessException("Unable to find " + caption + " button");
            }

            // TODO:  Can it be detected if work offline is alreay checked?

            tcLog.Info("Click on " + commandBarControl.Caption + ", " + commandBarControl.Id);
            commandBarControl.Execute();


            tcLog.Info("SetWorkOffline ... done");

            // Synced
            return (true);
        }


        #region Private methods


        private const string SyncDisabled_KeyName = "HKEY_LOCAL_MACHINE\\SOFTWARE\\ZIMBRA";
        private const string Calendar_KeyName = "HKEY_CURRENT_USER\\Software\\Microsoft\\Office\\11.0\\Outlook\\Options\\Calendar";
        private const string SyncDisabled_ValueName = "syncDisabled";
        private enum RegistryKey_SyncDisabled
        {
            Enabled = 0,
            Disabled = 1,
            KeyDoesNotExist = -1
        };

        private static RegistryKey_SyncDisabled SetSyncDisabledRegistry(RegistryKey_SyncDisabled newValue)
        {
            object oldValue = Registry.GetValue(
                 SyncDisabled_KeyName,
                 SyncDisabled_ValueName,
                 RegistryKey_SyncDisabled.KeyDoesNotExist);

            if (newValue == RegistryKey_SyncDisabled.KeyDoesNotExist)
            {
                // set to enabled by default
                newValue = RegistryKey_SyncDisabled.Enabled;
            }

            Registry.SetValue(
                    SyncDisabled_KeyName,
                    SyncDisabled_ValueName,
                    newValue,
                    RegistryValueKind.DWord);

            log.DebugFormat(@"{0}\{1} was {2}", SyncDisabled_KeyName, SyncDisabled_ValueName, (RegistryKey_SyncDisabled)oldValue);
            log.DebugFormat(@"{0}\{1} is  {2}", SyncDisabled_KeyName, SyncDisabled_ValueName, newValue);

            return (oldValue == null ? RegistryKey_SyncDisabled.Enabled : (RegistryKey_SyncDisabled)oldValue);
        }

        private const string DownloadMode_valueName = "DownloadMode";
        private enum RegistryKey_DownloadMode
        {
            Enabled = 1,
            Disabled = 0,
            KeyDoesNotExist = -1
        };

        public bool DownloadHeadersOnly(bool newValue)
        {
            object oldValue = Registry.GetValue(
                SyncDisabled_KeyName,
                DownloadMode_valueName,
                RegistryKey_DownloadMode.KeyDoesNotExist);

            if (newValue == false)
            {
                Registry.SetValue(
                        SyncDisabled_KeyName,
                        DownloadMode_valueName,
                        RegistryKey_DownloadMode.Disabled,
                        RegistryValueKind.DWord);
            }
            if (newValue == true)
            {
                Registry.SetValue(
                    SyncDisabled_KeyName,
                    DownloadMode_valueName,
                    RegistryKey_DownloadMode.Enabled,
                    RegistryValueKind.DWord);
            }

            log.DebugFormat(@"{0}\{1} was {2}", SyncDisabled_KeyName, DownloadMode_valueName, (RegistryKey_DownloadMode)oldValue);
            log.DebugFormat(@"{0}\{1} is  {2}", SyncDisabled_KeyName, DownloadMode_valueName, newValue);
            return(true);

        }

        private const string DisableMeetingReg_valueName = "DisableMeetingRegeneration";
        private enum RegistryKey_DisableMeetingRegeneration 
        {
            Enabled = 1,
            Disabled = 0,
            KeyDoesNotExist = -1
        };

        public object DisableMeetingRegeneration ()
        {
            object oldValue = Registry.GetValue(
                Calendar_KeyName,
                DisableMeetingReg_valueName,
                RegistryKey_DownloadMode.KeyDoesNotExist);

            log.DebugFormat(@"{0}\{1} was {2}", Calendar_KeyName, DisableMeetingReg_valueName, (RegistryKey_DisableMeetingRegeneration)oldValue);
            return(oldValue);

        }

        private bool InitialSync(int maximumDelaySeconds)
        {
            log.Debug("InitialSync ...");

            int syncValue = OutlookRedemption.Instance.getInitialSyncValue();


            // Check if we are already initial synced
            if (syncValue >= 2)
            {
                tcLog.Info("InitialSync: Mailbox was already initial Synced");
                zAssert.Greater(syncValue, 1, "Verify the mailbox was already initial synced");
                return (true);
            }

            // Not yet synced.  Initial sync now

            // Press the send/receive button
            ClickOnControl("Send/Receive &All");

            for (int i = 0; i < maximumDelaySeconds; i++)
            {

                log.Debug("InitialSync - sleeping for " + maximumDelaySeconds + " more seconds ...");
                System.Threading.Thread.Sleep(1000);

                syncValue = OutlookRedemption.Instance.getInitialSyncValue();
                if (syncValue >= 2)
                {
                    tcLog.Info("InitialSync: Mailbox was initial Synced");
                    zAssert.Greater(syncValue, 1, "Verify the mailbox was already initial synced");
                    return (true);
                }
 
            }

            throw new HarnessException("Initial Sync never completed");

        }

        /*
        private bool WaitForDeltaSyncInactive(int maximumDelaySeconds)
        {
            for (int i = 0; i < maximumDelaySeconds; i++)
            {
                bool syncValue = OutlookRedemption.Instance.getDeltaSyncValue();
                if (syncValue == false)
                {
                    tcLog.Info("WaitForSyncDeltaSyncInactive: sync now inactive");
                    zAssert.IsFalse(syncValue, "Verify that deltasync now inactive");
                    System.Threading.Thread.Sleep(100);
                    return (true);
                }

                tcLog.Info("WaitForSyncDeltaSyncInactive: sync already in progress...try again in 1 sec");
                System.Threading.Thread.Sleep(1000);

                log.Debug("WaitForSyncDeltaSyncInactive - will timeout in " + (maximumDelaySeconds - i) + " seconds ...");
            }

            throw new HarnessException("WaitForSyncDeltaSyncInactive timed out");
        }
         */


        private void WaitForDeltaSyncInactive(int maximumDelaySeconds)
        {
            try
            {
                // See http://msdn.microsoft.com/en-us/library/z4c9z2kt.aspx#Y1250
                EventWaitHandle ewh = EventWaitHandle.OpenExisting("ZimbraHarness_SyncCompleteEvent",  // ZCO signals this when sync completes
                                                                   EventWaitHandleRights.Synchronize);

                bool bSignalled = ewh.WaitOne(maximumDelaySeconds * 1000);
                if (!bSignalled)
                    throw new HarnessException("WaitForSyncDeltaSyncInactive timed out");
            }
            catch (WaitHandleCannotBeOpenedException)
            {
                throw new HarnessException("Failed to open ZimbraHarness_SyncCompleteEvent. ZCO too old?");
            }
        }


        private bool DeltaSync(int maximumDelaySeconds/*, Redemption.RDOStore store*/)
        {
            /*
             * Tells ZCO to sync ALL stores, by simulating click on F9
             * 
             */

            log.Debug("DeltaSync ...");

            Debug.Write("\n\n\n\n");
            Debug.Write("******************************************************\n");
            Debug.Write("*********DOING A SYNC*********************************\n");
            Debug.Write("******************************************************\n");

            log.Info("******************************************************");
            log.Info("Syncing all stores...");
            log.Info("******************************************************");

            // Dont attempt sync while one already in progress since F9 is noop in that case
            // Wait for SyncCompleteEvent to be signalled
            log.Info("...Waiting for sync idle...");
            Debug.Write("...Waiting for sync idle...\n");
            WaitForDeltaSyncInactive(maximumDelaySeconds);

            // Press the send/receive button (F9)
            log.Info("...Clicking F9...");
            Debug.Write("...Clicking F9...\n");
            ClickOnControl("Send/Receive &All");


            // Wait for SyncStartedEvent. This means ZCO has received the sync request
            log.Info("...Waiting for sync start...");
            Debug.Write("...Waiting for sync start...\n");
            WaitForDeltaSyncActive(maximumDelaySeconds);


            // Wait for SyncCompleteEvent to be signalled. This means the sync has finished
            log.Info("...Waiting for sync complete...");
            Debug.Write("...Waiting for sync complete...\n");
            WaitForDeltaSyncInactive(maximumDelaySeconds);

            log.Info("******************************************************");
            log.Info("Syncing all stores COMPLETE");
            log.Info("******************************************************");



            Debug.Write("******************************************************\n");
            Debug.Write("*********DONE*****************************************\n");
            Debug.Write("******************************************************\n");
            Debug.Write("\n\n\n\n");


            return (true);
        }

        private void UpdateGlobalAddressList()
        {
            // Localization - Must convert Update &Global Address List (US/EN) to the current localization value
            //string caption = outlookCaptions["Update &Global Address List"];

            if (!(OutlookProcess.Instance.OutlookProcessPath == "C:\\Program Files\\Microsoft Office\\Office14\\OUTLOOK.EXE" || OutlookProcess.Instance.OutlookProcessPath == "C:\\Program Files (x86)\\Microsoft Office\\Office14\\OUTLOOK.EXE"))
            {
                CommandBarControl commandBarControl = findCommandBarControlFromCaption(MsoControlType.msoControlButton, "Update &Global Address List");
                if (commandBarControl == null)
                {
                    throw new HarnessException("Unable to find " + "Update &Global Address List" + " button");
                }

                log.Info("Click on " + commandBarControl.Caption + ", " + commandBarControl.Id);
                commandBarControl.Execute();
            }
            else
            {
                IntPtr windowHandle = NativeWIN32.GetWindowHandle("rctrl_renwnd32", "Inbox - Zimbra - " + zAccount.AccountZCO.emailAddress + " - Microsoft Outlook");
                
                IAccessible ribbon = MSAAHelper.GetAccessibleObjectByNameAndRole(
                MSAAHelper.GetAccessibleObjectFromHandle(windowHandle), new Regex("Ribbon"), "property page", true);

                IAccessible ZimbraTab = MSAAHelper.GetAccessibleObjectByNameAndRole(ribbon, new Regex("Zimbra"), "page tab", true);
                log.Info("Click on Zimbra tab in Outlook 2010");
                ZimbraTab.accDoDefaultAction(0);

                IAccessible ZimbraPage = MSAAHelper.GetAccessibleObjectByNameAndRole(ribbon, new Regex("Zimbra"), "property page", true);

                IAccessible SyncGlobalAddressListDropdown = MSAAHelper.GetAccessibleObjectByNameAndRole(ZimbraPage, new Regex("Sync Global"), "drop down button", true);
                log.Info("Click on Sync Global Address List dropdown button in Outlook 2010");
                SyncGlobalAddressListDropdown.accDoDefaultAction(0);

                IAccessible UpdateGAL = MSAAHelper.GetAccessibleObjectByNameAndRole(SyncGlobalAddressListDropdown, new Regex("Update Global"), "menu item", true);
                log.Info("Click on Update Global Address List menu item in Outlook 2010");
                UpdateGAL.accDoDefaultAction(0);
            }
        }


        private void ClickOnControl(string buttonText_en)
        {
            // Localization - Must convert Send/Receive &All (US/EN) to the current localization value
            string caption = outlookCaptions[buttonText_en];

            CommandBarControl commandBarControl = findCommandBarControlFromCaption(MsoControlType.msoControlButton, caption);
            if (commandBarControl == null)
            {
                throw new HarnessException("Unabe to find " + caption + " button");
            }

            log.Info("Click on " + commandBarControl.Caption + ", " + commandBarControl.Id);
            commandBarControl.Execute();
        }

        private CommandBarControl findCommandBarControlFromCaption(MsoControlType type, string caption)
        {
            foreach (Explorer explorer in OutlookConnection.Instance.application.Explorers)
            {
                log.Debug("Searching " + explorer.Caption + " explorer for controls ...");

                CommandBars commandBars = explorer.CommandBars;

                // Find all button controls
                CommandBarControls commandBarControls = commandBars.FindControls(type, null, null, null);

                foreach (CommandBarControl i in commandBarControls)
                {
                    if (i.Caption.Equals(caption))
                    {
                        log.Debug("Found CommandBarControl: " + i.Caption + ", " + i.Id);
                        return (i);
                    }
                }

            }

            // For debugging
            PrintAllButtons();

            return (null);
        }

        private void PrintAllButtons()
        {
            foreach (Explorer explorer in OutlookConnection.Instance.application.Explorers)
            {
                log.Info("PrintAllButtons: Explorer: " + explorer.Caption);
                CommandBars commandBars = explorer.CommandBars;
                CommandBarControls commandBarControls = commandBars.FindControls(MsoControlType.msoControlButton, null, null, null);
                // For debugging, print out all command bar information
                foreach (CommandBarControl i in commandBarControls)
                {
                    log.Info("PrintAllButtons: CommandBarControl: " + i.Caption + ", " + i.Id);
                }
            }
        }


        private void WaitForDeltaSyncActive(int maximumDelaySeconds)
        {

            try
            {
                // See http://msdn.microsoft.com/en-us/library/z4c9z2kt.aspx#Y1250
                EventWaitHandle ewh = EventWaitHandle.OpenExisting("ZimbraHarness_SyncStartedEvent", // ZCO signals this when sync started
                                                                   EventWaitHandleRights.Synchronize
                    /*| EventWaitHandleRights.Modify*/);

                bool bSignalled = ewh.WaitOne(maximumDelaySeconds * 1000);
                if (!bSignalled)
                    throw new HarnessException("WaitForDeltaSyncActive timed out");
            }
            catch (WaitHandleCannotBeOpenedException)
            {
                throw new HarnessException("Failed to open ZimbraHarness_SyncStartedEvent. ZCO too old?");
            }
        }


        /*
        private bool WaitForDeltaSyncComplete(int maximumDelaySeconds)
        {

            try
            {
                EventWaitHandle ewh = EventWaitHandle.OpenExisting("ZimbraHarness_SyncStartedEvent");

                bool bSignalled = ewh.WaitOne(maximumDelaySeconds * 1000);
                //ewh.Reset();
                if (!bSignalled)
                    throw new HarnessException("WaitForDeltaSyncActive timed out");
            }
            catch (WaitHandleCannotBeOpenedException)
            {
                throw new HarnessException("ZCO too old");
            }
            return (false);
            //throw new HarnessException("WaitForSyncDeltaSyncInactive timed out");

        }

         private bool ResetCompleted()
        {
            try
            {
                EventWaitHandle ewh = EventWaitHandle.OpenExisting("ZimbraHarness_SyncCompletedEvent", EventWaitHandleRights.Modify);
                //ewh.Reset();
            }
            catch (WaitHandleCannotBeOpenedException)
            {
                throw new HarnessException("ZCO too old");
            }

            return (false);
        }
         
      


        private bool WaitForStoreSyncTokenChange(Redemption.RDOStore store, int maximumDelaySeconds, string currSyncToken)
        {
            for (int i = 0; i < maximumDelaySeconds; i++)
            {
                string syncToken = OutlookRedemption.Instance.getSyncTokenValueForStore(store);
                if (syncToken != currSyncToken)
                {
                    tcLog.Info("WaitForStoreSyncTokenChange: sync now complete");
                    return (true);
                }

                tcLog.Info("WaitForStoreSyncTokenChange: sync token not yet changed...try again in 1 sec");
                System.Threading.Thread.Sleep(1000);

                log.Debug("WaitForSyncWaitForStoreSyncTokenChangeTokenChange - will timeout in " + (maximumDelaySeconds - i) + " seconds ...");
            }

            throw new HarnessException("WaitForStoreSyncTokenChange timed out");

        }*/
         


        // A table of Outlook L10N, such as file menu buttons, etc.
        private Dictionary<string, string> outlookCaptions = new Dictionary<string, string>();


        #endregion


        #region Singleton

        private static OutlookCommands instance;

        private static readonly Object mutex = new Object();

        private OutlookCommands()
        {
            string language = GlobalProperties.getProperty("SyncClientLanguage", "");

            switch (language)
            {
                case "":
                case "en":

                    // Buttons
                    outlookCaptions["Wor&k Offline"] = "Wor&k Offline";
                    outlookCaptions["Send/Receive &All"] = "Send/Receive &All";
                    outlookCaptions["E&xit"] = "E&xit";

                    // system folders
                    outlookCaptions["Junk E-mail"] = "Junk E-mail";
                    outlookCaptions["Sent Items"] = "Sent Items";
                    outlookCaptions["Deleted Items"] = "Deleted Items";

                    // ... add more buttons as necessary
                    break;

                case "de":

                    // Buttons
                    outlookCaptions["Wor&k Offline"] = "Off&line arbeiten"; // 5613
                    outlookCaptions["Send/Receive &All"] = "&Alle senden/empfangen"; // 7095
                    outlookCaptions["E&xit"] = "&Beenden"; // 1891

                    // system folders
                    outlookCaptions["Junk E-mail"] = "Not Implemented by MS";  // There is no Junk email folder in German OLK
                    outlookCaptions["Sent Items"] = "Gesendet Objekte";
                    outlookCaptions["Deleted Items"] = "Gelöschte Objekte";

                    // ... add more buttons as necessary
                    break;

                case "fr":

                    // Buttons
                    outlookCaptions["Wor&k Offline"] = "Tra&vailler en mode hors connexion"; // 5613
                    outlookCaptions["Send/Receive &All"] = "Envoyer/Recevoir &tout"; // 7095
                    outlookCaptions["E&xit"] = "&Quitter"; // 1891

                    // system folders
                    outlookCaptions["Junk E-mail"] = "Not Implemented by MS";  // There is no Junk email folder in German OLK
                    outlookCaptions["Sent Items"] = "Boîte d'envoi";
                    outlookCaptions["Deleted Items"] = "Éléments supprimés";

                    // ... add more buttons as necessary
                    break;

            }

        }

        public static OutlookCommands Instance
        {
            get
            {
               lock(mutex)
                   return (instance == null ? (instance = new OutlookCommands()) : instance);
            }
        }

        #endregion



    }
}
