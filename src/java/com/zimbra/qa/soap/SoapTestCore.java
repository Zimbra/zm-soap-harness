package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileFilter;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.net.InetAddress;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.UnknownHostException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.Enumeration;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.TimeZone;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.SecretKey;

import org.apache.commons.httpclient.Header;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.commons.httpclient.methods.RequestEntity;
import org.apache.log4j.FileAppender;
import org.apache.log4j.Layout;
import org.apache.log4j.Logger;
import org.apache.log4j.PatternLayout;
import org.dom4j.DocumentException;
import org.dom4j.Namespace;
import org.dom4j.QName;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFMarshallingContext;
import com.ibm.staf.STAFResult;
import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.SoapFaultException;
import com.zimbra.common.soap.XmlParseException;
import com.zimbra.common.util.ByteUtil;

public class SoapTestCore {

    // General debug logger
    private static Logger mLog = Logger.getLogger(SoapTestCore.class.getName());

    // Logger for test case output (details and summary)
    protected Logger mTraceLogger = null;
    protected Logger mResultLogger = null;
    
    public static final String NAMESPACE_STR = "urn:zimbraTestHarness";
    public static final Namespace NAMESPACE = Namespace.get("test", NAMESPACE_STR);

    // Elements used
    public static final QName E_TESTS = QName.get("tests", NAMESPACE);

    // include a sub-xml file
    public static final QName E_TESTINCLUDE = QName.get("include", NAMESPACE);
    public static final String E_INCLUDEFILE = "filename";


    // Elements to run at the end of file execution
    public static final QName E_FINALLY = QName.get("finally", NAMESPACE);
    public static final String A_FINALLY_QUEUED = "queued";
    
    // include a sub-xml file
    public static final QName E_DELEGATE_LOOP = QName.get("delegate", NAMESPACE);
    public static final String E_DELEGATE_LIST = "rights";
    public static final String E_DELEGATE_SET = "set";
    public static final QName E_DELEGATE_EXECUTE = QName.get("checksoap", NAMESPACE);
    public static final String E_DELEGATE_REQUESTS = "requests";
    public static final String E_DELEGATE_RIGHT = "right";


    // General
    public static final QName E_ZDC_SERVER = QName.get("zdcserver", NAMESPACE);
    public static final QName E_FORLOOP = QName.get("for", NAMESPACE);
    public static final QName E_TESTLOOP = QName.get("test_loop", NAMESPACE);
    public static final QName E_PREAUTH = QName.get("preauth", NAMESPACE);
    public static final QName E_PROPERTY = QName.get("property", NAMESPACE);
    public static final QName E_REGEX = QName.get("regex", NAMESPACE);
    public static final QName E_DELAY = QName.get("delay", NAMESPACE);
    public static final QName E_SELECT = QName.get("select", NAMESPACE);
    public static final QName E_HEADER = QName.get("header", NAMESPACE);
    public static final QName E_ECHO = QName.get("echo", NAMESPACE);
    public static final QName E_WAITFORPOSTFIXQUEUE = QName.get("waitforpostfixqueue", NAMESPACE);
    public static final QName E_EXIT = QName.get("exit", NAMESPACE);
    public static final QName E_NAMESPACE = QName.get("namespace", NAMESPACE);

    // Attributes used
    public static final String A_ATTR = "attr";
    public static final String A_PATH = "path";
    public static final String A_NAME = "name";
    public static final String A_SET = "set";
    public static final String A_REPLACE = "replace";
    public static final String A_MATCH = "match";
    public static final String A_INPUT = "input";
    public static final String A_REGEX = "regex";
    public static final String A_GROUP = "group";
    public static final String A_VALUE = "value";
    public static final String A_URLENCODE = "urlencode";
    public static final String A_PREFIX = "prefix";
    public static final String A_URI = "uri";
    public static final String A_MSEC = "msec";
    public static final String A_SEC = "sec";
    public static final String A_CONCURRENT = "concurrent";


    public static final String A_TESTLOOP = "count";
    
    public static final String A_FORLOOPNAME = "name";
    public static final String A_FORLOOPSTART = "start";
    public static final String A_FORLOOPEND = "end";
    public static final String A_FORLOOPINCR = "increment";
    public static final String A_FORLOOPBREAK = "break";
    public static final String A_FORLOOPCONTINUE = "continue";
    

    public static final String A_ACCOUNT = "account";
    public static final String A_BY = "by";
    public static final String A_EXPIRES = "expires";
    public static final String A_TIMESTAMP = "timestamp";
    public static final String A_KEY = "key";
    public static final String A_ADMIN = "admin";

    // Regex Patterns used
    //	protected static Pattern mPropPattern = Pattern.compile("(\\$\\{((.*\\(\\$\\{[^}]+\\})*[^}]+)\\})");
    protected static final Pattern mPropPattern = Pattern.compile("(\\$\\{([^}]+)\\})");
    protected static final Pattern mGenTimePattern = Pattern.compile("\\(([-+])?(\\d+)([dhms])?\\)");
    protected static final Pattern mInitTimePattern = Pattern.compile("(\\[([^\\]]+)\\])");

    // Global settings used to control the test
    public static String sHostname = null;
    public static String testDuration = null;
    public static ArrayList<String> testType = null;
    public static ArrayList<String> testAreas = null;
    public static ArrayList<String> testAreasToSkip = new ArrayList<String>(Arrays.asList("dev_internal,ZDC".split(",")));
    public static ArrayList<String> testExcludes = null;
    public static ArrayList<String> installHistory = null;
    public static String testServerBits = "network"; // open or network
    public static int hostCount = 1;
    public static String rootZimbraQA = null;
    public static String mLogDirectory = null;
    public static String mLogSubDirectory = null;	// Used for ZDC server loop


    // Current settings for this test script
	public static CopyOnWriteArrayList<String> mCurrTestFiles = new CopyOnWriteArrayList<String>();
	
    
    String mCurrTestFile = null;
    public String rootCurrTestDir = null;
    public String rootDebugDir = null;
    
    // Reporting counters:
    public int mTestCasePass = 0;
    public int mTestCaseFail = 0;
//    public int mTestCaseError = 0; // Test Case Counters per XML File
    

    public int mTestPass = 0;
    public int mTestFail = 0; // Test counters

    /** to trace each request performance time */
    protected HashMap<String, Long> mReqTime;
    protected long mTestTime;

    /** counter for ${COUNTER} property */
    public static AtomicInteger mCounter = new AtomicInteger();
    protected long mLoopIndex = 0;

    public static TestFactory mTestFactory = new TestFactory();

    protected TestCase mCurrTestCase;

    protected boolean mPostfixDelayIsPending = false;
    protected boolean mLdapDelayIsPending = false;
    protected static HashMap<String, Boolean> mReplicated = new HashMap<String, Boolean> ();

    /** list of test results built up as we run */
    protected StringBuffer	summaryResults;

    // A list of actively running test steps
    
    /* A list of include file paths that have already been found */
    protected HashMap<String, String> mIncludePaths = null;

    // A service to run test steps concurrently
	private final ExecutorService testStepService = Executors.newFixedThreadPool(10);
    private LinkedList<Future> pendingTestSteps = new LinkedList<Future>();
	private int maxWaitTimeForPendingTestSteps;
	
	
    
    private class ConcurrentTestStepCore implements Runnable {

		final Test testStep;
        boolean rResult = false;
        
 		ConcurrentTestStepCore(Test t) {
			testStep = t;
		}
		
		public void run() {
			
        	mLog.info("Running ...");
        	
        	SoapTestCore core =null;
        	
        	 if (testStep == null) {
        		 mLog.warn("testStep is null");
        		 return;
        	 }
        	 
        	if (testStep != null) {        	
        		core = testStep.coreController;
        	}
        	
        	try {
        		
            	mLog.debug("run SoapTestCore.doTest");
            	
            	if (testStep != null) { 
            		testStep.executeTest();
            	}
            	
            } catch (HarnessException e) {
            	
        		mLog.error("Concurrent test step threw an exception", e);
        		
        		core.mCurrTestCase.addTestStepFailure(1);	// TestCase Failed!
    			core.summaryResults.append(" (Broken Bug: #" + ( core.mCurrTestCase.getBugIDs().equals("NO_BUGS_LOGGED") ? "NEW" :  core.mCurrTestCase.getBugIDs() ) + ")" );

            } finally {
            	
                if (testStep != null) {
                	
                	core.mTraceLogger.info(testStep.getDetails());
                    testStep.compact();
                    
                    // If the test failed and it is required, return false.  Otherwise return true
                    rResult = ( !( testStep.testFailed() && testStep.isRequired() ) );
        			
                }        	

            }

            // Record the amount of time it took to execute
            core.addReqTime(testStep);
            
            // Save the details for the summary report
            core.summaryResults.append(testStep.getSummary());
            core.summaryResults.append("\t" + core.mCurrTestCase.getId());
            
    		if (testStep.testFailed()) {
    			core.summaryResults.append(" (Broken Bug: #" + ( core.mCurrTestCase.getBugIDs().equals("NO_BUGS_LOGGED") ? "NEW" :  core.mCurrTestCase.getBugIDs() ) + ")" );
    		} else {
    			if ( !core.mCurrTestCase.getBugIDs().equals("NO_BUGS_LOGGED") ) {
    				core.summaryResults.append(" (Fixed Bug: #" + core.mCurrTestCase.getBugIDs() + ")");
    			}
    		}
    		core.summaryResults.append(Layout.LINE_SEP);

        	if ( testStep.testFailed() ) {
        		core.mCurrTestCase.addTestStepFailure(1);	// TestCase Failed!
            }

		}
    	
    }


    
    
    /**
     * Execute tests in an input XML file.
     * 
     * @param inputFile
     * @return
     * @throws DocumentException
     * @throws HarnessException
     * @throws SoapFaultException
     * @throws IOException
     * @throws HarnessException 
     * @throws HarnessException 
     */
    public void runTestFile(File inputFile) throws DocumentException, IOException, HarnessException {

        FileAppender fileAppender = null;
        mTraceLogger = Logger.getLogger("zimbra.qa.trace");
        mResultLogger = Logger.getLogger("zimbra.qa.trace.result");

        //Additivity has been set to false in order to avoid duplicate log being printed in the console during execution
        mTraceLogger.setAdditivity(false);


        mTestPass = 0;	// Individual test steps
        mTestFail = 0;
        mTestCasePass = 0; // Individual test cases
        mTestCaseFail = 0;

        // Remember the current test file
        mCurrTestFile = inputFile.getCanonicalPath();
        rootCurrTestDir = inputFile.getParentFile().getCanonicalPath();
        mCurrTestFiles.add(mCurrTestFile);
        
        // Reset the executed test ids
        Test.clearDepends();
        
        // Clear Perf Counter
        mReqTime.clear();
        
        
        // TODO: Should we reload the global properties to reset their values?

        // Clear mtests array
//        mTests.clear();
        summaryResults = new StringBuffer(Layout.LINE_SEP + "-------------------SUMMARY---------------------" + Layout.LINE_SEP + Layout.LINE_SEP);

        try {
        	
        	
	        // Instead of logging all information to a single staf.txt file,
	        // open an individual log file for each xml file
	        //
	        fileAppender = createFileAppender(mLogDirectory, mLogSubDirectory, inputFile);
	        if (fileAppender != null) {
	            mTraceLogger.addAppender(fileAppender);
	        }
	
	        mResultLogger.info("***************************************************************************************");
	        mResultLogger.info("EXECUTING TEST: " + inputFile.getAbsolutePath());

	        
	        // Store the CWD and test XML file (full path)
	        //
	        TestProperties.testProperties.setProperty("harnessTestFile", getPortableFilePath(new File(mCurrTestFile), null));
	        TestProperties.testProperties.setProperty("harnessTestFolder", getPortableFilePath(new File(rootCurrTestDir), null));
	        TestProperties.testProperties.setProperty("ZimbraQARoot", getPortableFilePath(new File(rootZimbraQA), null));
	        
	        
	        // Only use the part after data
	        // String logFileName =
	        // logFileName.substring(logFileName.indexOf(zimbraQARoot) +
	        // zimbraQARoot.length());
	        Element root = null;
	
	        try {
	
	            String docStr = new String(ByteUtil.getContent(inputFile), "utf-8");
	
	            root = Element.parseXML(docStr);
	
	            if (!root.getQName().equals(E_TESTS))
	                throw new HarnessException("Root node of document must be "
	                    + E_TESTS.getQualifiedName());
	
	            doTests(root);
	            // int result = doTests(Element.parseXML(docStr));
	
 
	        } catch (Exception ex) {

	        	if ( mCurrTestCase != null ) {
	        		// Keep track of the test cases status
	        		ResultsXml.addTestCaseException(mCurrTestCase.getId(),  ex.getClass().getCanonicalName());
	        	}
	    		

	            mResultLogger.error(inputFile.getAbsolutePath() + " threw an exception", ex);
	            throw new HarnessException(inputFile.getAbsolutePath() + " threw an exception", ex);
	            
	        } finally {
	        	

                mCurrTestCase = null;
	        	
	        	if ( root != null ) {
	        		// Unwind all the test config changes that may impact other tests
	        		try {
						doFinally(root);

						// Flush the TestProperties.testProperties, for logging
//			            TestProperties.testProperties.writeProperties(rootDebugDir);
			            
					} catch (HarnessException ex) {
						
						mResultLogger.error(inputFile.getName() + " threw an HarnessException ", ex);
			            throw (ex);
			            
					}
	        		
	        	} else {
	        		mLog.debug("Unwinding could not find the elements!");
	        	}

	        }
	
            mTraceLogger.info("");
            mTraceLogger.info("-------------------FILE INFO---------------------");
            mTraceLogger.info("");
            mTraceLogger.info("XML: " + inputFile);
            mTraceLogger.info("");
            
	        mTraceLogger.info(getPerfSummary());

	        mTraceLogger.info(summaryResults.toString());

	        mResultLogger.info("");        	
	        mTraceLogger.info("script_parsable:\t" + mTestCasePass + "\t" + mTestCaseFail);
	        mTraceLogger.info("");
	        mTraceLogger.info("");
	        mTraceLogger.info("");
	        mTraceLogger.info("TEST CASE Results: " + mTestCasePass + "(PASS) - " + mTestCaseFail + "(Fail)");
	        mTraceLogger.info("");
	        mTraceLogger.info("");
	        mResultLogger.info("REQUEST/RESPONSE Results: " + mTestPass + "(PASS) - " + mTestFail + "(Fail)");
	        mResultLogger.info("");
	        mResultLogger.info("");
        	
        		            
        } finally {
        	
            mCurrTestFiles.remove(mCurrTestFile);

            // remove the file appenders for this XML
            if (fileAppender != null) {
                mTraceLogger.removeAppender(fileAppender);
                mResultLogger.removeAppender(fileAppender);
                fileAppender.close();
                fileAppender = null;
            }
            
            mTraceLogger = null;
            
        }

    }

