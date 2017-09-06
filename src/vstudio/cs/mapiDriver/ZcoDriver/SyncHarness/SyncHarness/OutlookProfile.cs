using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Office.Core;
using System.IO;
using System.Diagnostics;
using Outlook = Microsoft.Office.Interop.Outlook;
using System.Runtime.InteropServices;
using System.Net;
using System.Text.RegularExpressions;
using log4net;
using Microsoft.Win32;


namespace SyncHarness
{

    public class OutlookProfile
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        
        public static bool installSyncClientSoftware = false;
        public static string installedSyncClientSoftware = null;

        public OutlookProfile()
        {
        }

        public OutlookProfile(zAccount account)
        {
            _AccountZCO = account;
            int port = Int32.Parse(GlobalProperties.getProperty("soapservice.port", "80"));
            bool useSSL = GlobalProperties.getProperty("soapservice.mode", "http").Equals("https");

            string profile = GenerateProfile(account.emailAddress, account.password, account.zimbraMailHost, port, useSSL);
            _ProfileName = profile;

        }

        public string GenerateProfile(string email, string password, string server, int port, bool useSSL)
        {
            //[Modified on 06/28/2011] Initialize to the generic profile name format, z<time>c<counter> //[8/10/2011] "c" character is interoduced to differenciate date value ends and where counter value starts.
            string profilename = String.Format("z{0}c{1}", GlobalProperties.time(), GlobalProperties.counter()); 
            GenerateProfileZCO(profilename, email, password, server, port, useSSL);
            return (profilename);
        }

        const string Profile_KeyName = @"Software\Microsoft\Windows NT\CurrentVersion\Windows Messaging Subsystem\Profiles";

        //Set registry key to "prompt for a profile to be used". This method is introduced because sometimes the setting in Control Panel's 
        // Mail app gets reset to "Always use this profile" option. For automation to work, the "Prompt for profile" option should always be set.
        public static void SetProfileRegistry()
        {
            RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Exchange\Client\Options", true);

            key.SetValue("PickLogonProfile", 1);
            log.Info("PickLogonProfile registry is set to 'Prompt for a profile' option");
        }

        public static void CleanOldProfiles()
        {
            RegistryKey profiles = Registry.CurrentUser.OpenSubKey(Profile_KeyName);
            if (profiles == null)
                return; // No profiles have ever been created.  Just return
            int iter=0;
            foreach (string profile in profiles.GetSubKeyNames())
            {

                //[Modified on 06/28/2011] Zimbra profiles look like z<DATE>c<COUNTER>
                
                Regex r = new Regex(@"z(?<DATE>\d+)c(?<COUNT>\d+)");
                log.Info("iteration: " + ++iter);
                Match m = r.Match(profile);
                if (m.Success)
                {
                    
                    // Only delete profiles that are older than 2 days
                    Int64 createTime = Int64.Parse(m.Groups["DATE"].Value);
                    Int64 lastWeekTime = (Int64)((TimeSpan)(DateTime.UtcNow.AddDays(-2) - (new DateTime(1970, 1, 1)))).TotalSeconds;

                    if (createTime < lastWeekTime)
                    {
                        log.Info("CleanOldProfiles: cleaning " + profile);
                        CleanProfile(profile);
                        CleanProfileFiles(profile);
                    }

                }

            }
        }

        public string profileName
        {
            get { return _ProfileName; }
        }

        public zAccount account
        {
            get { return (_AccountZCO); }
        }

        // Profile name
        private string _ProfileName = "";

        // User settings
        private zAccount _AccountZCO = null;

        private OutlookProfile GenerateProfileZCO(string profileName, string email, string password, string server, int port, bool useSSL)
        {
            // Check that the required input is defined
            if ((email == null || email.Equals("")) ||
                    (password == null || password.Equals("")) ||
                    (server == null || server.Equals("")))
            {
                throw new HarnessException("GenerateProfileZCO - invalid attributes UserName " + email + " UserPassword " + password + " ZCO " + server);
            }

            // Run the CreateZimbraProfile.exe command line utility
            NativeHelper.CreateProfile(
                    profileName,
                    server,
                    port.ToString(),
                    (useSSL ? "1" : "0"),
                    email,
                    password);

            log.Info("Outlook Profile : "+profileName+" created");
            return (this);
        }

        private static void CleanProfile(string profileName)
        {
            log.InfoFormat(@"CleanProfile: Delete profile {0}\{1}", Profile_KeyName, profileName);
            try
            {
                RegistryKey profiles = Registry.CurrentUser.OpenSubKey(Profile_KeyName, true);
                profiles.DeleteSubKeyTree(profileName);
            }
            catch (Exception e)
            {
                log.ErrorFormat("Unable to delete profile key {0} {1}", Profile_KeyName, profileName, e);
            }

        }

        private static void CleanProfileFiles(string profileName)
        {
            log.Debug("CleanProfileFiles: " + profileName);

            string LocalApplicationData = Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData);
            string ApplicationData = Environment.GetFolderPath(System.Environment.SpecialFolder.ApplicationData);
            
            DirectoryInfo localAppDataDirectoryInfo = new DirectoryInfo(LocalApplicationData + @"\Microsoft\Outlook");
            if (!localAppDataDirectoryInfo.Exists)
            {
                log.Warn("CleanProfileFiles: " + localAppDataDirectoryInfo.FullName + " does not exist");
                return;
            }

            foreach (FileInfo fileInfo in localAppDataDirectoryInfo.GetFiles(String.Format("{0}*.*", profileName)))
            {
                log.Info("CleanProfileFiles: delete file " + fileInfo.FullName);
                fileInfo.Delete();
            }

            DirectoryInfo appDataDirectoryInfo = new DirectoryInfo(ApplicationData + @"\Microsoft\Outlook");
            if (!appDataDirectoryInfo.Exists)
            {
                log.Warn("CleanProfileFiles: " + appDataDirectoryInfo.FullName + " does not exist");
                return;
            }

            foreach (FileInfo fileInfo in appDataDirectoryInfo.GetFiles(String.Format("{0}*.*", profileName)))
            {
                log.Info("CleanProfileFiles: delete file " + fileInfo.FullName);
                fileInfo.Delete();
            }

        }

        public void LaunchDebugger()
        {
            System.Diagnostics.Debugger.Launch();
        }
    }
}
