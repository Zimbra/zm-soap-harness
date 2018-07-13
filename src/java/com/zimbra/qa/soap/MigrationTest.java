package com.zimbra.qa.soap;


import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.log4j.Logger;
import org.dom4j.QName;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFMarshallingContext;
import com.ibm.staf.STAFResult;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;
import com.zimbra.common.soap.Element;

public class MigrationTest extends Test {

	static Logger mLog = Logger.getLogger(MigrationTest.class.getName());

	/**
	 * Option Attributes from SOAP XML
	 */

    public static final QName E_MIGRATIONTEST = QName.get("migrationtest", SoapTestCore.NAMESPACE);

	// "Import Destination" screen values
	public static final String A_ZIMBRA_ACCOUNT_SERVER = "zimbraaccountserver";
	public static final String A_ZIMBRA_ACCOUNT_PORT = "zimbraaccountserverport";
	public static final String A_ZIMBRA_ACCOUNT_SSL = "zimbraaccountserverssl";
	public static final String A_ZIMBRA_ACCOUNT_NAME = "zimbraaccountname";
	public static final String A_ZIMBRA_ACCOUNT_PASSWORD = "zimbraaccountpassword";

	// "Destination Domain" screen values
	public static final String A_ZIMBRA_DESTINATION_DOMAIN = "zimbradestinationdomain";

	// GROUPWISE attributes
	public static final String A_GW_DOMAINDIRECTORYPATH = "gwdomaindirectorypath";
	public static final String A_GW_POSTOFFICEINFORMATION = "gwpostofficeinformation";
	public static final String A_GW_LDAPSERVERADDRESS = "gwldapserveraddress";
	public static final String A_GW_LDAPSERVERPORT = "gwldapserverport";
	public static final String A_GW_ADMINUSERNAME = "gwadminusername";
	public static final String A_GW_ADMINPASSWORD = "gwadminpassword";

	// EXCHANGE attributes
	public static final String A_OUTLOOK_PROFILE = "mapiprofilename";

	// DOMINO attributes
	public static final String A_DM_LDAPSERVERADDRESS = "dmldapserveraddress";
	public static final String A_DM_LDAPSERVERPORT = "dmldapserverport";
	public static final String A_DM_ADMINUSERNAME = "dmadminusername";
	public static final String A_DM_ADMINPASSWORD = "dmadminpassword";
	public static final String A_DM_SERVERNAME = "dmservername";
	public static final String A_DM_ADMINIDFILE = "dmidfile";
	public static final String A_DM_FILEPASSWORD = "dmfilepassword";
	public static final String A_DM_NOTESINIFILE = "dmnotesfile";

	/**
	 * Required Attributes from SOAP XML
	 */
	public static final String A_SOURCE_ACCOUNT = "sourceaccount";
	public static final String A_SOURCE_BASE_DN = "sourcebasedn";



	public static final Pattern mExternalServerPattern = Pattern.compile("(\\$\\#)");

	public static final String ZIMBRA_PERL_COM = "perl";
	public static final String fPerlHelpers = "data" + File.separator + "mapiValidator" + File.separator + "perlHelpers";
	public static String fDefaultWizardPath = null;





	protected final String STAF_MAPI_HOST = "LOCAL";
	protected final String STAF_MAPI_SERVICE = "PROCESS";



	// Define the return codes from MAPI script.
	// Keep these values in sync with qaTest.pl and qaMapiTools.pl
	public static final int E_MAPI_PASSED = STAFResult.Ok; // Zero
	public static final int E_MAPI_FAILED = STAFResult.UserDefined + 1;


	private static class ExternalServer {

		protected String name;
		protected String perlScriptName;
		protected String propertiesFile;

		ExternalServer(String n, String s) {
			this.name = n;
			this.perlScriptName = s;
		}

		String getScriptPath() throws HarnessException {
			String mapiRoot = null;
			try {
				// Prepend the mapi root path, if specified
				mapiRoot = TestProperties.testProperties.getProperty("mapiValidator.root");
				File scriptFile = new File(SoapTestCore.rootZimbraQA, mapiRoot + File.separator + perlScriptName);
				return ( scriptFile.getCanonicalPath() );
			} catch (IOException e) {
				throw new HarnessException("Cannot find "+ name +" driver script: " + mapiRoot + File.separator + perlScriptName, e);
			}
		}

	}
	private static final ExternalServer exchangeServer = new ExternalServer("exchange", "perlHelpers/qaMigrationWizardExchange.pl");
	private static final ExternalServer groupwiseServer = new ExternalServer("groupwise", "perlHelpers/qaGroupwiseMigrationWizard.pl");
	private static final ExternalServer dominoServer = new ExternalServer("domino", "perlHelpers/qaMigrationDominoWizard.pl");

	private static ExternalServer externalServer = null;



	public MigrationTest() {
	}

