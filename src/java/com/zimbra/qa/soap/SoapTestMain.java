package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileFilter;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Iterator;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.GnuParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.MissingOptionException;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.apache.log4j.FileAppender;
import org.apache.log4j.Layout;
import org.apache.log4j.Logger;
import org.apache.log4j.PatternLayout;
import org.apache.log4j.PropertyConfigurator;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.net.SocketFactories;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.XmlParseException;
import com.zimbra.common.util.ByteUtil;
import com.zimbra.cs.util.BuildInfo;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;
//import com.zimbra.qa.soapws.core.ExecuteSoapWsTestMain;

public class SoapTestMain {

    // General debug logger
    protected static Logger mLog = Logger.getLogger(SoapTestMain.class.getName());

	// Global properties translated settings
    //static private final String defaultZimbraServer = "localhost";
	//static private final String defaultZimbraDefaultDomain = "zimbra.com";
	
	static private String zimbraServer = null;			// The 'primary' zimbra server
	static private String zimbraDefaultDomain = null;	// The 'primary' zimbra default domain
	static private String zimbraAdminServerName = null;	// The 'primary' zimbra server for the admin (default admin soap server)
	

    public static ArrayList<String> sFailedTestFiles = new ArrayList<String>();
    public static ArrayList<String> sExceptionTestFiles = new ArrayList<String>();
    
    public static ArrayList<String> sFailedRerunTestFiles = new ArrayList<String>();
    public static ArrayList<String> sExceptionRerunTestFiles = new ArrayList<String>();
    
    // Reporting counters:
    public static int mTotalTestCasePass = 0;
    public static int mTotalTestCaseFail = 0;
    public static int mTotalTestCaseError = 0; // Test Case Counters per main run

    public static int mTotalTestStepPass = 0;
    public static int mTotalTestStepFail = 0;

    public static int mTotalRerunTestCasePass = 0;
    public static int mTotalRerunTestCaseFail = 0;
    public static int mTotalRerunTestCaseError = 0; // Test Case Counters per main run

    public static int mTotalRerunTestStepPass = 0;
    public static int mTotalRerunTestStepFail = 0;
    
    public static String testCaseId = null;
    public static String testPackageOrClassName = "";
    public static boolean runWsdlTests=true;
    
    public static File sHarnessTestCases = null;
    public static File sHarnessTestSuite = null;
    public static String sZDCTestScript = null;
    public static File sSetupXmlScript = null;

    public static String globalPropertiesFile = null;
    public static Properties globalProperties = null;
    public static String setupPropertiesFile = null;
    public static Properties setupProperties = null;
    

