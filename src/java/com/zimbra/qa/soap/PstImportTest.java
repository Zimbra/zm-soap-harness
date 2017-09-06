package com.zimbra.qa.soap;


import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.apache.log4j.Logger;
import org.dom4j.QName;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFMarshallingContext;
import com.ibm.staf.STAFResult;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;
import com.zimbra.common.soap.Element;

public class PstImportTest extends Test {

	static Logger mLog = Logger.getLogger(PstImportTest.class.getName());


    public static final QName E_PSTIMPORTTEST = QName.get("pstimporttest", SoapTestCore.NAMESPACE);

	public static final String A_WIZARD = "wizardpath";
	public static final String A_PSTFILE = "pstfile";
	public static final String A_ACCOUNT = "account";
	public static final String A_OLDACCOUNT = "exchangeaccount";
	public static final String A_PASSWORD = "password";
	public static final String A_SERVER = "server";
	public static final String A_IMPORTDELAY = "importdelay";

	public static final String fPerlScript = "perlHelpers/qaImportWizard.pl";


	protected final String STAF_MAPI_HOST = "LOCAL";
	protected final String STAF_MAPI_SERVICE = "PROCESS";

	static final String ZIMBRA_PERL_COM = "perl";

	public static String fDefaultWizardPath = null;
	protected String perlFileName = null;



	// Define the return codes from MAPI script.
	// Keep these values in sync with qaTest.pl and qaMapiTools.pl
	public static final int E_MAPI_PASSED = STAFResult.Ok; // Zero
	public static final int E_MAPI_FAILED = STAFResult.UserDefined + 1;

	public PstImportTest() {
	}

	public PstImportTest(Element e, SoapTestCore core) {

		super(e, core);


	}


	private boolean executeOS() throws HarnessException {

		String OS = System.getProperty("os.name").toLowerCase();

		if ( !(OS.indexOf("windows xp") > -1) ) {
			  mLog.error("MAPI OS: "+ OS);
			  throw new HarnessException("Do not run MAPI tests from non-XP clients");
		}



		mLog.debug("PstImportTest execute OS");


       	StringBuffer osCommand = new StringBuffer();
		osCommand.append(ZIMBRA_PERL_COM + " ");
		osCommand.append("-I " + SoapTestCore.rootZimbraQA + " ");
		osCommand.append(perlFileName + " ");
		osCommand.append("-p " + TestProperties.testProperties.fDynamicPropertiesFile + " ");
		osCommand.append("-q " + SoapTestCore.rootZimbraQA  + " ");


		mRequestDetails = osCommand.toString();
		int retVal = systemCommand(osCommand.toString(), new File(SoapTestCore.rootZimbraQA));
		mResponseDetails = "return value: " + retVal;

    	if ( systemCommandOutput.indexOf("PST Import Test: FAIL") >= 0) {
    		return (mTestPassed = false);
    	}

    	if ( systemCommandOutput.indexOf("PST Import Test: PASS") >= 0 ) {
    		return (mTestPassed = true);
    	}

    	mLog.warn("No PASS or FAIL results from STAF call");
		return (mTestPassed = false);

	}

