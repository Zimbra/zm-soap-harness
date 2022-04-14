package com.zimbra.qa.nunit;


import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Properties;
import java.util.StringTokenizer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.config.Configurator;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFResult;
import com.ibm.staf.STAFUtil;
import com.ibm.staf.service.STAFCommandParseResult;
import com.ibm.staf.service.STAFCommandParser;
import com.ibm.staf.service.STAFServiceInterfaceLevel30;



public class StafService implements STAFServiceInterfaceLevel30  {

    
	private final String kVersion = "1.1.0"; // ???
	private final String kName = "Nunit";
	
    private static final int kDeviceInvalidSerialNumber = 4001;

	// Basic Debug Logger
    static private Logger mLog = LogManager.getLogger(StafService.class);
    static private final String mDefaultConfiguratorFile = "/opt/qa/soapvalidator/conf/log4jSTAF.properties";
    
    static private final String mCurrentStatusFile = "/Program Files/ZimbraQA/current.txt";

	// STAF Specifics
    private String fServiceName;
    private STAFHandle fHandle;
    private STAFCommandParser fExecuteParser;
    private STAFCommandParser fQueryParser;
    private STAFCommandParser fHaltParser;

    // STAF Commands
    private String	aEXECUTE = "EXECUTE";
    private String	aZIMBRAQAROOT = "ZIMBRAQAROOT";
    private String	aSUITE = "SUITE";
    private String	aPACKAGE = "PACKAGE";
    private String	aTESTCASE = "TESTCASE";
    private String	aAREAS = "AREAS";
	private String	aEXCLUDES = "EXCLUDES";
    private String	aBITS = "BITS";
    private String	aLOGDIR = "LOG";
    private String	aLOG4JPROPERTIESFILE = "LOG4J";
    
    private String	aQUERY = "QUERY";
    
    private String	aHALT = "HALT";
    
    private String	aVERSION = "VERSION";
    
    private String	aHELP = "HELP";
   
    


    
    public StafService() {
	}
	
    // STAFServiceInterfaceLevel30
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

    // STAFServiceInterfaceLevel30
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
        // EXECUTE <zimbra server> < SMOKE | FULL | DIRECTORY <DIR> | FILE <FILE> | TESTCASE <ID> > [ AREAS | BITS | HOSTS | TYPES ] 
        fExecuteParser = new STAFCommandParser();

        // EXECUTE
        fExecuteParser.addOption(aEXECUTE, 1, 
                STAFCommandParser.VALUEREQUIRED); // argument is the server under test

        // Need the ZimbraQA root to get to global.properties
        fExecuteParser.addOption(aZIMBRAQAROOT, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        // Types of EXECUTE - one of SUITE, DIRECTORY, FILE, or TESTCASE
        fExecuteParser.addOption(aSUITE, 1, 
        		STAFCommandParser.VALUEREQUIRED);  // No arg for SMOKE
                             
        fExecuteParser.addOption(aPACKAGE, 1, 
        		STAFCommandParser.VALUEREQUIRED);
                
        fExecuteParser.addOption(aTESTCASE, 1, 
    			STAFCommandParser.VALUEREQUIRED);
    
        // Optional LOG argument
        fExecuteParser.addOption(aLOGDIR, 1, 
    			STAFCommandParser.VALUEREQUIRED);
    
        // Optional LOG4J argument
        fExecuteParser.addOption(aLOG4JPROPERTIESFILE, 1, 
    			STAFCommandParser.VALUEREQUIRED);
    
        // Optional test parameters

        fExecuteParser.addOption(aAREAS, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aEXCLUDES, 1, 
    			STAFCommandParser.VALUEREQUIRED);

        fExecuteParser.addOption(aBITS, 1, 
    			STAFCommandParser.VALUEREQUIRED);



        // this means you must have one of the following options, but not multiple
        // fExecuteParser.addOptionGroup(aSUITE + " " + aDIRECTORY, 1, 1);
        
        // Any of these could appear 0 or 1 time
        fExecuteParser.addOptionGroup(aSUITE, 0, 1);
        fExecuteParser.addOptionGroup(aPACKAGE, 0, 1);
        fExecuteParser.addOptionGroup(aTESTCASE, 0, 1);
        
        fExecuteParser.addOptionGroup(aAREAS, 0, 1);
        fExecuteParser.addOptionGroup(aEXCLUDES, 0, 1);
        fExecuteParser.addOptionGroup(aBITS, 0, 1);
        fExecuteParser.addOptionGroup(aLOGDIR, 0, 1);
        fExecuteParser.addOptionGroup(aLOG4JPROPERTIESFILE, 0, 1);
        
        // Make sure that all the options line up correctly.
        fExecuteParser.addOptionNeed(aZIMBRAQAROOT, aEXECUTE);
        fExecuteParser.addOptionNeed(aSUITE, aZIMBRAQAROOT);
        fExecuteParser.addOptionNeed(aPACKAGE, aZIMBRAQAROOT);
        fExecuteParser.addOptionNeed(aTESTCASE, aZIMBRAQAROOT);
        
        //
        // QUERY parser
        fQueryParser = new STAFCommandParser();

        fQueryParser.addOption(aQUERY, 1, STAFCommandParser.VALUENOTALLOWED);

        // HALT parser
        fHaltParser = new STAFCommandParser();

        fHaltParser.addOption(aHALT, 1, STAFCommandParser.VALUENOTALLOWED);

                                       

        // Register Help Data

        registerHelpData(
            kDeviceInvalidSerialNumber,
            "Invalid serial number", 
            "A non-numeric value was specified for serial number");

        
        
		// Now, do the SoapTestCore specific stuff ...
		// Set up Log4j
        Configurator.initialize(null, mDefaultConfiguratorFile);
		
        
        
		// Now, the service is ready ...
		mLog.info("StafTestStaf: Ready ...");

        
        return (new STAFResult(rc));
    }  

