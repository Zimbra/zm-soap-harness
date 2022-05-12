package com.zimbra.qa.soap;

import java.io.File;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dom4j.QName;

import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class SystemCommandTest extends Test {

    private static Logger mLog = LogManager.getLogger(SystemCommandTest.class.getName());

    public static final QName E_SYSTEM = QName.get("system", SoapTestCore.NAMESPACE);

    // staf
    public static final String A_SERVER = "server";
    public static final String A_COMMAND = "command";
    public static final String A_PARMS = "parms";
    public static final String A_OUT = "stdout";
    public static final String A_ERR = "stderr";

    public SystemCommandTest() {
    }

    public SystemCommandTest(Element e, SoapTestCore core) {
        super(e, core);
    }

    private boolean executeJava() throws HarnessException {

        String targetHost = mTest.getAttribute(A_SERVER, SoapTestCore.sHostname);
        String targetCommand = mTest.getAttribute(A_COMMAND, null);
        String targetParms = mTest.getAttribute(A_PARMS, null);

        if (!(targetHost.equals(SoapTestCore.sHostname))) {
            // The XML specifies a different host to execute on - STAF is needed to do that
            mResponseDetails = "STAF native libaries are not installed (FAIL)";
            mTestPassed = false;
            return (false);
        }

        if (targetCommand.equals("mkdir")) {
            File f = new File(targetParms);
            if (!(mTestPassed = f.exists())) {
                mTestPassed = f.mkdirs();
            }
            mResponseDetails = targetCommand + " " + targetParms;
            return (mTestPassed);
        }

        if (targetCommand.equals("chmod")) {
            if (onWindows()) {
                mResponseDetails = "Skip chmod on Windows " + targetCommand + " " + targetParms;
                return (mTestPassed = true);
            }
        }

        if (targetCommand.equals("cat")) {
            if (onWindows()) {
                mResponseDetails = "Skip cat on Windows " + targetCommand + " " + targetParms;
                return (mTestPassed = true);
            }
        }

        // TODO: need to add translations for all UNIX commands
        mResponseDetails = "Unhandled System Command " + targetCommand + " " + targetParms;
        return (mTestPassed = false);
    }

    public boolean executeTest() throws HarnessException {
//		mLog.setLevel(Level.DEBUG);

        mLog.debug("SystemCommandTest execute");

        // Pause, if specified
        doDelay();

        // Send SOAP tests through STAF
        long start = System.currentTimeMillis();
        executeJava();

        long finish = System.currentTimeMillis();

        mTime = finish - start;
        if (!checkExecutionTimeframe()) {
            mLog.info("Execution took too long or too short");
            mTestPassed = false; // Execution took too long!
        }

        mLog.debug("System Command Test " + (testFailed() ? "failed" : "passed") + " in " + mTime + " msec");
        return (!testFailed());
    }

    @Override
    protected boolean dumpTest() {
        return false;
    }

    protected String getTestName() {
        return ("SystemCommand");
    }
}
