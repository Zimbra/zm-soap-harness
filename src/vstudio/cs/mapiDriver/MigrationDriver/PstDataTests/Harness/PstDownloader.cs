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
using Harness;
using Ionic.Zip;


namespace PstDataTests
{
    public class PstDownloader
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        public static string PstExeFileName = "";

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



        public string GetExeFile(ReleaseId version)
        {

            string InstallerDownloadedPath = null;      // The local file
            UriBuilder myUriBuilder = null;

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
                    webResponse = webRequest.GetResponse();
                }
                catch (WebException e)
                {
                    throw new HarnessException("Unable to get index.html from " + myUriBuilder.Uri, e);
                }

                Stream receiveStream = webResponse.GetResponseStream();
                StreamReader streamReader = new StreamReader(receiveStream, System.Text.Encoding.GetEncoding("utf-8"));
                log.Info("pst exe file path: " + webRequest.RequestUri);
                string line;
                
                while ((line = streamReader.ReadLine()) != null)
                {
                    log.Info(line);
                    if (line.Contains("ZCSPSTImportWizard"))
                    {

                        Regex r = new Regex(
                            "href\\s*=\\s*(?:\"(?<1>[^\"]*)\"|(?<1>\\S+))",
                            RegexOptions.IgnoreCase | RegexOptions.Compiled);

                        Match m = r.Match(line);

                        if (m.Success)
                        {
                           
                           if (line.Contains(".zip"))
                           {
                               // Value contains the "downloads" portion ... i.e. "/downloads/ZCSPSTImportWizard-7.1.1.82.zip"
                               log.Info("EXE executable partial uri" + m.Groups[1].Value);

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
                            throw new HarnessException("DownloadServerPstExe could not find ZCSPSTImportWizard in " + myUriBuilder.Uri + " " + line);
                        }


                     
                        break;

                    }
                }

                #endregion


            }
            else
            {

                throw new HarnessException("Cannot download specific PST installer version, PST exe will be downloaded from server");

            }

            #region Check if the file already exists on the local drive

            InstallerDownloadedPath = Path.GetFullPath(InstallerDownloadedPath);
            if (File.Exists(InstallerDownloadedPath))
            {
                // If the ZIP file has already been downloaded, just return it - don't download it again
                log.Info(InstallerDownloadedPath + " is already downloaded, hence it is not being downloaded.");
                PstExeFileName = InstallerDownloadedPath.Replace("zip", "exe");
                if (File.Exists(PstExeFileName))
                {
                    log.Info(PstExeFileName + " is already extracted hence not extracting it.");
                }
                else
                {
                    PstExeFileName = DecompressPstZip(InstallerDownloadedPath);
                }
                return (InstallerDownloadedPath);
            }
            else
            {
                DownloadZipFile(InstallerDownloadedPath, myUriBuilder);
                PstExeFileName = DecompressPstZip(InstallerDownloadedPath);
            }

            #endregion
            return (InstallerDownloadedPath);
            
        }

        
        private string DownloadZipFile(string InstallerDownloadedPath, UriBuilder myUriBuilder)
        {

            # region Download the PST Exe to the ZimbraQA folder
            try
            {
                // Make sure the base directory exists
                if (!Directory.Exists(Path.GetDirectoryName(InstallerDownloadedPath)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(InstallerDownloadedPath));
                }

                log.Info("Download " + myUriBuilder.Uri);
                log.Info("Downloaded at " + InstallerDownloadedPath);
                // Create a web client and download the file
                WebClient msiClient = new WebClient();
                msiClient.DownloadFile(myUriBuilder.Uri, InstallerDownloadedPath);

            }
            catch (Exception e)
            {
                throw new HarnessException("DownloadServerPstExe tried to download " + myUriBuilder.Uri + " to " + InstallerDownloadedPath, e);
            }

            # endregion
            return (InstallerDownloadedPath);
        }

        private string DecompressPstZip(string InstallerDownloadedPath)
        {
            # region Unzip the downloaded zip file
            string pstExecutable;
            string runPstFile = "";
            ZipFile pstZip = new ZipFile(InstallerDownloadedPath);
            pstZip.ExtractAll(Path.GetDirectoryName(InstallerDownloadedPath));
            foreach ( ZipEntry entry in pstZip.EntriesSorted )
            {
                if (entry.FileName.Contains("ZCSPSTImportWizard"))
                {
                    pstExecutable = entry.FileName;
                    log.Info("The executable pst file name is: " + pstExecutable);
                    runPstFile = Path.GetDirectoryName(InstallerDownloadedPath) + "\\" + pstExecutable;
                    
                }
            }
            
            #endregion
            log.Info("The executable PST path is: " + runPstFile);
            return (runPstFile);
            

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


        public static void CleanOldInstallerFiles()
        {

            string path = UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\downloads";
            DirectoryInfo directoryInfo = new DirectoryInfo(path);

            if (!directoryInfo.Exists)
                return;

            string[] extensions = { "*.zip", "*.exe", "config.xml" };
            foreach (string extension in extensions)
            {
                foreach (FileInfo fileInfo in directoryInfo.GetFiles(extension))
                {
                    try
                    {
                            log.Debug("Delete old exe, zip, config.xml file: " + fileInfo.Name);
                            fileInfo.Delete();
                    }
                    catch (Exception e)
                    {
                        // Catch exceptions and continue to the next file
                        log.Warn("Unable to delete file " + fileInfo.Name, e);
                    }
                }
            }
        }

    }

    
}
