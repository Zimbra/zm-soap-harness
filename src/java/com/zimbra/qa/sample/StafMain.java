package com.zimbra.qa.sample;


import java.io.File;
import java.io.IOException;
import java.util.StringTokenizer;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.appender.ConsoleAppender;
import org.apache.logging.log4j.core.appender.FileAppender;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.apache.logging.log4j.core.layout.PatternLayout;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFResult;
import com.ibm.staf.STAFUtil;
import com.ibm.staf.service.STAFCommandParseResult;
import com.ibm.staf.service.STAFCommandParser;
import com.ibm.staf.service.STAFServiceInterfaceLevel30;



public class StafMain implements STAFServiceInterfaceLevel30  {

    // ???
	private final String kVersion = "1.0.0";
    private static final int kDeviceInvalidSerialNumber = 4002;

	// Basic Debug Logger
    static public Logger mLog = LogManager.getLogger(StafMain.class);
	public static final String mLogFileName = "staf.txt";
    

	// STAF Specifics
    private String fServiceName;
    private STAFHandle fHandle;
    
    private STAFCommandParser fMainParser;
    private STAFCommandParser fQueryParser;
    private STAFCommandParser fHaltParser;
    
    private String fLineSep = new String("\n");
    
    // STAF Commands
    private String	sMain = "MAIN";
    private String	sQUERY = "QUERY";
    private String	sHALT = "HALT";
    private String	sVERSION = "VERSION";
    private String	sHELP = "HELP";
   

    //
    protected StafMain staf = null;
    

    
    public StafMain() {
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

        fMainParser = new STAFCommandParser();
        fMainParser.addOption(sMain, 1, 
                STAFCommandParser.VALUEREQUIRED); // argument is the server under test

        
        fQueryParser = new STAFCommandParser();
        fQueryParser.addOption(sQUERY, 1, 
                               STAFCommandParser.VALUENOTALLOWED);

        fHaltParser = new STAFCommandParser();
        fHaltParser.addOption(sHALT, 1, 
                               STAFCommandParser.VALUENOTALLOWED);

                                       

        // Register Help Data

        registerHelpData(
            kDeviceInvalidSerialNumber,
            "Invalid serial number", 
            "A non-numeric value was specified for serial number");

        
        
		// Now, do the StafCore specific stuff ...
		// Set up the Logger
        try {
            ConsoleAppender consoleAppender = ConsoleAppender.newBuilder()
                    .setName("console")
                    .setTarget(ConsoleAppender.Target.SYSTEM_OUT)
                    .build();
            FileAppender fileAppender = FileAppender.newBuilder()
                    .setName("file")
                    .setLayout(PatternLayout.newBuilder()
                            .withPattern(PatternLayout.DEFAULT_CONVERSION_PATTERN)
                            .build())
                    .withFileName(mLogFileName)
                    .build();
            LoggerContext context = (LoggerContext) LogManager.getContext(false);
            LoggerConfig loggerConfig = context.getConfiguration().getLoggerConfig(mLog.getName());
            loggerConfig.addAppender(consoleAppender, Level.INFO, null);
            loggerConfig.addAppender(fileAppender, Level.INFO, null);
            context.updateLoggers();
	        File l = new File(mLogFileName);
	        System.out.print("Logging to " + l.getCanonicalPath());
	        
		} catch (IOException e) {
			System.out.print("Unable to set up mLog logger to " + mLogFileName);
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
        if (request.equals(sMain.toLowerCase()))
        {
            return handleMain(info);
        }
        else if (request.equals(sQUERY.toLowerCase()))
        {
            return handleQuery(info);
        }
        else if (request.equals(sHALT.toLowerCase()))
        {
            return handleHalt(info);
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

        return new STAFResult(STAFResult.Ok,
         "StafTest Service Help " + fLineSep
         + fLineSep + 
         "MAIN <string> " + fLineSep +
         fLineSep + 
         "QUERY <job> -- TBD: should return statistics on active jobs " + fLineSep +
         fLineSep + 
         "VERSION" + fLineSep + 
         fLineSep + 
         "HALT (not supported) -- TBD: should stop all active jobs " + fLineSep + 
         fLineSep + 
         "HELP");
    }
    
    private STAFResult handleVersion()
    {
        mLog.info("StafMain: handleVersion ...");
        return new STAFResult(STAFResult.Ok, kVersion);
    }
    

    private STAFResult handleMain(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafMain: handleMain ...");

    	// Check whether Trust level is sufficient for this command.
        if (info.trustLevel < 4)
        {   
            
        	return new STAFResult(STAFResult.AccessDenied, 
                "Trust level 4 required for EXECUTE request." + fLineSep +
                "The requesting machine's trust level: " +  info.trustLevel); 
            
        }    

        
        
        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fMainParser.parse(info.request);
     
        if (parsedRequest.rc != STAFResult.Ok)
        {
        	
            return new STAFResult(STAFResult.InvalidRequestString,
                                  parsedRequest.errorBuffer);
            
        }

        // Initialize the return result
        int resultCode = STAFResult.Ok;
        String resultString = "handleMain: no result";
        
        StafCore core = new StafCore();
        resultString = new String("handleMain: " + core.execute());
        
		// Return ok code with the parsable return string
		return (new STAFResult(resultCode, resultString));
		
    }
    

    private STAFResult handleHalt(STAFServiceInterfaceLevel30.RequestInfo info)
    {

        mLog.info("StafMain: handleHalt ...");

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

        StringBuffer resultString = new StringBuffer();

    	resultString.append("handelQuery: no status");

    
        return ( new STAFResult(STAFResult.Ok, resultString.toString()) );
        
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

        // this method will resolve any STAF variables that
        // are contained within the Option Value
    private STAFResult resolveVar(String machine, String optionValue, int handle)
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

        STAFResult res = fHandle.submit2("local", "HELP",
                         "REGISTER SERVICE " + fServiceName +
                         " ERROR " + errorNumber +
                         " INFO " + STAFUtil.wrapData(info) +
                         " DESCRIPTION " + STAFUtil.wrapData(description));
    }

    // Un-register error codes for the STAX Service with the HELP service

    private void unregisterHelpData(int errorNumber)
    {

        STAFResult res = fHandle.submit2("local", "HELP",
                         "UNREGISTER SERVICE " + fServiceName +
                         " ERROR " + errorNumber);
    }


    
}