    public static void parseArgs(String args[]) throws HarnessException {

        Option h = new Option("h", "help", false, "print usage");

        Option v = new Option("v", "version", false, "print version");

        Option i = new Option("i", "id", true, "test case id");
        Option f = new Option("f", "file", true, "input document or directory");
        Option x = new Option("x", "external", true, "input document or directory - for ZDC external tests");
        Option s = new Option("s", "file", true, "setup document or directory");
        Option p = new Option("p", "properties", true, "global.properties file");
        Option c = new Option("c", "hostCount", true, "number of hosts in the SUT");
        Option t = new Option("t", "type", true, "specifies the type of test-case to run");
        Option a = new Option("a", "areas", true, "specifies the areas of test-case to run");
        Option k = new Option("k", "skip", true, "specifies the areas of test-case to skip");
        Option e = new Option("e", "excludes", true, "specifies the excludes of test-case to skip");
        Option b = new Option("b", "bits", true, "open, network (default: network)");
        Option d = new Option("d", "duration", true, "short, long");
        Option l = new Option("l", "log4j", true, "log4jSTAF.properties file");
        Option o = new Option("o", "output", true, "debug output folder");
        Option z = new Option("z", "qaroot", true, "P4 ZimbraQA root path");
        Option j = new Option("j", "java", false, "Run test with java (without STAF)");
        Option w = new Option("w", "wstest", true, "test package or classname for wsdl tests.");
        Option r = new Option("r", "runwsdl", true, "allow wsdl test to run or not (true/false)");
        Option sf = new Option("sf", "runSelective", true, "execute tests scripts mentioned in a file");

        Options options = new Options();
        options.addOption(i).addOption(h).addOption(v).addOption(f).addOption(x).
	        addOption(p).addOption(c).addOption(t).addOption(a).
	        addOption(e).addOption(b).addOption(d).addOption(l).
	        addOption(o).addOption(z).addOption(j).addOption(s).
	        addOption(k).addOption(w).addOption(r).addOption(sf);

        try {

            CommandLineParser parser = new GnuParser();

            CommandLine cl = parser.parse(options, args);

            // Option: -l <log4j.properties>
            if (cl.hasOption("l")) {

                String propertiesFile = cl.getOptionValue("l");
                File log4jProperties = new File(propertiesFile);
                if (log4jProperties.exists()) {
                    PropertyConfigurator.configure(propertiesFile);
                    mLog.debug("Loaded log4j.properites: " + propertiesFile);

                }

            }

            if (cl.hasOption("v")) {
                version();
                System.exit(2);
            }

            if (cl.hasOption("h")) {
                usage(options);
            }

            if ( cl.hasOption("j") )
            	Test.usingStaf = false;
            else
            	Test.usingStaf = true;
            if(cl.hasOption("w")) {
            	testPackageOrClassName=cl.getOptionValue("w");
            }
            
            // Option: -f file | directory
            if (!cl.hasOption("f")) {
            	if(cl.hasOption("w")){
            		throw new MissingOptionException("f is a required argument");
            	}
            } else {
            	sHarnessTestCases = new File(cl.getOptionValue("f"));
            }
            
            if(cl.hasOption("r")) {
            	runWsdlTests=Boolean.valueOf(cl.getOptionValue("r"));
            }

            if (cl.hasOption("x")) {
            	sZDCTestScript = cl.getOptionValue("x");
            }
            
            // Option: -s file | directory
            if (cl.hasOption("s")) {
            	sSetupXmlScript = new File(cl.getOptionValue("s"));
            }

            // Option: -p <global.properties>
            if (!cl.hasOption("p")) {
                throw new MissingOptionException("p is a required argument");
            }
            globalPropertiesFile = new String(cl.getOptionValue("p"));
            globalProperties = new Properties();
            readGlobalProperties(globalPropertiesFile);
            
            if (cl.hasOption("i")) {
            	testCaseId = cl.getOptionValue("i");
            }
            
            // Option: -z <ZimbraQA root> ... i.e. -z /p4/ZimbraQA
            if (cl.hasOption("z")) {
            	try {
                	File zimbraQA = new File(cl.getOptionValue("z"));
                	SoapTestCore.rootZimbraQA = zimbraQA.getCanonicalPath();
				} catch (IOException ex) {
					throw new HarnessException("ZimbraQA root path does not exist " + cl.getOptionValue("z"), ex);
				}
            }

            // Option: -t smoke | functional | feature | negative | etc.
            if (cl.hasOption("t"))
            	SoapTestCore.testType = new ArrayList<String>(Arrays.asList(cl.getOptionValues("t")));
            
            if ( SoapTestCore.testType != null ) {
            	
            	
            	for (Iterator<String> iterator = SoapTestCore.testType.iterator(); iterator.hasNext();)
        		{
        			String type = iterator.next();
        			
        			if (type.equalsIgnoreCase("sanity") && !globalProperties.getProperty("ignoreFiles").toString().equalsIgnoreCase("true")) {
        				SoapTestMain.sHarnessTestCases = new File(SoapTestCore.rootZimbraQA + "/data/soapvalidator/SanityTest");
        			}
        		}
        	}
            
            // Option: -a <comma separated list of areas to test>
            if (cl.hasOption("a"))
            	SoapTestCore.testAreas = new ArrayList<String>(Arrays.asList(cl.getOptionValue("a").split(",")));

            // Option: -a <comma separated list of areas to skip>
            if (cl.hasOption("k"))
            	SoapTestCore.testAreasToSkip = new ArrayList<String>(Arrays.asList(cl.getOptionValue("k").split(",")));

            // Option: -e <comma separated list of excludes to skip>
            if (cl.hasOption("e"))
            	SoapTestCore.testExcludes = new ArrayList<String>(Arrays.asList(cl.getOptionValue("e").split(",")));

            
            // Option: -o <directory to spit logs>
            if (cl.hasOption("o")) {
            	SoapTestCore.mLogDirectory = cl.getOptionValue("o");

                String logFileName = SoapTestCore.mLogDirectory + "/" + "soap.txt";

                mLog.debug("using " + logFileName);

                try {

                	// Create the folder, if it doesn't exist
                	File path = new File(SoapTestCore.mLogDirectory);
                	path.mkdirs();
                	
                    // Add a new log file
                    FileAppender executeAppender = new FileAppender(new PatternLayout("%m%n"),
                                                                    logFileName, false);

                    mLog.addAppender(executeAppender);
                    mLog.debug("added " + logFileName);

                } catch (IOException ex) {

                    mLog.warn("unable to set logger to: " + logFileName, ex);

                }

            }

			if (cl.hasOption("sf")) {
				sHarnessTestSuite = new File(cl.getOptionValue("sf"));
			}

            // Option: -b network | open ... type of zimbra install bits
            SoapTestCore.testServerBits = cl.getOptionValue("b", "network");

            // Option: -b network | open ... type of zimbra install bits
            SoapTestCore.testDuration = cl.getOptionValue("d", "short");

            // Option: -c # ... the number of hosts in the SUT
            SoapTestCore.hostCount = Integer.parseInt(cl.getOptionValue("c", "1"));

            SoapTestCore.sHostname = LC.zimbra_server_hostname.value();

        } catch (ParseException pe) {
            System.err.println(pe.toString());
            usage(options);
        }

    }

