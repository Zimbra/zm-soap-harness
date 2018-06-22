package com.zimbra.qa.soap;


import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.Properties;
import java.util.StringTokenizer;

import com.zimbra.common.net.SocketFactories;
import org.apache.log4j.FileAppender;
import org.apache.log4j.Logger;
import org.apache.log4j.PatternLayout;
import org.apache.log4j.PropertyConfigurator;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFResult;
import com.ibm.staf.STAFUtil;
import com.ibm.staf.service.STAFCommandParseResult;
import com.ibm.staf.service.STAFCommandParser;
import com.ibm.staf.service.STAFServiceInterfaceLevel30;

public class StafIntegration implements STAFServiceInterfaceLevel30  {

    // ???
	private final String kVersion = "1.1.0";
    private static final int kDeviceInvalidSerialNumber = 4001;

	// Basic Debug Logger
    static public Logger mLog = Logger.getLogger(StafIntegration.class);
    static protected String mDefaultConfiguratorFile = "/opt/qa/soapvalidator/conf/log4jSTAF.properties";
    

	private FileAppender executeAppender = null;

	// STAF Specifics
    private String fServiceName;
    private STAFHandle fHandle;
    private STAFCommandParser fExecuteParser;
    private STAFCommandParser fQueryParser;
    private STAFCommandParser fHaltParser;
    private String fLineSep = new String("\n");

    // STAF Commands
    private String	aEXECUTE = "EXECUTE";
    private String	aADMIN = "ADMIN";
    private String	aDOMAIN = "DOMAIN";
    private String	aZIMBRAQAROOT = "ZIMBRAQAROOT";
    private String	aSUITE = "SUITE";
    private String	aDIRECTORY = "DIRECTORY";
    private String	aTESTCASE = "TESTCASE";
    private String	aWSTEST = "WSTEST";
    private String	aRUNWSDLTESTS = "RUNWSDLTESTS";
    private String	aSETUP = "SETUP";
    private String	aAREAS = "AREAS";
	private String	aEXCLUDES = "EXCLUDES";
    private String	aBITS = "BITS";
    private String	aHOSTS = "HOSTS";
    private String	aTYPES = "TYPES";
    private String	aDURATION = "DURATION";
    private String	aLOGDIR = "LOG";
    private String	aLOG4JPROPERTIESFILE = "LOG4J";
    private String	aQUERY = "QUERY";
    private String	aHALT = "HALT";
    private String	aVERSION = "VERSION";
    private String	aHELP = "HELP";
    private String	aTESTSUITES = "TESTSUITES";
   
    // STAF Harness Specifics
    private boolean fAlreadyRunning = false;
    
	// Soap settings
//    private String fPropsGlobal = null;
	private String fSoapZimbraServerName = null;

	// If LOG option is specified, then duplicate logs here
//	protected String fSoapLogDir = null;
	public static final String mLogFileName = "staf.txt";
    

    
    public StafIntegration() {
	}
	
