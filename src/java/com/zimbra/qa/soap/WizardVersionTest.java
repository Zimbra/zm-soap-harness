package com.zimbra.qa.soap;


import java.io.File;
import java.util.List;
import java.util.Map;

import org.apache.log4j.Logger;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFMarshallingContext;
import com.ibm.staf.STAFResult;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;
import com.zimbra.common.soap.Element;

public class WizardVersionTest extends Test {

	static Logger mLog = Logger.getLogger(WizardVersionTest.class.getName());

	public static final String fPerlScript = "perlHelpers/qaWizardVersion.pl";

	protected final String STAF_MAPI_HOST = "LOCAL";
	protected final String STAF_MAPI_SERVICE = "PROCESS";


	// Define the return codes from MAPI script.
	// Keep these values in sync with qaTest.pl and qaMapiTools.pl
	public static final int E_MAPI_PASSED = STAFResult.Ok; // Zero
	public static final int E_MAPI_FAILED = STAFResult.UserDefined + 1;

	public WizardVersionTest() {
	}

	public WizardVersionTest(Element e, SoapTestCore core) {

		super(e, core);


	}


	private boolean executeStaf() throws HarnessException {

		mLog.debug("WizardVersionTest execute STAF");

		String userDir = System.getProperty( "user.dir" );
		String mapiRoot = TestProperties.testProperties.getProperty("mapiValidator.root", null);
       	File propFile = new File( TestProperties.testProperties.getProperty("propertiesFile", null) );
       	File qaRootDir = new File ( SoapTestCore.rootZimbraQA );

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
	        	stafCommand.append("perl ");

	        	if ( mapiRoot != null ) {
	        		// Add the include path to perlHelpers
		        	stafCommand.append("-I " + mapiRoot + "/perlHelpers/ ");
	        	}

	        	// Add the perl test script to execute
	        	stafCommand.append(mapiRoot + "/" + fPerlScript + " ");

	           	if ( propFile.exists() && propFile.isFile() && propFile.canRead() ) {
	            	// Append the property file
	           		stafCommand.append(" -p"+propFile + " ");
	            }
    	        if ( qaRootDir.exists() && qaRootDir.isDirectory() && qaRootDir.canRead() ) {
	            	// Append the QA root dir
    	        	stafCommand.append(" -q"+qaRootDir + " ");
            	}
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

		mLog.debug("WizardVersionTest execute");

		// Pause, if specified
		doDelay();

		try {

			// Send SOAP tests through STAF
			long start = System.currentTimeMillis();
			executeStaf();
			long finish = System.currentTimeMillis();

			mTime = finish - start;
			if ( !checkExecutionTimeframe() ) {
				mLog.info("Execution took too long or too short");
				mTestPassed = false;  // Execution took too long!
			}


			mLog.debug("Wizard Version Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
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
		return ("WizardVersionTest");
	}
}