    public static void version() {
        BuildInfo.main(null);
    }

    public static void usage(Options o) {

        HelpFormatter hf = new HelpFormatter();
        hf.printHelp("StafTestCore -h | -v | -f <arg>", o, true);
        System.exit(1);

    }

    public static String execute() throws HarnessException, InterruptedException, IOException {
    	
    	if (TestProperties.testProperties == null)
    	{
        	// Initialize the TestProperties object
        	TestProperties.testProperties = new TestProperties();
    	}
    	
    	
    	

    	StringBuffer resultString = new StringBuffer("");
   	
        if ( sSetupXmlScript != null ) {
        	
            setupProperties = new Properties();

        	if (sSetupXmlScript.isDirectory()) {

        		StafTestDirectory harness = new StafTestDirectory();
        		
        		harness.runTestDirectory(sSetupXmlScript);
        		
        		harness=null;

            } else {

                SoapTestCore harness = new SoapTestCore();

                
                try {
                	
                    harness.runTestFile(sSetupXmlScript);

                } catch (Exception e) {

        			// End here since the system is not set up as expected
                	mLog.error("SETUP TEST FAILED: " + sSetupXmlScript.getAbsolutePath(), e);
                	
                	mTotalTestCaseError++;
                	sExceptionTestFiles.add(sSetupXmlScript.getAbsolutePath());	

        	        throw new HarnessException("SETUP TEST FAILED: " + sSetupXmlScript.getAbsolutePath(), e);

                } finally {

                    mTotalTestCasePass +=	harness.mTestCasePass;
                    mTotalTestCaseFail +=	harness.mTestCaseFail;

                    mTotalTestStepPass +=	harness.mTestPass;
                    mTotalTestStepFail +=	harness.mTestFail;

                    if ( harness.mTestCaseFail > 0 ) {
                    	sFailedTestFiles.add(sSetupXmlScript.getAbsolutePath());
                    }
                    
                	// Copy all of the properties from the setup to a saved "setupProperties" object
                    setupProperties.putAll(TestProperties.testProperties.getProperties());
                    TestProperties.testProperties.writeProperties(harness.rootDebugDir);
                    setupPropertiesFile = new String(TestProperties.testProperties.fDynamicPropertiesFile);

                    harness = null;
                    
                }
                
                
            }
	            
        }
        
        if(sHarnessTestCases!=null && sHarnessTestCases.exists()) {

			execute(sHarnessTestCases);

        	// Retry all failed tests again

			for( String reRunFailedFileName : sFailedTestFiles )
			{/*
				SoapTestCore harness = new SoapTestCore();
				
				try {

					harness.runTestFile( new File(reRunFailedFileName) );
				
				} catch (Exception e) {
				
					mLog.error("TEST RERUN FAILED: " + sHarnessTestCases.getAbsolutePath(), e);
				
					mTotalRerunTestCaseError++;
					sExceptionRerunTestFiles.add(sHarnessTestCases.getAbsolutePath() );

					throw new HarnessException("TEST FAILED: " + sHarnessTestCases.getAbsolutePath(), e);

				} finally {

					mTotalRerunTestCasePass +=	harness.mTestCasePass;
					mTotalRerunTestCaseFail +=	harness.mTestCaseFail;
											
					mTotalRerunTestStepPass +=	harness.mTestPass;
					mTotalRerunTestStepFail +=	harness.mTestFail;
											
					if ( harness.mTestCaseFail > 0 ) {
						sFailedRerunTestFiles.add(reRunFailedFileName);
					}
					harness=null;
			
				}
				
			*/}
			for( String reRunErrorFileName : sExceptionTestFiles )
			{ 
				SoapTestCore harness = new SoapTestCore();
				
				try {

					harness.runTestFile( new File(reRunErrorFileName) );
				
				} catch (Exception e) {
				
					mLog.error("TEST RERUN FAILED: " + sHarnessTestCases.getAbsolutePath(), e);
				
					mTotalRerunTestCaseError++;
					sExceptionRerunTestFiles.add(reRunErrorFileName);

					throw new HarnessException("TEST FAILED: " + sHarnessTestCases.getAbsolutePath(), e);

				} finally {

				harness=null;
			
				}
				
			}
    	}
        
		if (sHarnessTestSuite != null && sHarnessTestSuite.exists()) {
			String line = null;
			FileReader fr = new FileReader(sHarnessTestSuite);
			BufferedReader bufferedReader = new BufferedReader(fr);
			while ((line = bufferedReader.readLine()) != null) {
				
			        File enlistedTestCases = new File(line);
				try {
					execute(enlistedTestCases);
				} catch (Exception e) {
					mLog.error("Error Running test case file - " + enlistedTestCases, e);
				}

			}
			bufferedReader.close();
		}

        if(runWsdlTests) {
        	try {
        		mLog.debug("WSDL Soap Started");
        		//executeWsdlTests();
        	} catch (Exception e) {
				mLog.error("Error Running wsdl harness",e);
			}
        }
        
        
        return (resultString.toString());
        
    }
    
