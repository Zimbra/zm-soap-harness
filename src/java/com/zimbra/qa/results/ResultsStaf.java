package com.zimbra.qa.results;


import java.io.File;
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
import com.zimbra.qa.results.ResultsCore.ResultsException;



public class ResultsStaf implements STAFServiceInterfaceLevel30  {

    // ???
	private final String kVersion = "1.0.0";
    private static final int kDeviceInvalidSerialNumber = 4002;

	// Basic Debug Logger
    static public Logger mLog = LogManager.getLogger(ResultsStaf.class);
	public static final String mLogFileName = "staf.txt";
    

	// STAF Specifics
    private String fServiceName;
    private STAFHandle fHandle;
    
    private STAFCommandParser fRecordParser;
    private STAFCommandParser fQueryParser;
    
    static private final  String fLineSep = new String("\n");
    
    // STAF Commands
    static protected final  String sRECORD	= "RECORD";
    static protected final  String sQUERY	= "QUERY";
    static protected final  String sVERSION	= "VERSION";
    static protected final  String sHELP	= "HELP";
   
    static protected final	String pPASSED	= "PASSED";
    static protected final  String pFAILED	= "FAILED";
    static protected final  String pERRORS	= "ERRORS";
    
    static protected final  String pSUITE	= "SUITE";	// SOAP, GENESIS, MAPI ...
    static protected final  String pARCHITECTURE		= "OS";		// RHEL4, FC, MAC ...
    static protected final  String pBUILD	= "BUILD";	// 20061103020101, ...
    static protected final  String pBITS	= "BITS";	// FOSS, NETWORK
    static protected final  String pTYPE	= "TYPE";	// SMOKE, FULL
    static protected final  String pBRANCH	= "BRANCH";	// CRAY, DAIMLER, EDISON, ...
    static protected final  String pURL		= "URL";
    
    //
    protected ResultsStaf staf = null;
    

    
    public ResultsStaf() {
    	staf = this;
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
        

        
        // Create a command parser for each of the commands
        //

        fRecordParser = new STAFCommandParser();
        fRecordParser.addOption(sRECORD, 1, STAFCommandParser.VALUENOTALLOWED);
        fRecordParser.addOption(pSUITE, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pARCHITECTURE, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pBUILD, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pBITS, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pTYPE, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pBRANCH, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pURL, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pPASSED, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pFAILED, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pERRORS, 1, STAFCommandParser.VALUEREQUIRED);
        fRecordParser.addOption(pURL, 1, STAFCommandParser.VALUEALLOWED);

        fQueryParser = new STAFCommandParser();
        fQueryParser.addOption(sQUERY, 1, STAFCommandParser.VALUENOTALLOWED);
        fQueryParser.addOption(pSUITE, 1, STAFCommandParser.VALUEREQUIRED);
        fQueryParser.addOption(pARCHITECTURE, 1, STAFCommandParser.VALUEREQUIRED);
        fQueryParser.addOption(pBUILD, 1, STAFCommandParser.VALUEREQUIRED);
        fQueryParser.addOption(pBITS, 1, STAFCommandParser.VALUEREQUIRED);
        fQueryParser.addOption(pTYPE, 1, STAFCommandParser.VALUEREQUIRED);
        fQueryParser.addOption(pBRANCH, 1, STAFCommandParser.VALUEREQUIRED);

        
                                       

        // Register Help Data

        registerHelpData(
            kDeviceInvalidSerialNumber,
            "Invalid serial number", 
            "A non-numeric value was specified for serial number");


        Configurator.reconfigure();
        File props = new File("/tmp/log4j.properties");
        if ( props.exists() ) {
            Configurator.initialize(null, "/tmp/log4j.properties");
        }
        
		// Now, the service is ready ...
		mLog.info("StafMain: Ready ...");

        
        return (new STAFResult(rc));
    }  

    public STAFResult acceptRequest(STAFServiceInterfaceLevel30.RequestInfo info)
    {               
		
        mLog.info("StafMain: acceptRequest ...");

    	String lowerRequest = info.request.toLowerCase();
        StringTokenizer requestTokenizer = new StringTokenizer(lowerRequest);
        String request = requestTokenizer.nextToken();

        // call the appropriate method to handle the command
        if (request.equals(sRECORD.toLowerCase()))
        {
            return handleRecord(info);
        }
        else if (request.equals(sQUERY.toLowerCase()))
        {
            return handleQuery(info);
        }
        else if (request.equals(sHELP.toLowerCase()))
        {
            return handleHelp();
        }
        else if (request.equals(sVERSION.toLowerCase()))
        {
            return handleVersion();
        }
        else
        {
            return new STAFResult(STAFResult.InvalidRequestString,
                                  "Unknown StafCore (STAF) Request: " + 
                                  lowerRequest);
        }
    }

