using System;
using System.IO;
using System.Net;
using System.Text;
using System.Data;
using System.Reflection;
using System.Diagnostics;
using System.Collections;
using Microsoft.Office.Core;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Outlook = Microsoft.Office.Interop.Outlook;
using System.Security.Cryptography.X509Certificates;
using NUnit.Framework;
using SyncHarness;
using log4net;
using log4net.Config;

namespace clientTests
{

    [SetUpFixture]
    public class GlobalSetupFixture
    {
        private static ILog log = LogManager.GetLogger(typeof(GlobalSetupFixture));



        // Must have public constructure
        public GlobalSetupFixture()
        {

            // Reset the log4net system based on the properties
            BasicConfigurator.Configure();

            log.Info("new GlobalSetupFixture");

        }

        [SetUp]
        public void Setup()
        {

            try
            {

                log.Info("SetUpFixture: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name);

                // Accept self signed certificates without error
                SkipInvalidCertificates();

                // Reset the log4net system based on the properties
                ConfigureLog4Net();

                // Start the Popup monitor
                WindowMonitor.Initialize();
                CpuMonitor.StartCpuLogging();

                // Clean up any old profiles and zdbs
                OutlookProfile.CleanOldProfiles();
                OutlookInstallerZCO.CleanOldMsiInstallers();
                OutlookInstallerZCO.CleanCoreFiles();
                // Set registry key to "Prompt for a profile" 
                OutlookProfile.SetProfileRegistry();
                // Set the language settings for Outlook
                // TODO: Add these back
                /*
                string lang = ((Properties.StafProperties.ContainsKey("SyncClientLanguage")) ? ((string)Properties.StafProperties["SyncClientLanguage"]) : (""));
                OutlookLanguageSetting.SetLanguage(lang);
                */


                // Make sure the Sync client software is installed, if applicable
                if (Boolean.Parse(GlobalProperties.getProperty("SyncClientInstall", "false")))
                {
                    OutlookInstallerZCO installer = new OutlookInstallerZCO();

                    installer.uninstall();                                          // Uninstall first
                    installer.install(OutlookInstallerZCO.ReleaseId.vLatest);       // Then install
                    installer.disableWaitsetRegistry(); //Bug#75633: This function is used for disabling waitsets

                }
                else
                {
                    log.Info("Skipping the sync client install step because SyncClientInstall is false");
                }

                // Write a Results.html and Results.xsl that can convert the Results.xml to an HTML table
                CreateXslResults();

                // Send PingRequest to the server(s) to make sure it is alive
                zAccountAdmin.GlobalAdminAccount.sendSOAP(@"<PingRequest xmlns = 'urn:zimbraAdmin'/>");
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:PingResponse", null, null, null, 1);

            }
            catch (Exception e)
            {
                log.Error("Uncaught exception in SetUp", e);
                
                throw new HarnessException("Uncaught exception in SetUp", e);
            }

        }

        [TearDown]
        public void TearDown()
        {

            try
            {

                log.Info("SetUpFixture: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name);

                zAssert.DisplayTotalCounts();

                #region Shut down OUTLOOK

                if ( !OutlookProcess.Instance.StopApplication("Global Setup Fixture: shutting down Outlook after all tests have completed"))
                {
                    OutlookProcess.Instance.KillApplication();
                }

                #endregion

                #region Uninstall ZCO

                if (Boolean.Parse(GlobalProperties.getProperty("SyncClientInstall", "false")))
                {
                    OutlookInstallerInterface installer = new OutlookInstallerZCO();
                    installer.uninstall();
                }

                #endregion
                #region Kill MonitorCPU and MonitorPopups threads
                CpuMonitor.Destroy();
                WindowMonitor.Destroy();
                #endregion
                #region kill nunit
                // wait for some time for nunit to automatically close. IF it does not close, kill it.
                //[6/23/2011] this fix is causing an issue with reporting. results.xml is missing as nunit gets killed before it can be generated.
                // Hence I added code to dispose objects to handle multithreading. so commenting following code.
                //System.Threading.Thread.Sleep(60000);
                //KillNunitConsole();
                #endregion
            }
            catch (Exception e)
            {
                log.Error("Uncaught exception in TearDown", e);
                throw;
            }

        }


        private bool KillNunitConsole()
        {
            string ProcessName = "nunit-console";
            Process[] killingProcesses = Process.GetProcessesByName(ProcessName);
            if (killingProcesses.Length > 0)
            {
                foreach (Process pr in killingProcesses)
                {
                    pr.Kill();
                    pr.WaitForExit(5000);
                }


                log.Warn("KillApplicationProcess ... " + ProcessName + " had to be killed");
                System.Threading.Thread.Sleep(10000);
                return (true);
            }
            log.Debug("KillApplicationProcess ... nunit-console already stopped.");
            return (false);
        }

        private void ConfigureLog4Net()
        {
            log.Info("new ConfigureLog4Net");

            // log4net configuration priorities
            // First, check /Program Files/ZimbraQA/log4net.config
            // Second, check for "./log4net.xml"
            // Lastly, create a default file appender

           

            FileInfo primary = new FileInfo(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\log4net.config");
            FileInfo secondary = new FileInfo(GlobalProperties.getProperty("ZimbraQARoot", ".") + @"\conf\SyncClient\log4net.config");

            if (primary.Exists)
            {
                log.Info("Will use log4net configuration file: " + primary.FullName);
                log4net.Config.XmlConfigurator.Configure(primary);
            }
            else if (secondary.Exists)
            {
                log.Info("Will use log4net configuration file: " + secondary.FullName);
                log4net.Config.XmlConfigurator.Configure(secondary);
            }
            else
            {
                FileInfo nunit = new FileInfo("nunit.txt");
                log.Info("Use default configuration.  Log to: " + nunit.FullName);

                // Initialize default logging
                log4net.Appender.FileAppender appender = new log4net.Appender.FileAppender();
                appender.Layout = new log4net.Layout.PatternLayout("%d [%t] %-5p %c - %m%n");
                appender.File = nunit.FullName;
                appender.Threshold = log4net.Core.Level.Info;
                appender.ActivateOptions();
                log4net.Config.BasicConfigurator.Configure(appender);
                log.Info("Used log4net default configuration : " + appender.File);
            }


        }

        private void CreateXslResults()
        {
            const string html = @"<html>
<head>
<script>
function loadXMLDoc(fname)
{
var xmlDoc;
// code for IE
if (window.ActiveXObject)
  {
  xmlDoc=new ActiveXObject(""Microsoft.XMLDOM"");
  }
// code for Mozilla, Firefox, Opera, etc.
else if (document.implementation 
&& document.implementation.createDocument)
  {
  xmlDoc=document.implementation.createDocument("""","""",null);
  }
else
  {
  alert('Your browser cannot handle this script');
  }
xmlDoc.async=false;
xmlDoc.load(fname);
return(xmlDoc);
}

function displayResult()
{
xml=loadXMLDoc(""Results.xml"");
xsl=loadXMLDoc(""Results.xsl"");
// code for IE
if (window.ActiveXObject)
  {
  ex=xml.transformNode(xsl);
  document.getElementById(""example"").innerHTML=ex;
  }
// code for Mozilla, Firefox, Opera, etc.
else if (document.implementation 
&& document.implementation.createDocument)
  {
  xsltProcessor=new XSLTProcessor();
  xsltProcessor.importStylesheet(xsl);
  resultDocument = xsltProcessor.transformToFragment(xml,document);
  document.getElementById(""example"").appendChild(resultDocument);
  }
}
</script>
<style type=""text/css"">
            table { empty-cells:show; }
</style>
</head>
<body id=""example"" onLoad=""displayResult()"">
</body>
</html>";

            const string xsl = @"<?xml version=""1.0"" encoding=""ISO-8859-1""?>

<xsl:stylesheet version=""1.0"" xmlns:xsl=""http://www.w3.org/1999/XSL/Transform"">

<xsl:template match=""/"">
  <html>
<p>
      <b><u><font size=""4"">Summary</font></u></b>
      Total = 
      <xsl:for-each select=""//test-results"">
        <xsl:variable name=""total"" select=""@total""/>
        <xsl:variable name=""failures"" select=""@failures""/>
        <xsl:value-of select=""@total""/>
      Pass = 
        <font color=""#00ff00"">
          <xsl:value-of select=""$total - $failures""/>
        </font>
      Fail = 
        <font color=""#ff0000"">
          <xsl:value-of select=""@failures""/>
        </font>
      Not Run = 
        <font color=""#999900"">
          <xsl:value-of select=""@not-run""/>
        </font>
      </xsl:for-each>
    </p>  
<body>
    <h2>Test Objectives</h2>
    <table border=""1"">
    <tr bgcolor=""#9acd32"">
      <th align=""left"">ID</th>
      <th align=""left"">Test Result</th>
      <th align=""left"">Objective</th>
      <th align=""left"">Steps</th>
      <th align=""left"">Bug #</th>
      <th align=""left"">Notes #</th>
      <th align=""left"">Sync Direction</th>
    </tr>
    <xsl:for-each select=""//test-case"">
    <tr>
      <td><xsl:value-of select=""@name""/></td>
      	<xsl:choose>
          <xsl:when test=""@success = 'False'"">
            <td bgcolor=""#ff0000"">
            <xsl:value-of select=""@success""/></td>
          </xsl:when>
            <xsl:when test=""@success = 'True'"">
            <td bgcolor=""#00ff00"">
            <xsl:value-of select=""@success""/></td>
          </xsl:when>
          <xsl:otherwise>
            <td bgcolor=""#dddddd"">
	        <xsl:value-of select=""@success""/></td>
          </xsl:otherwise>
        </xsl:choose>
      <td><xsl:value-of select=""@description""/></td>
      <td>
	<xsl:for-each select="".//property"">
		<xsl:if test=""@name = 'TestSteps'"">
			<xsl:value-of select=""@value""/>
		</xsl:if>
	</xsl:for-each>
	</td>
    <td>
	<xsl:for-each select="".//property"">
		<xsl:if test=""@name = 'bug'"">
			<xsl:value-of select=""@value""/>
		</xsl:if>
	</xsl:for-each>
	</td>
    <td>
	<xsl:for-each select="".//property"">
		<xsl:if test=""@name = 'Notes'"">
			<xsl:value-of select=""@value""/>
		</xsl:if>
	</xsl:for-each>
	</td>
    <td>
	<xsl:for-each select="".//property"">
		<xsl:if test=""@name = 'SyncDirection'"">
			<xsl:value-of select=""@value""/>
		</xsl:if>
	</xsl:for-each>
	</td>
    </tr>
    </xsl:for-each>
    </table>
  </body>
  </html>
</xsl:template>

</xsl:stylesheet>";

            try
            {
                string logRoot = "";
                int iteration=0;
                Boolean done=false;
                //if the log folder is not yet written, may happen when disk is slow, wait for a minute. Then, find if it exists. Do this two times.  
                while(done==false && iteration <2)
                {
                    if ((new DirectoryInfo(GlobalProperties.getProperty("ZimbraLogRoot"))).Exists)
                    {
                        logRoot = GlobalProperties.getProperty("ZimbraLogRoot") + @"\";
                        done=true;
                    }
                    else
                    {
                        System.Threading.Thread.Sleep(60000);                
                        iteration++;

                    }
                }
                

                TextWriter htmlFile = new StreamWriter(logRoot + "Results.html");
                htmlFile.Write(html);
                htmlFile.Close();
                htmlFile = null;

                TextWriter xslFile = new StreamWriter(logRoot + "Results.xsl");
                xslFile.Write(xsl);
                xslFile.Close();
                xslFile = null;
            }
            catch (Exception e)
            {
                log.Error("CreateXslResults threw an exception.  Ignoring.", e);
            }

        }

        private void SkipInvalidCertificates()
        {
            System.Net.ServicePointManager.ServerCertificateValidationCallback +=
                new System.Net.Security.RemoteCertificateValidationCallback(ValidateRemoteCertificate);
        }

        private static bool ValidateRemoteCertificate(
            object sender,
            X509Certificate certificate,
            X509Chain chain,
            System.Net.Security.SslPolicyErrors policyErrors)
        {
            return (true);
        }


    }
}