	public static void execute(File testCases) throws HarnessException, InterruptedException, IOException {
		if (testCases.isDirectory()) {
			// run wsdl tests only when root folder of xml test specified.

			if (!(testCases.getName().endsWith("soapvalidator") || testCases.getName().endsWith("SanityTest"))) {
				if (testPackageOrClassName.equals("")) {
					mLog.debug("WSDL suite will not run as package or class name not specified.");
					runWsdlTests = false;
				}
			}

			StafTestDirectory harness = new StafTestDirectory();
			harness.runTestDirectory(testCases);
			harness = null;

		} else {
			mLog.debug("WSDL suite will not run as its xml file");
			// do no run wsdl test when running single xml file
			runWsdlTests = false;

			SoapTestCore harness = new SoapTestCore();

			try {

				harness.runTestFile(testCases);

			} catch (Exception e) {

				mLog.error("TEST FAILED: " + testCases.getAbsolutePath(), e);

				mTotalTestCaseError++;
				sExceptionTestFiles.add(testCases.getAbsolutePath());

				throw new HarnessException("TEST FAILED: " + testCases.getAbsolutePath(), e);

			} finally {

				mTotalTestCasePass += harness.mTestCasePass;
				mTotalTestCaseFail += harness.mTestCaseFail;

				mTotalTestStepPass += harness.mTestPass;
				mTotalTestStepFail += harness.mTestFail;

				if (harness.mTestCaseFail > 0) {
					sFailedTestFiles.add(testCases.getAbsolutePath());
				}

				harness = null;

			}
		}
	}
    
//   static void executeWsdlTests() {
//    	//running wsdl soap harness
//    	try  {
//	        ExecuteSoapWsTestMain soapWsTestSuite = new ExecuteSoapWsTestMain();
//        	soapWsTestSuite.testPropertyFileName=globalPropertiesFile;
//        	soapWsTestSuite.wsdlLocation=SoapTestCore.rootZimbraQA+soapWsTestSuite.wsdlLocation;
//        	if(testPackageOrClassName!=null && !testPackageOrClassName.equals("")) {
//            	soapWsTestSuite.testPackageOrClassName=testPackageOrClassName;
//        	}
//        	if(testCaseId!=null) {
//        		soapWsTestSuite.includeTestGroups.add(testCaseId);
//        	} else if(SoapTestCore.testType!=null){
//        		soapWsTestSuite.includeTestGroups=SoapTestCore.testType;
//        	}
//        	if(SoapTestCore.testExcludes!=null)
//        		soapWsTestSuite.excludeTestGroups=SoapTestCore.testExcludes;
//        	if(SoapTestCore.testServerBits!=null)
//        		soapWsTestSuite.bits=SoapTestCore.testServerBits;
//        	if(SoapTestCore.mLogDirectory!=null)
//        		soapWsTestSuite.outputFolderName=SoapTestCore.mLogDirectory;
//        	if(zimbraServer!=null) 
//        		soapWsTestSuite.zimbraServer=zimbraServer;
//        	soapWsTestSuite.executetest();
//        	
//        	mLog.info("SoapWS Passed " +soapWsTestSuite.getPassedTestCount());
//        	mLog.info("SoapWS Failed " + soapWsTestSuite.getFailedTestCount() );
//        	mLog.info("SoapWS Skip" +soapWsTestSuite.getSkippedTestCount() );
//        	mLog.info("SoapWS Total" +soapWsTestSuite.getTotalTestCount() );
//        	
//        	mTotalTestCaseFail=mTotalTestCaseFail+soapWsTestSuite.getFailedTestCount();
//        	mTotalTestCasePass=mTotalTestCasePass+soapWsTestSuite.getPassedTestCount();
//        	mTotalTestCaseError=mTotalTestCaseError+soapWsTestSuite.getSkippedTestCount();
//        	sFailedTestFiles.addAll(soapWsTestSuite.getFailedTests());
//        	sExceptionTestFiles.addAll(soapWsTestSuite.getSkipedTests());
//        	
//    	} catch (Exception e) {
//			mLog.info("failed", e);
//			System.err.println(e.toString());
//			e.printStackTrace();
//		}    	
//    }
    
    
    /**
     * Exit status is 0 if no failures, 1 otherwise.
     * @throws HarnessException 
     * @throws InterruptedException 
     * @throws IOException
     * @throws Exception 
     */
    public static void main(String args[]) throws HarnessException, InterruptedException, IOException {

        // Set up SSL
        // Always accept self-signed SSL certificates.
        SocketFactories.registerProtocols(true);

    	// Initialize Results-Soap.xml
    	ResultsXml.initialize();

        mTotalTestCasePass = 0;
        mTotalTestCaseFail = 0;
        mTotalTestCaseError = 0;

        mTotalTestStepPass = 0;
        mTotalTestStepFail = 0;

        mTotalRerunTestCasePass = 0;
        mTotalRerunTestCaseFail = 0;
        mTotalRerunTestCaseError = 0;

        mTotalRerunTestStepPass = 0;
        mTotalRerunTestStepFail = 0;
		// Intialize the recorder for SOAP requests
		PerformanceStatistics.initialize();

        StringBuffer resultString = new StringBuffer();
        
        try {
        	
        	// Parse any command line arguments
        	parseArgs(args);

        	// Execute the specified test XML directory or filename
        	resultString.append( execute() );
        	} finally {
        	
        	// Write Results-Soap.xml
        	ResultsXml.writeResultsFile(SoapTestCore.mLogDirectory);
        
        	
			// Record the performance statistics
			PerformanceStatistics.writeReport();
			PerformanceStatistics.destroy();

        	
        	// Build the parsable return result
        	resultString.append("Tests Executed:" + (mTotalTestStepPass + mTotalTestStepFail)).append(Layout.LINE_SEP);
        	resultString.append("Pass:" + mTotalTestStepPass).append(Layout.LINE_SEP);
        	resultString.append("Fail:" + mTotalTestStepFail).append(Layout.LINE_SEP).append(Layout.LINE_SEP);
        	resultString.append("Test Cases Executed:" + (mTotalTestCasePass + mTotalTestCaseFail)).append(Layout.LINE_SEP);
        	resultString.append("Pass:" + mTotalTestCasePass).append(Layout.LINE_SEP);
        	resultString.append("Fail:" + mTotalTestCaseFail).append(Layout.LINE_SEP);
        	resultString.append("Script Errors:" + mTotalTestCaseError).append(Layout.LINE_SEP).append(Layout.LINE_SEP);

            if (sFailedTestFiles.size() > 0) {
            	resultString.append("These tests had failures:").append(Layout.LINE_SEP);
                for (String filename : sFailedTestFiles)
                    resultString.append("	").append(filename).append(Layout.LINE_SEP);
            }

            if (sExceptionTestFiles.size() > 0) {
            	resultString.append("These tests had exceptions:").append(Layout.LINE_SEP);
                for (String filename : sExceptionTestFiles)
                    resultString.append("	").append(filename).append(Layout.LINE_SEP);
            }

        	resultString.append("Tests Rerun Executed:" + (mTotalRerunTestStepPass + mTotalRerunTestStepFail)).append(Layout.LINE_SEP);
        	resultString.append("Pass:" + mTotalRerunTestStepPass).append(Layout.LINE_SEP);
        	resultString.append("Fail:" + mTotalRerunTestStepFail).append(Layout.LINE_SEP).append(Layout.LINE_SEP);
        	resultString.append("Test Cases Executed:" + (mTotalRerunTestCasePass + mTotalRerunTestCaseFail)).append(Layout.LINE_SEP);
        	resultString.append("Pass:" + mTotalRerunTestCasePass).append(Layout.LINE_SEP);
        	resultString.append("Fail:" + mTotalRerunTestCaseFail).append(Layout.LINE_SEP);
        	resultString.append("Script Errors:" + mTotalRerunTestCaseError).append(Layout.LINE_SEP).append(Layout.LINE_SEP);

            if (sFailedRerunTestFiles.size() > 0) {
            	resultString.append("These tests had rerun failures:").append(Layout.LINE_SEP);
                for (String filename : sFailedRerunTestFiles)
                    resultString.append("	").append(filename).append(Layout.LINE_SEP);
            }

            if (sExceptionRerunTestFiles.size() > 0) {
            	resultString.append("These tests had rerun exceptions:").append(Layout.LINE_SEP);
                for (String filename : sExceptionRerunTestFiles)
                    resultString.append("	").append(filename).append(Layout.LINE_SEP);
            }
            
            resultString.append(Layout.LINE_SEP).append(Layout.LINE_SEP);
            resultString.append("Test finished: " + ( (mTotalTestCaseFail + mTotalTestCaseError > 0) ? "FAIL" : "PASS")).append(Layout.LINE_SEP);

	        mLog.info(resultString.toString());
	        System.out.print(resultString.toString());
	        
        }

        System.exit((mTotalTestCaseFail + mTotalTestCaseError > 0) ? 1 : 0);
        
    }

