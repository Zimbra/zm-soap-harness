package com.zimbra.qa.importer;

import java.util.StringTokenizer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.config.Configurator;

import com.zimbra.common.net.SocketFactories;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFResult;
import com.ibm.staf.STAFUtil;
import com.ibm.staf.service.STAFCommandParseResult;
import com.ibm.staf.service.STAFCommandParser;
import com.ibm.staf.service.STAFServiceInterfaceLevel30;

public class StafIntegration implements STAFServiceInterfaceLevel30 {
    // ???
    private final String kVersion = "1.1.0";
    private static final int kDeviceInvalidSerialNumber = 4001;

    // Basic Debug Logger
    static private Logger mLog = LogManager.getLogger(StafIntegration.class);

    // STAF Specifics
    private String fServiceName;
    private STAFHandle fHandle;
    private STAFCommandParser fAccountParser;
    private STAFCommandParser fHaltParser;
    private String fLineSep = new String("\n");

    // STAF Commands

    // STAF ACCOUNT COMMANDS
    private String aACCOUNT = "ACCOUNT";
    private String aINPUTFILE = "INPUTFILE";
    private String aDOMAIN = "DOMAIN";
    private String aEMAIL = "EMAIL";
    private String aPASSWORD = "PASSWORD";
    private String aSERVER = "SERVER";

    private String aHALT = "HALT";
    private String aVERSION = "VERSION";
    private String aHELP = "HELP";

    public StafIntegration() {
    }
    // Required by STAF
    public STAFResult init(STAFServiceInterfaceLevel30.InitInfo info) {
        int rc = STAFResult.Ok;

        info.serviceJar.getName();

        // STAF specific stuff ...

        try {
            fServiceName = info.name;
            fHandle = new STAFHandle("STAF/SERVICE/" + info.name);
        } catch (STAFException e) {
            return (new STAFResult(STAFResult.STAFRegistrationError));
        }

        // ACCOUNT command parser
        // "ACCOUNT INPUTFILE <filepath> < DOMAIN <account domain> | EMAIL <account
        // email> > [ PASSWORD <account password> ] [ SERVER <zimbra server> ]";
        fAccountParser = new STAFCommandParser();
        fAccountParser.addOption(aACCOUNT, 1, STAFCommandParser.VALUENOTALLOWED);
        fAccountParser.addOption(aINPUTFILE, 1, STAFCommandParser.VALUEREQUIRED);
        fAccountParser.addOption(aDOMAIN, 1, STAFCommandParser.VALUEREQUIRED);
        fAccountParser.addOption(aEMAIL, 1, STAFCommandParser.VALUEREQUIRED);
        fAccountParser.addOption(aPASSWORD, 1, STAFCommandParser.VALUEREQUIRED);
        fAccountParser.addOption(aSERVER, 1, STAFCommandParser.VALUEREQUIRED);

        // this means you must have one of the following options, but not multiple
        fAccountParser.addOptionGroup(aINPUTFILE, 1, 1); // Must specify INPUTFILE
        fAccountParser.addOptionGroup(aSERVER + " " + aDOMAIN + " " + aEMAIL, 1, 2); // Must specify SERVER OR specify
                                                                                     // one of DOMAIN or EMAIL
        fAccountParser.addOptionGroup(aDOMAIN + " " + aEMAIL, 1, 1); // Must specify either DOMAIN or EMAIL

        // HALT parser
        fHaltParser = new STAFCommandParser();
        fHaltParser.addOption(aHALT, 1, STAFCommandParser.VALUENOTALLOWED);

        // Register Help Data
        registerHelpData(kDeviceInvalidSerialNumber, "Invalid serial number",
                "A non-numeric value was specified for serial number");

        // Set up Log4j
        Configurator.reconfigure();

        // Set up SSL to always accept untrusted certs
        SocketFactories.registerProtocols(true);

        // Now, the service is ready ...
        mLog.info("StafImporter: Ready ...");
        return (new STAFResult(rc));
    }

    public STAFResult acceptRequest(STAFServiceInterfaceLevel30.RequestInfo info) {
        // Refresh Log4j
        // TODO
        // PropertyConfigurator.configure(mDefaultConfiguratorFile);
        mLog.info("StafImporter: acceptRequest ...");

        StringTokenizer requestTokenizer = new StringTokenizer(info.request);
        String request = requestTokenizer.nextToken().toLowerCase();

        // call the appropriate method to handle the command
        if (request.equals(aACCOUNT.toLowerCase())) {
            return handleAccount(info);
        } else if (request.equals(aHALT.toLowerCase())) {
            return handleHalt(info);
        } else if (request.equals(aHELP.toLowerCase())) {
            return handleHelp();
        } else if (request.equals(aVERSION.toLowerCase())) {
            return handleVersion();
        } else {
            return new STAFResult(STAFResult.InvalidRequestString,
                    "Unknown SoapTestCore (STAF) Request: " + info.request);
        }
    }