    public static boolean isTestCaseInFile(File xmlFile, String soapTestCase) throws IOException, XmlParseException {
    	
        
        // Convert XML text file to Element object
        String docStr = new String(ByteUtil.getContent(xmlFile), "utf-8");
        Element root = Element.parseXML(docStr);
        
        // XML must be <t:tests/>
        if (!root.getQName().equals(E_TESTS)) {
        	mLog.error("Root node of document must be " + E_TESTS.getQualifiedName());
        	return (false);
        }

        // Parse the Element, look for the test case
        for (Iterator it = root.elementIterator(); it.hasNext();) {

            // e = expandProps(e.createCopy());
            Element e = (Element) it.next();
            mLog.debug("Element " + e.toString());

            if (e.getQName().equals(TestCase.E_TESTCASE)) {
            	if ( e.getAttribute(TestCase.A_TESTCASEID, "").equalsIgnoreCase(soapTestCase)) {
                	mLog.debug(soapTestCase + " does exist in " + xmlFile);
            		mLog.debug("Found " + soapTestCase);
            		return (true);
            	}
            }
        }
        
        // Never found the test case
    	mLog.debug(soapTestCase + " does not exist in " + xmlFile);
        return (false);
    	
    }
    
    /**
     * 
     */
    private String getPerfSummary() {
        // Summarize the pass/fail statistics

    	StringBuffer summary = new StringBuffer();

    	if (!mReqTime.isEmpty()) {

            // Display the request/response times
            //
            summary.append(Layout.LINE_SEP);
            summary.append("-----------------------------REQUEST PERFORMANCE SUMMARY---------------------------------").append(Layout.LINE_SEP).append(Layout.LINE_SEP);
            summary.append("Request Name                              ExecutionTime(msec)  ExecutionCount  AvgExecutionTime(msec)").append(Layout.LINE_SEP).append(Layout.LINE_SEP);

            for (Iterator it = mReqTime.keySet().iterator(); it.hasNext();) {
                String str = (String) it.next();

                long tmpTime = ((Long) mReqTime.get(str)).longValue();

                summary.append(getReqSummary(str, tmpTime)).append(Layout.LINE_SEP);

            }
        }
    	
    	return (summary.toString());
    }

    public SoapTestCore() {

        mReqTime = new HashMap<String, Long>();

        mTestCasePass = 0;
        mTestCaseFail = 0;
        mTestPass = 0;
        mTestFail = 0;

        sHostname = LC.zimbra_server_hostname.value();

    }

    protected void doEcho(Element e) {
        mLog.info("ECHO: " + e.getTextTrim());
        if ( mTraceLogger != null ) {
        	mTraceLogger.info("ECHO: " + e.getTextTrim());
        }
    }

    protected void doPreauth(Element elem) throws HarnessException {
    	
    	mLog.debug(elem.prettyPrint());
    	
    	try {

    		String admin = elem.getAttribute(A_ADMIN, null);
    		if ( (admin != null) && (!admin.equals("1")) )
    			throw new HarnessException("For preatuh, admin can only equal 1");
    		
    		HashMap<String,String> params = new HashMap<String,String>();
	    
	    	// From the element, generate the params
	    	params.put("account",	elem.getAttribute(A_ACCOUNT));
	    	if ( admin != null )
	    		params.put("admin",	admin);
		    params.put("by",		elem.getAttribute(A_BY, "name")); // needs to be part of hmac
		    params.put("expires",	elem.getAttribute(A_EXPIRES, "0"));
		    params.put("timestamp",	elem.getAttribute(A_TIMESTAMP, "1135280708088"));
		    
		    String key = elem.getAttribute(A_KEY);
	
		    String variable = elem.getAttribute(A_SET);
		    
		    mLog.debug("account: " + params.get("account"));
		    mLog.debug("admin: " + params.get("admin"));
		    mLog.debug("by: " + params.get("by"));
		    mLog.debug("timestamp: " + params.get("timestamp"));
		    mLog.debug("expires: " + params.get("expires"));
		    mLog.debug("key: " + key);
		    mLog.debug("variable: " + variable);

	    	// Set 'preauth' property to the computed preauth
		    TestProperties.testProperties.setProperty(variable, computePreAuth(params, key));
		    
		    mLog.debug("Preauthkey: " + TestProperties.testProperties.getProperty(variable));
	    	
    	} catch (ServiceException e) {
    		throw new HarnessException("doPreauth error", e);
    	}
	    
    }
    
    protected void doProperty(Element property) throws HarnessException {
        String name = property.getAttribute(A_NAME, null);
        String value = property.getAttribute(A_VALUE, null);
        boolean urlEncode = property.getAttribute(A_URLENCODE, "false").equalsIgnoreCase("true");
        if (name == null)
            throw new HarnessException("<property> tag missing name");
        if (value == null)
            throw new HarnessException("<property> tag missing value");
        
        if ( urlEncode )
        	value = com.zimbra.common.util.HttpUtil.urlEscape(value);
        
        TestProperties.testProperties.setProperty(name, value);

    }

    // <t:regex  input="string" regex="pattern" [ group="number" ] [ match="string" ] [ replace="value" ] [ set="prop" ]/>
    protected void doRegex(Element e) throws HarnessException
    {
    	
    	String input = e.getAttribute(A_INPUT, null);
    	String pattern = e.getAttribute(A_REGEX, null);
    	int group = Integer.parseInt(e.getAttribute(A_GROUP, "0"));
    	String match = e.getAttribute(A_MATCH, null);
    	String prop = e.getAttribute(A_SET, null);
    	String replace = e.getAttribute(A_REPLACE, null);
    	
        if (input == null)
            throw new HarnessException("<regex> missing value");
        if (pattern == null)
            throw new HarnessException("<regex> missing pattern");
   	
    	Pattern p = Pattern.compile(pattern, Pattern.MULTILINE);
    	Matcher m = p.matcher(input);
    	
    	// If replace was specified, replace the match with the new value
    	if ( replace != null )
    	{
    		if ( prop == null )
    			throw new HarnessException("regex: if using replace, you must use set");
    		TestProperties.testProperties.setProperty(prop, m.replaceAll(replace));
    		return;
    	}
    	
    	// Check that the regex matches
    	if ( !m.matches() )
    		throw new HarnessException("No match: input("+ input +") regex("+ pattern+")");
    	
    	if ( m.groupCount() < group )
    		throw new HarnessException("No match on group: available groups("+ m.groupCount()+") is less than specified group("+ group+ ")");
    	
    	String found = m.group(group);
    	
    	// If "match" attribute was specified, make sure it matches
    	if ( match != null )
    	{
    		if ( !Pattern.matches(match, found) )
    			throw new HarnessException("No match: found("+ found +") match("+ match +")");
    	}
    	
    	// If "set" attribute was specified, save the value
    	if ( prop != null )
    	{
    		TestProperties.testProperties.setProperty(prop, found);
    	}
    	
    }
    
    protected void doDelay(Element property) throws HarnessException {
        
        String msecDelay = property.getAttribute(A_MSEC, null);
        String secDelay = property.getAttribute(A_SEC, null);
        
        try
        {
        	if ( msecDelay != null ) {
	        	sleepDelay(Integer.parseInt(msecDelay));
	        } else if ( secDelay != null ) {
	        	sleepDelay(Integer.parseInt(secDelay) * 1000);
	        } else {
	            throw new HarnessException("<delay> tag missing delay value");
	        }
        } catch (NumberFormatException e) {
        	throw new HarnessException("Non-integer delay value: " + property.toString(), e);
        }

    }
    