    private STAFResult handleHelp()
    {

        mLog.info("StafMain: handleHelp ...");

        // TODO: The OPTIONS values should be based on a query from the DB
        // i.e. QUERY for all supported OS's and allow them
        //
        
        return new STAFResult(STAFResult.Ok,
         "StafTest Service Help " + fLineSep +
         fLineSep + 
         "RECORD PASSED <x> FAILED <y> ERRORS <z> [ OPTIONS ] " + fLineSep +
         fLineSep + 
         "QUERY [ OPTIONS ] " + fLineSep +
         fLineSep + 
         "VERSION" + fLineSep + 
         fLineSep + 
         "HALT (not supported) -- TBD: should stop all active jobs " + fLineSep + 
         fLineSep + 
         fLineSep + 
         "OPTIONS: " + fLineSep +
         "SUITE <suite>, where <suite> is one of SOAP, GENESIS, MAPI, QTP, UPGRADE " + fLineSep +
         "OS <os>, where <os> is one of RHEL4, FC4, FC5, MACPPC, MACINTEL, SUSE, etc. " + fLineSep +
         "BUILD <build>, where <build> is a date YYYYMMDDHHMMSS " + fLineSep +
         "BRANCH <branch>, where <branch> is a CRAY, DAIMLER, EDISON, etc. " + fLineSep +
         "BITS <bits>, where <suite> is one of FOSS or NETWORK " + fLineSep +
         "TYPE <type>, where <suite> is one of SMOKE or FULL " + fLineSep +
         "URL <url>, where <url> is string that points to result logs " + fLineSep +
         fLineSep + 
         "HELP");
        
    }
    
    private STAFResult handleVersion()
    {
        mLog.info("StafMain: handleVersion ...");
        return new STAFResult(STAFResult.Ok, kVersion);
    }
    

    private STAFResult handleRecord(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafMain: handleRecord ...");

    	// Check whether Trust level is sufficient for this command.
        if (info.trustLevel < 4)
        {   
            
        	return new STAFResult(STAFResult.AccessDenied, 
                "Trust level 4 required for EXECUTE request." + fLineSep +
                "The requesting machine's trust level: " +  info.trustLevel); 
            
        }    

        
        
        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fRecordParser.parse(info.request);
     
        if (parsedRequest.rc != STAFResult.Ok)
        {
        	
            return new STAFResult(STAFResult.InvalidRequestString,
                                  parsedRequest.errorBuffer);
            
        }

        String resultString = "tbd";

		try {
			
			ResultsCore core = new ResultsCore(parsedRequest);
			setDbHostname(core);
			resultString = core.recordResults();
			
		} catch (ResultsException e) {
			
			mLog.error("handleRecord: core.recordResults threw " + e.getMessage(), e);
			resultString = e.getMessage();
			
		}
        
        
		// Return ok code with the parsable return string
		return (new STAFResult(STAFResult.Ok, resultString));
		
    }
    

    
    private STAFResult handleQuery(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafMain: handleQuery ...");

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

        String resultString = "tbd";

		try {
			
			ResultsCore core = new ResultsCore(parsedRequest);
			setDbHostname(core);
			resultString = core.queryResults();
			
		} catch (ResultsException e) {
			
			mLog.error("handleRecord: core.queryResults threw " + e.getMessage(), e);
			resultString = e.getMessage();
			
		}
        
        
		// Return ok code with the parsable return string
		return (new STAFResult(STAFResult.Ok, resultString));
        
    }
    
    private void setDbHostname(ResultsCore c) {
    	
    	// Example: STAF local VAR HANDLE 1 RESOLVE resulthost
    	//
    	String key = "DBHOSTNAME";
    	
    	String machine = "LOCAL";
    	String service = "VAR";
    	String command = "GET SHARED VAR "+ key;
    	
    	// Run the STAF command
    	STAFResult result = fHandle.submit2(machine, service, command);
    	if ( result.rc == STAFResult.Ok ) {
    		c.dHostname = result.result; // DB Hostname is set, use it
    	}
  
    }
    
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


    // Register error codes for the STAX Service with the HELP service

    private void registerHelpData(int errorNumber, String info,
                                  String description)
    {

        fHandle.submit2("local", "HELP",
                         "REGISTER SERVICE " + fServiceName +
                         " ERROR " + errorNumber +
                         " INFO " + STAFUtil.wrapData(info) +
                         " DESCRIPTION " + STAFUtil.wrapData(description));
    }

    // Un-register error codes for the STAX Service with the HELP service

    private void unregisterHelpData(int errorNumber)
    {

        fHandle.submit2("local", "HELP",
                         "UNREGISTER SERVICE " + fServiceName +
                         " ERROR " + errorNumber);
    }


    
}