    private STAFResult handleHelp() {
        
        mLog.info("StafImporter: handleHelp ...");
        // TODO: Need to convert the help command into the variables, aEXECUTE, aHELP,
        // etc.
        return new STAFResult(STAFResult.Ok,
                "ACCOUNT INPUTFILE {filepath} < DOMAIN {account domain} | EMAIL {account email} >  [ SERVER {zimbra server} ] [ PASSWORD {account password} ] "
                        + fLineSep + fLineSep + "where" + fLineSep
                        + "\t{filepath} is a text file containing the output of 'zmprov ga account@domain.com'"
                        + fLineSep
                        + "\t{account domain} is the domain in which to create the account (email will be u<unique>@DOMAIN)"
                        + fLineSep
                        + "\t{account email} is the email account to create (format must be account@domain.com)"
                        + fLineSep
                        + "\t{zimbra server} is the server on which to create the account (default = localhost)"
                        + fLineSep + "\t{account password} is the account password to set (accountpassword)" + fLineSep
                        + "\tYou must specify either DOMAIN or EMAIL" + fLineSep + fLineSep + "VERSION" + fLineSep
                        + fLineSep + "HALT (not supported)" + fLineSep + fLineSep + "HELP");
    }

    private STAFResult handleVersion() {
        mLog.info("StafImporter: handleVersion ...");
        return new STAFResult(STAFResult.Ok, kVersion);
    }

    private STAFResult handleAccount(STAFServiceInterfaceLevel30.RequestInfo info) {

        mLog.info("StafImporter: handleExecute ...");

        // Check whether Trust level is sufficient for this command.
        if (info.trustLevel < 4) {

            return new STAFResult(STAFResult.AccessDenied, "Trust level 4 required for " + aACCOUNT + " request."
                    + fLineSep + "The requesting machine's trust level: " + info.trustLevel);
        }

        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fAccountParser.parse(info.request);
        if (parsedRequest.rc != STAFResult.Ok) {
            return new STAFResult(STAFResult.InvalidRequestString, parsedRequest.errorBuffer);
        }
        parseAccount(parsedRequest); // Set any variables that are passed in
        try {
            // Return ok code with the parsable return string
            return (new STAFResult(STAFResult.Ok, AccountMain.execute()));
        } catch (Exception e) {
            return (new STAFResult(STAFResult.JavaError, logException(e)));
        }
    }

    private void parseAccount(STAFCommandParseResult parsedRequest) {

        if (parsedRequest.optionTimes(aINPUTFILE) > 0) {
            AccountMain.InputFile = parsedRequest.optionValue(aINPUTFILE);
        }

        AccountMain.server = "localhost";
        if (parsedRequest.optionTimes(aSERVER) > 0) {
            AccountMain.server = parsedRequest.optionValue(aSERVER);
        }

        if (parsedRequest.optionTimes(aINPUTFILE) > 0) {
            AccountMain.InputFile = parsedRequest.optionValue(aINPUTFILE);
        }

        String domain = "domain.com";

        if (parsedRequest.optionTimes(aDOMAIN) > 0) {
            domain = parsedRequest.optionValue(aDOMAIN);
        }

        AccountMain.email = "u" + AccountMain.unique() + "@" + domain;
        if (parsedRequest.optionTimes(aEMAIL) > 0) {
            AccountMain.email = parsedRequest.optionValue(aEMAIL);
        }

        AccountMain.password = "test123";
        if (parsedRequest.optionTimes(aPASSWORD) > 0) {
            AccountMain.password = parsedRequest.optionValue(aPASSWORD);
        }
    }

    private STAFResult handleHalt(STAFServiceInterfaceLevel30.RequestInfo info) {
        
        mLog.info("StafImporter: handleHalt ...");

        // Check whether Trust level is sufficient for this command.
        if (info.trustLevel < 4) {

            return new STAFResult(STAFResult.AccessDenied, "Trust level 4 required for HALT request." + fLineSep
                    + "The requesting machine's trust level: " + info.trustLevel);
        }

        // Make sure the request is valid
        STAFCommandParseResult parsedRequest = fHaltParser.parse(info.request);

        if (parsedRequest.rc != STAFResult.Ok) {
            return new STAFResult(STAFResult.InvalidRequestString, parsedRequest.errorBuffer);
        }

        String resultString = "Not supported";
        // Return ok code with the parsable return string
        return (new STAFResult(STAFResult.Ok, resultString));
    }

    public STAFResult term() {
        try {
            // Un-register Help Data
            unregisterHelpData(kDeviceInvalidSerialNumber);
            // Un-register the service handle
            fHandle.unRegister();
        } catch (STAFException ex) {
            return (new STAFResult(STAFResult.STAFRegistrationError));
        }

        return (new STAFResult(STAFResult.Ok));
    }

    // Register error codes for the STAX Service with the HELP service
    private void registerHelpData(int errorNumber, String info, String description) {
        @SuppressWarnings("unused")
        STAFResult res = fHandle.submit2("local", "HELP", "REGISTER SERVICE " + fServiceName + " ERROR " + errorNumber
                + " INFO " + STAFUtil.wrapData(info) + " DESCRIPTION " + STAFUtil.wrapData(description));
    }

    // Un-register error codes for the STAX Service with the HELP service
    private void unregisterHelpData(int errorNumber) {
        @SuppressWarnings("unused")
        STAFResult res = fHandle.submit2("local", "HELP",
                "UNREGISTER SERVICE " + fServiceName + " ERROR " + errorNumber);
    }

    private String logException(Throwable t) {
        StringBuilder sb = new StringBuilder(t.getMessage()).append("\n");
        for (StackTraceElement ste : t.getStackTrace())
            sb.append("\t").append(ste.toString()).append("\n");
        if (t.getCause() != null)
            sb.append(logException(t.getCause()));
        return (sb.toString());
    }
}