    public static int sleepDelay(int delay) {

		if (delay > 0)
		{	
			try {
				mLog.debug("sleepDelay:  sleeping for " + delay + " msec");
				Thread.sleep(delay);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
			return (delay);
		}

		return (0);

    }

    @SuppressWarnings("unchecked")
    private void doNamespace(Element property) throws HarnessException {
        String prefix = property.getAttribute(A_PREFIX, null);
        String uri = property.getAttribute(A_URI, null);
        if (prefix == null)
            throw new HarnessException("<namespace> tag missing prefix");
        if (uri == null)
            throw new HarnessException("<namespace> tag missing uri");
        Utilities.getURIs().put(prefix, uri);
    }

    protected boolean doSystemCommand(Element e) throws HarnessException, ServiceException {

        e = expandProps(e);

        SystemCommandTest sysTest = new SystemCommandTest(e, this);

        // If there is a postfix delay pending, do it here
        doPostfixDelay(e);
        doLdapDelay(e);

        sysTest.executeTest();

        return (!sysTest.testFailed());

    }

    /**
     * 
     * @param root
     * @return true if there is a failure, false if there are no failures
     * @throws HarnessException
     * @throws SoapFaultException
     * @throws IOException
     * @throws XmlParseException 
     * @throws ServiceException
     */
    protected void doTests(Element root) throws HarnessException, IOException, XmlParseException {


        for (Iterator it = root.elementIterator(); it.hasNext();) {

            // e = expandProps(e.createCopy());
            Element e = (Element) it.next();
            mLog.debug("Element " + e.toString());

            if (e.getQName().equals(TestCase.E_TESTCASE)) {

                // Type = test_case
                if ( !doTestCase(e) ) {
                    // A failure happened that prevents us from proceeding
                    // i.e. exception, required test failed
                	break;
                }


            } else if (e.getQName().equals(E_ZDC_SERVER)) {
            	
                e = expandProps(e);
                if ( !doDesktopServer(e) )
            	{
            		break;
            	}

            } else if (e.getQName().equals(E_TESTINCLUDE)) {
            	
            	if ( !doInclude(e) ) {
                    // A failure happened that prevents us from proceeding
                    // i.e. exception, required test failed
            		break;
            	}
            	
            } else if (e.getQName().equals(SoapTest.E_TESTTEST)) {

            	if ( mCurrTestCase == null )
            	{
            		Element r = Element.parseXML(
            				"<t:tests xmlns:t=\"urn:zimbraTestHarness\">" +
            				"<t:test_case testcaseid=\"Test\" type=\"always\" >"+
            				"<t:objective>Test</t:objective>"+
            				"</t:test_case>"+
            				"</t:tests>");
            		try {
						mCurrTestCase = new TestCase(r.getElement(TestCase.E_TESTCASE));
					} catch (ServiceException serviceException) {}
            	}
            	e = expandProps(e);

                if (mTestFactory.isTestObjectType(e)) {

                    if ( !doTest(e) ) {
                    	// A required test failed
                    	// Set the test case to failed, then continue to the next test case
                       	mCurrTestCase.addTestStepFailure(1);
                    	break;
                    }
                    
                    
                } else {

                	// mResultLogger.info(DomUtil.toString(e.toXML(),true));
                	
                	// A non-Test type was specified (i.e. t:property,
                    // etc.)
                    e = expandProps(e);
                    checkGlobals(e);

                }

            } else if ( e.getQName().equals(E_FINALLY) ) {

                	
            	// Expand to current properties, otherwise, variable values
            	// may change at the end of the script, and we need to run
            	// the test with the current values.
            	//
                e = expandProps(e);
                
                // Set a flag that shows the test made it to this point
                // i.e., if the script never got to this element, don't run
                // the t:finally element at the end.  Only run elements that
                // occur before the exception
                //
                e.addAttribute(A_FINALLY_QUEUED, "true");
                
                // Don't execute properties or echos or anything, do that
                // at the end when the t:finally runs
                //
                // checkGlobals(e);
                    
                // Skip tests that run at the end
                //
                continue;

            } else {

                // Type = select, etc.

                e = expandProps(e);
                checkGlobals(e);

            }

        } // for ( Iterator it ... )

    }

    /*
     * 
     */
    protected boolean doTest(Element e) throws HarnessException {
    	
        // Based on the type of element that is being used,
        // create the appropriate test object
        Test test = mTestFactory.createTestObject(e, this);

       

        if ( test == null ) {
        	
        	// Test could be null if the element is a t:finally
        	// return true, since there was no failure
        	return (true);
        	
        }
        
        // If there is a postfix delay pending, do it here
        test.mPostfixSetup = doPostfixDelay(e);
        doLdapDelay(e);
        
        try
        {
        	
	        if (test.isConcurrent() ) {
	              	
	        	// TODO: run a test step concurrently
	        	mLog.info("Creating a new core ...");
	        	
	        	Future task = testStepService.submit( new ConcurrentTestStepCore(test) );
	        	pendingTestSteps.add(task);
	        	
	        	if ( (test.getMaxTimeFrame()+5000) > maxWaitTimeForPendingTestSteps) {
	        		maxWaitTimeForPendingTestSteps = test.getMaxTimeFrame() + 5000;
	        	}
	
	    		// Since we don't know the result, return here
	        	return (true);
	        	
	        }
	        
	
	        // Non-concurrent test steps
	        // Execute the test now
	        //
	        
	        try {
	        	mLog.debug("run SoapTestCore.doTest");
	        	test.executeTest();
	        } finally {
	            if ( test.testFailed() )
	            	mResultLogger.error(test.getDetails());
	            else
		            mTraceLogger.info(test.getDetails());
	            	
	            test.compact();
	        }
	
	        // Record the amount of time it took to execute
	        addReqTime(test);
	        
	        // Save the details for the summary report
	        summaryResults.append(test.getSummary());
	        summaryResults.append("\t" + mCurrTestCase.getId());
	        
			if (test.testFailed()) {
					summaryResults.append(" (Broken Bug: #" + ( mCurrTestCase.getBugIDs().equals("NO_BUGS_LOGGED") ? "NEW" :  mCurrTestCase.getBugIDs() ) + ")" );
			} else {
				if ( !mCurrTestCase.getBugIDs().equals("NO_BUGS_LOGGED") ) {
					summaryResults.append(" (Fixed Bug: #" + mCurrTestCase.getBugIDs() + ")");
				}
			}
	    	summaryResults.append(Layout.LINE_SEP);
	
	    	if ( test.testFailed() ) {
	        	mCurrTestCase.addTestStepFailure(1);	// TestCase Failed!
	        }
	
	        // If the test failed and it is required, return false.  Otherwise return true
	        return ( !( test.testFailed() && test.isRequired() ) );
        }
        finally
        {
        	if ( test.testFailed() )
        		mTestFail++;
        	else
        		mTestPass++;
        }
        
    }
    
    /*
     * Returns true if all tests pass or if the test was skipped Returns false
     * if there were failures
     */
    protected boolean doTestCase(Element testcase) throws XmlParseException, HarnessException,
        IOException {

        try {
            mCurrTestCase = new TestCase(testcase);
        } catch (ServiceException e) {
            throw new HarnessException("Unable to create TestCase object", e);
        }


		// Keep track of the executed test cases
		ResultsXml.addTestCase(mCurrTestCase.getId());
		
        // Check if this test case should be skipped
        if (mCurrTestCase.shouldSkip(this)) {

            mCurrTestCase.setSkipped(true);
            summaryResults.append("SKIP "+ mCurrTestCase.getId()).append(Layout.LINE_SEP);
            
    		// Keep track of the test cases status
    		ResultsXml.addTestCaseResults(mCurrTestCase.getId(), ResultsXml.ResultStatus.Skipped);
    		
            return (true);

        }

        // Default - wait for concurrent tests for up to 30 seconds
        maxWaitTimeForPendingTestSteps = 30000;
        
        // Print the test case header
        mTraceLogger.info(mCurrTestCase.getDetails());

        // Go through each test element and execute it
        for (Iterator it = testcase.elementIterator(); it.hasNext();) {

            Element e = (Element) it.next();
//            mCurrTest = null;
            
            if ( e.getQName().equals(E_FORLOOP) ) {

                mLog.debug("Running " + E_FORLOOP.getName());

                if ( !doTestForLoop(e) ) {
                	// A required test failed
                	// A required test failed
                	// Set the test case to failed, then continue to the next test case
                   	mCurrTestCase.addTestStepFailure(1);
                   	// TODO: support "required" on the for loop
                }
                

        	}
            else if (e.getQName().equals(E_TESTLOOP)) {

                mLog.debug("Running " + E_TESTLOOP.getName());

                if ( !doTestLoop(e) ) {
                	// A required test failed
                	return (false);
                }
                
	        } else if (e.getQName().equals(E_DELEGATE_LOOP)) {
	        	
	            mLog.debug("Running " + E_DELEGATE_LOOP.getName());
	
	            if ( !doTestDelegateLoop(e) ) {
	            	return (false);
	            }
	
            } else if (e.getQName().equals(E_TESTINCLUDE)) {
            	
                mLog.debug("Running " + E_TESTINCLUDE.getName());

                if ( !doInclude(e) ) {
                	// A required test failed
                	return (true);
                }

            } else {

                e = expandProps(e);

                if (mTestFactory.isTestObjectType(e)) {

                    if ( !doTest(e) ) {
                    	// A required test failed
                    	// Set the test case to failed, then continue to the next test case
                       	mCurrTestCase.addTestStepFailure(1);
                    	break;
                    }
                    
                    
                } else {

                	// mResultLogger.info(DomUtil.toString(e.toXML(),true));
                	
                	// A non-Test type was specified (i.e. t:property,
                    // etc.)
                    e = expandProps(e);
                    checkGlobals(e);

                }

            }

        } // for (iterator)


        
        // Wait here for all the test steps to finish
        int count = maxWaitTimeForPendingTestSteps / 1000;
        while (true) {

        	if ( pendingTestSteps.size() <= 0 ) {
        		// All pending test cases are completed
        		break;
        	}
        	
            mLog.info("Waiting for tasks to end. Active tasks: " + pendingTestSteps.size() + " ...");
			try {
				Thread.sleep(1000);
			} catch (InterruptedException e) {
				throw new HarnessException(e.getMessage(), e);
			}
			count--;

			Future f = pendingTestSteps.peek();
        	if ( f.isDone() ) {
        		pendingTestSteps.remove(f);
        	} else if ( count <= 0 ) {
				throw new HarnessException("concurrent test steps took over " + maxWaitTimeForPendingTestSteps + " msec to complete");
        	}        	
        	

        }


        
        if ( mCurrTestCase.testFailed() ) {
        	
        	mTestCaseFail++;
        	
    		// Keep track of the test cases status
    		ResultsXml.addTestCaseResults(mCurrTestCase.getId(), ResultsXml.ResultStatus.Fail);
    		
    	} else {
        	if ( !mCurrTestCase.getType().equalsIgnoreCase("always") ) {
        		
        		mTestCasePass++;
        		
        	}

    		// Keep track of the test cases status
    		ResultsXml.addTestCaseResults(mCurrTestCase.getId(), ResultsXml.ResultStatus.Pass);
    		
    	}


        mTraceLogger.info("############## END Test Case ID: " + mCurrTestCase.getId());
        mTraceLogger.info("");

        return (true);

    }

    protected boolean doFinallyShouldSkip(Element e) {
    	
    	// Check the excludes on the t:finally, skip if specified
    	if ( (SoapTestCore.testExcludes != null) && (e.getAttribute(TestCase.A_AREAS, null) != null) ) {
    		
    		// Set the default to "" to remove the ServiceException, but
    		// the default will not be used since we've already checked that the value exists
    		List<String> attrExcludes = java.util.Arrays.asList(e.getAttribute(TestCase.A_AREAS, "").split("[,\\s]+"));
    		
    		for (Iterator<String> iterator1 = attrExcludes.iterator(); iterator1.hasNext();)
    		{
    			String current = iterator1.next().toUpperCase();
    			
    			for (Iterator<String> iterator2 = SoapTestCore.testExcludes.iterator(); iterator2.hasNext();)
    			{
    				
    				if ( current.equals(iterator2.next().toUpperCase()) )
    				{
    					// Skip this t:finally
    					// Go to the next element
    					mLog.debug("skipping t:finally, because excludes matches");
    					return ( true );
    				}
    				
    			}
    		}
    		
    	}
    		
    	
    	return ( false );
    	
    }
    
    /*
     * Returns true if all tests pass or if the test was skipped Returns false
     * if there were failures
     */
    protected void doFinally(Element root) throws HarnessException {


        boolean needToLogFinally = false;
        
        
        
        // Go through each test element and execute it
		for (Iterator iter1 = root.elementIterator(); iter1.hasNext();) {

            Element e = (Element) iter1.next();

            // Run elements that are t:finally
            //
            // Elements that were passed over are modified with A_FINALLY_QUEUED
        	// Only run those t:finally elments that contain the attribute
            //
            if ( ( e.getQName().equals(E_FINALLY)) && (e.getAttribute(A_FINALLY_QUEUED, "false").equals("true")) ) {
            	
            	
            	// Check the excludes on the t:finally, skip if specified
            	if ( doFinallyShouldSkip(e) ) {
            		continue;
            	}
            	
            	if ( !needToLogFinally ) {
            		needToLogFinally = true;
                    // Print the test case header
                    mTraceLogger.info("############## Finally block");
                    mTraceLogger.info("");
            	}
                
            	for (Iterator iter2 = e.elementIterator(); iter2.hasNext();) {
                	
                	Element t = (Element) iter2.next();
                	
	                mLog.debug("running " + t);            	
		            
	                if (mTestFactory.isTestObjectType(t)) {
	
	                    // If there is a postfix delay pending, do it here
	                    doPostfixDelay(t);
	                    doLdapDelay(t);

	                    // Based on the type of element that is being used,
	                    // create the appropriate test object
	                    Test test = mTestFactory.createTestObject(t, this);

	                    mLog.debug("run doSoapTest.executeTest");
	                    try {
	                    	mLog.debug("run SoapTestCore.doTest");
	                    	test.executeTest();
	                    } finally {
	                        mTraceLogger.info(test.getDetails());
	                        test.compact();
	                    }

	                    // Save the details for the summary report
	                    summaryResults.append(test.getSummary());
	                    summaryResults.append("\t" + E_FINALLY.getName());
	                    summaryResults.append(Layout.LINE_SEP);
	
	                } else {
	                	
                        // Do any properties or delays, too
	                	checkGlobals(t);
	                	
	                }
		
		            
                } // for (Iterator iter2 ...
                
	            
            } else {
                mLog.debug("skipping " + e);            	
            }

        } // for (Iterator iter1 ... 

        if ( needToLogFinally ) {
        	mTraceLogger.info("############## END Finally Block");
        }


    }

    private class DesktopServerElement
    {
    	public final QName E_CONFIG = QName.get("config", NAMESPACE);
    	public final QName E_SERVER = QName.get("server", NAMESPACE);

    	
    	// E_ZDC_SERVER attributes
    	public final String A_ID = "id";
    	
    	// E_CONFIG attributes
    	public final String A_AREA = "areas"; // Required
   	
    	// E_SERVER attributes
    	public final String A_ACCOUNT_FLAVOR = "accountFlavor";	// Required
    	public final String A_EMAIL = "email";	// Required
    	public final String A_PASSWORD = "password";	// Required
    	public final String A_HOST = "host";	// Required
    	public final String A_PORT = "port";	// Required
    	public final String A_DOMAIN = "domain";	// Optional : value will be derived from email
    	public final String A_ACCOUNTNAME = "accountName";	// Optional : account${TIME}${COUNTER}
    	public final String A_FROMDISPLAY = "fromDisplay";	// Optional : same as accountName
    	public final String A_SYNC_FREQ = "syncFreqSecs";	// Optional : 900
    	public final String A_DEBUGTRACEENABLED = "debugTraceEnabled";	// Optional : on

    	protected Element eDesktop = null;
    	protected Element eTestConfig = null;
    	protected Element eTestServer = null;


    	public DesktopServerElement(Element e) throws HarnessException
    	{
    		eDesktop = e;
    		try
    		{
    			eTestConfig = e.getElement(E_CONFIG);
    			eTestServer = e.getElement(E_SERVER);
    			
   			
    		} catch (ServiceException ex) {
    			throw new HarnessException("Invalid ZDC Server test element", ex);
    		}
    	}
    	
		public String getId() throws HarnessException {
			try {
				return (eDesktop.getAttribute(A_ID));
			} catch (ServiceException e) {
				throw new HarnessException(E_ZDC_SERVER.getName() + " must define " + A_ID, e);
			}
		}
    	
		public String MyAccountName = null;	// Since getFromDisplay also returns this value, remember the value
		public String getAccountName() throws HarnessException {
			if ( MyAccountName == null )
				MyAccountName = eDesktop.getAttribute(A_ACCOUNTNAME, "account" + System.currentTimeMillis() + mCounter.incrementAndGet());
			return (MyAccountName);
		}
		
		public String getFromDisplay() throws HarnessException {
			return (eDesktop.getAttribute(A_FROMDISPLAY, getAccountName()));
		}
		
		public String getHost() throws HarnessException {
			try {
				return (eTestServer.getAttribute(A_HOST));
			} catch (ServiceException e) {
				throw new HarnessException(E_SERVER.getName() + " must define " + A_HOST, e);
			}
		}
		
		public String getPort() throws HarnessException {
			try {
				return (eTestServer.getAttribute(A_PORT));
			} catch (ServiceException e) {
				throw new HarnessException(E_SERVER.getName() + " must define " + A_PORT, e);
			}
		}

		public String getEmail() throws HarnessException {
			try {
				return (eTestServer.getAttribute(A_EMAIL));
			} catch (ServiceException e) {
				throw new HarnessException(E_SERVER.getName() + " must define " + A_EMAIL, e);
			}
		}
    	  	
		public String getDomain() throws HarnessException {
			String email = getEmail();
			int atPos = email.indexOf('@');
			if ( atPos < 0 )
				throw new HarnessException("Unable to determine domain from "+ email);
			return (email.substring(atPos + 1));
		}
    	  	
		public String getPassword() throws HarnessException {
			try {
				return (eTestServer.getAttribute(A_PASSWORD));
			} catch (ServiceException e) {
				throw new HarnessException(E_SERVER.getName() + " must define " + A_PASSWORD, e);
			}
		}
		
		public String getAccountFlavor() throws HarnessException {
			try {
				return (eTestServer.getAttribute(A_ACCOUNT_FLAVOR));
			} catch (ServiceException e) {
				throw new HarnessException(E_SERVER.getName() + " must define " + A_ACCOUNT_FLAVOR, e);
			}
		}
    	
		public String getSyncFreqSecs() throws HarnessException {
			return (eTestServer.getAttribute(A_SYNC_FREQ, "900"));
		}
    	
		public String getDebugTraceEnabled() throws HarnessException {
			return (eTestServer.getAttribute(A_DEBUGTRACEENABLED, "on"));
		}
    	
    	public String[] getAreas() throws HarnessException {
    		try {
				return (eTestConfig.getAttribute(A_AREA).split(","));
			} catch (ServiceException e) {
				throw new HarnessException(E_CONFIG.getName() + " must define " + A_AREA, e);
			}
    	}

    	public boolean isProvisioned(String server, String password, String sGetAllAccountsResponse) throws HarnessException
    	{
    		
    		Element[] accounts = null;
    		try {
    			accounts = Utilities.getElementsFromPath(Element.parseXML(sGetAllAccountsResponse), "//admin:account");
			} catch (XmlParseException e) {
    			throw new HarnessException("Invalid GetAllAccountsResponse: " + sGetAllAccountsResponse);
            }
			
    		for (Element a : accounts)
			{
    			String n = a.getAttribute("name", null);
				if ( n != null)
				{
					if ( n.equalsIgnoreCase(getEmail()) )
					{
						return (true);	// Already provisioned
					}
				}
			}

    		return (false);	// Not yet provisioned
    	}
    	
    	@SuppressWarnings("deprecation")
		public void provision(String server, String password, String GetAllAccountsResponse) throws HarnessException
    	{

    		if ( isProvisioned(server, password, GetAllAccountsResponse) )
    			return;		// Already provisioned, skip this step

			URL url = getURL(server, password);
			
			//Build the cookies to connect to the rest servlet
			//
			HttpState initialState = new HttpState();
			

			// Create an HttpClient
	    	HttpClient client = new HttpClient();
			client.setState(initialState);

			// make the post
			PostMethod method = new PostMethod(url.toString());

			int httpResponseCode = HttpStatus.SC_OK;
			
			try {

				method.setRequestBody(getPayload());
				method.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	        	
	        	httpResponseCode = client.executeMethod(method);

	            if (httpResponseCode != HttpStatus.SC_OK)
					mLog.warn("Method failed: " + method.getStatusLine());

	            // For logging
	            mResultLogger.info("0000 - " + (new Date()) + " - DesktopServerElement.provision() -- " + url.toString());
	            mResultLogger.info("----");
	            for (Header h : method.getRequestHeaders())
	            	mResultLogger.info(h.toString().trim());
	            RequestEntity r = method.getRequestEntity();
	        	if ( r != null )
        		{
	    			try {
	    				ByteArrayOutputStream stream = new ByteArrayOutputStream();
	    				r.writeRequest(stream);
	    				mResultLogger.info(""); mResultLogger.info("");
	    				mResultLogger.info(stream.toString());
	    				mResultLogger.info(""); mResultLogger.info("");
	    			} catch (IOException e) {
	    				mResultLogger.warn("unable to convert request to ByteArrayOutputStream", e);
	    			}
        		}
	        	mResultLogger.info("----");
	        	mResultLogger.info(method.getStatusLine().toString());
	    		for (Header h : method.getResponseHeaders() )
	    			mResultLogger.info(h.toString().trim());
	        	mResultLogger.info("----"); mResultLogger.info("");
	    		
				
	        } catch (IOException ioException) {
	            throw new HarnessException("Account post failed", ioException);
	        } finally {
	        	method.releaseConnection();
	        }
					
    	}
		
		protected String getPayload() throws HarnessException
		{
			StringBuilder sb = new StringBuilder("accountId=&verb=add");
			
			if ( getAccountFlavor().equalsIgnoreCase(zDesktopAcctTest.S_FLAVOR_ZIMBRA) )
			{
				sb.append("&accountFlavor=").append(getAccountFlavor());
				sb.append("&email=").append(getEmail());
				sb.append("&accountName=").append(getAccountName());
				sb.append("&password=").append(getPassword());
				sb.append("&host=").append(getHost());
				sb.append("&port=").append(getPort());
				sb.append("&syncFreqSecs=").append(getSyncFreqSecs());
				sb.append("&debugTraceEnabled=").append(getDebugTraceEnabled());
			}
			else if ( getAccountFlavor().equalsIgnoreCase(zDesktopAcctTest.S_FLAVOR_YMP) )
			{
				sb.append("&accountFlavor=").append(getAccountFlavor());
				sb.append("&domain=").append(getDomain());
				sb.append("&accountName=").append(getAccountName());
				sb.append("&fromDisplay=").append(getFromDisplay());
				sb.append("&email=").append(getEmail());
				sb.append("&password=").append(getPassword());
				sb.append("&syncFreqSecs=").append(getSyncFreqSecs());
				sb.append("&debugTraceEnabled=").append(getDebugTraceEnabled());
			}
			else if ( getAccountFlavor().equalsIgnoreCase(zDesktopAcctTest.S_FLAVOR_GMAIL) )
			{
				sb.append("&accountFlavor=").append(getAccountFlavor());
				sb.append("&domain=").append(getDomain());
				sb.append("&accountName=").append(getAccountName());
				sb.append("&fromDisplay=").append(getFromDisplay());
				sb.append("&email=").append(getEmail());
				sb.append("&password=").append(getPassword());
				sb.append("&syncFreqSecs=").append(getSyncFreqSecs());
				sb.append("&debugTraceEnabled=").append(getDebugTraceEnabled());
			}
			else
			{
				throw new HarnessException("getPayload: Not supported yet: accountFlavor = " + getAccountFlavor());
			}

			
			return (sb.toString());
			
		}
		
		protected URL getURL(String server, String password) throws HarnessException {
			
			if ( (server == null) || (server.equals("")) )
				throw new HarnessException("server must be specified");

			
			String httpMode = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.mode", "http");
			String httpPort = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.port", "7633");
			String httpPath = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.path", "service/soap/");

			String uriString = httpMode + "://" + server + ":" + httpPort + "/" + httpPath;
			URL url = null;
			try {
				
				URL soapURL = new URL(uriString);
				
				String host = soapURL.getHost();
				int port = soapURL.getPort();
				String protocol = soapURL.getProtocol();
				String file = "/zimbra/desktop/accsetup.jsp?at=" + password;
					
				url = new URL(protocol, host, port, file );
				
				mLog.debug("getURL using: " + url.toString());

			} catch (MalformedURLException e) {
				throw new HarnessException("zdesktopuser.server was malformed " + uriString, e);
			}
			
			
			return (url);
			
		}
			
        protected boolean executeDesktopServer(File f) throws IOException, DocumentException, HarnessException
        {
        	if ( f.isDirectory() ) {
        		
        		File[] files = f.listFiles();
        		for (int i = 0; i < files.length; i++)
        		{
        			executeDesktopServer(files[i]);
        		}
        		
        	} else {
    	 
                int dotPos = f.getPath().lastIndexOf('.');
                if ( dotPos < 0 )
                	return (true); // Only run .xml files - there is no extension on this file
                if ( !f.getPath().substring(dotPos).equalsIgnoreCase(".xml") )
                	return (true); // Only run .xml files - this extension is something other than xml
                
                // If a test case ID is specified, only run the script if it contains the ID
                if ( (SoapTestMain.sZDCTestScript != null) && (!f.getPath().contains(SoapTestMain.sZDCTestScript)))
                {
                	return (true);
                }
                if ( (SoapTestMain.testCaseId != null) && (!SoapTestMain.isTestCaseInFile(f, SoapTestMain.testCaseId)) ) {
                	return (true);
                }

        		mTraceLogger.info("Execute: " + f.getPath());
                SoapTestCore harness = null;
                
                try {

                	harness = new SoapTestCore();

                    TestProperties.testProperties.setProperty("zdcserver.email", getEmail());
                    TestProperties.testProperties.setProperty("zdcserver.password", getPassword());

                	harness.runTestFile(f);
                	
                } catch (Exception e) {
                	
                	mLog.error("TEST FAILED: " + f.getAbsolutePath(), e);
                	
                	SoapTestMain.mTotalTestCaseError++;
                	SoapTestMain.sExceptionTestFiles.add(f.getAbsolutePath());
                	
                } finally {

                	SoapTestMain.mTotalTestCasePass +=	harness.mTestCasePass;
                	SoapTestMain.mTotalTestCaseFail +=	harness.mTestCaseFail;
                                            	
                	SoapTestMain.mTotalTestStepPass +=	harness.mTestPass;
                	SoapTestMain.mTotalTestStepFail +=	harness.mTestFail;
                                            	
                    if ( harness.mTestCaseFail > 0 ) {
                    	SoapTestMain.sFailedTestFiles.add(f.getAbsolutePath() + "("+ SoapTestCore.mLogSubDirectory +")");
                    }
                    
                    harness=null;
                
                }
                
        	}
        			 		     	
    		return (true);
    		 
    	}


    }
    
	protected static boolean isDesktopServerTestRunning = false;
	protected boolean doDesktopServer(Element e) throws HarnessException
	{
		
		// Don't recursively run desktop tests
		if ( isDesktopServerTestRunning )
			return (true);
	     	
		// Extract the Desktop settings from the element
		DesktopServerElement desktop = new DesktopServerElement(e);
		
		// Provision the accounts on the local and external ZDC clients
		desktop.provision(TestProperties.testProperties.getProperty("zdesktopuser.server"), TestProperties.testProperties.getProperty("zdesktopuser.password"), TestProperties.testProperties.getProperty("GetAllAccountsResponse.zdesktop"));
		desktop.provision(TestProperties.testProperties.getProperty("zexternal.server"), TestProperties.testProperties.getProperty("zexternal.password"), TestProperties.testProperties.getProperty("GetAllAccountsResponse.zexternal"));
		
		if (SoapTestCore.testAreas == null) {
			SoapTestCore.testAreas = new ArrayList<String>(Arrays.asList(desktop.getAreas()));
		} else {
			for (String a : desktop.getAreas())
				SoapTestCore.testAreas.add(a);
		}
		SoapTestCore.testAreasToSkip.remove("ZDC");
		
		// Set up the logging directory
		int index = rootCurrTestDir.indexOf("data");
		SoapTestCore.mLogSubDirectory = rootCurrTestDir.substring(index + "data".length() + 1) + "/" + desktop.getId();
	
		// Search through the entire root for new test cases
		try {
		
			isDesktopServerTestRunning = true;
			desktop.executeDesktopServer(new File(rootZimbraQA + "/data/zdesktopvalidator"));
	
		} catch (IOException ex) {
			throw new HarnessException("doDesktopServer threw exception", ex);
		} catch (DocumentException ex) {
			throw new HarnessException("doDesktopServer threw exception", ex);
		} catch (HarnessException ex) {
			throw new HarnessException("doDesktopServer threw exception", ex);
		}
		finally
		{
			isDesktopServerTestRunning = false;
			
			SoapTestCore.mLogSubDirectory = null;
			
			for (String a : desktop.getAreas())
				SoapTestCore.testAreas.remove(a);
			
			SoapTestCore.testAreasToSkip.add("ZDC");
		}
	 	
	 	return (true);
	 	
	 }

	protected boolean doTestDelegateSoap(Element eTests) throws HarnessException, IOException, XmlParseException {
		String requests = eTests.getAttribute(E_DELEGATE_REQUESTS, "*");
		String right = eTests.getAttribute(E_DELEGATE_RIGHT, null);
		if ( right == null )
			throw new HarnessException("Need to specify right in element "+ E_DELEGATE_EXECUTE.getName());

		// For the specified right, determine which soap should return postitive result
		List<String> successList = delegateRightToSoapTable().get(right);
		List<String> negativeList = delegateRightToSoapTableNegative();
		
		if ( requests.equals("*") ) {	// Run all available requests

			// For the specified right, run all soap tests that should return positive results
			for (String s : successList ) {
				
				s=s.trim();
				
				File f = new File(rootZimbraQA + "/conf/rights/soap/Positive/"+ s + ".xml");
	            String docStr = new String(ByteUtil.getContent(f), "utf-8");	        	
	            Element root = Element.parseXML(docStr);
	            
	            for (Iterator i = root.elementIterator(); i.hasNext(); ) {

	                Element e = (Element)i.next();
	                e = expandProps(e);

	                Test test = null;
	                boolean result = true;
	                
	                try
	                {
	                	
		                if (mTestFactory.isTestObjectType(e)) {
	
		                    if ( !doTest(e) ) {
		                    	// A required test failed
		                    	// Set the test case to failed, then continue to the next test case
		                       	mCurrTestCase.addTestStepFailure(1);
		                    	break;
		                    }
	
	                    } else {
	
	                        mLog.debug("Running OTHER" + e.toString());
	                        e = expandProps(e);
	                        checkGlobals(e);
	
	                    }
	
	                    if ((result == false) && (test != null) && (test.isRequired())) {
	
	                        mLog.warn("A required test Failed!");
	                        mLog.warn(e.toString());
	                        mTestCaseFail++;
	                        return (false);
	
	                    }
	
	                } finally {
	
	                    if (test != null) {
	                        mTraceLogger.info(test.getDetails());
	                        test.compact();
	                    }
	
	                }
	                
	            }
                             
			}
			
			// Run all the negative soap tests (except those already executed, to verify they return negative results
			for (String n : negativeList ) {
				
				n = n.trim();
				
				if ( successList.contains(n) ) {
					// Skip any files that should be successful
					continue;
				}
				
				File f = new File(rootZimbraQA + "/conf/rights/soap/Negative/"+ n + ".xml");
	            String docStr = new String(ByteUtil.getContent(f), "utf-8");	        	
	            Element root = Element.parseXML(docStr);
	            
	            for (Iterator i = root.elementIterator(); i.hasNext(); ) {

	                Element e = (Element)i.next();
	                e = expandProps(e);

	                Test test = null;
	                boolean result = true;
	                
	                try
	                {
	                	
		                if (mTestFactory.isTestObjectType(e)) {
	
		                    if ( !doTest(e) ) {
		                    	// A required test failed
		                    	// Set the test case to failed, then continue to the next test case
		                       	mCurrTestCase.addTestStepFailure(1);
		                    	break;
		                    }
	
	                    } else {
	
	                        mLog.debug("Running OTHER" + e.toString());
	                        e = expandProps(e);
	                        checkGlobals(e);
	
	                    }
	
	                    if ((result == false) && (test != null) && (test.isRequired())) {
	
	                        mLog.warn("A required test Failed!");
	                        mLog.warn(e.toString());
	                        mTestCaseFail++;
	                        return (false);
	
	                    }
	
	                } finally {
	
	                    if (test != null) {
	                        mTraceLogger.info(test.getDetails());
	                        test.compact();
	                    }
	
	                }
	                
	            }
			}
			
		} else {	// Only run the specified requests
			
			// TODO: implement me
			
			// If the request matches the successList, then run the conf/rights/soap/Positive/request.xml file

			// Otherwise, run the conf/rights/soap/Negative/request.xml file
			
		}
		
		

		return (true);
	}
	
	protected boolean doTestDelegateLoop(Element eTests) throws HarnessException, IOException, XmlParseException {
		
		// Read the test attributes from the element
		// set: set this variable property to the current right being tested
		// rights: a comma separated list of rights to test, or "*" for all rights
		//
		String setRight = eTests.getAttribute(E_DELEGATE_SET, "right.value");
		String rightlist = eTests.getAttribute(E_DELEGATE_LIST, "*");
		List<String> rights = null;
		if ( rightlist.equals("*")) {
			rights = delegateRights();
		} else {
			rights = Arrays.asList(rightlist.split(","));
		}
		
		
        for (String right : rights) {

        	
        	if ( !right.equals("deleteAccount") ) {
        		// TODO: for debugging, only run the first right
        		// eventually, remove this if block
        		continue;
        	}
        	
        	mTraceLogger.info("");
        	mTraceLogger.info("### Delegate - Checking right = "+ right);
        	mTraceLogger.info("");
        	
        	// Save the current right as a property in case the XML needs it
        	TestProperties.testProperties.setProperty(setRight, right);
        	
            for (Iterator it = eTests.elementIterator(); it.hasNext();) {

                Test test = null;
                
                // Make a copy of the Element so that we can reuse the element
                // on the next iteration
                // Element e = createCopy((Element) it.next());
                Element e = ((Element)it.next()).clone();
                try {

                    boolean result = true;

                    // Expand the copy
                    e = expandProps(e);

	                if ( e.getQName().equals(E_DELEGATE_EXECUTE) ) {
	                	
	                    mLog.debug("Running " + E_DELEGATE_EXECUTE.getName());

	                    if ( !doTestDelegateSoap(e) ) {
	                    	// A required test failed
	                    	return (false);
	                    }

	                } else if (mTestFactory.isTestObjectType(e)) {

	                    if ( !doTest(e) ) {
	                    	// A required test failed
	                    	// Set the test case to failed, then continue to the next test case
	                       	mCurrTestCase.addTestStepFailure(1);
	                    	break;
	                    }

                    } else {

                        mLog.debug("Running OTHER" + e.toString());
                        e = expandProps(e);
                        checkGlobals(e);

                    }

                    if ((result == false) && (test != null) && (test.isRequired())) {

                        mLog.warn("A required test Failed!");
                        mLog.warn(e.toString());
                        mTestCaseFail++;
                        return (false);

                    }

                } finally {

                    if (test != null) {
                        mTraceLogger.info(test.getDetails());
                        test.compact();
                    }

                }

            } // for (Iterator it ...)

        } // for (int incCount ...)

        return (false);
		
	}

	// Read all the test rights from conf/rights/availableRights.txt
	// TODO: Need to split these out into domain rights, cos rights, etc.
	protected List<String> delegateRightList = null;
	protected List<String> delegateRights() throws IOException {
		if ( delegateRightList == null ) {
			delegateRightList = new ArrayList<String>();			
			
			BufferedReader inputBufferReader = null;
			try{				
				inputBufferReader = new BufferedReader(new FileReader(rootZimbraQA + "/conf/rights/availableRights.txt"));	
				String line;
				while ( (line = inputBufferReader.readLine()) != null ) {
					delegateRightList.add(line);
				}
			}catch (FileNotFoundException e) {
				mLog.warn("FileNotFoundException during reading  availableRights.txt "+  e);				
			} catch (IOException e) {
				mLog.warn("IOException during reading  availableRights.txt "+  e);				
			} finally{
				Utilities.close(inputBufferReader, mLog);
			}
		}
		return (delegateRightList);
	}
    
	// Read all the soap requests for delegate testing
	protected Hashtable<String, List<String>> delegateSoapTable = null;
	protected Hashtable<String, List<String>> delegateRightToSoapTable() throws IOException {
		if ( delegateSoapTable == null ) {
			delegateSoapTable = new Hashtable<String, List<String>>();
			
			Properties porperties = new Properties();
			FileReader fileReader = null;
			
			try{
				fileReader = new FileReader(new File(rootZimbraQA + "/conf/rights/rightsToSOAP.properties"));
				porperties.load(fileReader);
			}catch (FileNotFoundException e) {
				mLog.warn("FileNotFoundException during reading rightsToSOAP.properties "+  e);				
			} catch (IOException e) {
				mLog.warn("IOException during reading rightsToSOAP.properties "+  e);				
			}finally{
				Utilities.close(fileReader, mLog);
			}
			
			for (Enumeration e = porperties.keys(); e.hasMoreElements(); ) {
				String key = (String) e.nextElement();
				ArrayList<String> l = new ArrayList<String>();
				l.addAll(Arrays.asList(porperties.getProperty(key, "").split(",")));
				delegateSoapTable.put(key, l);
				}
			
			// Find out if there is a *=PingRequest,etc.
			List<String> all = null;
			for (Enumeration e = delegateSoapTable.keys(); e.hasMoreElements(); ) {
				String key = (String)e.nextElement();
				if ( key.equals("*") ) {
					all = delegateSoapTable.get(key);
					break;
				}
			}
			if (all != null) {
				for (Enumeration e = delegateSoapTable.keys(); e.hasMoreElements(); ) {
					String key = (String)e.nextElement();
					for (String i : all) {
						if ( !delegateSoapTable.get(key).contains(i) )
							delegateSoapTable.get(key).add(i);
					}
				}
			}
			
		}
		return (delegateSoapTable);
	}
    
    private static FileFilter xmlFileFilter = new FileFilter() {
    	public boolean accept(File f) {
    		int dot = f.getName().lastIndexOf('.');
    		if ( dot < 0 )
    			return (false);
    		int ext = f.getName().lastIndexOf(".xml");
    		if ( ext < 0 )
    			return (false);
    		return (dot == ext);
    	}
    };
    
	protected List<String> delegateSoapTableNegative = null;
	protected List<String> delegateRightToSoapTableNegative() {
		if ( delegateSoapTableNegative == null ) {
			delegateSoapTableNegative = new ArrayList<String>();
			File dir = new File(rootZimbraQA + "/conf/rights/soap/Negative/");
            File files[] = dir.listFiles(xmlFileFilter);
            if (files != null) {
            	for (int i = 0; i < files.length; i++ ) {
            		File f = files[i];
            		if ( f.isFile() ) {
            			String name = f.getName();
            			name = name.substring(0, name.length() - ".xml".length());
            			delegateSoapTableNegative.add(name);
            		}
            	}
            }
		}
		return (delegateSoapTableNegative);
	}
	
	protected boolean doInclude(Element include) throws HarnessException,
	    IOException, XmlParseException {
	
		// Extract the file name
		String includeFileName = include.getAttribute(E_INCLUDEFILE, null);
		if ( includeFileName == null ) {
			throw new HarnessException("Include Element requires a Filename");
		}
		
		String includeFilePathName = findIncludeFile(includeFileName, rootZimbraQA);
		
		if ( includeFilePathName == null ) {
			throw new HarnessException("Couldn't find " + includeFileName + " in " + rootZimbraQA);
		}
		
		
		// Open the file
		File includeFile = new File(includeFilePathName);
		
	
		// Convert file contents to Element structure
		String docStr = new String(ByteUtil.getContent(includeFile), "utf-8");
	    Element root = Element.parseXML(docStr);
	
	    
	    /* hasFailure = any failure in the file */
//	    int numFailures = 0;
	    // Test incTest = null;
	
	    // Process each element
	    for (Iterator it = root.elementIterator(); it.hasNext();) {
	
	        // e = expandProps(e.createCopy());
	        Element e = (Element) it.next();
	        mLog.debug("Include Element " + e.toString());
	
	        if ( e.getQName().equals(TestCase.E_TESTCASE) ) {
	        	
	        	mLog.debug("Running " + TestCase.E_TESTCASE.getName());
                // Type = test_case
                if ( !doTestCase(e) ) {
                	return (false);
                }

	        } else if (e.getQName().equals(E_TESTLOOP)) {
	        	
	            mLog.debug("Running " + E_TESTLOOP.getName());
	
	            if ( !doTestLoop(e) ) {
	            	return (false);
	            }
	
	        } else if (e.getQName().equals(E_DELEGATE_LOOP)) {
	        	
	            mLog.debug("Running " + E_DELEGATE_LOOP.getName());
	
	            if ( !doTestDelegateLoop(e) ) {
	            	return (false);
	            }
	
	        } else if (e.getQName().equals(E_TESTINCLUDE)) {
	        	
	            mLog.debug("Running " + E_TESTINCLUDE.getName());
	
	            if ( !doInclude(e) ) {
	            	return (false);
	            }
	
	        } else {
	
	            e = expandProps(e);
	
                if (mTestFactory.isTestObjectType(e)) {

                    mLog.debug("run include executeTest");
                    if ( !doTest(e) ) {
                    	// A required test failed
                    	return (false);
                    }

                } else {

                    // A non-Test type was specified (i.e. t:property,
                    // etc.)
                    e = expandProps(e);
                    checkGlobals(e);
                    
                }
                
            }
		
	    } // for ( Iterator it ... )
	
	    return (true);
	
	}

    private int getLoopCount(Element element) throws HarnessException {

        String countString = element.getAttribute(A_TESTLOOP, "1");

        // Check that it isn't a variable
        countString = expandAllProps(countString);

        // Switch to an int
        int mtcLoopCount = parseInteger(countString);

        if (mtcLoopCount > 0) { // To avoid -ve value for tcloop attribute
            return mtcLoopCount;
        } else {
            return 1;
        }
    }

    private int parseInteger(String mStr) {

        return java.lang.Integer.parseInt(mStr);
    }

    protected boolean doTestForLoop(Element ltest)
    	throws HarnessException, IOException, XmlParseException 
	{

	    mLog.debug("doTestForLoop " + ltest);
	    
	    String fName;
	    long fStart;
	    long fEnd;
	    long fIncr;
	    String fBreak;
	    String fContinue;
	    
	    try
	    {
	    	
	    	fName = ltest.getAttribute(A_FORLOOPNAME, "variable");
	    	fStart = ltest.getAttributeLong(A_FORLOOPSTART);
	    	fEnd = ltest.getAttributeLong(A_FORLOOPEND);
	    	fIncr = ltest.getAttributeLong(A_FORLOOPINCR, 1);
	    	fBreak = ltest.getAttribute(A_FORLOOPBREAK, null);
	    	fContinue = ltest.getAttribute(A_FORLOOPCONTINUE, null);
	    	
	    } catch (ServiceException e) {
	    	throw new HarnessException("t:for missing required attribute", e);
	    }
	    
	

	    /* Create Partial construction */
	    HashMap<Element, String> lookupTable = new HashMap<Element, String>();
	    for (Iterator it = ltest.elementIterator(); it.hasNext();) {
	        Element mele = (Element) it.next();
	        lookupTable.put(mele, mele.toXML().asXML());
	    }
	
	    for (long i = fStart; i <= fEnd; i += fIncr) {
	
	        Test test = null;
	        
	        // Set the "name" variable to the current value of the iterator
	        TestProperties.testProperties.setProperty(fName, Long.toString(i));
	        
	        for (Iterator it = ltest.elementIterator(); it.hasNext();) {
	
	            // Make a copy of the Element so that we can reuse the element
	            // on the next iteration
	            // Element e = createCopy((Element) it.next());
	            Element e = Element.parseXML(lookupTable.get(it.next()));
	            try {
	
	                e = expandProps(e);

	                if (mTestFactory.isTestObjectType(e)) {

	                    // It is OK for tests in for loops to fail
	                	// since the purpose is for the XML/SOAP
	                	// to poll until a certain result is received
	                	// (i.e. the break attr)
	                	//
	                	
	                    test = mTestFactory.createTestObject(e, this);

	                    
	                    // If there is a postfix delay pending, do it here
	                    test.mPostfixSetup = doPostfixDelay(e);
	                    doLdapDelay(e);
	                    
                    	test.executeTest();

	                    // Record the amount of time it took to execute
	                    addReqTime(test);
	                    
	                    // Save the details for the summary report
	                    summaryResults.append(test.getSummary());
	                    summaryResults.append("\t" + mCurrTestCase.getId());
	                    if (i + fIncr > fEnd) {
	                    	summaryResults.append("\tFAIL is not ok.  Last loop.");
	                    } else {
	                    	summaryResults.append("\tFAIL is ok.  for("+i+")");
	                    }
	                	summaryResults.append(Layout.LINE_SEP);
	                    
	                    
	                } else {

	                    // A non-Test type was specified (i.e. t:property,
	                    // etc.)
	                    e = expandProps(e);
	                    checkGlobals(e);

	                }
	
	            } finally {
	
	                if (test != null) {
	                    mTraceLogger.info(test.getDetails());
	                    test.compact();
	                    test=null;
	                }
	
	            }
	
	        } // for (Iterator it ...)
	        
	        if ( fContinue != null )
        	{
	        	// TODO
	        	throw new HarnessException("t:for does not support continue attr");
        	}
	        
	        if ( fBreak != null ) {
	        	
	        	// If a property was specified as an eval, and
	        	// the property does not equal 0 or "UNSET", then break
	        	// from the for loop
	        	//
	        	String value = TestProperties.testProperties.getProperty(fBreak, null);
		        if ( value != null ) {
		        	if ( !value.equals("0") && !value.equals("UNSET") && !value.equals(""))
		        	{
		        		return (true);
		        	}
		        }
		        
	        }
	
	    } // for (int i ...)
	
	    if ( fBreak != null ) {
	    	// Reached the end of the for loop, and the eval was never found
	    	return (false); // FAIL
	    } else {
	    	return (true); // No eval, so return PASS by default
	    }
	
	}

    protected boolean doTestLoop(Element ltest) throws HarnessException,
        IOException, XmlParseException {

        mLog.debug("doTestLoop " + ltest);

        int count = getLoopCount(ltest);
        mLog.debug("Loop count : " + count);

        /* Create Partial construction */
        HashMap<Element, String> lookupTable = new HashMap<Element, String>();
        for (Iterator it = ltest.elementIterator(); it.hasNext();) {
            Element mele = (Element) it.next();
            lookupTable.put(mele, mele.toXML().asXML());
        }

        for (mLoopIndex = 0; mLoopIndex < count; mLoopIndex++) {

            Test test = null;
            
            for (Iterator it = ltest.elementIterator(); it.hasNext();) {

                // Make a copy of the Element so that we can reuse the element
                // on the next iteration
                // Element e = createCopy((Element) it.next());
                Element e = Element.parseXML(lookupTable.get(it.next()));
                try {

                    boolean result = true;

                    // Expand the copy
                    e = expandProps(e);

	                if (mTestFactory.isTestObjectType(e)) {

	                	test = mTestFactory.createTestObject(e, this);
                    
                        // If there is a postfix delay pending, do it here
                        doPostfixDelay(e);

                        mLog.debug("run doSoapTest.executeTest");
                        test.executeTest();

                        // Record the amount of time it took to execute
                        addReqTime(test);

                        result = (!test.testFailed());
                        // Trigger logging only if test has failed
/*
                        if (mCurrTest.testFailed() && (first == false)) {
                            addTestCase(mCurrTest);
                        }
 * 
 */

                    } else {

                        mLog.debug("Running OTHER" + e.toString());
                        e = expandProps(e);
                        checkGlobals(e);

                    }

                    if ((result == false) && (test != null) && (test.isRequired())) {

                        mLog.warn("A required test Failed!");
                        mLog.warn(e.toString());
                        mTestCaseFail++;
                        return (false);

                    }

                } finally {

                    if (test != null) {
                        mTraceLogger.info(test.getDetails());
                        test.compact();
                    }

                }

            } // for (Iterator it ...)

        } // for (int incCount ...)

        return true;

    }

    protected String doPostfixDelay(Element test) throws HarnessException {

        // TODO: We shouldn't delay if we are in a loop
        // TODO: We shouldn't delay if the next messge is a SendMsgRequest, too

        String returnValue = null;
        
        mLog.debug("doPostfixDelay");
        
        if ( TestProperties.testProperties.getProperty("postfix.check", "true").equals("false") )
        {
        	mLog.debug("postfix.check property is false - skipping the postfix check");
        	return ("postfix.check property is false - skipping the postfix check");
        }
        

    	String[] requests = SoapTestMain.globalProperties.getProperty("postfixrequests.list", "").split(",");
        if (mPostfixDelayIsPending) {

        	boolean matched = false;
        	for (String request : requests) {
        		if ( Utilities.getElementsFromPath(test, "//" + request).length > 0 ) {
                    matched = true;
        			break;
        		}	
        	}
        	
            // If there is a postfix delay pending, and this request does not
            // require a postfix delay, then wait now
        	if ( !matched ) {
        		
                // TODO: If the message is sent to an account in a multinode deployment,
            	// then we need to check the mailqueue on the destination account's server,
            	// not the sender's server.  However, the harness can't determine which
            	// server that is.
            	//
            	// Maybe check all hosts postfix queues after these messages are sent?
            	// That seems a bit excessive, but will solve the race condition.
            	//
            	
            	// This request does not need a delay, but we have one pending
                mLog.debug("going into waitForPostfixQueue");
                returnValue = MailInjectTest.waitForPostfixQueue();
                mPostfixDelayIsPending = false;
        		
        	}

        } else {

            // If there is not a postfix delay pending, but this request does
            // not require a postfix delay, then set the flag to wait next time
        	for (String request : requests ) {
        		if ( Utilities.getElementsFromPath(test, "//"+ request).length > 0 ) {
                    mPostfixDelayIsPending = true;
                    break;
        		}
        	}

        }

        return (returnValue);

    }
    
    protected boolean doLdapDelay(Element test) throws HarnessException {
    	//delay for replica

        mLog.debug("doLdapDelay");
        mLog.debug(test.toString());

        if (mLdapDelayIsPending) {
        	mLog.debug("doLdapDelay is pending");
            // If there is a ldap delay pending, and this request does not
            // require a delay, then wait
            if ((Utilities.getElementsFromPath(test, "//admin:CreateDistributionListRequest").length > 0) ||
                (Utilities.getElementsFromPath(test, "//admin:CreateCalendarResourceRequest").length > 0) ||
                (Utilities.getElementsFromPath(test, "//admin:CreateAccountRequest").length > 0)) {
                // This request needs a delay
                // Wait until we don't have a test that needs a delay
                mLdapDelayIsPending = true;

            } else {
            	// This request does not need a delay, but we have one pending
            	// Could be more restrictive(for example wait only for "//mail:AddDistributionListMemberRequest"
                mLog.debug("going into waitForLdap");
                waitForLdap();
                if ((Utilities.getElementsFromPath(test, "//admin:AddDistributionListMemberRequest").length > 0) ||
                	(Utilities.getElementsFromPath(test, "//admin:ModifyCalendarResourceRequest").length > 0)||
                	(Utilities.getElementsFromPath(test, "//admin:ModifyAccountRequest").length > 0)) {
                	mLdapDelayIsPending = true;
            	} else {
            		mLdapDelayIsPending = false;
            	}
            }

        } else {

            // If there is not a ldap delay pending, and this request does
            // require delay, then set the flag to wait next time
        	mLog.debug("doLdapDelay no pending");
            if ((Utilities.getElementsFromPath(test, "//admin:CreateDistributionListRequest").length > 0) ||
                (Utilities.getElementsFromPath(test, "//admin:CreateCalendarResourceRequest").length > 0) ||
            	(Utilities.getElementsFromPath(test, "//admin:AddDistributionListMemberRequest").length > 0) ||
                (Utilities.getElementsFromPath(test, "//admin:ModifyCalendarResourceRequest").length > 0) ||
                (Utilities.getElementsFromPath(test, "//admin:CreateAccountRequest").length > 0) ||
                (Utilities.getElementsFromPath(test, "//admin:ModifyAccountRequest").length > 0)) {

                // This request also needs a delay
                mLdapDelayIsPending = true;

            } else {
                // no delay needed
                mLdapDelayIsPending = false;
            }

        }

        return (mLdapDelayIsPending);

    }

	static protected String waitForLdap() throws HarnessException {

		// Wait for ldap to finish operation, especially for replication
		long delay = 2000;
		try {
			delay = Integer.parseInt(SoapTestMain.globalProperties.getProperty("ldapdelay.msec", Long.toString(delay)));
		} catch (NumberFormatException e) {
			mLog.info("ldapdelay.msec is not defined, using " + delay);
		}
		String zimbraServer = SoapTestMain.globalProperties.getProperty("zimbraServer.name");
		if ( zimbraServer == null ) {
			throw new HarnessException("global property not found: (zimbraServer.name)");
		}
		return ( waitForLdap(delay, zimbraServer) );

	}

	static protected String waitForLdap(long delay, String ZIMBRA_STORE_HOST) throws HarnessException {

		if ( delay <= 0 ) {
			return ("specified delay was less than 0");
		}
		mLog.info("xxxxx mReplicated=" + mReplicated.toString());
		if (mReplicated.containsKey(ZIMBRA_STORE_HOST) && !mReplicated.get(ZIMBRA_STORE_HOST)) {
			mLog.info("xxx no replication\n");
			return ("No delay, no replica config");
		}

		if ( !Test.usingStaf )
		{
			try {
				mLog.info("Waiting 3000ms on Windows");
				Thread.sleep(3000);
			} catch (InterruptedException e) {}
			return ("Waited 3000ms on Windows");
		}

		long startTime = System.currentTimeMillis();
		Date d = new Date();
    	mLog.info(d.toString() + " - Start Ldap config detect\n");
		StringBuffer value = new StringBuffer("zmlocalconfig: Host " + ZIMBRA_STORE_HOST);
		
		final String STAF_ZIMBRA_SERVICE = "PROCESS";
		final String ZIMBRA_LC_COMMAND = "/bin/su ";
		final String ZIMBRA_LC_PARMS = "- zimbra -c 'zmlocalconfig'";
		
		STAFHandle handle = null;
       	
       	try
        {
            handle = new STAFHandle(SoapTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());
	        try
	        {
	        	if (!mReplicated.containsKey(ZIMBRA_STORE_HOST)) {
	            // Build the STAF PROCESS command
	        	StringBuffer stafCommand = new StringBuffer();
	        	stafCommand.append(" START COMMAND ");
	        	stafCommand.append(ZIMBRA_LC_COMMAND);
	        	stafCommand.append(" PARMS " + ZIMBRA_LC_PARMS);
	        	stafCommand.append(" RETURNSTDOUT RETURNSTDERR WAIT ");

	        	mLog.debug("Execute STAF " + ZIMBRA_STORE_HOST + " " + STAF_ZIMBRA_SERVICE + " " + stafCommand);
	            
		        STAFResult stafResult = handle.submit2(ZIMBRA_STORE_HOST, STAF_ZIMBRA_SERVICE, stafCommand.toString());
	
	            // First, check for STAF errors, like unable to contact host
	           	if ( stafResult.rc != STAFResult.Ok ) {
		            mLog.warn("STAF return code:\n" + stafResult.rc);
		            	
		           	// Fall back : delay regardless
		    		try {
			           	mLog.debug("Waiting for "+ delay +" msec");
		    			Thread.sleep(delay);
		    		} catch (InterruptedException e) {
		    			e.printStackTrace();
		   			}   	
		            return ("Couldnt contact STAF on " + ZIMBRA_STORE_HOST + ", delayed");
		        }
	            // Unwind the result object.
	           	// zmlmtpinject returns 0 on success and >0 on failure
		        //
	            STAFMarshallingContext mc = STAFMarshallingContext.unmarshall(stafResult.result);
	           	mLog.debug("zmlocalconfig results:\n" + mc.toString());
	            	
	            Map resultMap = (Map)mc.getRootObject();
	            List returnedFileList = (List)resultMap.get("fileList");
	           	Map stdoutMap = (Map)returnedFileList.get(0);
	           	String processOut = (String)stdoutMap.get("data");
	            	
	            if ( processOut != null ) {
	           		//mLog.debug("zmlocalconfig:\n" + processOut);
	           		d = new Date();
	           		String ldapUrl = "";
	           		String ldapMasterUrl = "";
	           		String[] cfg = processOut.split("\n");
	           		for (int i = 0; i < cfg.length; i++) {
	           			if (cfg[i].startsWith("ldap_master_url")) {
	           				ldapMasterUrl = cfg[i].split(" = ")[1].trim();
	           			} else if (cfg[i].startsWith("ldap_url")) {
	           					ldapUrl = cfg[i].split(" = ")[1].trim();
	           			}
	           		}
	           		mLog.info("ldap_url=" + ldapUrl + ", ldap_master_url=" + ldapMasterUrl);
	           		value.append(":\n" + "ldap_url=" + ldapUrl + ", ldap_master_url=" + ldapMasterUrl + "\n");
	        		d = new Date();
	            	mLog.info(d.toString() + " - End Ldap config detect\n");
	            	//for replication assume ldap_url != ldap_master_url
		            if (ldapUrl.equals(ldapMasterUrl)) {
		           		//no replication, no need for delay
		            	mLog.info("xxxxxxxxxx identical urls no replication\n");
		            	mReplicated.put(ZIMBRA_STORE_HOST, false);
		           		return (value.toString());
		           	}
	            	mReplicated.put(ZIMBRA_STORE_HOST, true);
	            }
	            }
	            	
	            delay -= System.currentTimeMillis() - startTime;
	    		d = new Date();
	        	mLog.info(d.toString() + " - End Ldap config detect\n");
	        	if (delay > 0) {
	        		try {
	        			Thread.sleep(delay);
	        		} catch (InterruptedException e) {
	        			e.printStackTrace();
	        		}
	        	}

        		d = new Date();
	        	value.append(d.toString() + " End delay\n");
	        	mLog.info(d.toString() + " - End Ldap delay\n");
	    		return (value.toString());            
	            
	 
	        } finally {
	        	
	            try {
					handle.unRegister();
				} catch (STAFException e) {
		        	mLog.warn("Error unregistering with STAF, RC:" + e.rc, e);
				}
	        
	        }
			
        } catch (STAFException e) {
        	
        	mLog.warn("Error registering or unregistering with STAF, RC:" + e.rc, e);
        	mLog.warn("Example:  RC: 21 is STAFNotRunning");
        	mLog.warn("See Return Codes here:  http://staf.sourceforge.net/current/STAFJava.htm#Header_STAFResult");
                   
        } 


		return (value.toString());
		
	}    
    
    protected void checkGlobals(Element e) throws HarnessException {

        if (e.getQName().equals(SystemCommandTest.E_SYSTEM)) {
            try {
                doSystemCommand(e);
            } catch (ServiceException ex) {
                throw new HarnessException("Failed to execute non-TestCase system command" + e.toString(), ex);
            }
        } else if (e.getQName().equals(E_ECHO)) {
        	doEcho(e);
        } else if (e.getQName().equals(E_PROPERTY)) {
            doProperty(e);
        } else if (e.getQName().equals(E_REGEX)) {
            doRegex(e);
        } else if (e.getQName().equals(E_PREAUTH)) {
            doPreauth(e);
        } else if (e.getQName().equals(E_DELAY)) {
            doDelay(e);
        } else if (e.getQName().equals(E_NAMESPACE)) {
            doNamespace(e);
        }else if (e.getQName().equals(E_WAITFORPOSTFIXQUEUE)) {
        	MailInjectTest.waitForPostfixQueue();
         } else if (e.getQName().equals(E_EXIT)) {
            mLog.info("Exiting upon encountering exit command in input file");
            System.exit(0);
        }
    }

    protected String expandDynamicProps(String text) throws HarnessException {

        mLog.debug("expandDynamicProps [" + text + "]");

        Matcher matcher = mPropPattern.matcher(text);
        StringBuffer sb = new StringBuffer();

        while (matcher.find()) {

            String prop = matcher.group(2);
            String replace = TestProperties.testProperties.getProperty(prop, null);

            mLog.debug("expandDynamicProps prop [" + prop + "]");
            mLog.debug("expandDynamicProps replace [" + replace + "]");

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
        mLog.debug("expandDynamicProps returning [" + text + "]");
        return text;
    }

    protected long expandGenTime(String prop) throws HarnessException {
    	
    	long msec = 0;

        // example of prop: TIME(+1d)(-30m)(+1h)(-10s)
    	Matcher ct = mGenTimePattern.matcher(prop);

        while (ct.find()) {
        	
            String signStr = ct.group(1) == null ? "+" : ct.group(1);
            String nStr = ct.group(2) == null ? "0" : ct.group(2);
            String units = ct.group(3) == null ? "d" : ct.group(3);

            long sign = signStr.equals("-") ? -1 : 1;

            long n = Long.parseLong(nStr);
            
            long u = 1;
            if (units.equals("d"))
                u = (1000 * 60 * 60 * 24);
            else if (units.equals("h"))
                u = (1000 * 60 * 60);
            else if (units.equals("m"))
                u = (1000 * 60);
            else if (units.equals("s"))
                u = (1000);

            mLog.debug("expandGenTime: adding "+ (sign * n * u) +" more msec");
            msec = msec + (sign * n * u);
        
        }
        
        // Return 0 if no changes were specified
        // Return the delta time if changes were specified (add it to the date)
        return (msec);
    	
    }
    
    protected String expandAllProps(String text) throws HarnessException {
    	
    	mLog.debug("expandAllProps: START (" + text +")");
    	
        // Wherever there is a [.*] block, expand it
    	// Nested [.*] blocks are not allowed, i.e. ${TIME[${TIME[${TIME}]}]} because I can't figure out the regex
    	//
    	Matcher subPropMatcher = mInitTimePattern.matcher(text);
    	StringBuffer initTimeStringBuffer = new StringBuffer();
    	while (subPropMatcher.find()) {
    		String subProp = subPropMatcher.group(2);
    		String replace = expandAllProps(subProp);
    		mLog.debug("subPropMatcher: replace="+replace);
        	if (replace != null) {
            	// Fix bug #46460
        		//replace value has dollar then we need to add escape character \ before $.
        		String wellFormedReplacement = replace.replaceAll("(\\$)", "\\\\\\$");
            	subPropMatcher.appendReplacement(initTimeStringBuffer, "[" + wellFormedReplacement + "]");
            	//subPropMatcher.appendReplacement(initTimeStringBuffer, "[" + replace + "]");
            }
        }
    	subPropMatcher.appendTail(initTimeStringBuffer);
        text = initTimeStringBuffer.toString();
    	mLog.debug("subPropMatcher: final text " + text);

        
    	Matcher matcher = mPropPattern.matcher(text);
        StringBuffer sb = new StringBuffer();
        
        while (matcher.find()) {
            String prop = matcher.group(2);
            String replace = TestProperties.testProperties.getProperty(prop, null);

            if (replace == null) {

                // Drop the msec part, since the server does the same
                // Dropping the msec part breaks the harness where it uses ${TIME} as a unique identifier.
            	// 	Believe it or not, some scripts run in less than 1 second, which can cause account names to be the same.
            	// 	Long currentTime = (System.currentTimeMillis()/1000) * 1000;
            	Long currentTime = System.currentTimeMillis();
                
                // Look for [.*] in the individual props, and initialize the time accordingly
            	mLog.debug("tMatcher: start time (now) " + currentTime);
            	Matcher tMatcher = mInitTimePattern.matcher(prop);
            	StringBuffer tBuffer = new StringBuffer();
            	while (tMatcher.find()) {
            		currentTime = Long.parseLong(tMatcher.group(2));
                   	tMatcher.appendReplacement(tBuffer, "");	// Remove the [.*] part
                	mLog.debug("tMatcher: initialized time " + currentTime);
                }
            	tMatcher.appendTail(tBuffer);
                prop = tBuffer.toString();
            	
            	mLog.debug("expandAllProps: prop (" + prop + ")");

                // If (+1d)(+5h)(+10m)(+30s) is specified, adjust the time accordingly
            	currentTime = currentTime + expandGenTime(prop);
            	mLog.debug("expandGenTime: modified time " + currentTime);

            	// Convert to calendar, GMT
            	GregorianCalendar d = new GregorianCalendar(TimeZone.getTimeZone("UTC"));
            	d.setTimeInMillis(currentTime);
            	mLog.debug("expandGenTime: modified date " + d.getTime());
            	
            	SimpleDateFormat fmt = new SimpleDateFormat();
            	fmt.setTimeZone(TimeZone.getTimeZone("UTC"));
            	
            	if ("COUNTER".equals(prop)) {
                    replace = mCounter.incrementAndGet() + "";
                } else if ("LOOPINDEX".equals(prop)) {
                    replace = mLoopIndex + "";
                } else if ("LOCALHOST".equals(prop)) {
                    replace = sHostname;
                } else if (prop.startsWith("TIME")) {
                    replace = "" + currentTime;
                } else if (prop.startsWith("UUID")) {
                    replace = UUID.randomUUID().toString();
                } else if (prop.startsWith("GENTIME")) {
                    fmt.applyPattern("yyyyMMddHHmmss'Z'");
                    replace = fmt.format(d.getTime());
                } else if (prop.startsWith("XMLTIME")) {
                    fmt.applyPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
                    replace = fmt.format(d.getTime());
                } else if (prop.startsWith("GENDATESTAMP")) {
                	fmt.applyPattern("MM/dd/yyyy");
                    replace = fmt.format(d.getTime());
                } else if (prop.startsWith("CURRDATE")) {
                	fmt.applyPattern("yyyyMMdd");
                   replace = fmt.format(d.getTime());
                } else if (prop.startsWith("CURRTIME")) {
                	fmt.applyPattern("HHmmss");
                    replace = fmt.format(d.getTime());
                } else if (prop.startsWith("CURRENTTIMEHHMM")) {
                	fmt.applyPattern("HHmm");
                    replace = fmt.format(d.getTime());
                }   else if (prop.startsWith("ICALTIME")) {
                	fmt.applyPattern("yyyyMMdd'T'HHmmss");
        		    replace = fmt.format(d.getTime());
				} else if (prop.startsWith("GMTTIME")) {
                    fmt.applyPattern("yyyyMMdd'T'HHmmss'Z'");
                    replace = fmt.format(d.getTime());
                } else if (prop.startsWith("CURRWEEKDAY")) {
					//sun=0,mon=1,....,sat=6
					replace = String.valueOf(d.get(Calendar.DAY_OF_WEEK)-1);
				} else if (prop.startsWith("CURRDAY")) {					
					fmt.applyPattern("EE");
					replace = fmt.format(d.getTime());	
				} else if (prop.startsWith("CURRMON")) {					
					fmt.applyPattern("MM");
					replace = fmt.format(d.getTime());
                } else if (prop.startsWith("XZIMBRARECEIVED")) {
                	fmt.applyPattern("EEE, d MMM yyyy HH:mm:ss Z");
                    replace = fmt.format(d.getTime());
				} else if (prop.startsWith("NETWORK")) {
					try
					{
						String myIp = InetAddress.getLocalHost().getHostAddress();
						replace = myIp.substring(0, myIp.lastIndexOf('.') + 1) + "0";
					}
					catch(UnknownHostException uhe)
					{
						//handle exception
						throw new HarnessException("cannot get local host ip address", uhe);
					}
                } else  {

                    // Check the dynamic props
                    replace = expandDynamicProps(text);

                }
            }

            if (replace != null) {
            	    // Fix bug #46460
            	    //replace value has dollar then we need to add escape character \ before $.
                	String wellFormedReplacement = replace.replaceAll("(\\$)", "\\\\\\$");
                	matcher.appendReplacement(sb, wellFormedReplacement);
                	//matcher.appendReplacement(sb, replace);
            } else {
                throw new HarnessException("unknown property: " + matcher.group(1));
                //matcher.appendReplacement(sb, matcher.group(1));
            }
        }
        matcher.appendTail(sb);
        text = sb.toString();
    	mLog.debug("expandAllProps: RETURN (" + text +")");
        return text;
    }

    protected Element expandProps(Element doc) throws HarnessException {

        for (Iterator it = doc.elementIterator(); it.hasNext();) {
            Element e = (Element) it.next();
            expandProps(e);
        }
        // Bug# 46462: Add support for non expandable properties.
        for (Iterator it = doc.attributeIterator(); it.hasNext();) {
        	Element.Attribute attr = (Element.Attribute) it.next();
        	if(attr.getKey().equalsIgnoreCase("expand") && attr.getValue().equals("0") ) {
            	return doc;
            }
        }
        for (Iterator it = doc.attributeIterator(); it.hasNext();) {
            Element.Attribute attr = (Element.Attribute) it.next();
            String text = attr.getValue();
    		// TODO: SOAP/STAF Separation
//            if (text.indexOf("$#") != -1) {
//            	attr.setValue(MigrationTest.expandMigrationProps(text));
//            	text = attr.getValue();
//            }
            if (text.indexOf("${") != -1) {
                try {
                	attr.setValue(expandAllProps(text));
                } catch (IllegalArgumentException e) {
                	throw new HarnessException("expandAllProps threw exception for "+ text, e);
                }
            }
            
        }
        String text = doc.getText();
		// TODO: SOAP/STAF Separation
//        if (text.indexOf("$#") != -1) {
//            doc.setText(MigrationTest.expandMigrationProps(text));
//            text = doc.getText();
//        }
        if (text.indexOf("${") != -1) {
            try {
            	doc.setText(expandAllProps(text));
            } catch (IllegalArgumentException e) {
            	throw new HarnessException("expandAllProps threw exception for "+ text, e);
            	
            }
        }
    	
        return doc;
    }

   
    static public void setInstallHistory(String history) {

		mLog.info("setInstallHistory ...");
    	
		
		if ( installHistory == null ) {
			installHistory = new ArrayList<String>();
		}
		
		
		Pattern pattern = Pattern.compile("(\\d+)\\.(\\d+)\\.(\\d+)");

    	Matcher matcher = pattern.matcher(history);
    	while (matcher.find()) {
    		
    		String release = matcher.group(0);
    		if ( !installHistory.contains(release) ) 
    		{
        		installHistory.add(release);
        		mLog.info("setInstallHistory added "+ release);
    		}
    		

        }

    }
  
    protected void addReqTime(Test test) {
    	
    	if (test == null) {
   		 mLog.warn("test is null");
   		 return;
   	 	}   	 

        if (test.getClass().equals(SoapTest.class)) {

            SoapTest soapTest = (SoapTest) test;

            String str = soapTest.getDocReqName();

            if (mReqTime.containsKey(str)) {

                long tmpTime = ((Long) mReqTime.get(str)).longValue();
                //				mTestTime = tmpTime +((mCurrTest.mTime - delay )*1000000L) + 1;
                long addTime = (test.mTime * 1000000L) + 1;
                mReqTime.put(str, new Long(tmpTime + addTime));

            } else {

                //				mReqTime.put(str,new Long(((mCurrTest.mTime - delay )*1000000L) + 1));	
                long addTime = (test.mTime * 1000000L) + 1;
                mReqTime.put(str, new Long(addTime));

            }

            
            // Record the overall longest requests
            PerformanceStatistics.record(str, test.mTime);

        }

    }

    protected static String getReqSummary(String str, long tmpTime) {

        StringBuffer status = new StringBuffer();
        status.append(Test.rpad(str, 41));
        status.append("    ");
        status.append(Test.lpad(tmpTime / 1000000L + "", 10));
        status.append("    ");
        status.append(Test.lpad(tmpTime % 1000000L + "", 7));
        status.append("    ");
        status.append(Test.lpad((tmpTime / 1000000L) / (tmpTime % 1000000L) + "", 11));
        return status.toString();
    }

    private String findIncludeFile(String filename, String rootDir) {
    	
        mLog.debug("findIncludeFile looking in directory: " + rootDir);
        
        
        if ( mIncludePaths == null ) {
        	mIncludePaths = new HashMap<String, String>();
        	
        }
        
        // Determine if we have already searched for this include file
        String filepath = (String) mIncludePaths.get(filename);
        
        if ( filepath != null ) {
        	mLog.debug("findIncludeFile already found " + filename);
        	return (filepath);
        }
        
    	File root = new File(rootDir);

    	File files[] = root.listFiles();
        if (files == null || files.length < 1) {
            return filepath;
        }
        

        try {
        	
	
	        // First, run test files in this directory.
	        for (int i = 0; i < files.length; i++) {
	            File f = files[i];
	
	            // Skip directories.
	            if (f.isDirectory()) {
	            	filepath = findIncludeFile(filename, f.getAbsolutePath());
	            	if ( filepath != null ) {
	                	return (filepath);
	            	}
	            }
	
	            if ( f.getAbsolutePath().indexOf(filename) >= 0 ) {
	            	return (filepath = f.getAbsolutePath());
	            }
	
	        }

        	return filepath;
        	
        } finally {
        	
        	if ( filepath != null ) {
            	mLog.debug("findIncludeFile found " + filename + " in " + filepath);
            	mIncludePaths.put(filename, filepath);        		
        	}

    	}
    	
    }
    
    protected static Element createCopy(Element e) throws XmlParseException {

        // Convert to dom4j Element
        org.dom4j.Element d4context = e.toXML();

        // Create new Element from dom4j Element
        Element copy = Element.parseXML(d4context.asXML());

        return (copy);
    }

    // Convert the specified File 'f' to unix path notation
    // i.e. Convert
    // C:\\dir1\\dir2\\dir3 (File object)
    // to
    // /dir1/dir2/dir3 (String object)
    //
    private static String getPortableFilePath(File f, String p) {
    	
    	if ( f == null )
    		return (p);
    	    	
    	if ( p == null ) {
    		p = f.getName();
    	} else {
    		p = f.getName() + "/" + p;
    	}
    	
    	return (getPortableFilePath(f.getParentFile(), p));    	
    }
    
    public static  String computePreAuth(Map<String,String> params, String key) {
    	
    	TreeSet<String> names = new TreeSet<String>(params.keySet());
        StringBuilder sb = new StringBuilder();
        for (String name : names) {

        	if (sb.length() > 0) sb.append('|');
            sb.append(params.get(name));
            
        }
        
        return getHmac(sb.toString(), key.getBytes());

    }

    private static String getHmac(String data, byte[] key) {
    
    	try
    	{
              ByteKey bk = new ByteKey(key);
              Mac mac = Mac.getInstance("HmacSHA1");
              mac.init(bk);
              return toHex(mac.doFinal(data.getBytes()));
        } catch (NoSuchAlgorithmException e) {
              throw new RuntimeException("fatal error", e);
        } catch (InvalidKeyException e) {
              throw new RuntimeException("fatal error", e);
        }
        
    }
      
    static class ByteKey implements SecretKey {
		private static final long serialVersionUID = -6714488976985264310L;
		private byte[] mKey;
          
          ByteKey(byte[] key) {
              mKey = (byte[]) key.clone();;
          }
          
          public byte[] getEncoded() {
              return mKey;
          }

          public String getAlgorithm() {
              return "HmacSHA1";
          }

          public String getFormat() {
              return "RAW";
          }       
     }

    public static String toHex(byte[] data) {

    	StringBuilder sb = new StringBuilder(data.length * 2);
        for (int i=0; i<data.length; i++ ) {
        	
             sb.append(hex[(data[i] & 0xf0) >>> 4]);
             sb.append(hex[data[i] & 0x0f] );
        }
        
        return sb.toString();
        
    }

    private static final char[] hex = 
    	{ '0' , '1' , '2' , '3' , '4' , '5' , '6' , '7' ,
          '8' , '9' , 'a' , 'b' , 'c' , 'd' , 'e' , 'f'};

    private FileAppender createFileAppender(String logRoot, String logSubDir, File xmlTestFile) throws IOException {

    	String logFileName = xmlTestFile.getName();
        String baseDir = "";

        if (logRoot != null) {
            baseDir = logRoot + "/";
        }
        if (logSubDir != null ){
        	baseDir = baseDir + logSubDir + "/";
        }

        File temp = xmlTestFile;
        while (temp.getParent() != null) {

            mLog.debug("getParent: " + temp.getParent());
            if (temp.getParentFile().getName().equals("data")) {

                // We found the root of the <ZimbraQA>/data folder
                String absPath = xmlTestFile.getAbsolutePath();

                // Strip everything up to <ZimbraQA>/data
                logFileName = absPath
                    .substring(temp.getParentFile().getAbsolutePath().length() + 1);

                // Change .xml to .txt
                logFileName = logFileName.substring(0, logFileName.length() - 4) + ".txt";

                // Prepend with baseDir
                logFileName = baseDir + logFileName;

                // Create the directory path to the new file
                File logFilePath = new File(logFileName);
                logFilePath.getParentFile().mkdirs();
                
                // Remember the debug folder so tests can save output files there
                rootDebugDir = logFilePath.getParentFile().getCanonicalPath();

                break;
            }

            temp = temp.getParentFile();
        }

        mLog.debug("using logfile: " + logFileName);
        mLog.debug("using debug dir: " + rootDebugDir);

        return (new FileAppender(new PatternLayout("%m%n"), logFileName, false));
    }

    public static class HarnessException extends Exception {
 
        private static final long serialVersionUID = 6317935226118774217L;

        public HarnessException(String message) {
            super(message);
        }

        public HarnessException(String message, Throwable cause) {
            super(message, cause);
        }
    }    
    
}