	public MigrationTest(Element e, SoapTestCore core) {

		super(e, core);


	}


	private void parseArgs() throws HarnessException {


		// If a migration tool path is set, then use that migration wizard.
		// Otherwise, the perl script will download it from the server
		//
		if ( TestProperties.testProperties.getProperty(externalServer.name +".MigrationTool.path", "").equals("") ) {
			mLog.debug("Will download the migration wizard from the server");
		} else {
			TestProperties.testProperties.setProperty("exchange.MigrationTool.path", TestProperties.testProperties.getProperty(externalServer.name +".MigrationTool.path") );
		}


		// Determine which accounts to import, either specific account or by a search query
		String sourceaccount = mTest.getAttribute(A_SOURCE_BASE_DN, null);
		String sourcebasedn = mTest.getAttribute(A_SOURCE_ACCOUNT, null);

		if ( (sourceaccount == null) && (sourcebasedn == null) ) {
			throw new HarnessException("Either "+A_SOURCE_BASE_DN +" or "+A_SOURCE_ACCOUNT+" must be specified. "+ mTest);
		}

		TestProperties.testProperties.setProperty(A_SOURCE_BASE_DN, ( sourceaccount != null ? sourceaccount : "" ));
		TestProperties.testProperties.setProperty(A_SOURCE_ACCOUNT, ( sourcebasedn != null ? sourcebasedn : "" ));

		/*
		 * Optional values (with defaults)
		 */

		// "Import Destination" Screen
		TestProperties.testProperties.setProperty(A_ZIMBRA_ACCOUNT_SERVER, mTest.getAttribute(A_ZIMBRA_ACCOUNT_SERVER, TestProperties.testProperties.getProperty("zimbraServer.name")));
		TestProperties.testProperties.setProperty(A_ZIMBRA_ACCOUNT_PORT, mTest.getAttribute(A_ZIMBRA_ACCOUNT_PORT, TestProperties.testProperties.getProperty("admin.port")));
		TestProperties.testProperties.setProperty(A_ZIMBRA_ACCOUNT_SSL, mTest.getAttribute(A_ZIMBRA_ACCOUNT_SSL, (TestProperties.testProperties.getProperty("admin.mode").equals("https") ?  "1" : "0") ));
		TestProperties.testProperties.setProperty(A_ZIMBRA_ACCOUNT_NAME, mTest.getAttribute(A_ZIMBRA_ACCOUNT_NAME, TestProperties.testProperties.getProperty("admin.user")));
		TestProperties.testProperties.setProperty(A_ZIMBRA_ACCOUNT_PASSWORD, mTest.getAttribute(A_ZIMBRA_ACCOUNT_PASSWORD, TestProperties.testProperties.getProperty("admin.password")));

		// "Destination Domain" Screen
		TestProperties.testProperties.setProperty(A_ZIMBRA_DESTINATION_DOMAIN, mTest.getAttribute(A_ZIMBRA_DESTINATION_DOMAIN, TestProperties.testProperties.getProperty("defaultdomain.name")));

		// GROUPWISE settings
		//

		// "Groupwise Server" Screen
		TestProperties.testProperties.setProperty(A_GW_DOMAINDIRECTORYPATH, mTest.getAttribute(A_GW_DOMAINDIRECTORYPATH, TestProperties.testProperties.getProperty("groupwise.domaindirectory.path")));
		TestProperties.testProperties.setProperty(A_GW_POSTOFFICEINFORMATION, mTest.getAttribute(A_GW_POSTOFFICEINFORMATION, TestProperties.testProperties.getProperty("groupwise.postofficeinformation.path")));
		TestProperties.testProperties.setProperty(A_GW_LDAPSERVERADDRESS, mTest.getAttribute(A_GW_LDAPSERVERADDRESS, TestProperties.testProperties.getProperty("groupwise.ldapserver.address")));
		TestProperties.testProperties.setProperty(A_GW_LDAPSERVERPORT, mTest.getAttribute(A_GW_LDAPSERVERPORT, TestProperties.testProperties.getProperty("groupwise.ldapserver.port")));
		TestProperties.testProperties.setProperty(A_GW_ADMINUSERNAME, mTest.getAttribute(A_GW_ADMINUSERNAME, TestProperties.testProperties.getProperty("groupwise.admin.user")));
		TestProperties.testProperties.setProperty(A_GW_ADMINPASSWORD, mTest.getAttribute(A_GW_ADMINPASSWORD, TestProperties.testProperties.getProperty("groupwise.admin.password")));

		// EXCHANGE settings
		//

	    // Domino Setting
		TestProperties.testProperties.setProperty(A_DM_LDAPSERVERADDRESS, mTest.getAttribute(A_DM_LDAPSERVERADDRESS, TestProperties.testProperties.getProperty("domino.ldapserver.address")));
		TestProperties.testProperties.setProperty(A_DM_LDAPSERVERPORT, mTest.getAttribute(A_DM_LDAPSERVERPORT, TestProperties.testProperties.getProperty("domino.ldapserver.port")));
		TestProperties.testProperties.setProperty(A_DM_ADMINUSERNAME, mTest.getAttribute(A_DM_ADMINUSERNAME, TestProperties.testProperties.getProperty("domino.admin.user")));
		TestProperties.testProperties.setProperty(A_DM_ADMINPASSWORD, mTest.getAttribute(A_DM_ADMINPASSWORD, TestProperties.testProperties.getProperty("domino.admin.password")));
		TestProperties.testProperties.setProperty(A_DM_SERVERNAME, mTest.getAttribute(A_DM_SERVERNAME, TestProperties.testProperties.getProperty("domino.server.name")));
		TestProperties.testProperties.setProperty(A_DM_ADMINIDFILE, mTest.getAttribute(A_DM_ADMINIDFILE, TestProperties.testProperties.getProperty("domino.adminIDfile.path")));
		TestProperties.testProperties.setProperty(A_DM_FILEPASSWORD, mTest.getAttribute(A_DM_FILEPASSWORD, TestProperties.testProperties.getProperty("domino.file.password")));
		TestProperties.testProperties.setProperty(A_DM_NOTESINIFILE, mTest.getAttribute(A_DM_NOTESINIFILE, TestProperties.testProperties.getProperty("domino.notesINIfile.path")));

		// "MAPI profile" screen
		TestProperties.testProperties.setProperty(A_OUTLOOK_PROFILE, mTest.getAttribute(A_OUTLOOK_PROFILE, TestProperties.testProperties.getProperty("exchange.outlook.profile")));

		// Save the new properties
		TestProperties.testProperties.writeProperties(coreController.rootDebugDir);

	}