	private boolean executeStaf() throws HarnessException {

		mLog.debug("PstImportTest execute STAF");

		// Run the MAPI perl script using STAF.  Use the STAF PROCESS service,
		// which can run any executable on the test client.
		//
		// To run MAPI tests, execute the perl script


       	STAFHandle handle = null;

       	try
        {

            handle = new STAFHandle(SoapTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());


	        try
	        {


	        	StringBuffer stafCommand = new StringBuffer();
	        	stafCommand.append(" START ");

	        	stafCommand.append(" WORKDIR ");
	        	stafCommand.append(" " + SoapTestCore.rootZimbraQA + " ");

	        	stafCommand.append(" COMMAND ");
	        	stafCommand.append(ZIMBRA_PERL_COM + " ");

				stafCommand.append("-I " + SoapTestCore.rootZimbraQA + " ");
				stafCommand.append(perlFileName + " ");
           		stafCommand.append(" -p"+ TestProperties.testProperties.fDynamicPropertiesFile + " ");
   	        	stafCommand.append(" -q"+ SoapTestCore.rootZimbraQA + " ");

    	        stafCommand.append(" RETURNSTDOUT RETURNSTDERR WAIT");

    	        mSetupDetails = "STAF " + STAF_MAPI_HOST + " " + STAF_MAPI_SERVICE + " " + stafCommand.toString();
    	        mLog.debug("Execute STAF " + STAF_MAPI_HOST + " " + STAF_MAPI_SERVICE + " " + stafCommand.toString());


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

            	if ( stderrResult.indexOf("PST Import Test: FAIL") >= 0) {
            		return (mTestPassed = false);
            	}

            	if ( stderrResult.indexOf("PST Import Test: PASS") >= 0 ) {
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

		mLog.debug("PstImportTest execute");


		// Pause, if specified
		doDelay();


		// Determine which import wizard tool to use.
		// Precedence:
		// 1. XML File <A_WIZARD>
		// 2. global.properties/set in xml file ("pstImportTool.path")
		// 3. if not specified, download from the server
		//
		String wizardPathFileName = mTest.getAttribute(A_WIZARD, null);
		if ( wizardPathFileName == null ) {

			if ( fDefaultWizardPath != null ) {
				wizardPathFileName = fDefaultWizardPath;
			} else {
				wizardPathFileName = TestProperties.testProperties.getProperty("pstImportTool.path", null);
				fDefaultWizardPath = wizardPathFileName;
			}
		}
		if ( wizardPathFileName != null ) {
			try {
				File wizardPathFile = new File(SoapTestCore.rootZimbraQA, wizardPathFileName);
				TestProperties.testProperties.setProperty("harnessWizardPath", wizardPathFile.getCanonicalPath());
			} catch (IOException e) {
				throw new HarnessException("Unable to locate PST Import Tool: " + wizardPathFileName, e);
			}
		}


		// If harnessWizardPath is not set, then the perl script will download from the server

		String accountName = mTest.getAttribute(A_ACCOUNT, null);
		if ( accountName != null ) {
			TestProperties.testProperties.setProperty("harnessAccountName", accountName);
		}
		// Determine the old account assocaited with the PST file, if any
		String oldAccountName = mTest.getAttribute(A_OLDACCOUNT, null);
		if ( oldAccountName != null ) {
			TestProperties.testProperties.setProperty("harnessExchangeAccountName", oldAccountName);
		}
		String accountPassword = mTest.getAttribute(A_PASSWORD, null);
		if ( accountPassword != null ) {
			TestProperties.testProperties.setProperty("harnessAccountPassword", accountPassword);
		}
		String accountServer = mTest.getAttribute(A_SERVER, null);
		if ( accountServer != null ) {
			TestProperties.testProperties.setProperty("harnessAccountServer", accountServer);
		}


		String importDelay = mTest.getAttribute(A_IMPORTDELAY, null);
		if ( importDelay != null ) {
			TestProperties.testProperties.setProperty("harnessImportDelay", importDelay);
		}


		String pstFileName = null;
		try {
			// Determine the PST file to import
			pstFileName = mTest.getAttribute(A_PSTFILE, null);
			if ( pstFileName == null ) {
				mTestPassed = false;
				throw new HarnessException("PST Import Test needs a " + A_PSTFILE + " attribute");
			}
			File pstFile = new File(SoapTestCore.rootZimbraQA, pstFileName);
			TestProperties.testProperties.setProperty("harnessImportFile", pstFile.getCanonicalPath());
		} catch (IOException e) {
			throw new HarnessException("PST file path is invalid " + pstFileName, e);
		}


		String mapiRoot = null;
		try {
			// Prepend the mapi root path, if specified
			mapiRoot = TestProperties.testProperties.getProperty("mapiValidator.root", null);
			File scriptFile = new File(SoapTestCore.rootZimbraQA, mapiRoot + File.separator + fPerlScript);
			perlFileName = scriptFile.getCanonicalPath();
		} catch (IOException e) {
			throw new HarnessException("Cannot find pst import perl script " + mapiRoot + File.separator + fPerlScript, e);
		}


		TestProperties.testProperties.setProperty("rootZimbraQA", SoapTestCore.rootZimbraQA);


		// Since this sub tools could read the dynamic properties,
        // before executing the script, we need to write all properties to disk
		TestProperties.testProperties.writeProperties(coreController.rootDebugDir);



		try {

			// Send SOAP tests through STAF
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




	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected String getTestName() {
		return ("PstImportTest");
	}


}
