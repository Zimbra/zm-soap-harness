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


namespace NewPSTDataTests
{
    public class PSTDownloader
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        public static string PstExeFileName = "";
        
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

        /**
         * Get the migration tool specified in migration.properties
         * */
        private String GetLocalMigrationTool()
        {

            // Determine if a value is set in migration.properties
            String path = GlobalProperties.getProperty("MigrationToolPath", null);

            // If a value was set, and the file exists, return it
            if ((path != null) && (path.Trim().Length != 0) && (File.Exists(path)))
            {
                return (path);
            }

            // No property value set.  Return null
            return (null);

        }

        private Uri GetDownloadURI(string User, string Pwd)
        {


            #region Determine the latest MSI installer from the server

            UriBuilder myUriBuilder = new UriBuilder();
            myUriBuilder.Host = GlobalProperties.getProperty("zimbraServer.name");
            myUriBuilder.Path = "downloads/index.html";
            myUriBuilder.Scheme = GlobalProperties.getProperty("soapservice.mode");

            // scrub the downloads page for PST tool
            WebRequest webRequest = null;
            WebResponse webResponse = null;
            try
            {
                webRequest = WebRequest.Create(myUriBuilder.Uri);
                webRequest.Credentials = new NetworkCredential(User, Pwd);
                webResponse = webRequest.GetResponse();
            }
            catch (WebException e)
            {
                throw new HarnessException("Unable to get index.html from " + myUriBuilder.Uri, e);
            }



            Stream receiveStream = webResponse.GetResponseStream();
            StreamReader streamReader = new StreamReader(receiveStream, System.Text.Encoding.GetEncoding("utf-8"));
            log.Info("Exchange exe file path: " + webRequest.RequestUri);
            string line;

            while ((line = streamReader.ReadLine()) != null)
            {
                log.Info(line);
                if (line.Contains("ZimbraMigration"))
                {

                    Regex r = new Regex(
                        "href\\s*=\\s*(?:\"(?<1>[^\"]*)\"|(?<1>\\S+))",
                        RegexOptions.IgnoreCase | RegexOptions.Compiled);

                    Match m = r.Match(line);

                    if (m.Success)
                    {

                        if (line.Contains(".zip"))
                        {
                            log.Info("EXE executable partial uri" + m.Groups[1].Value);

                            myUriBuilder.Path = m.Groups[1].Value;

                            return (myUriBuilder.Uri);

                        }
                        else
                        {
                            continue; //skip to go to next line to check for _x86 installer
                        }
                    }

                    if (!m.Success)
                    {
                        throw new HarnessException("Download PSTMigration: Could not find PSTMigrationWizard in " + myUriBuilder.Uri + " " + line);
                    }

                    break;

                }
            }

            #endregion

            throw new HarnessException("Download PSTMigration: Could not find PSTMigrationWizard!");

        }

        private String GetMigrationToolFromWeb()
        {
            //Create a temporary account to access index.html page and download migration tool
            ZAccount ac1 = new ZAccount();
            ac1.createAccount();

            string UserName = ac1.displayName;
            string Password = ac1.password;

            // Determine the URL to download from
            Uri uri = this.GetDownloadURI(UserName, Password);
            if (uri == null)
            {
                // No URI to download
                return (null);
            }

            // Determine the download destination
            String MigrationZipFilePath = Path.GetFullPath(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\downloads\" + Path.GetFileName(uri.LocalPath));
            String MigrationToolPath = Path.GetDirectoryName(MigrationZipFilePath) + @"\" + Path.GetFileNameWithoutExtension(MigrationZipFilePath) + @"\ZimbraMigrationConsole.exe";

            if (File.Exists(MigrationZipFilePath))
            {
                log.Info(MigrationZipFilePath + " is already downloaded, hence it is not being downloaded.");
            }
            else
            {
                DownloadZipFile(MigrationZipFilePath, uri, UserName, Password);
            }

            if (File.Exists(MigrationToolPath))
            {
                log.Info(MigrationToolPath + " already exists, hence it is not being expanded.");
            }
            else
            {
                DecompressMigrationZip(MigrationZipFilePath);
            }

            return (MigrationToolPath);

        }

        public void GetMigrationTool()
        {

            String filePath = null;

            filePath = this.GetLocalMigrationTool();
            if (filePath != null)
            {
                log.Info("GetMigrationTool: using " + filePath);
                //return (filePath);
                PstExeFileName = filePath;
                return;
            }

            //If path is not specified in migration.properties then, download it from index.html.
            filePath = this.GetMigrationToolFromWeb();
            if (filePath != null)
            {
                log.Info("GetMigrationTool: using " + filePath);
                //return (filePath);
                PstExeFileName = filePath;
                return;
            }

            // Get a specific version of the tool
            throw new HarnessException("TODO: Cannot download specific Migration tool version!!!");

        }

        private void DownloadZipFile(string MigrationZipFilePath, Uri uri, string UserName, string Password)
        {

            # region Download the ZimbraMigration Exe to the ZimbraQA folder
            try
            {
                // Make sure the base directory exists
                if (!Directory.Exists(Path.GetDirectoryName(MigrationZipFilePath)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(MigrationZipFilePath));
                }

                log.Info("Download " + uri);
                log.Info("Downloaded at " + MigrationZipFilePath);
                // Create a web client and download the file
                WebClient msiClient = new WebClient();
                msiClient.Credentials = new NetworkCredential(UserName, Password);
                msiClient.DownloadFile(uri, MigrationZipFilePath);

            }
            catch (Exception e)
            {
                throw new HarnessException("PSTDownloader tried to download " + uri + " to " + MigrationZipFilePath, e);
            }

            # endregion

        }

        private void DecompressMigrationZip(string MigrationZipFilePath)
        {
            # region Unzip the downloaded zip file

            String MigrationToolPath = Path.GetDirectoryName(MigrationZipFilePath) + "\\" + Path.GetFileNameWithoutExtension(MigrationZipFilePath);
            ZipFile migrationZip = new ZipFile(MigrationZipFilePath);

            // Need write code to handle when extracted files are already present. Right now, automation simply fails and comes out.
            migrationZip.ExtractAll(MigrationToolPath);
          
            #endregion
            log.Info("The Migration tool path is: " + MigrationToolPath);

        }

        private ReleaseId StringToID(string version)
        {
            switch (version)
            {
                case null: return ReleaseId.vLatest;
                case "4.5.11": return ReleaseId.v4_5_11;
                case "5.0.9": return ReleaseId.v5_0_09;
                case "5.0.10": return ReleaseId.v5_0_10;
                case "latest": return ReleaseId.vLatest;
            }

            throw new HarnessException("string to ReleaseId mapping does not exist for " + version);
        }

        public static void CleanOldInstallerFiles()
        {
            //Need to write this


            string path = UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\downloads";
            DirectoryInfo directoryInfo = new DirectoryInfo(path);

            if (!directoryInfo.Exists)
                return;

            string[] extensions = { "*.zip", "*.exe", "config.xml", "*.dll" };
            foreach (string extension in extensions)
            {
                foreach (FileInfo fileInfo in directoryInfo.GetFiles(extension))
                {
                    try
                    {
                        log.Debug("Delete old exe, zip, config.xml and dll file: " + fileInfo.Name);
                        fileInfo.Delete();
                        //If zip file has been extracted to a folder, delete it also.
                        if (Directory.Exists(fileInfo.FullName))
                        {
                            Directory.Delete(fileInfo.FullName);
                        }

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