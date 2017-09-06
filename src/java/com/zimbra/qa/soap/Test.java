/*
 * Created on Apr 27, 2005
 *
 * TODO To change the template for this generated file go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Date;
import java.util.HashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.apache.log4j.Logger;
import org.dom4j.QName;

import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;



/**
 * @author Persistent
 *
 * TODO To change the template for this generated type comment go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
public abstract class Test extends AbsTest {

	protected static Logger mLog = Logger.getLogger(Test.class.getName());
	
	static protected AtomicInteger mTestNumbers = new AtomicInteger();

	public static final QName E_TEST = QName.get("test", SoapTestCore.NAMESPACE);

	public static final String A_ID = "id";
	public static final String A_TYPE = "type";
	public static final String A_REQUIRED = "required";
	public static final String A_DEPENDS = "depends";
	public static final String A_DELAY = "delay";

	protected static final String lowerCaseProp = "doSelect.toLowercase";
	
	public static final String A_TIMEFRAME_MAX = "timeframeMax";
	public static final String A_TIMEFRAME_MIN = "timeframeMin";

	public Date mTimeStamp = null;
	public boolean mTestPassed = false;
	public boolean mSkipped = false;
	
	// How long the test took
	public long mTime = 0;
	
	/** request test count to get average of request time */
	public int mTestCount;
	
	
	/** test number */
	protected int mTestNum;

	/** the <test> element */
	protected Element mTest;



	/** test objects indexed by their id (only in map if <t:test id="..."> set) */
	static private HashMap<String, TestReport> mTestResults = new HashMap<String, TestReport>();

	/** total number of checks made on this test */
	public int mNumChecks = 0;
	public int mNumCheckPass = 0;
	public int mNumCheckFail = 0;
	public String mFailReason = null;
	
	
	/** Default log output */
	protected Object mReference = null;
	protected String mPostfixSetup = null;
	protected String mSetupDetails = null;
	protected String mRequestDetails = null;
	protected String mResponseDetails = null;
	protected String mTeardownDetails = null;
	
	/** If a system command is executed, save output to this String **/
	protected String systemCommandOutput = "";
	
	protected SoapTestCore coreController = null;
	
	protected abstract boolean dumpTest();
	protected abstract String getTestName();
	
	protected abstract boolean executeTest() throws HarnessException;

	public Test() {
		
	}
		
	public Test(Element e, SoapTestCore core) {
		
		coreController = core;
		
		mTestNum = mTestNumbers.incrementAndGet();
		mTest = e;
		mRequestDetails = e.toString();
				
		mTimeStamp = new Date();		
		
		if ( getId() != null ) {
            TestReport current = new TestReport(this);
			mTestResults.put(current.getId(), current);
        }
		
	}
    
	protected boolean isConcurrent() {
		return ( mTest.getAttribute(SoapTestCore.A_CONCURRENT, "false").equals("true") );
	}
	
	public void compact() {
		mSetupDetails = null;
		mRequestDetails = null;
		mResponseDetails = null;
		mTeardownDetails = null;
    }
		
	protected String getDetails() {
		
		StringBuffer details=new StringBuffer();

		details.append(lpadz(mTestNum + "", 4) + " - " + mTimeStamp.toString() + (mReference == null ? "" : " - " + mReference.toString()) + "\n");
				
		if ( mPostfixSetup != null ) {
			details.append("----\n" + mPostfixSetup + "\n");
		}
		if ( mSetupDetails != null ) {
			details.append("----\n" + mSetupDetails + "\n");
		}
		if ( mRequestDetails != null ) {
			details.append("----\n" + mRequestDetails + "\n");
		}
		if ( mResponseDetails != null ) {
			details.append("----\n" + mResponseDetails + "\n");
		}
		if ( mTeardownDetails != null ) {
			details.append("----\n" + mTeardownDetails + "\n");
		}
		if ( mFailReason != null ) {
			details.append("----\n" + mFailReason + "\n");						
		}
		details.append("----\n");
		
		return details.toString();
		
	}
	
	protected String getSummary() {
		StringBuffer status = new StringBuffer();

		if (mSkipped) {
			status.append("SKIP ");
		} else if (testFailed()) {
			status.append("FAIL ");
		} else {
			status.append("PASS ");
		}

		status.append(lpadz(mTestNum + "", 4));
		status.append(" ");

		status.append(lpad((mNumChecks - mNumCheckFail) + "/" + mNumChecks, 5));
		status.append(" ");

		status.append(lpad(mTime + "ms ", 8));

		status.append(rpad(getTestName(), 28));
		
		return status.toString();
	}
	
	public void check(boolean ok, String message) {
		mNumChecks++; mNumCheckPass++;
		if (ok) {
			mNumCheckPass++;
		} else {
			mLog.info("check failed: ("+ message+")");
			mFailReason = "check failed: ("+ message+")";
			mNumCheckFail++;
		}
	}

	public int getMaxTimeFrame(){
		String tFrame = mTest.getAttribute(A_TIMEFRAME_MAX,"0");
		return Integer.parseInt(tFrame);
	}

	public int getMinTimeFrame(){
		String tFrame = mTest.getAttribute(A_TIMEFRAME_MIN,"0");
		return Integer.parseInt(tFrame);
	}

	public boolean checkExecutionTimeframe() {
		
		long maxDuration = getMaxTimeFrame();
		if ( (maxDuration > 0) && (mTime > maxDuration)  ) {
			coreController.mResultLogger.info("Execution was too long!  " + mTime + " > " + maxDuration);
			return ( false );
		}
		
		long minDuration = getMinTimeFrame();
		if ( (minDuration != 0) && (mTime < minDuration) ) {
			coreController.mResultLogger.info("Execution was too short!  " + mTime + " < " + minDuration);
			return ( false );
		}
		
		// Execution time was ok
		return ( true );
		
	}
	
	public boolean testFailed() {
		return (!mTestPassed);
	}
	
	
	public boolean isRequired() {
		return ("true".equals(mTest.getAttribute(A_REQUIRED, null)));
	}
	
	public String getId() {
		return mTest.getAttribute(A_ID, null);
	}

	public int doDelay() {
		return (SoapTestCore.sleepDelay(getDelay()));
	}
	
	public int getDelay() {
		int delay = 0;
		try {
			return Integer.parseInt(mTest.getAttribute(A_DELAY, "0"));						
		} catch (NumberFormatException n) {
			mLog.warn("Unable to parse delay for " + mTest.toString());
		}
		return (delay);
	}
	
	public String[] getDepends() {
		String d = mTest.getAttribute(A_DEPENDS, null);
		if (d != null && !d.equals("")) {
			return d.split(",");
		} else {
			return null;
		}
	}
	
	public static boolean usingStaf = false;
	
	protected static boolean onWindows() {
        String os = System.getProperty("os.name").toLowerCase();
        return os.startsWith("win");
    }

	protected static String lpad(String s, int width) {
		return pad(s, width, false, true);
	}
	
	protected static String rpad(String s, int width) {
		return pad(s, width, false, false);
	}
	
	protected static String lpadz(String s, int width) {
		return pad(s, width, true, true);
	}
	
	protected static String rpadz(String s, int width) {
		return pad(s, width, true, false);
	}
		
	/**
	 * @param testNum
	 * @return
	 */
	protected static String pad(String s, int width, boolean withZero,
			boolean left) {
		int needed = width - s.length();
	
		if (needed <= 0)
			return s;
	
		StringBuffer sb = new StringBuffer(width);
	
		if (left) {
			while (needed-- > 0) {
				sb.append(withZero ? '0' : ' ');
			}
			sb.append(s);
		} else {
			sb.append(s);
			while (needed-- > 0) {
				sb.append(withZero ? '0' : ' ');
			}
		}
		return sb.toString();
	}
	

	static public void clearDepends() {

		// Reset the executed test ids
		mTestResults.clear();

	}
	
	static public boolean checkDepends(Test test) throws HarnessException {

		String depends[] = test.getDepends();
		if (depends != null) {
			for (int i = 0; i < depends.length; i++) {
				TestReport t = mTestResults.get(depends[i]);
				if (t == null)
					throw new HarnessException("test (id=" + test.getId()
							+ ") depends on test (id=" + depends[i]
							+ ") which hasn't been run yet");
				if (t.isTestFailed()) {
					return false;
				}
			}
		}
		return true;
	}


	protected class StreamGobbler extends Thread
	{
	    InputStream is;
	    String type;
	    
	    StreamGobbler(InputStream is, String type)
	    {
	        this.is = is;
	        this.type = type;
	    }
	    
	    public void run()
	    {
	        try
	        {
	            InputStreamReader isr = new InputStreamReader(is);
	            BufferedReader br = new BufferedReader(isr);
	            
	            String line=null;
	            while ( (line = br.readLine()) != null) {
	            	
	            	// Log to the results file
	                coreController.mResultLogger.info(line);
	                systemCommandOutput += line;
	                
	                // Log to the main logger
	                if ( type.equals("ERROR") ) {
	                	mLog.error(line);	                	
	                } else {
	                	mLog.debug(line);
	                }
	            }
	            //mPostTestDetails = sb.toString();
	        } catch (IOException ioe) {
				ioe.printStackTrace();
			}
	    }
	}
	
	protected int systemCommand(String command, File dir) throws HarnessException {
		
		String OS = System.getProperty("os.name").toLowerCase();

		if ( !(OS.indexOf("windows") > -1) ) {
			  mLog.error("MAPI OS: "+ OS);
			  throw new HarnessException("Do not run MAPI tests from non-windows clients (" + OS + ")" );
		} 

        String[] cmd = new String[3];
        cmd[0] = "cmd.exe" ;
        cmd[1] = "/C" ;
        cmd[2] = command;

        
        try {
        	
        	Runtime rt = Runtime.getRuntime();
        	mSetupDetails = "exec: " + cmd[0] + " " + cmd[1] + " " + cmd[2] + (( dir == null ) ? "" : dir.getCanonicalFile());
	   
        	Process proc = rt.exec(cmd, null, dir);
	        
        	// any error message?
	        StreamGobbler errorGobbler = new
	            StreamGobbler(proc.getErrorStream(), "ERROR");            
	        
	        // any output?
	        StreamGobbler outputGobbler = new
	            StreamGobbler(proc.getInputStream(), "OUTPUT");
	            
	        // kick them off
	        errorGobbler.start();
	        outputGobbler.start();
	                                
	        // any error???
	        int exitVal = proc.waitFor();

	        return (exitVal);
	        
	        
        } catch (IOException e) {
        	throw new HarnessException("Error while executing " + command, e);
        } catch (InterruptedException e) {
        	throw new HarnessException("Error while executing " + command, e);
		}

	}

	protected int systemCommand(String command) throws HarnessException {
		return (systemCommand(command, new File(SoapTestCore.rootZimbraQA)));
	}
	
	
	/**
	 * @author bhwang
	 *
	 */
	public class TestReport {
	    private String Id;
	    private boolean testFailed;
	    
	    public TestReport(Test test) {
	        if(test != null) {
	            setId(test.getId());
	            setTestFailed(test.testFailed());
	        } 
	        else {
	            setId("");
	            setTestFailed(false);
	        }
	    }

	    public void setId(String id) {
	        Id = id;
	    } 
	     
	    public String getId() {
	        return Id;
	    }

	    public void setTestFailed(boolean testFailed) {
	        this.testFailed = testFailed;
	    }      
	    public boolean isTestFailed() {
	        return testFailed;
	    }
	 
	    
	}


}