using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using log4net.Config;
using NUnit.Framework;
using System.Security.Cryptography.X509Certificates;
using System.Reflection;
using System.IO;
using System.Text.RegularExpressions;

namespace Harness.NUnit
{
    public class HarnessGlobalSetupFixture
    {
        protected static ILog logger = LogManager.GetLogger(typeof(HarnessGlobalSetupFixture));

        public HarnessGlobalSetupFixture()
        {
            // Reset the log4net system based on the properties
            BasicConfigurator.Configure();

            logger.Info("new " + typeof(HarnessGlobalSetupFixture));
        }


        protected void HarnessSetup()
        {

            try
            {

                logger.Info("SetUpFixture: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name);

                // Accept self signed certificates without error
                SkipInvalidCertificates();

                // Reset the log4net system based on the properties
                ConfigureLog4Net();

                // Start the Popup monitor
                WindowMonitor.Initialize();
                CpuMonitor.StartCpuLogging();


                // Write a Results.html and Results.xsl that can convert the Results.xml to an HTML table
                CreateXslResults();

                // Send PingRequest to the server(s) to make sure it is alive
                ZAccountAdmin.GlobalAdminAccount.sendSOAP(@"<PingRequest xmlns = 'urn:zimbraAdmin'/>");
                ZAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:PingResponse", null, null, null, 1);

            }
            catch (Exception e)
            {
                throw new HarnessException("Uncaught exception in SetUp", e);
            }

        }

        public void HarnessTearDown()
        {

            try
            {

                logger.Info("SetUpFixture: " + MethodBase.GetCurrentMethod().DeclaringType.FullName + "." + MethodBase.GetCurrentMethod().Name);

                ZAssert.DisplayTotalCounts();

                CleanPSTTempFolder();

            }
            catch (Exception e)
            {
                logger.Error("Uncaught exception in TearDown", e);
                throw;
            }

        }



        protected void ConfigureLog4Net()
        {
            logger.Info("new ConfigureLog4Net");

            // log4net configuration priorities
            // First, check /Program Files/ZimbraQA/log4net.config
            // Second, check for "./log4net.xml"
            // Lastly, create a default file appender



            FileInfo primary = new FileInfo(UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\log4net.config");
            FileInfo secondary = new FileInfo(GlobalProperties.getProperty("ZimbraQARoot", ".") + @"\conf\SyncClient\log4net.config");

            if (primary.Exists)
            {
                logger.Info("Will use log4net configuration file: " + primary.FullName);
                log4net.Config.XmlConfigurator.Configure(primary);
            }
            else if (secondary.Exists)
            {
                logger.Info("Will use log4net configuration file: " + secondary.FullName);
                log4net.Config.XmlConfigurator.Configure(secondary);
            }
            else
            {
                FileInfo nunit = new FileInfo("nunit.txt");
                logger.Info("Use default configuration.  Log to: " + nunit.FullName);

                // Initialize default logging
                log4net.Appender.FileAppender appender = new log4net.Appender.FileAppender();
                appender.Layout = new log4net.Layout.PatternLayout("%d [%t] %-5p %c - %m%n");
                appender.File = nunit.FullName;
                appender.Threshold = log4net.Core.Level.Info;
                appender.ActivateOptions();
                log4net.Config.BasicConfigurator.Configure(appender);
                logger.Info("Used log4net default configuration : " + appender.File);
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
                int iteration = 0;
                Boolean done = false;
                //if the log folder is not yet written, may happen when disk is slow, wait for a minute. Then, find if it exists. Do this two times.  
                while (done == false && iteration < 2)
                {
                    if ((new DirectoryInfo(GlobalProperties.getProperty("ZimbraLogRoot"))).Exists)
                    {
                        logRoot = GlobalProperties.getProperty("ZimbraLogRoot") + @"\";
                        done = true;
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
                logger.Error("CreateXslResults threw an exception.  Ignoring.", e);
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

        //Following function is used to clean up core dump and any other files generated in PST folder under user temp folder
        private void CleanPSTTempFolder()
        {
            string tempPath = System.IO.Path.GetTempPath();          
            DirectoryInfo root = new DirectoryInfo(tempPath);

            try
            {
                if (root.Exists)
                {
                    foreach (DirectoryInfo d in root.GetDirectories())
                    {
                        if (Regex.IsMatch(d.FullName, "ZCSPSTImportWizard"))
                        {
                            d.Delete(true);
                            //  break; //Uncomment this line, after first run because only one PST folder would be created by the automation run.
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                System.Console.WriteLine("Warning message during PST Temp folder Delete: " + e.Message);
            }
        }


    }
}