    // Required by STAF
	public STAFResult init(STAFServiceInterfaceLevel30.InitInfo info)
    {
		int rc = STAFResult.Ok;

        info.serviceJar.getName();
        
        // STAF specific stuff ...
		
		try
        {
            fServiceName = info.name;
            fHandle = new STAFHandle("STAF/SERVICE/" + info.name);
        }
        catch (STAFException e)
        {
            return (new STAFResult(STAFResult.STAFRegistrationError));
        }
        

        
        // EXECUTE command parser
        // EXECUTE <zimbra server> < SANITY | SMOKE | FULL | DIRECTORY <DIR> | FILE <FILE> | TESTCASE <ID> > [ AREAS | BITS | HOSTS | TYPES ] 
        fExecuteParser = new STAFCommandParser();

        // EXECUTE
        fExecuteParser.addOption(aEXECUTE, 1, 
                STAFCommandParser.VALUEREQUIRED); // argument is the server under test

        fExecuteParser.addOption(aDOMAIN, 1, 
                STAFCommandParser.VALUEREQUIRED); // argument is the default domain name

        fExecuteParser.addOption(aADMIN, 1, 
                STAFCommandParser.VALUEREQUIRED); // argument is the server where admin is configured

        // Need the ZimbraQA root to get to global.properties
        fExecuteParser.addOption(aZIMBRAQAROOT, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        // Types of EXECUTE - one of SUITE, DIRECTORY, FILE, or TESTCASE
        fExecuteParser.addOption(aSUITE, 1, 
        		STAFCommandParser.VALUEREQUIRED);  // No arg for SMOKE
                             
        fExecuteParser.addOption(aDIRECTORY, 1, 
        		STAFCommandParser.VALUEREQUIRED);
                
       fExecuteParser.addOption(aTESTCASE, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        //Package name for soap wsdl test cases.
        fExecuteParser.addOption(aWSTEST, 1, 
    			STAFCommandParser.VALUEREQUIRED);
 
        //Package name for soap wsdl test cases.
        fExecuteParser.addOption(aRUNWSDLTESTS, 1, 
    			STAFCommandParser.VALUEREQUIRED);
 
        
        // Optional LOG argument
        fExecuteParser.addOption(aLOGDIR, 1, 
    			STAFCommandParser.VALUEREQUIRED);
    
        // Optional LOG4J argument
        fExecuteParser.addOption(aLOG4JPROPERTIESFILE, 1, 
    			STAFCommandParser.VALUEREQUIRED);
    
        // Optional test parameters
        // TODO: Ideally, areas and types should be allowed to appear more than once
        // TODO: however, I don't want to have to code the parsing of multiple areas or types
        fExecuteParser.addOption(aSETUP, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aAREAS, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aEXCLUDES, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aBITS, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aHOSTS, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aTYPES, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aDURATION, 1, 
    			STAFCommandParser.VALUEREQUIRED);

		fExecuteParser.addOption(aTESTSUITES, 1,
				STAFCommandParser.VALUEREQUIRED);

        // this means you must have one of the following options, but not multiple
        // fExecuteParser.addOptionGroup(aSUITE + " " + aDIRECTORY, 1, 1);
        
        // Any of these could appear 0 or 1 time
        fExecuteParser.addOptionGroup(aSUITE, 0, 1);
        fExecuteParser.addOptionGroup(aDIRECTORY, 0, 1);
        fExecuteParser.addOptionGroup(aTESTCASE, 0, 1);
        fExecuteParser.addOptionGroup(aWSTEST, 0, 1);
        fExecuteParser.addOptionGroup(aRUNWSDLTESTS, 0, 1);
        fExecuteParser.addOptionGroup(aTESTSUITES, 0, 1);
        
        fExecuteParser.addOptionGroup(aSETUP, 0, 1);
        fExecuteParser.addOptionGroup(aAREAS, 0, 1);
        fExecuteParser.addOptionGroup(aEXCLUDES, 0, 1);
        fExecuteParser.addOptionGroup(aBITS, 0, 1);
        fExecuteParser.addOptionGroup(aHOSTS, 0, 1);
        fExecuteParser.addOptionGroup(aTYPES, 0, 1);
        fExecuteParser.addOptionGroup(aDURATION, 0, 1);
        fExecuteParser.addOptionGroup(aLOGDIR, 0, 1);
        fExecuteParser.addOptionGroup(aLOG4JPROPERTIESFILE, 0, 1);
        
        // Make sure that all the options line up correctly.
        fExecuteParser.addOptionNeed(aZIMBRAQAROOT, aEXECUTE);
        fExecuteParser.addOptionNeed(aSUITE, aZIMBRAQAROOT);
        fExecuteParser.addOptionNeed(aDIRECTORY, aZIMBRAQAROOT);
        fExecuteParser.addOptionNeed(aTESTCASE, aZIMBRAQAROOT);
        fExecuteParser.addOptionNeed(aWSTEST, aZIMBRAQAROOT);
        fExecuteParser.addOptionNeed(aTESTSUITES, aZIMBRAQAROOT);
        
        //
        // QUERY parser
        fQueryParser = new STAFCommandParser();

        fQueryParser.addOption(aQUERY, 1, 
                               STAFCommandParser.VALUENOTALLOWED);

        // HALT parser
        fHaltParser = new STAFCommandParser();

        fHaltParser.addOption(aHALT, 1, 
                               STAFCommandParser.VALUENOTALLOWED);

                                       

        // Register Help Data

        registerHelpData(
            kDeviceInvalidSerialNumber,
            "Invalid serial number", 
            "A non-numeric value was specified for serial number");

        
        
		// Now, do the SoapTestCore specific stuff ...
		// Set up Log4j
        PropertyConfigurator.configure(mDefaultConfiguratorFile);
		
        // Set up SSL
		// Always accept self-signed SSL certificates.
		SocketFactories.registerProtocols(true);
        

		
		// Now, the service is ready ...
		mLog.info("StafTestStaf: Ready ...");

        
        return (new STAFResult(rc));
    }  

    public STAFResult acceptRequest(STAFServiceInterfaceLevel30.RequestInfo info)
    {               

		// Refresh Log4j
        PropertyConfigurator.configure(mDefaultConfiguratorFile);
		
        mLog.info("StafTestStaf: acceptRequest ...");

    	String lowerRequest = info.request.toLowerCase();
        StringTokenizer requestTokenizer = new StringTokenizer(lowerRequest);
        String request = requestTokenizer.nextToken();

        // call the appropriate method to handle the command
        if (request.equals(aEXECUTE.toLowerCase()))
        {
            return handleExecute(info);
        }
        else if (request.equals(aQUERY.toLowerCase()))
        {
            return handleQuery(info);
        }
        else if (request.equals(aHALT.toLowerCase()))
        {
            return handleHalt(info);
        }
        else if (request.equals(aHELP.toLowerCase()))
        {
            return handleHelp();
        }
        else if (request.equals(aVERSION.toLowerCase()))
        {
            return handleVersion();
        }
        else
        {
            return new STAFResult(STAFResult.InvalidRequestString,
                                  "Unknown SoapTestCore (STAF) Request: " + 
                                  lowerRequest);
        }
    }

    private STAFResult handleHelp()
    {

        mLog.info("StafTestStaf: handleHelp ...");

    	// TODO: Need to convert the help command into the variables, aEXECUTE, aHELP, etc.
        return new STAFResult(STAFResult.Ok,
         "StafTest Service Help" + fLineSep
         + fLineSep + 
         "EXECUTE <Zimbra Server> [ DOMAIN <Default Domain> ] [ ADMIN <Admin Server> ] " + fLineSep +
         "ZIMBRAQAROOT <full path> ( SUITE <smoke | full> | DIRECTORY <full path> | WSTEST <Package Name like com.zimbra.qa.soapws.tests  OR test class name like  com.zimbra.qa.soapws.tests.admin.BasicAccountRequestTest >) " + fLineSep +
         "optional [ TESTCASE <id> | SETUP <full path> | RUNWSDLTESTS <true|false> | |AREAS <a> | BITS <open | network> | HOSTS <#> | TYPES <t> | LOG <dir path> | LOG4J <prop file> " + fLineSep + 
         fLineSep + 
         "QUERY <job> -- TBD: should return statistics on active jobs " + fLineSep +
         fLineSep + 
         "VERSION" + fLineSep + 
         fLineSep + 
         "HALT (not supported)" + fLineSep + 
         fLineSep + 
         "HELP");
    }
    
    private STAFResult handleVersion()
    {
        mLog.info("StafTestStaf: handleVersion ...");
        return new STAFResult(STAFResult.Ok, kVersion);
    }
    

    private STAFResult handleExecute(STAFServiceInterfaceLevel30.RequestInfo info) 
    {

        mLog.info("StafTestStaf: handleExecute ...");

    	// Check whether Trust level is sufficient for this command.
        if (info.trustLevel < 4)
        {   
            
        	return new STAFResult(STAFResult.AccessDenied, 
                "Trust level 4 required for EXECUTE request." + fLineSep +
                "The requesting machine's trust level: " +  info.trustLevel); 
            
        }    

        
        
        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fExecuteParser.parse(info.request);
     
        if (parsedRequest.rc != STAFResult.Ok)
        {
        	
            return new STAFResult(STAFResult.InvalidRequestString,
                                  parsedRequest.errorBuffer);
            
        }

        // Initialize the return result
        int resultCode = STAFResult.Ok;
        StringBuffer resultString = new StringBuffer();
        

        if (fAlreadyRunning) {
        	return (new STAFResult(STAFResult.Ok, "already running"));
        }
        
		try {
			
			fAlreadyRunning = true;
		
			// Reset counts
			resetStafTestCoreSettings();

			

            // Make the appropriate settings in the soap test object
	        parseExecute(parsedRequest);

			// Make sure that the test case root FILE was opened.
			if ( SoapTestMain.sHarnessTestCases == null && SoapTestMain.sHarnessTestSuite == null && SoapTestMain.testPackageOrClassName.equals("")  ) {
				resultString.append("Test Case Root or File is not opened!");
				return (new STAFResult(STAFResult.JavaError, resultString.toString()));			
			}
			
	    	// Intialize the recorder for SOAP requests
	    	PerformanceStatistics.initialize();

			// Execute the tests
			try
			{
				
				// Execute the tests
				resultString.append(SoapTestMain.execute());
				
				
				mLog.info("resultString: " + resultString.toString());
				mLog.info("\n\nTest finished: " + ( SoapTestMain.mTotalTestCasePass + SoapTestMain.mTotalTestCaseFail > 0 ? "FAIL" : "PASS"));
	
			
			
			} catch (Exception e) {
				
				mLog.fatal("STAF test execution threw an exception", e);
				resultCode = STAFResult.JavaError;
				
	    	} finally {
	    		
	        	// Write Results-Soap.xml
	        	ResultsXml.writeResultsFile(SoapTestCore.mLogDirectory);
	    		
	            // Build the parsable return result
	            resultString.append("\n");
	            resultString.append("Executed:" + (SoapTestMain.mTotalTestCasePass + SoapTestMain.mTotalTestCaseFail) +"\n");
	            resultString.append("Pass:" + SoapTestMain.mTotalTestCasePass +"\n");
	            resultString.append("Fail:" + SoapTestMain.mTotalTestCaseFail +"\n");
	            resultString.append("Script Errors:" + SoapTestMain.mTotalTestCaseError +"\n\n");

	            if (SoapTestMain.sFailedTestFiles.size() > 0) {
	                resultString.append("These tests had failures:" + "\n");
	                for (String filename : SoapTestMain.sFailedTestFiles)
	                    resultString.append("	").append(filename).append("\n");
	            }

	            if (SoapTestMain.sExceptionTestFiles.size() > 0) {
	                resultString.append("These tests had exceptions:" + "\n");
	                for (String filename : SoapTestMain.sExceptionTestFiles)
	                    resultString.append("	").append(filename).append("\n");
	            }

	            resultString.append("\n\nTest finished: " + ( (SoapTestMain.mTotalTestCaseFail + SoapTestMain.mTotalTestCaseError > 0) ? "FAIL" : "PASS") + "\n");
	            
	            // Write the pass/fail results to file
	    		writeTestSummaryTxt(SoapTestCore.mLogDirectory, 
	    				SoapTestMain.mTotalTestCasePass, 
	    				SoapTestMain.mTotalTestCaseFail, 
	    				SoapTestMain.mTotalTestCaseError);	            

	    		// Write Results-Soap.xml for rerun
	        	ResultsXml.writeResultsFile(SoapTestCore.mLogDirectory);
	    		
	            // Build the parsable return result for rerun
	            resultString.append("======================================================================================\n");
	            resultString.append("Rerun Executed:" + (SoapTestMain.mTotalRerunTestCasePass + SoapTestMain.mTotalRerunTestCaseFail) +"\n");
	            resultString.append("Pass:" + SoapTestMain.mTotalRerunTestCasePass +"\n");
	            resultString.append("Fail:" + SoapTestMain.mTotalRerunTestCaseFail +"\n");
	            resultString.append("Script Errors:" + SoapTestMain.mTotalRerunTestCaseError +"\n\n");

	            if (SoapTestMain.sFailedRerunTestFiles.size() > 0) {
	                resultString.append("These rerun tests had failures:" + "\n");
	                for (String filename : SoapTestMain.sFailedRerunTestFiles)
	                    resultString.append("	").append(filename).append("\n");
	            }

	            if (SoapTestMain.sExceptionRerunTestFiles.size() > 0) {
	                resultString.append("These rerun tests had exceptions:" + "\n");
	                for (String filename : SoapTestMain.sExceptionRerunTestFiles)
	                    resultString.append("	").append(filename).append("\n");
	            }

	            resultString.append("\n\nRerun Test finished: " + ( (SoapTestMain.mTotalRerunTestCaseFail + SoapTestMain.mTotalRerunTestCaseError > 0) ? "FAIL" : "PASS") + "\n");

	            
	            // Write the pass/fail results to file
	    		writeTestSummaryTxt(SoapTestCore.mLogDirectory, 
	    				SoapTestMain.mTotalRerunTestCasePass, 
	    				SoapTestMain.mTotalRerunTestCaseFail, 
	    				SoapTestMain.mTotalRerunTestCaseError);
	    		
	    		// Close out the log file
	    		if ( executeAppender != null ) {
	    			mLog.removeAppender(executeAppender);
	    			executeAppender.close();
	    			executeAppender = null;
	    		}
	    		
		        // Record the performance statistics
		        PerformanceStatistics.writeReport(SoapTestCore.mLogDirectory);
		        PerformanceStatistics.destroy();
		        

	    		SoapTestCore.mLogDirectory = null;
		    		
	    	}


		} finally {
			resetStafTestCoreSettings();
			fAlreadyRunning = false;
		}

		// Return ok code with the parsable return string
		return (new STAFResult(resultCode, resultString.toString()));

		
        
    }
    
    
    private void parseExecute(STAFCommandParseResult parsedRequest) {
    

        if ( parsedRequest.optionTimes(aLOG4JPROPERTIESFILE) > 0 ) {
            
        	String log4jPropertiesFile = parsedRequest.optionValue(aLOG4JPROPERTIESFILE);
				
        	mLog.debug(aLOG4JPROPERTIESFILE + " is " + log4jPropertiesFile);
	        	
            PropertyConfigurator.configure(log4jPropertiesFile);
        	
        }

        if ( parsedRequest.optionTimes(aLOGDIR) > 0 ) {
            
        	// TODO: should be able to specify multiple log dirs.
        	SoapTestCore.mLogDirectory = parsedRequest.optionValue(aLOGDIR);
        	String logFileName = SoapTestCore.mLogDirectory + "/" + mLogFileName;
        	mLog.debug(aLOGDIR + " is " + SoapTestCore.mLogDirectory);

        	
        	
	        	
        	try {
        		
            	// Create the folder, if it doesn't exist
            	File path = new File(SoapTestCore.mLogDirectory);
            	path.mkdirs();
            	
	        	// Remove any previous appender
            	if ( executeAppender != null ) {
            		mLog.removeAppender(executeAppender);
            		executeAppender.close();
            		executeAppender=null;
            	}
            	
            	
            	// Create a new log file
	        	executeAppender = new FileAppender(new PatternLayout("%m%n"), logFileName, false);
	        	
	        	mLog.addAppender(executeAppender);
				mLog.debug("added " + logFileName);

			} catch (IOException e) {
				
				mLog.warn("unable to set logger to: " + logFileName + ": " + e.toString());
				if ( executeAppender != null ) {
	    			mLog.removeAppender(executeAppender);
	    			executeAppender.close();
					executeAppender = null;
				}
				SoapTestCore.mLogDirectory = null;
				
			}
        	
        	
        }
        
        if ( parsedRequest.optionTimes(aEXECUTE) > 0 ) {
        	
	    	// The first value is the server host name (or proxy server)
        	// Additional server names can be specified for the other multihost servers (not implemented)
        	//
        	
//        	int numOptions = parsedRequest.optionTimes(aEXECUTE);

	    	fSoapZimbraServerName = parsedRequest.optionValue(aEXECUTE, 1);
	    	// TODO: For some reason, I can't get the multiple arguments to work correctly
	    	// String zimbraDefaultDomain = ( (parsedRequest.optionTimes(aEXECUTE) > 1) ? parsedRequest.optionValue(aEXECUTE, 2) : fSoapZimbraServerName );
	    	
	    	// All tests should point to zimbraServer
	    	mLog.debug("parseExecute: zimbraServer is " + fSoapZimbraServerName);
	    	mLog.debug("parseExecute: zimbraDefaultDomain is " + fSoapZimbraServerName);

	    	// The first value is always the server hostname
	    	SoapTestMain.setZimbraServerName(fSoapZimbraServerName, 0);
	    	SoapTestMain.setZimbraAdminServer(fSoapZimbraServerName);
	    	SoapTestMain.setZimbraDefaultDomain(fSoapZimbraServerName, 0);
	    	
	    	// TODO: Need to process multihost values, too
	        
        }
        
        if ( parsedRequest.optionTimes(aDOMAIN) > 0 ) {
        	

	    	String zimbraDefaultDomain = parsedRequest.optionValue(aDOMAIN, 1);
	    	
	    	// All tests should point to zimbraServer
	    	mLog.debug("parseExecute: zimbraDefaultDomain is " + zimbraDefaultDomain);

	    	// The first value is always the server hostname
	    	SoapTestMain.setZimbraDefaultDomain(zimbraDefaultDomain, 0);
	        
        }
        
        if ( parsedRequest.optionTimes(aADMIN) > 0 ) {
        	

	    	String zimbraAdminServer = parsedRequest.optionValue(aADMIN, 1);
	    	
	    	// All tests should point to zimbraServer
	    	mLog.debug("parseExecute: zimbraAdminServer is " + zimbraAdminServer);

	    	// The first value is always the server hostname
	    	SoapTestMain.setZimbraAdminServer(zimbraAdminServer);
	        
        }
        
        // This must come after aEXECUTE, since that will specify the server name and default domain
        if ( parsedRequest.optionTimes(aZIMBRAQAROOT) > 0 ) {
        	
	    	String folderRoot = parsedRequest.optionValue(aZIMBRAQAROOT);
	    	mLog.debug("zimbraQaRoot is " + folderRoot);
	        
	        // Set up some default files
	    	//
        	try {
        		
				SoapTestCore.rootZimbraQA = new File(folderRoot).getCanonicalPath();
	            mLog.debug(aDIRECTORY + " is " + SoapTestCore.rootZimbraQA);

        	} catch (IOException e) {
				mLog.error("Unable to determine rootZimbraQA " + folderRoot, e);
			}
	        

	        try {
	        	
	        	SoapTestMain.globalPropertiesFile = new String(folderRoot + "/conf/global.properties");
	        	SoapTestMain.globalProperties = new Properties();
	        	SoapTestMain.readGlobalProperties(SoapTestMain.globalPropertiesFile);
	        	
		        mLog.debug("default fPropsGlobal is " + SoapTestMain.globalPropertiesFile);
		        
			} catch (Exception e) {
				mLog.error("Can't read the global properties file.  Global Properties is empty", e);
			}


        }
        
        if ( parsedRequest.optionTimes(aDIRECTORY) > 0 ) {

        	// Reset fXMLRoot to whatever was specified on the command line
        	SoapTestMain.sHarnessTestCases = new File(parsedRequest.optionValue(aDIRECTORY));           
            
            if ( parsedRequest.optionTimes(aSUITE) > 0 ) {
            	
            	String value = parsedRequest.optionValue(aSUITE);
            	mLog.debug(aSUITE + " is " + value);
            	
            	
            	// Set the test case types accordingly
            	if ( value.equalsIgnoreCase("SANITY") ) {
            		SoapTestMain.sHarnessTestCases = new File(SoapTestCore.rootZimbraQA + "/data/soapvalidator/SanityTest");
            	}
        	}
            
            mLog.debug(aDIRECTORY + " is " + SoapTestMain.sHarnessTestCases);

		} else if (parsedRequest.optionTimes(aTESTSUITES) > 0) {

			// Reset fXMLRoot to whatever was specified on the command line
			SoapTestMain.sHarnessTestSuite = new File(parsedRequest.optionValue(aTESTSUITES));

			if (parsedRequest.optionTimes(aSUITE) > 0) {

				String value = parsedRequest.optionValue(aSUITE);
				mLog.debug(aSUITE + " is " + value);

				// Set the test case types accordingly
				if (value.equalsIgnoreCase("SANITY")) {
					SoapTestMain.sHarnessTestCases = new File(
							SoapTestCore.rootZimbraQA + "/data/soapvalidator/SanityTest");
				}
			}

			mLog.debug(aTESTSUITES + " is " + SoapTestMain.sHarnessTestSuite);

		} else  if ( parsedRequest.optionTimes(aSUITE) > 0 ) {
            	
            	String value = parsedRequest.optionValue(aSUITE);
            	mLog.debug(aSUITE + " is " + value);
            	
            	
            	// Set the test case types accordingly
            	if ( value.equalsIgnoreCase("SANITY") ) {
            		SoapTestMain.sHarnessTestCases = new File(SoapTestCore.rootZimbraQA + "/data/soapvalidator/SanityTest");
            	}else{
				// Use the default XML path (soap tests)
            		SoapTestMain.sHarnessTestCases = new File(SoapTestCore.rootZimbraQA + "/data/soapvalidator");
            	}
            	mLog.debug("default "+ aDIRECTORY +" is " + SoapTestMain.sHarnessTestCases);   
        } 
        
        if( parsedRequest.optionTimes(aWSTEST) > 0 ) {
        		SoapTestMain.testPackageOrClassName = parsedRequest.optionValue(aWSTEST);
        		if ( parsedRequest.optionTimes(aDIRECTORY) == 0 ) {
        			SoapTestMain.sHarnessTestCases=null;
        		}
        		mLog.debug(aWSTEST + " is " + SoapTestMain.testPackageOrClassName);
        		
        } 

        if ( parsedRequest.optionTimes(aRUNWSDLTESTS) > 0 ) {
        	String value = parsedRequest.optionValue(aRUNWSDLTESTS);
        	SoapTestMain.runWsdlTests=Boolean.valueOf(value);
            mLog.debug(aRUNWSDLTESTS + " is " + SoapTestMain.runWsdlTests);
        }

        if ( parsedRequest.optionTimes(aTESTCASE) > 0 ) {
            
        	SoapTestMain.testCaseId = parsedRequest.optionValue(aTESTCASE);
            
            mLog.debug(aTESTCASE + " is " + SoapTestMain.testCaseId);
            
        } 
        
        if ( parsedRequest.optionTimes(aSETUP) > 0 ) {
            
        	SoapTestMain.sSetupXmlScript = new File(parsedRequest.optionValue(aSETUP));
            
            mLog.debug(aSETUP + " is " + SoapTestMain.sSetupXmlScript);
            
        } 
        
        if ( parsedRequest.optionTimes(aAREAS) > 0 ) {
            
        	String value = parsedRequest.optionValue(aAREAS);
        	SoapTestCore.testAreas = new ArrayList<String>(Arrays.asList(value.split(",")));
       
        	mLog.debug(aAREAS + " is " + value);
        }

        if ( parsedRequest.optionTimes(aEXCLUDES) > 0 ) {
            
        	String value = parsedRequest.optionValue(aEXCLUDES);
        	SoapTestCore.testExcludes = new ArrayList<String>(Arrays.asList(value.split(",")));
       
        	mLog.debug(aEXCLUDES + " is " + value);
        }

        
        if ( parsedRequest.optionTimes(aTYPES) > 0 ) {
            
        	String value = parsedRequest.optionValue(aTYPES);
        	SoapTestCore.testType = new ArrayList<String>(Arrays.asList(value.split(",")));
       
        	mLog.debug(aTYPES + " is " + value);
        }

        if ( parsedRequest.optionTimes(aDURATION) > 0 ) {
            
        	SoapTestCore.testDuration = parsedRequest.optionValue(aDURATION);
       
        	mLog.debug(aDURATION + " is " + SoapTestCore.testDuration);
        }

        if ( parsedRequest.optionTimes(aHOSTS) > 0 ) {
            
        	SoapTestCore.hostCount = Integer.valueOf(parsedRequest.optionValue(aHOSTS));
       
        	mLog.debug(aHOSTS + " is " + SoapTestCore.hostCount);
        }

        if ( parsedRequest.optionTimes(aBITS) > 0 ) {
            
        	SoapTestCore.testServerBits = parsedRequest.optionValue(aBITS);
       
        	mLog.debug(aBITS + " is " + SoapTestCore.testServerBits);
        }
        

        if ( parsedRequest.optionTimes(aSUITE) > 0 ) {
        	
        	String value = parsedRequest.optionValue(aSUITE);
        	mLog.debug(aSUITE + " is " + value);
        	
        	
        	// Set the test case types accordingly
        	if ( value.equalsIgnoreCase("SANITY") ) {
            	SoapTestCore.testType = new ArrayList<String>(Arrays.asList("sanity".split(",")));            	
        	} else if ( value.equalsIgnoreCase("SMOKE") ) {
            	SoapTestCore.testType = new ArrayList<String>(Arrays.asList("sanity,smoke".split(",")));        		
        	} else if ( value.equalsIgnoreCase("FULL") ) {
        		SoapTestCore.testType = null;        		
        	} else if (value!=null){
        		SoapTestCore.testType =new ArrayList<String>(Arrays.asList(value.split(",")));   ;		       		
        	} else {
        		SoapTestCore.testType=null; // default - All tests
        	}
       
        	mLog.debug(aSUITE + " is " + value);
	        
        }
        

        
    }

    private STAFResult handleHalt(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafTestStaf: handleHalt ...");

    	// Check whether Trust level is sufficient for this command.
        if (info.trustLevel < 4)
        {   
            
        	return new STAFResult(STAFResult.AccessDenied, 
                "Trust level 4 required for HALT request." + fLineSep +
                "The requesting machine's trust level: " +  info.trustLevel); 
            
        }    

        
        
        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fHaltParser.parse(info.request);
     
        if (parsedRequest.rc != STAFResult.Ok)
        {
        	
            return new STAFResult(STAFResult.InvalidRequestString,
                                  parsedRequest.errorBuffer);
            
        }

        String resultString = "Not supported";

		
		// Return ok code with the parsable return string
		return (new STAFResult(STAFResult.Ok, resultString));

		
        
    }
    
    private STAFResult handleQuery(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafTestStaf: handleQuery ...");

        // Check whether Trust level is sufficient for this command.
        if (info.trustLevel < 2)
        {   
            return new STAFResult(STAFResult.AccessDenied, 
                "Trust level 2 required for QUERY request. Requesting " +
                "machine's trust level: " +  info.trustLevel); 
        }        


        STAFCommandParseResult parsedRequest = fQueryParser.parse(info.request);
                   
        if (parsedRequest.rc != STAFResult.Ok)
        {
            return new STAFResult(STAFResult.InvalidRequestString,
                                  parsedRequest.errorBuffer);
        }

        StringBuffer resultString = new StringBuffer();

        // If there is a soap test outstanding, report the current results
        if ( !fAlreadyRunning ) {

        	resultString.append("Not Running." + fLineSep);

        } else {
        	        		
        	// Print the high level results
        	resultString.append("In Progress:" + fLineSep +
        	"Executed:" + (SoapTestMain.mTotalTestCasePass + SoapTestMain.mTotalTestCaseFail) + fLineSep +
			"Pass:" + SoapTestMain.mTotalTestCasePass + fLineSep +
			"Fail:" + SoapTestMain.mTotalTestCaseFail + fLineSep +
			"Script Errors:" + SoapTestMain.mTotalTestCaseError + fLineSep);
        	resultString.append(fLineSep);
        	

			if ( (SoapTestMain.sFailedTestFiles != null) && (SoapTestMain.sFailedTestFiles.size() > 0)) {
				resultString.append("These tests have failures:").append(fLineSep);
				for (String filename : SoapTestMain.sFailedTestFiles)
					resultString.append("	").append(filename).append(fLineSep);
				resultString.append(fLineSep);
			}
			
			if ( (SoapTestMain.sExceptionTestFiles != null) && (SoapTestMain.sExceptionTestFiles.size() > 0)) {
				resultString.append("These tests have exceptions:").append(fLineSep);
				for (String filename : SoapTestMain.sExceptionTestFiles)
					resultString.append("	").append(filename).append(fLineSep);
				resultString.append(fLineSep);
			}
			
			// Print the test constraints, too
			
        	// Print the high level rerun results
        	resultString.append("In Progress:" + fLineSep +
        	"Rerun Executed:" + (SoapTestMain.mTotalRerunTestCasePass + SoapTestMain.mTotalRerunTestCaseFail) + fLineSep +
			"Pass:" + SoapTestMain.mTotalRerunTestCasePass + fLineSep +
			"Fail:" + SoapTestMain.mTotalRerunTestCaseFail + fLineSep +
			"Script Errors:" + SoapTestMain.mTotalRerunTestCaseError + fLineSep);
        	resultString.append(fLineSep);
        	

			if ( (SoapTestMain.sFailedRerunTestFiles != null) && (SoapTestMain.sFailedRerunTestFiles.size() > 0)) {
				resultString.append("These tests have failures:").append(fLineSep);
				for (String filename : SoapTestMain.sFailedRerunTestFiles)
					resultString.append("	").append(filename).append(fLineSep);
				resultString.append(fLineSep);
			}
			
			if ( (SoapTestMain.sExceptionRerunTestFiles != null) && (SoapTestMain.sExceptionRerunTestFiles.size() > 0)) {
				resultString.append("These tests have exceptions:").append(fLineSep);
				for (String filename : SoapTestMain.sExceptionRerunTestFiles)
					resultString.append("	").append(filename).append(fLineSep);
				resultString.append(fLineSep);
			}
			
			// Print the test constraints, too
			
	        resultString.append("Server type: " + SoapTestCore.testServerBits + fLineSep);
	        resultString.append("Areas: ");
	        if (SoapTestCore.testAreas == null) {
		        resultString.append(" default (all)" + fLineSep);
	        } else {
	        	for (Iterator<String> i = SoapTestCore.testAreas.iterator(); i.hasNext(); )
	        	{
	        		resultString.append(i.next() + " ");
	        	}
	    		resultString.append(fLineSep);
	    	}
	        resultString.append("Types: ");
	        if (SoapTestCore.testType == null) {
		        resultString.append(" default (all)" + fLineSep);
	        } else {
	        	for (Iterator<String> i = SoapTestCore.testType.iterator(); i.hasNext(); )
	        	{
	        		resultString.append(i.next() + " ");
	        	}
	    		resultString.append(fLineSep);
	    	}
	        resultString.append("Excluding Types: ");
	        if (SoapTestCore.testAreasToSkip == null) {
		        resultString.append(" default (none)" + fLineSep);
	        } else {
	        	for (Iterator<String> i = SoapTestCore.testAreasToSkip.iterator(); i.hasNext(); )
	        	{
	        		resultString.append(i.next() + " ");
	        	}
	    		resultString.append(fLineSep);
	    	}
	        resultString.append("Excluding: ");
	        if (SoapTestCore.testExcludes == null) {
		        resultString.append(" default (none)" + fLineSep);
	        } else {
	        	for (Iterator<String> i = SoapTestCore.testExcludes.iterator(); i.hasNext(); )
	        	{
	        		resultString.append(i.next() + " ");
	        	}
	    		resultString.append(fLineSep);
	    	}
	        resultString.append("SUT Host Count " + SoapTestCore.hostCount + fLineSep);
	        resultString.append("Debug Logs in " + SoapTestCore.mLogDirectory + fLineSep);	        	
			
	        
	        // If there is a current SOAP script, print it
			for (Iterator iter = SoapTestCore.mCurrTestFiles.iterator(); iter.hasNext();) {
		        resultString.append("Current Test Script: " + ((String) iter.next()) + fLineSep);	        		        	
	        }
	        
	        
	        resultString.append(fLineSep);
				
        	
        }
        	

        return new STAFResult(STAFResult.Ok, resultString.toString() );    }
    
    
    public STAFResult term()
    {      
        try
        {
            // Un-register Help Data

            unregisterHelpData(kDeviceInvalidSerialNumber);

            // Un-register the service handle

            fHandle.unRegister();
        }
        catch (STAFException ex)
        {            
            return (new STAFResult(STAFResult.STAFRegistrationError));
        }
        
        return (new STAFResult(STAFResult.Ok));
    }

        // this method will resolve any STAF variables that
        // are contained within the Option Value
    @SuppressWarnings("unused")
    private STAFResult resolveVar(String machine, String optionValue, 
                                  int handle)
    {
        String value = "";
        STAFResult resolvedResult = null;

        if (optionValue.indexOf("{") != -1)
        {
            resolvedResult =
                fHandle.submit2(machine, "var", "handle " + handle + 
                                " resolve " + optionValue);

            if (resolvedResult.rc != 0)
            {
                return resolvedResult;
            }

            value = resolvedResult.result;
        }
        else
        {
            value = optionValue;
        }

        return new STAFResult(STAFResult.Ok, value);
    }
    
    @SuppressWarnings("unused")
    private String getStafRootDir() {
    	return (resolveSystemVar("STAF/Config/STAFRoot"));
    }

    
    private String resolveSystemVar(String variable) {

    	String value = null;
    	
    	if ( (variable != null) && (!variable.equals("")) ) {
    		STAFResult varResult =
    			fHandle.submit2("local", "var", "get system var " + variable);
    		if ( varResult.rc == 0 ) {
    			value = varResult.result;
    		}
    	}
    	return (value);
    }

    // Register error codes for the STAX Service with the HELP service

    private void registerHelpData(int errorNumber, String info,
                                  String description)
    {
        @SuppressWarnings("unused") STAFResult res = fHandle.submit2("local", "HELP",
                         "REGISTER SERVICE " + fServiceName +
                         " ERROR " + errorNumber +
                         " INFO " + STAFUtil.wrapData(info) +
                         " DESCRIPTION " + STAFUtil.wrapData(description));
    }

    // Un-register error codes for the STAX Service with the HELP service

    private void unregisterHelpData(int errorNumber)
    {
        @SuppressWarnings("unused") STAFResult res = fHandle.submit2("local", "HELP",
                         "UNREGISTER SERVICE " + fServiceName +
                         " ERROR " + errorNumber);
    }


    
    private void resetStafTestCoreSettings() {

    	SoapTestMain.mTotalTestCasePass = 0;
    	SoapTestMain.mTotalTestCaseFail = 0;
    	SoapTestMain.mTotalTestCaseError = 0;
    	SoapTestMain.mTotalRerunTestCasePass = 0;
    	SoapTestMain.mTotalRerunTestCaseFail = 0;
    	SoapTestMain.mTotalRerunTestCaseError = 0;
    	SoapTestMain.testCaseId = null;
    	SoapTestMain.sFailedTestFiles = new ArrayList<String>();
    	SoapTestMain.sExceptionTestFiles = new ArrayList<String>();
    	SoapTestMain.sFailedRerunTestFiles = new ArrayList<String>();
    	SoapTestMain.sExceptionRerunTestFiles = new ArrayList<String>();

    	SoapTestCore.rootZimbraQA = null;
    	SoapTestCore.testAreas = null;
    	SoapTestCore.testType = null;
    	SoapTestCore.testDuration = null;
    	SoapTestCore.hostCount = 1;
    	SoapTestCore.testServerBits = "network";
    	SoapTestCore.mCurrTestFiles.clear();
    	SoapTestCore.mCounter.set(0);
    	
    	SoapTest.zimbraMailboxServers = new ArrayList<String>();
    	MailInjectTest.zimbraMtaServers = new ArrayList<String>();
    	
    	ResultsXml.initialize();
    	
    	Test.usingStaf = true;
    	    	
    }

    public static void writeTestSummaryTxt(String dir, int pass, int fail, int errors) {
    	
    	Properties summary = new Properties();
    	
    	summary.setProperty("Passed", Integer.toString(pass));
    	summary.setProperty("Failed", Integer.toString(fail));
    	summary.setProperty("Errors", Integer.toString(errors));
    	   	
    	FileOutputStream fos = null;
		try {
			
			
			fos = new FileOutputStream(dir + File.separator + "testsummary.txt");
			summary.store(fos, null);
	    	
		} catch (FileNotFoundException e) {
			mLog.error("Unable to write testsummary.txt to " + dir + File.separator + "testsummary.txt", e);
		} catch (IOException e) {
			mLog.error("Unable to write testsummary.txt to " + dir + File.separator + "testsummary.txt", e);
		}finally{			
			Utilities.close(fos, mLog);			
		}
    	
    	
    }

    
}