	private boolean executeOS() throws HarnessException {

		parseArgs();

		mLog.debug("MigrationTest execute OS");


       	StringBuffer osCommand = new StringBuffer();
		osCommand.append(ZIMBRA_PERL_COM + " ");
		osCommand.append("-I " + SoapTestCore.rootZimbraQA + " ");
		osCommand.append(externalServer.getScriptPath() + " ");
		osCommand.append("-p " + TestProperties.testProperties.fDynamicPropertiesFile + " ");
		osCommand.append("-q " + SoapTestCore.rootZimbraQA  + " ");


		mRequestDetails = osCommand.toString();
		int retVal = systemCommand(osCommand.toString(), new File(SoapTestCore.rootZimbraQA));
		mResponseDetails = "return value: " + retVal;

    	if ( systemCommandOutput.indexOf("Migration Test: FAIL") >= 0) {
    		return (mTestPassed = false);
    	}

    	if ( systemCommandOutput.indexOf("Migration Test: PASS") >= 0 ) {
    		return (mTestPassed = true);
    	}

    	mLog.warn("No PASS or FAIL results from STAF call");
		return (mTestPassed = false);

	}

	private boolean executeStaf() throws HarnessException {

		mLog.debug("MigrationImportTest execute STAF");

		parseArgs();

       	STAFHandle handle = null;

       	try
        {

            handle = new STAFHandle(SoapTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());


	        try
	        {


	        	StringBuffer stafCommand = new StringBuffer();
	        	stafCommand.append(" START COMMAND ");
	        	stafCommand.append(ZIMBRA_PERL_COM + " ");

	        	stafCommand.append("-I " + SoapTestCore.rootZimbraQA + File.separator + fPerlHelpers + " ");

	        	// Add the perl test script to execute
	        	stafCommand.append(externalServer.getScriptPath() + " ");

           		stafCommand.append(" -p"+ TestProperties.testProperties.fDynamicPropertiesFile + " ");
	        	stafCommand.append(" -q"+ SoapTestCore.rootZimbraQA + " ");

	        	stafCommand.append(" RETURNSTDOUT RETURNSTDERR WAIT");
	            mLog.debug("Execute STAF " + STAF_MAPI_HOST + " " + STAF_MAPI_SERVICE + " " + stafCommand.toString());

	    		// Since this sub tools could read the dynamic properties,
	            // before executing the script, we need to write all properties to disk
	    		TestProperties.testProperties.writeProperties(coreController.rootDebugDir);


	            STAFResult stafResult = handle.submit2(STAF_MAPI_HOST, STAF_MAPI_SERVICE, stafCommand.toString());
	            if ( stafResult.rc != STAFResult.Ok ) {
		            // TODO: This is actually a script error
	            	mLog.warn("STAF return code:\n" + stafResult.rc);
	            	return (mTestPassed = false);
	            }

	            // Parse the stafResult string.  Look for Data:PASS or Data:FAIL
	            // If anything else is found, then there were failures
	            // or script errors - then mark the test as failed
	            //
            	STAFMarshallingContext mc = STAFMarshallingContext.unmarshall(stafResult.result);
            	mLog.info("MAPI Results:\n" + mc.toString());

            	// Unwind the result object.
            	// MAPI returns PASS or FAIL in the stderr return
            	// (STAF fileList is the list of stdout and stderr contents)
            	//
            	Map resultMap = (Map)mc.getRootObject();
            	List fileList = (List)resultMap.get("fileList");
            	Map stdoutMap = (Map)fileList.get(0);
            	String stdoutResult = (String)stdoutMap.get("data");
            	Map stderrMap = (Map)fileList.get(1);
            	String stderrResult = (String)stderrMap.get("data");

            	mResponseDetails = stdoutResult + "\n\n" + stderrResult;
            	mLog.debug("stdoutResult: [" + stdoutResult + "]");
            	mLog.debug("stderrResult: [" + stderrResult + "]");

            	if ( stderrResult.indexOf("FAIL") >= 0) {
            		return (mTestPassed = false);
            	}

            	if ( stderrResult.indexOf("PASS") >= 0 ) {
            		return (mTestPassed = true);
            	}

            	mLog.warn("No PASS or FAIL results from STAF call");
	    		return (mTestPassed = false);

	        } finally {

	            // Disconnect the STAF handle
	        	handle.unRegister();

	        }

        } catch (STAFException e) {

        	mLog.warn("Error registering or unregistering with STAF, RC:" + e.rc, e);
        	mLog.warn("RC: 21 is STAFNotRunning");
        	mLog.warn("http://staf.sourceforge.net/current/STAFJava.htm#Header_STAFResult");

        }


        return (mTestPassed = false);



	}