    // STAFServiceInterfaceLevel30
    public STAFResult acceptRequest(STAFServiceInterfaceLevel30.RequestInfo info)
    {               

		// Refresh Log4j
        Configurator.initialize(null, mDefaultConfiguratorFile);
		
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
            return handleHelp(info);
        }
        else if (request.equals(aVERSION.toLowerCase()))
        {
            return handleVersion(info);
        }
        else
        {
            return new STAFResult(STAFResult.InvalidRequestString,
                                  "Unknown SoapTestCore (STAF) Request: " + 
                                  lowerRequest);
        }
    }

    private STAFResult handleHelp(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafTestStaf: handleHelp ...");

        // Check whether Trust level is sufficient for this command.
        STAFResult trustResult = parseTrustLevel(info, 2);
        if ( trustResult != null )
        	return (trustResult);

        StringBuilder sb = new StringBuilder();
        
        sb.append(kName).append(" Service Help");
        sb.append("\n");
        sb.append("\n");
        
        sb.append(aEXECUTE).append(" <Zimbra Server> ");
        sb.append("\n ").append(aZIMBRAQAROOT).append(" <full path> ");
        sb.append("\n ( ").append(aSUITE).append(" <smoke | full> | ").append(aPACKAGE).append(" <path> | ").append(aTESTCASE).append(" <path> ) ");
        sb.append("\n optional [ ");
        sb.append("\n  ").append(aAREAS).append(" <area1, area2, ..., areaN> ");
        sb.append("\n  ").append(aEXCLUDES).append(" <area1, area2, ..., areaN> ");
        sb.append("\n  ").append(aLOGDIR).append(" <fullpath> ");
        sb.append("\n  ").append(aLOG4JPROPERTIESFILE).append(" <fullpath> ");
        sb.append("\n ]"); // end optional
        sb.append("\n");
        sb.append("\n");
        
        sb.append(aQUERY);
        sb.append("\n");
        sb.append("\n");

        sb.append(aVERSION);
        sb.append("\n");
        sb.append("\n");

        sb.append(aHALT);
        sb.append("\n");
        sb.append("\n");

        sb.append(aHELP);
        sb.append("\n");
        sb.append("\n");

    	// TODO: Need to convert the help command into the variables, aEXECUTE, aHELP, etc.
        return new STAFResult(STAFResult.Ok, sb.toString());

    }
    
    private STAFResult handleVersion(STAFServiceInterfaceLevel30.RequestInfo info)
    {
        mLog.info("StafTestStaf: handleVersion ...");
        
        // Check whether Trust level is sufficient for this command.
        STAFResult trustResult = parseTrustLevel(info, 2);
        if ( trustResult != null )
        	return (trustResult);


        return new STAFResult(STAFResult.Ok, kVersion);
    }
    

    private STAFResult handleExecute(STAFServiceInterfaceLevel30.RequestInfo info) 
    {

        mLog.info("StafTestStaf: handleExecute ...");

    	// Check whether Trust level is sufficient for this command.
        STAFResult trustResult = parseTrustLevel(info, 4);
        if ( trustResult != null )
        	return (trustResult);
        
        
        
        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fExecuteParser.parse(info.request);
        if (parsedRequest.rc != STAFResult.Ok)
        	return new STAFResult(STAFResult.InvalidRequestString, parsedRequest.errorBuffer);
            

        // Initialize the return result
        int resultCode = STAFResult.Ok;
        StringBuffer resultString = new StringBuffer();
        
		try {
					
            // Make the appropriate settings in the soap test object
	        parseExecute(parsedRequest);
			
			// TODO
			resultString.append(NunitController.getInstance().execute());


		} catch (Exception e) {
			return (new STAFResult(STAFResult.JavaError, e.getMessage()));
		}

		// Return ok code with the parsable return string
		return (new STAFResult(resultCode, resultString.toString()));

		
        
    }
    
    
    private void parseExecute(STAFCommandParseResult parsedRequest) throws IOException {
    

        if ( parsedRequest.optionTimes(aLOG4JPROPERTIESFILE) > 0 ) {
            
        	String value = parsedRequest.optionValue(aLOG4JPROPERTIESFILE);
	    	mLog.debug(aLOG4JPROPERTIESFILE + " is " + value);
	        	
            Configurator.initialize(null, value);
        	
        } else {
        	
            Configurator.reconfigure();
        	
        }

        if ( parsedRequest.optionTimes(aLOGDIR) > 0 ) {
            
        	// TODO: should be able to specify multiple log dirs.
        	String value = parsedRequest.optionValue(aLOGDIR);
        	mLog.debug(aLOGDIR + " is " + value);

        	NunitController.pLogDirectory = value;

        } else {
        	
	    	NunitController.pLogDirectory = ".";

        }
        
        if ( parsedRequest.optionTimes(aEXECUTE) > 0 ) {
        	
        	String value = parsedRequest.optionValue(aEXECUTE, 1);
	    	mLog.debug(aEXECUTE + " is " + value);
        	
        	NunitController.pZimbraServer = value;
        	
        } else {
        	
        	// TODO: Required
	    	NunitController.pZimbraServer = null;

        }
        
        
        // This must come after aEXECUTE, since that will specify the server name and default domain
        if ( parsedRequest.optionTimes(aZIMBRAQAROOT) > 0 ) {
        	
        	String value = parsedRequest.optionValue(aZIMBRAQAROOT);
	    	mLog.debug(aZIMBRAQAROOT + " is " + value);
	        
	    	NunitController.pZimbraQARoot = value;

        } else {
        	
        	// TODO: Required
	    	NunitController.pZimbraQARoot = null;

        }
        
        if ( parsedRequest.optionTimes(aPACKAGE) > 0 ) {
        	
        	String value = parsedRequest.optionValue(aPACKAGE);
	    	mLog.debug(aPACKAGE + " is " + value);
	        
	    	NunitController.pPackage = value;

        } else {
        	
	    	NunitController.pPackage = null;

        }

        if ( parsedRequest.optionTimes(aTESTCASE) > 0 ) {
        	
        	String value = parsedRequest.optionValue(aTESTCASE);
	    	mLog.debug(aTESTCASE + " is " + value);
	        
	    	NunitController.pTestCase = value;

        } else {
        	
	    	NunitController.pTestCase = null;

        }
        
        if ( parsedRequest.optionTimes(aAREAS) > 0 ) {

        	String value = parsedRequest.optionValue(aAREAS);
        	mLog.debug(aAREAS + " is " + value);

        	NunitController.pAreas = new ArrayList<String>(Arrays.asList(value.split(",")));

        } else {

        	NunitController.pAreas = null;

        }

        if ( parsedRequest.optionTimes(aEXCLUDES) > 0 ) {

        	String value = parsedRequest.optionValue(aEXCLUDES);
        	mLog.debug(aEXCLUDES + " is " + value);

        	NunitController.pExcludes = new ArrayList<String>(Arrays.asList(value.split(",")));

        } else {

        	NunitController.pExcludes = null;

        }

        
        if ( parsedRequest.optionTimes(aBITS) > 0 ) {

        	String value = parsedRequest.optionValue(aBITS);
        	mLog.debug(aBITS + " is " + value);

        	NunitController.pBits = value;

        } else {

        	NunitController.pBits = "NETWORK";

        }
        

        if ( parsedRequest.optionTimes(aSUITE) > 0 ) {
        	
        	String value = parsedRequest.optionValue(aSUITE);
        	mLog.debug(aSUITE + " is " + value);
        	
        	NunitController.pSuite = value;
        	
        } else {
        	
        	NunitController.pSuite = "smoke";
        	
        }       

        
    }

    private STAFResult handleHalt(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafTestStaf: handleHalt ...");

    	// Check whether Trust level is sufficient for this command.
        STAFResult trustResult = parseTrustLevel(info, 4);
        if ( trustResult != null )
        	return (trustResult);

        
        
        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fHaltParser.parse(info.request);     
        if (parsedRequest.rc != STAFResult.Ok)
        	return new STAFResult(STAFResult.InvalidRequestString, parsedRequest.errorBuffer);

        
        
        // Initialize the return result
        int resultCode = STAFResult.Ok;
        StringBuffer resultString = new StringBuffer();
        
		
		if ( NunitController.getInstance().isExecuting() ) {
			resultString.append(NunitController.getInstance().stopExecution());
		} else {
			resultString.append("Not Running");
		}


		// Return ok code with the parsable return string
		return (new STAFResult(resultCode, resultString.toString()));

		
        
    }
    
    private STAFResult handleQuery(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafTestStaf: handleQuery ...");

        // Check whether Trust level is sufficient for this command.
        STAFResult trustResult = parseTrustLevel(info, 2);
        if ( trustResult != null )
        	return (trustResult);



        STAFCommandParseResult parsedRequest = fQueryParser.parse(info.request);                   
        if (parsedRequest.rc != STAFResult.Ok)
        	return new STAFResult(STAFResult.InvalidRequestString, parsedRequest.errorBuffer);


        // Initialize the return result
        int resultCode = STAFResult.Ok;
        StringBuffer resultString = new StringBuffer();
        InputStream inputStream= null;

		try {
			
			if ( !NunitController.getInstance().isExecuting() ) {
				resultString.append("*** Not Running\n");
				resultString.append('\n');
				resultString.append('\n');
				resultString.append("Prior Results:\n\n");
			}

			Properties status = new Properties();       
	     
        	inputStream= new FileInputStream(new File(mCurrentStatusFile));
        	status.load(inputStream);
        	
			resultString.append("File: ").append(mCurrentStatusFile).append("\n\n");
			resultString.append(String.format("%s: %s\n", status.getProperty("TestCaseTotal"), "Total Test Cases Executed"));
			resultString.append(String.format("%s: %s\n", status.getProperty("TestCasePass"), "Total Test Cases PASS"));
			resultString.append(String.format("%s: %s\n\n", status.getProperty("TestCaseFail"), "Total Test Cases FAIL"));
			resultString.append(String.format("%s: %s\n", status.getProperty("AssertTotal"), "Total Checks Executed"));
			resultString.append(String.format("%s: %s\n", status.getProperty("AssertPass"), "Total Checks PASS"));
			resultString.append(String.format("%s: %s\n", status.getProperty("AssertFail"), "Total Checks FAIL"));
			resultString.append("\n\n");
			resultString.append("Failed Test Cases:\n");
			
			String failedTests = status.getProperty("FailedTests");
			if ( (failedTests != null) && (failedTests.length()>0) ) {
				String[] failedList = failedTests.split(",");
				Arrays.sort(failedList, null);
				for (String t : failedList) {
					resultString.append('\t').append(t).append('\n');
				}
			} else {
				resultString.append("none\n");
			}

		} catch (FileNotFoundException e) {
			return (new STAFResult(STAFResult.JavaError, e.getMessage()));
		} catch (IOException e) {
			return (new STAFResult(STAFResult.JavaError, e.getMessage()));
		}finally{
			if ( inputStream != null ) {			
				try {
					inputStream.close();
				} catch (IOException e) {
					mLog.error("Unable to close InputStream in finally", e);
				}
			}
		}

		// Return ok code with the parsable return string
		return (new STAFResult(resultCode, resultString.toString()));
    }
    
    
    // this method will resolve any STAF variables that
    // are contained within the Option Value
    @SuppressWarnings("unused")
    private STAFResult resolveVar(String machine, String optionValue, int handle) {
    	
        String value = "";
        STAFResult resolvedResult = null;

        if (optionValue.indexOf("{") != -1)
        {
            resolvedResult = fHandle.submit2(machine, "var", "handle " + handle + " resolve " + optionValue);

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


    protected static STAFResult parseTrustLevel(RequestInfo info, int level) {
    	
    	// Check whether Trust level is sufficient for this command.
        if (info.trustLevel < level)
        {   
        	String lowerRequest = info.request.toLowerCase();
            StringTokenizer requestTokenizer = new StringTokenizer(lowerRequest);
            String request = requestTokenizer.nextToken().toUpperCase();

            StringBuilder sb = new StringBuilder();
            sb.append("Trust level ").append(level);
            sb.append(" required for ").append(request).append(" request.").append("\n");
            sb.append("The requesting machine's trust level: ").append(info.trustLevel).append("\n");
            
        	return (new STAFResult(STAFResult.AccessDenied, sb.toString()));
        }
        return (null);
    }
    
    protected static void writeTestSummaryTxt(String dir, int pass, int fail, int errors) {
    	
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
			if ( fos != null ) {			
				try {
					fos.close();
				} catch (IOException e) {
					mLog.error("Unable to close FileOutputStream in finally", e);
				}
			}
			
		}
    	
    	
    }


    
}
