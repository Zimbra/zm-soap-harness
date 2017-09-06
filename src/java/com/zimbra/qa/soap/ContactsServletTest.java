package com.zimbra.qa.soap;


import java.io.IOException;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import org.apache.commons.httpclient.Cookie;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpException;
import org.apache.commons.httpclient.HttpMethod;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.methods.GetMethod;
import org.dom4j.QName;

import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.SoapFaultException;
import com.zimbra.common.soap.Element.XMLElement;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class ContactsServletTest extends RestServletTest {
		
		
       
    public static final QName E_CSVSERVLETTEST = QName.get("csvservlettest", SoapTestCore.NAMESPACE);
	public static final QName E_CSV_REQUEST = QName.get("csvServletRequest", SoapTestCore.NAMESPACE);
	public static final QName E_CSV_RESPONSE = QName.get("csvServletResponse", SoapTestCore.NAMESPACE);

	public static final String A_CSV_FILENAME = "filename";

	protected String csvUrlProp	= "csvURL";
	protected String csvServerProp	= "server.csvServlet";


	// Contact Export string (contents of contacts.csv in string form
	public String[] contactsCSV;

	

	public ContactsServletTest() {
		
		super();
		
		restUrlProp	= csvUrlProp;
		restServerProp	= csvServerProp;

	}
	
	public ContactsServletTest(Element e, SoapTestCore core) {
	
		super(e, core);
		
		restUrlProp	= csvUrlProp;
		restServerProp	= csvServerProp;
		
	}
		

	
	private boolean executeCSVRequest(Element element) throws HarnessException {

		mLog.debug("executeCSVRequest execute");
		
		
		
		String mAuthToken = TestProperties.testProperties.getProperty("authToken", null);
		String mSessionId = TestProperties.testProperties.getProperty("sessionId", null);
		mLog.debug("mAuthToken [" + mAuthToken + "] ...");
		mLog.debug("mSessionID [" + mSessionId + "] ...");


		

		//Build the cookies to connect to the rest servlet
		//
		HttpState initialState = new HttpState();
		Cookie authCookie = new Cookie(restURI.getHost(), "ZM_AUTH_TOKEN", mAuthToken, "/", null, false);
		Cookie sessionCookie = new Cookie(restURI.getHost(), "JSESSIONID", mSessionId, "/zimbra", null, false);
		initialState.addCookie(authCookie);
		initialState.addCookie(sessionCookie);
		
		
		HttpClient client = new HttpClient();
		client.setState(initialState);
		
		//		 Connect to the rest servlet
		//
		HttpMethod method = new GetMethod(restURI.toString());

		
		
		int code = 0;
		
		try
		{

			// Save the URL for logging
			mRequestDetails = restURI.toString();
			
			httpResponseCode = client.executeMethod(method);
			
			
			if ( httpResponseCode != HttpStatus.SC_OK ) {
				mLog.debug("Method failed: " + method.getStatusLine());
			}
			else {
				

				// Add the body
				mResponseDetails = method.getResponseBodyAsString();

				// TODO:  Need a lot more robustness out of this parse
				// For instace, the street names could have end-of-line chars in it
				// Also, fields could contain quotes or commas
				//
				if(mResponseDetails.contains("\r\n")) {
					contactsCSV = mResponseDetails.split("\r\n");
				} else {
					contactsCSV = mResponseDetails.split("\n");
				}
				

				mLog.debug("detailsResponse " + mResponseDetails);
				
			}

		} catch (HttpException e) {
		      System.err.println("Fatal protocol violation: " + e.getMessage());
		      e.printStackTrace();
	    } catch (IOException e) {
		      System.err.println("Fatal transport error: " + e.getMessage());
		      e.printStackTrace();
	    } finally {
		      // Release the connection.
		      method.releaseConnection();
	    }
		
		return (mTestPassed = (code == HttpStatus.SC_OK));
	

	}
	
	public boolean executeCSVResponse(Element element) throws HarnessException {
		
		mLog.debug("doContentServletResponse\n");
		
		mLog.debug(mResponseDetails);

		Element contacts = null;
		
		try {

			if ( contactsCSV == null ) {
				// Huh?
				throw new HarnessException("Unable to create contacts response element");
			}
			
			contacts = new XMLElement(E_CSV_RESPONSE);
			
			if ( contactsCSV.length > 0 ) {
				
				String[] keyNames = contactsCSV[0].split(",");
				
		        for (int i = 1; i < contactsCSV.length; i++) {
					
		        	String[] valueNames = contactsCSV[i].split(",");
		        	
		        	Element child = contacts.addElement("cn");
		        	
		        	for (int j = 0; j < keyNames.length; j++ ) {
		        		
		        		
		        		// String quotes and spaces, which are invalid XML
		        		String key = keyNames[j].replaceAll("\"", "");
		        		String value = valueNames[j].replaceAll("\"", "");
		        		
		        		child.addElement("a").addAttribute("n", key).addText(value);
		        		
		        		// Use the email address as the unique contact id
		        		if (key.equals("E-mail Address")) {
		        			child.addAttribute("email", value);
		        		}
		        		
		        	}
				}
			
			}
			
		} catch (ArrayIndexOutOfBoundsException e) {
			throw new HarnessException("Contact header count did not match data count", e);
			
		}
		
		// For Logging
		mTeardownDetails = contacts.prettyPrint();

		
		try {

			//		test = expandProps(test);
			for (Iterator it = element.elementIterator(); it.hasNext();) {
				Element e = (Element) it.next();
				if (e.getQName().equals(E_SELECT)) {
				
						doSelect(contacts, e);
				
	//			} else {
					
	//				checkGlobals(e);
				
				}
			}
			
		} catch (Exception e) {
			mLog.error("Exception while parsing selects", e);
		}

		return (mTestPassed = (mNumCheckFail == 0));

	}
	
	public boolean executeTest() throws HarnessException {
	
	
		mLog.debug("ContactsServletTest execute " + mTest.toString());

		
		

		// Pause, if specified
		doDelay();
		

		
		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();
		
		for (Iterator it = mTest.elementIterator(); it.hasNext();) {
			Element e = (Element) it.next();

			if (e.getQName().equals(E_CSV_REQUEST)) {
				
				// Make sure we have a rest servlet URL
				try {

					// Specify csv format
					e.addAttribute(A_REST_FORMAT, "csv");
					e.addAttribute(A_REST_FOLDER, "contacts");
							
					restURI = convertElementToURL(e);
					mReference = restURI;
				} catch (URISyntaxException ex) {
					throw new HarnessException("Invalid REST spec", ex);
				}

				executeCSVRequest(e);
				
			} else if (e.getQName().equals(E_CSV_RESPONSE)) {
				
				executeCSVResponse(e);
				
			}

		}
				
		
		long finish = System.currentTimeMillis();
				
		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false;  // Execution took too long!
		}
		

		

		
		mLog.debug("ContactsServlet Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return (!testFailed());
		
	}
	


	protected void doSelect(Element context, Element select)
		throws SoapFaultException, IOException, HarnessException {
	 
		String path = select.getAttribute(A_PATH, null);
		String attr = select.getAttribute(A_ATTR, null);
		String match = select.getAttribute(A_MATCH, null);
		String property = select.getAttribute(A_SET, null);
		String emptyset = select.getAttribute(A_EMPTYSET, "0");
		String value; // TBD below
		boolean negativeTest = emptyset.equals("1");
		
		String resultMessage = "doSelect: path ("+path+") attr ("+attr+") match ("+
		match+") set ("+property+") emptyset ("+emptyset+")";
		mLog.debug(resultMessage);
		
		// Get elements from path or use the context
		Element[] tests = null;
		if (path != null) {
			tests = Utilities.getElementsFromPath(context, path);
			if (!negativeTest && tests.length == 0) {
				check(false, "path '" + path + "' did not match any elements");
				return;
			}
		} else {
			tests = new Element[1];
			tests[0] = context;
		}
		
		boolean matchFound = false;
		boolean attrFound = false;
		
		Element test = null;
		
		for (int i = 0; i < tests.length; i++) {
			test = tests[i];
		
			// If attr is specified, get the value from the attribute.  Otherwise
			// get it from the element text.
			if (attr != null) {
				value = test.getAttribute(attr, null);
			} else {					
				value = test.getText();					
			}
						
		
			boolean elementHasValue = (value != null);
			if (elementHasValue) {
				resultMessage = resultMessage.concat(" value("+value+")");
			}
			if (attr != null && elementHasValue) {
				attrFound = true;
			}
		
			// Handle matches
			if (match != null && elementHasValue) {
				try
				{
					if ( TestProperties.testProperties.getProperty(Test.lowerCaseProp, "false").equals("true") ) {
						// Bug 9092
						if (Pattern.matches(match.toLowerCase(), value.toLowerCase())) {
							matchFound = true;
						}
					} else {
						if (Pattern.matches(match, value)) {
							matchFound = true;
						}
					}
				} catch (PatternSyntaxException pse) {
					throw new HarnessException("doSelect threw PatternSyntaxException", pse);
				}
			}
			
			// Handle setting a property
			if (property != null && elementHasValue) {
				// Properties can only be set to null using the <t:property ...> mechanism
				TestProperties.testProperties.setProperty(property, value);
			}
		
			// Keep looking until all conditions have been satisfied
			boolean keepLooking = false;
			if (!elementHasValue ||
				(match != null && !matchFound) ||
				(attr != null && !attrFound)) {
				keepLooking = true;
			}
			if (!keepLooking) {
				break;
			}
		}
		
		// Process the result
		boolean success = true;
		
		if ((match != null && !matchFound)) {
			resultMessage = resultMessage.concat(", match not found");
			success = false;
		}
		if (attr != null && !attrFound) {
			resultMessage = resultMessage.concat(", attribute does not exist");
			success = false;
		}
		if (tests.length == 0) {
			resultMessage = resultMessage.concat(", no elements matched by path");
			success = false;
		}
		if (negativeTest) {
			// If emptyset=1, then negative results are PASS (positive results are FAIL)
			check(!success, resultMessage);
		}
		else {
			check(success, resultMessage);
		}
		
		// Handle sub-selects
		for (Iterator it = select.elementIterator(); it.hasNext();) {
			Element e = (Element) it.next();
			if (e.getQName().equals(E_SELECT)) {
				if (test != null) {
					// xxx bburtin: per previous behavior, subselects only operate on the
					// last element selected by the path.  I'm already creating enough
					// churn in this code for now.  We can revisit this issue if it comes
					// up.
					doSelect(test, e);
				}
			}
		}
	}

	
	protected String getTestName() {
		return ("ContactsServletTest");
}


}