    static private class StafTestDirectory {
    	
        // ExecutorService for running scripts, test cases, and tests
        static ExecutorService executorService = null;

        protected ArrayList<File> concurrentScripts = new ArrayList<File>();
        protected ArrayList<File> nonConcurrentScripts = new ArrayList<File>();
        
        
        
        StafTestDirectory() {
        	
        	// TODO: Make the number of threads configurable
        	executorService = Executors.newFixedThreadPool(10);
        	
        }
        
        static private class ConncurrentCore implements Runnable {

    		final File scriptFile;
    		
    		ConncurrentCore(File f) {
    			scriptFile = f;
    		}
    		
    		public void run() {
    			
                
            	SoapTestCore harness = new SoapTestCore();

            	try {
                	
                	harness.runTestFile(scriptFile);
                	
                } catch (Exception e) {
                	
        			mLog.error("TEST FAILED: " + scriptFile.getAbsolutePath(), e);
        			
                	mTotalTestCaseError++;
                	sExceptionTestFiles.add(scriptFile.getAbsolutePath());

                } finally {
                	
                    mTotalTestCasePass +=	harness.mTestCasePass;
                    mTotalTestCaseFail +=	harness.mTestCaseFail;

                    mTotalTestStepPass +=	harness.mTestPass;
                    mTotalTestStepFail +=	harness.mTestFail;

                    if ( harness.mTestCaseFail > 0 ) {
                    	sFailedTestFiles.add(scriptFile.getAbsolutePath());
                    }
                    
                	harness = null;

                }
                
    		}
        	
        }
        
