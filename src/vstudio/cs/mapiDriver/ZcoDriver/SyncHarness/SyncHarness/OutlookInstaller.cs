using System;
using System.Collections.Generic;
using System.Text;
using System.Collections;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using log4net;
using System.Diagnostics;
using System.Collections.Specialized;
using Microsoft.Win32;

namespace SyncHarness
{
    public class OutlookInstallerZCO : OutlookInstallerInterface
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        static private Hashtable releaseIdToUri = null;

        public enum ReleaseId
        {
            v4_5_00,
            // TODO: Add remaining builds
            v4_5_09,
            v4_5_10,
            v4_5_10_1,
            v4_5_11,
            v5_0_00_BETA1,
            v5_0_00_BETA2,
            // v5_0_00_BETA3,      // No NETWORK release for BETA3
            v5_0_00_RC1,
            v5_0_00_RC2,
            v5_0_00,
            v5_0_01,
            v5_0_02,
            v5_0_03,
            // v5_0_04,            // 5.0.4 is equivalent to 5.0.3
            v5_0_05,
            v5_0_06,
            v5_0_07,
            v5_0_08,
            v5_0_09,
            v5_0_10,
            vLatest
        };

        public OutlookInstallerZCO()
        {

            #region Build the release ID to URI table
            
            releaseIdToUri = new Hashtable();

            releaseIdToUri.Add(ReleaseId.v4_5_00, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANK/20070115190001_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-4.5.0_GA_611_4.5.115.msi"));
            // ...
            releaseIdToUri.Add(ReleaseId.v4_5_09, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANK/20071016174855_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-4.5.9_GA_1451_4.5.402.msi"));
            //releaseIdToUri.Add(ReleaseId.v4_5_09, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANK/20071016174855_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-4.5.9_GA_1451_4.5.402.msi"));
            releaseIdToUri.Add(ReleaseId.v4_5_10, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANK/20071116204438_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-4.5.10_GA_1571_4.5.436.msi"));
            releaseIdToUri.Add(ReleaseId.v4_5_10_1, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANK/20071129172131_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-4.5.10_GA_1613_4.5.449.msi"));
            releaseIdToUri.Add(ReleaseId.v4_5_11, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANK/20080128122801_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-4.5.11_GA_1749_4.5.505.msi"));

            releaseIdToUri.Add(ReleaseId.v5_0_00_BETA1, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN_D1/20070531085405_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.0_BETA1_850_5.0.179.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_00_BETA2, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/D2/20070704123108_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.0_BETA2_1078_5.0.224.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_00_RC1, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN_D4/20070922190101_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.0_RC1_1518_5.0.1319.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_00_RC2, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN_D5/20071120114006_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.0_RC2_1678_5.0.2360.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_00, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN/20071218171304_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.0_GA_1862_5.0.2428.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_01, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN/20080109161512_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.1_GA_1900_5.0.2450.1.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_02, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN/20080130202656_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.2_GA_1967_5.0.2465.1.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_03, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN/20080317183002_NETWORK-20080318/ZimbraBuild/i386/ZimbraOlkConnector-5.0.3_GA_2101_5.0.2533.3.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_05, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN/20080417091659_NETWORK-20080522/ZimbraBuild/i386/ZimbraOlkConnector-5.0.5_GA_2199_5.0.2580.5.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_06, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN-506/20080522091324_NETWORK-20080609/ZimbraBuild/i386/ZimbraOlkConnector-5.0.6_GA_2299_5.0.2615.6.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_07, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN-507/20080806193058_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.7_GA_2450_5.0.2661.7.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_08, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN-508/20080805205908_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.8_GA_2458_5.0.2662.8.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_09, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN-509/20080814053001_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.9_GA_2500_5.0.2706.9.msi"));
            releaseIdToUri.Add(ReleaseId.v5_0_10, new Uri("http://build.lab.zimbra.com:8000/links/RHEL4/FRANKLIN-5010/20081003013002_NETWORK/ZimbraBuild/i386/ZimbraOlkConnector-5.0.10_GA_2638_5.0.2767.10.msi"));

            #endregion


            #region Determine if ZCO is currently installed

            GetZcoInstallRegistryKey();

            #endregion

        }

        private RegistryKey GetZcoInstallRegistryKey()
        {

            RegistryKey uninstallKey = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
            foreach (string keyName in uninstallKey.GetSubKeyNames())
            {
                RegistryKey packageKey = uninstallKey.OpenSubKey(keyName);
                ArrayList valueNames = new ArrayList(packageKey.GetValueNames());
                if ( valueNames.Contains("DisplayName") )
                {
                    if (packageKey.GetValue("DisplayName", "").Equals("VMware Zimbra Connector for Microsoft Outlook"))
                    {
                        // Found ZCO
                        if ( valueNames.Contains("DisplayVersion"))
                        {
                            log.Info("ZCO is already installed.  Version is "+ packageKey.GetValue("DisplayVersion", "Unknown"));
                        }
                        return (packageKey);
                    }
                }
            }
            return (null);
        }

        public void disableWaitsetRegistry()
        {
            RegistryKey zimbraKey = Registry.CurrentUser.OpenSubKey(@"Software\Zimbra", true);

            //Bug#75633: Add Dword key named SyncOnChangeEnabled and set value to 0 - this would disable waitset (ZCO will not sync automatically on changes)
            zimbraKey.SetValue("SyncOnChangeEnabled", 0, RegistryValueKind.DWord);
            log.Info("Disabled waitset feature in ZCO");
        }

        private string GetMsiFile(ReleaseId version)
        {

            string InstallerDownloadedPath = null;      // The local file
            UriBuilder myUriBuilder = null;

            //Create a temporary account To access just index.html page and download installer.
            zAccount ac1 = new zAccount();
            ac1.createAccount();

            string UserName = ac1.displayName;// "admin";
            string Password = ac1.password;// "test123";
            // if version == null, download the latest from the server
            // if version is specified, download the version from the ZCS build server
            // (version should be specified as "4.5.11", "5.0.9", etc.
            //

            if (version == ReleaseId.vLatest)
            {

                #region Determine the latest MSI installer from the server

                myUriBuilder = new UriBuilder();
                myUriBuilder.Host = GlobalProperties.getProperty("zimbraServer.name");
                myUriBuilder.Path = "downloads/index.html";
                myUriBuilder.Scheme = GlobalProperties.getProperty("soapservice.mode");
                
                
                // scrub the downloads page for ZCO
                WebRequest webRequest = null;
                WebResponse webResponse = null;
                try
                {
                    
                    webRequest = WebRequest.Create(myUriBuilder.Uri);
                    //webRequest.PreAuthenticate = true;
                    webRequest.Credentials = new NetworkCredential(UserName, Password);
                   
                    webResponse = webRequest.GetResponse();
                }
                catch (WebException e)
                {
                    throw new HarnessException("Unable to get index.html from " + myUriBuilder.Uri, e);
                }

                Stream receiveStream = webResponse.GetResponseStream();
                StreamReader streamReader = new StreamReader(receiveStream, System.Text.Encoding.GetEncoding("utf-8"));
                log.Info("msi file path: " + webRequest.RequestUri);
                string line;
                
                while ((line = streamReader.ReadLine()) != null)
                {
                    log.Info(line);
                    if (line.Contains("ZimbraConnectorOLK"))
                    {

                        Regex r = new Regex(
                            "href\\s*=\\s*(?:\"(?<1>[^\"]*)\"|(?<1>\\S+))",
                            RegexOptions.IgnoreCase | RegexOptions.Compiled);

                        Match m = r.Match(line);

                        if (m.Success)
                        {
                           // Actual code should be:
                           // Find the version of outlook. If it is 2010, find if it is 32bit or 64bit
                            //  if it is 32bit, get 32bit version of the MSI installer.
                            // else if it  is 64bit, get 64bit MSI installer.
                            // following code is to find the outlook version. However, not sure whether it contains information about 32bit.
                            // As of now [9/15/2010] harness has not run with OLK2010. so not sure what the following code returns.
                            // string olkVersion = OutlookConnection.Instance.application.Version;
                            // for now, code will always select 32bit installer.

                           if (line.Contains("_x86.msi"))
                           {
                               // Value contains the "downloads" portion ... i.e. "/downloads/ZimbraOlkConnector-5.0.10_GA_2544_5.0.2734.10.msi"
                               // 
                               log.Info("MSI installer uri" + m.Groups[1].Value);

                               myUriBuilder.Path = m.Groups[1].Value;

                               InstallerDownloadedPath = Path.GetFullPath(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA" + m.Groups[1].Value);

                           }
                           else
                           {
                               continue; //skip to go to next line to check for _x86 installer
                           }
                        }

                        if (!m.Success)
                        {
                            throw new HarnessException("DownloadServerZcoMsi could not find ZimbraOutlookConnector in " + myUriBuilder.Uri + " " + line);
                        }


                     
                        break;

                    }
                }

                #endregion


            }
            else
            {

                #region Determine the archived MSI from the specified version

                // TODO: Handle clientVersion
                // For example, if clientVersion="5.0.2", get version 5.0.2 from the build server and install that
                //

                if (!releaseIdToUri.ContainsKey(version))
                {
                    throw new Exception("URL not defined for version "+ version);

                }

                // Set the URI build to the Zimbra Build server URL
                myUriBuilder = new UriBuilder(releaseIdToUri[version] as Uri);

                // Set the download location to just the filename part
                string[] parts = myUriBuilder.Uri.LocalPath.Split("/".ToCharArray());
                InstallerDownloadedPath = Path.GetFullPath(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\downloads\" + parts[parts.Length - 1]);

                #endregion

            }

            #region Check if the file already exists on the local drive

            InstallerDownloadedPath = Path.GetFullPath(InstallerDownloadedPath);
            if (File.Exists(InstallerDownloadedPath))
            {
                // If the MSI file has already been downloaded, just return it - don't download it again
                log.Info(InstallerDownloadedPath + " is already downloaded, hence it is not being downloaded.");
                return (InstallerDownloadedPath);
            }

            #endregion


            # region Download the MSI to the ZimbraQA folder
            try
            {
                // Make sure the base directory exists
                if (!Directory.Exists(Path.GetDirectoryName(InstallerDownloadedPath)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(InstallerDownloadedPath));
                }

                log.Info("Download " + myUriBuilder.Uri);
                // Create a web client and download the file
                WebClient msiClient = new WebClient();
                msiClient.Credentials = new NetworkCredential(UserName, Password);
                msiClient.DownloadFile(myUriBuilder.Uri, InstallerDownloadedPath);

            }
            catch (Exception e)
            {
                throw new HarnessException("DownloadServerZcoMsi tried to download " + myUriBuilder.Uri + " to " + InstallerDownloadedPath, e);
            }

            # endregion

            return (InstallerDownloadedPath);

        }

        private ReleaseId StringToID(string version)
        {
            switch (version)
            {
                case null: return ReleaseId.vLatest;
                case "4.5.11": return ReleaseId.v4_5_11;
                case "5.0.9" : return ReleaseId.v5_0_09;
                case "5.0.10": return ReleaseId.v5_0_10;
                case "latest": return ReleaseId.vLatest;
            }

            throw new HarnessException("string to ReleaseId mapping does not exist for "+ version);
        }


        public bool install(ReleaseId clientVersion)
        {
            log.Info(OutlookType + " install: " + clientVersion);

            // TODO: check if the version is already installed
            // if ( isInstalled() )
            // {
            // ...
            // }
            //

            // Determine the MSI file to install
            FileInfo msiInstallerFileInfo = new FileInfo(GetMsiFile(clientVersion));


            #region Run the MSI installer

            try
            {

                ProcessStartInfo startInfo = new ProcessStartInfo("msiexec.exe");
                startInfo.Arguments = " /quiet /i " + Path.GetFileName(msiInstallerFileInfo.FullName);
                startInfo.UseShellExecute = true;
                startInfo.WorkingDirectory = Path.GetDirectoryName(msiInstallerFileInfo.FullName);

                log.Info("InstallZCOSoftware: installing " + Path.GetFileName(msiInstallerFileInfo.FullName) + " from " + Path.GetDirectoryName(msiInstallerFileInfo.FullName));
                Process p = Process.Start(startInfo);
                p.WaitForExit(60000);
                log.Info("installed.  Version is " + installedVersion());

            }
            catch (Exception e)
            {
                throw new HarnessException("Unable to install ZCO using " + msiInstallerFileInfo.FullName, e);
            }

            #endregion

            return (true);
        }

        public static void CleanOldMsiInstallers()
        {

            string path = UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\downloads";
            DirectoryInfo directoryInfo = new DirectoryInfo(path);

            if (!directoryInfo.Exists)
                return;

            string[] extensions = { "*.msi", "*.exe" };
            foreach (string extension in extensions)
            {
                foreach (FileInfo fileInfo in directoryInfo.GetFiles(extension))
                {
                    try
                    {

                        TimeSpan age = DateTime.Now - fileInfo.CreationTime;
                        if (age.TotalDays > 7)
                        {
                            log.Debug("Delete old msi file: " + fileInfo.Name);
                            fileInfo.Delete();
                        }
                    }
                    catch (Exception e)
                    {
                        // Catch exceptions and continue to the next file
                        log.Warn("Unable to delete old msi file " + fileInfo.Name, e);
                    }
                }
            }
        }

        public static void CleanCoreFiles()
        {
            string TempPath = System.Environment.GetEnvironmentVariable("TEMP");

            DirectoryInfo zcoCoreDirectoryInfo = new DirectoryInfo(TempPath + @"\zco-cores");
            if (!zcoCoreDirectoryInfo.Exists)
            {
                log.Warn("CleanZCOCoreFiles: " + zcoCoreDirectoryInfo.FullName + " does not exist");
                return;
            }

            foreach (FileInfo fileInfo in zcoCoreDirectoryInfo.GetFiles())
            {
                TimeSpan age = DateTime.Now - fileInfo.CreationTime;
                if (age.TotalDays > 7)
                {
                    try
                    {
                        log.Info("CleanZCOCoreFiles: delete file which was more than 7 days old" + fileInfo.FullName);
                        fileInfo.Delete();
                     }
                    catch (Exception e)
                    {
                        // Catch exceptions and continue to the next file
                        log.Warn("Unable to delete ZCO core file " + fileInfo.Name, e);
                    }
                }
            }



        }

        #region OutlookInstallerInterface Members

        public static string OutlookType
        {
            get { return "outlookZCO"; }
        }

        public bool install()
        {
            log.Info(OutlookType + " install");
            return (install(null));
        }

        public bool install(string clientApp, string clientVersion)
        {
            log.Info(OutlookType + " install: " + clientApp + " " + clientVersion);
            if (!clientApp.Equals(OutlookType))
            {
                // TODO: need to implement other clients
                throw new HarnessException("clientApp cannot be: " + clientApp +" ... it must be: "+ OutlookType);
            }
            return (install(clientVersion));
        }

        public bool install(string clientVersion)
        {
            log.Info(OutlookType + " install: " + clientVersion);

            return (install(StringToID(clientVersion)));
        }

        public bool uninstall()
        {
            log.Info(OutlookType + " uninstall");

            RegistryKey installKey = GetZcoInstallRegistryKey();
            if (installKey == null)
            {
                log.Info("ZCO is not installed");
                return (true);
            }


            // ZCO is installed
            // Use the ProductCode to uninstall
            string[] parts = installKey.Name.Split(@"\".ToCharArray());
            string productCode = parts[parts.Length - 1];

            log.Info("ZCO is installed with product key " + productCode);

            #region Run the MSI installer with /x to uninstall

            try
            {

                ProcessStartInfo startInfo = new ProcessStartInfo("msiexec.exe");
                startInfo.Arguments = " /quiet /x " + productCode + " /l*v log.txt";
                startInfo.UseShellExecute = true;
                startInfo.WorkingDirectory = Path.GetDirectoryName(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\downloads\");

                log.Info("InstallZCOSoftware: uninstalling " + productCode + " from " + Path.GetDirectoryName(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\downloads\"));
                Process p = Process.Start(startInfo);
                p.WaitForExit(60000);
                log.Info("uninstalled.");

            }
            catch (Exception e)
            {
                log.Error("Unable to uninstall ZCO " + productCode, e);
                throw;
            }

            #endregion
            
            return (true);
        }

        public bool isInstalled()
        {
            return (GetZcoInstallRegistryKey() != null);
        }

        public string installedVersion()
        {
            RegistryKey installKey = GetZcoInstallRegistryKey();
            if (installKey == null)
            {
                return ("Not installed");
            }

            return ((string)installKey.GetValue("DisplayVersion", "Unknown"));
        }

        #endregion
    }

    public interface OutlookInstallerInterface
    {

        bool install();
        bool install(string version);
        bool install(string app, string version);

        bool uninstall();

        bool isInstalled();
        string installedVersion();
        void disableWaitsetRegistry();

    }

}