	public boolean executeTest() throws HarnessException {

		mLog.debug("MigrationImportTest execute");


		// Pause, if specified
		doDelay();

		// Depending on the "AREAS" specified, use the settings associaged with the source server
		// By default, run Exchange if no match is found
		//
		for (String serverType : SoapTestCore.testAreas ) {
			if (serverType.equalsIgnoreCase("exchange"))		externalServer = exchangeServer;
			else if (serverType.equalsIgnoreCase("groupwise"))	externalServer = groupwiseServer;
			else if (serverType.equalsIgnoreCase("domino"))		externalServer = dominoServer;
			else externalServer = exchangeServer;
		}
		mLog.info("Using external server of type: "+ externalServer.name);


		// Find the perl script to execute
		TestProperties.testProperties.setProperty("perlScriptPath", externalServer.getScriptPath());

		try {

			long start = System.currentTimeMillis();
			if ( usingStaf ) {
				executeStaf();
			} else {
				executeOS();
			}
			long finish = System.currentTimeMillis();

			mTime = finish - start;
			if ( !checkExecutionTimeframe() ) {
				mLog.info("Execution took too long or too short");
				mTestPassed = false;  // Execution took too long!
			}


			mLog.debug("PST Import Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
			return (!testFailed());

		} finally {

			// Since this sub tools could update the dynamic properties, we need to
			// read the current properties again and save any new property right away.
			TestProperties.testProperties.readProperties();

		}




	}

    static protected String expandMigrationProps(String text) throws HarnessException {

        mLog.debug("expandMigrationProps [" + text + "]");

		if ( SoapTestCore.testAreas == null ) {
			throw new HarnessException("Migration tests must set Areas to exchange, groupwise, or domino");
		}

		for (String serverType : SoapTestCore.testAreas ) {
			if (serverType.equalsIgnoreCase("exchange"))		externalServer = exchangeServer;
			else if (serverType.equalsIgnoreCase("groupwise"))	externalServer = groupwiseServer;
			else if (serverType.equalsIgnoreCase("domino"))		externalServer = dominoServer;
		}

		if (externalServer == null ) {
			throw new HarnessException("The specified test areas must include either exchange, groupwise, or domino");
		}

		mLog.info("Using external server of type: "+ externalServer.name);

		Matcher matcher = mExternalServerPattern.matcher(text);
        StringBuffer sb = new StringBuffer();

        while (matcher.find()) {

            String prop = matcher.group(1);
            String replace = externalServer.name;

            mLog.debug("expandMigrationProps prop [" + prop + "]");
            mLog.debug("expandMigrationProps replace [" + replace + "]");

            if (replace != null) {
                matcher.appendReplacement(sb, replace);
            } else {
                // Sync the dynamic props
                throw new HarnessException("unknown property: " + matcher.group(1));
                // matcher.appendReplacement(sb, matcher.group(1));
            }
        }
        matcher.appendTail(sb);
        text = sb.toString();
        mLog.debug("expandMigrationProps returning [" + text + "]");
        return text;
    }




	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected String getTestName() {
		return ("MigrationImportTest");
	}


}