        private static final String INFILE_SUFFIX = ".xml";
        private static final int INFILE_SUFFIX_LENGTH = INFILE_SUFFIX.length();

        private static FileFilter xmlFileFilter = new FileFilter() {
        	public boolean accept(File f) {
                
        		// Accept directories
        		if ( f.isDirectory() )
        			return true;
        		
        		// Accept files with .xml extensions
        		String fname = f.getName();
        		int namelen = fname.length();
                return (  !( namelen < INFILE_SUFFIX_LENGTH || 
                		!fname.substring(namelen - INFILE_SUFFIX_LENGTH).equalsIgnoreCase(INFILE_SUFFIX)) );
        	}
        };
        
            
        private boolean isTestScriptConcurrent(File xmlFile) throws IOException, XmlParseException {
        	
            // Convert XML text file to Element object
            String docStr = new String(ByteUtil.getContent(xmlFile), "utf-8");
            Element root = Element.parseXML(docStr);
            
            // XML must be <t:tests/>
            if (!root.getQName().equals(SoapTestCore.E_TESTS)) {
            	mLog.error("Root node of document must be " + SoapTestCore.E_TESTS.getQualifiedName());
            	return (false);
            }
            
       		return ("true".equals(root.getAttribute(SoapTestCore.A_CONCURRENT, "false")));

        }
        
        public void listConcurrentTests(File dir) {
        	
            // xmlFilenameFilter -- Skip files whose name is not "*.xml".
            File files[] = dir.listFiles(xmlFileFilter);
            if (files == null || files.length < 1)
                return;
            
            // First, run test files in this directory.
            for (int i = 0; i < files.length; i++) {
                File f = files[i];

        		mLog.debug("Checking " + f + " ...");

        		// Recursively process directories.
                if (f.isDirectory()) {
                	
                	listConcurrentTests(f);
                	
                } else {
                	
                	boolean concurrent;
                	try {
						concurrent = isTestScriptConcurrent(f);
					} catch (Exception e) {
						// Default to false if the XML file can't be read correctly
						// The exception will be thrown later when the script is executed
						concurrent = false;
					}
                	
                	if ( concurrent ) {
                		mLog.debug("Adding " + f + " to the concurrent script list");
                		concurrentScripts.add(f);
                	} else {
                		mLog.debug("Adding " + f + " to the non-concurrent script list");
                		nonConcurrentScripts.add(f);
                	}
                }
                
            }
            
            Collections.sort(concurrentScripts);
            Collections.sort(nonConcurrentScripts);
                            
            
        }
        
        public void runTestDirectory(File rootDir) throws InterruptedException {

        	// Build a list of scripts to run
        	listConcurrentTests(rootDir);

            // Execute the concurrent tests first
        	for (Iterator iter = concurrentScripts.iterator(); iter.hasNext();) {
                File f = (File) iter.next();

                // Skip files that don't have the test case, if specified
                if ( (SoapTestMain.testCaseId != null) && (!SoapTestMain.isTestCaseInFile(f, SoapTestMain.testCaseId)) ) {
                	continue;
                }
                
        		executorService.execute(new ConncurrentCore(f));

            }
        	
        	// Wait for all the concurrent scripts to end
        	mLog.info("Waiting for the concurrent scripts to end");
        	executorService.shutdown();
        	executorService.awaitTermination(3600, TimeUnit.SECONDS);
        	mLog.info("The concurrent scripts ended");
        	
        	
            // Run the nonconcurrent tests
        	for (Iterator iter = nonConcurrentScripts.iterator(); iter.hasNext();) {
                File f = (File) iter.next();

	            if ( (SoapTestMain.testCaseId != null) && (!SoapTestMain.isTestCaseInFile(f, SoapTestMain.testCaseId)) ) {
	            	continue;
	            }

	    		SoapTestCore harness = new SoapTestCore();
	    		
	    		// Reset the test properties so that one test script cannot impact another
	    		TestProperties.testProperties = new TestProperties();
	    		
	            try
                {
    	                        		    	    		    	
    	            harness.runTestFile(f);
    	            
                    
                } catch (Exception e) {
                	                	
                	mLog.error("TEST FAILED: " + f.getAbsolutePath(), e);
                	
                	mTotalTestCaseError++;
                	sExceptionTestFiles.add(f.getAbsolutePath());
                	
                } finally {    	            
        	        
    	            mTotalTestCasePass +=	harness.mTestCasePass;
    	            mTotalTestCaseFail +=	harness.mTestCaseFail;
    	            
    	            mTotalTestStepPass += harness.mTestPass;
    	            mTotalTestStepFail += harness.mTestFail;
    	            
                    if ( harness.mTestCaseFail > 0 ) {
                    	sFailedTestFiles.add(f.getAbsolutePath());
                    }

    	            harness = null;

                }

            }

            return;
            
        }

    }
    
    
    public static boolean isTestCaseInFile(File xmlFile, String soapTestCase)  {
    	
        
        // Convert XML text file to Element object
        String docStr;
		Element root;
		try {
			docStr = new String(ByteUtil.getContent(xmlFile), "utf-8");
			root = Element.parseXML(docStr);
		} catch (Exception e) {
			// If we can't read the file, then just return false so the rest
			// of the tree can be executed
			return false;
		}
        
        // XML must be <t:tests/>
        if (!root.getQName().equals(SoapTestCore.E_TESTS)) {
        	mLog.error("Root node of document must be " + SoapTestCore.E_TESTS.getQualifiedName());
        	return (false);
        }

        // Parse the Element, look for the test case
        for (Iterator it = root.elementIterator(); it.hasNext();) {

            // e = expandProps(e.createCopy());
            Element e = (Element) it.next();
            mLog.debug("Element " + e.toString());

            if (e.getQName().equals(TestCase.E_TESTCASE)) {
            	if ( e.getAttribute(TestCase.A_TESTCASEID, "").equalsIgnoreCase(soapTestCase)) {
                	mLog.debug(soapTestCase + " does exist in " + xmlFile);
            		mLog.debug("Found " + soapTestCase);
            		return (true);
            	}
            }
        }
        
        // Never found the test case
    	mLog.debug(soapTestCase + " does not exist in " + xmlFile);
        return (false);
    	
    }
    
    



	public static void readGlobalProperties(String filename) throws HarnessException {
		
		mLog.debug("readGlobalProperties: filename(" + filename + ")");

		FileInputStream fInputStream = null;		
        try {
        	fInputStream = new FileInputStream(new File(filename));
			globalProperties.load(fInputStream);
		} catch (Exception e) {
			throw new HarnessException("Unable to read global properties file "+ filename, e);
		}finally{
			Utilities.close(fInputStream, mLog);
		}
    		
        // Go through all the properties.  If you see 'localhost' or 'zimbra.com', then
        // change it to the value in zimbraServer and zimbraDefaultDomain
        //
		for (Enumeration e = globalProperties.propertyNames(); e.hasMoreElements();) {
		
			String key = e.nextElement().toString();
			String value = globalProperties.getProperty(key).toString();
			
			mLog.debug("mGlobalProps: " + key +": "+ value);
	    
			// zimbraServer.name=qa30.lab.zimbra.com
			// adminServer.name=qa50.lab.zimbra.com
			
			// Skip any zdesktop settings
			if ( key.equals("zdesktopuser.server") )		continue;
			if ( key.equals("zexternal.server") )			continue;

			if ( key.equals("zimbraServer.name") )
			{
				if ( (zimbraServer != null) && (!zimbraServer.equals("localhost")) )
				{
					globalProperties.setProperty(key, zimbraServer);
					continue;
				}
			}
			
			if ( key.equals("adminServer.name") )
			{
				if ( (zimbraAdminServerName != null) && (!zimbraAdminServerName.equals("localhost")) )
				{
					globalProperties.setProperty(key, zimbraAdminServerName);
					continue;
				}
			}
    	
	    	// Check for definitions like defaultdomain.name=zimbra.com
			if ( (zimbraServer != null) && (value.equals("localhost")) ) {
				globalProperties.setProperty(key, value.replace("localhost", zimbraServer));
    			mLog.debug("mGlobalProps: " + key +": "+ globalProperties.getProperty(key).toString());    			
	    	}
		
	    	// Check for definitions like admin.user=admin@zimbra.com
			if ( (zimbraServer != null) && (value.contains("@localhost")) ) {
				globalProperties.setProperty(key, value.replace("@localhost", "@"+ zimbraServer));
    			mLog.debug("mGlobalProps: " + key +": "+ globalProperties.getProperty(key).toString());    			
	    	}
		
	    	if ( (zimbraDefaultDomain != null) && (value.equals("zimbra.com")) ) {
	    		globalProperties.setProperty(key, value.replace("zimbra.com", zimbraDefaultDomain));
    			mLog.debug("mGlobalProps: " + key +": "+ globalProperties.getProperty(key).toString());    			
	    	}
	    	
	    	if ( (zimbraDefaultDomain != null) && (value.contains("@zimbra.com")) ) {
	    		globalProperties.setProperty(key, value.replace("@zimbra.com", "@" + zimbraDefaultDomain));
    			mLog.debug("mGlobalProps: " + key +": "+ globalProperties.getProperty(key).toString());    			
	    	}
	    	
    	}

    			
	}
	
	static public void setZimbraServerName(String name, int index) {
		
		mLog.debug("setZimbraServerName: " + name + ", " + index);

		zimbraServer = name;
		
		// TODO: if index > 0, then need to build the multihost values, too
		
	}

	static public void setZimbraAdminServer(String name)
	{
		
		mLog.debug("setZimbraServerName: " + name );

		zimbraAdminServerName = name;

	}
	
	static public void setZimbraDefaultDomain(String domain, int index) {
		
		mLog.debug("setZimbraDefaultDomain: " + domain + ", " + index);

		zimbraDefaultDomain = domain;
		
		// TODO: if index > 0, then need to build the multihost values, too
		
	}

	
	
	

}

