package com.zimbra.qa.soap;


import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.Map;
import java.util.HashMap;
import java.util.Iterator;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import org.apache.commons.httpclient.Cookie;
import org.apache.commons.httpclient.Credentials;
import org.apache.commons.httpclient.Header;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpException;
import org.apache.commons.httpclient.HttpMethod;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.UsernamePasswordCredentials;
import org.apache.commons.httpclient.auth.AuthScope;
import org.apache.commons.httpclient.methods.GetMethod;
import org.apache.commons.httpclient.methods.InputStreamRequestEntity;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.log4j.Logger;
import org.dom4j.QName;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class RestServletTest extends Test {


	// XML definitions
    public static final QName E_RESTSERVLETTEST = QName.get("resttest", SoapTestCore.NAMESPACE);
	public static final QName E_REST_REQUEST = QName.get("restServletRequest", SoapTestCore.NAMESPACE);
	public static final QName E_REST_RESPONSE = QName.get("restServletResponse", SoapTestCore.NAMESPACE);

	// http://server/zimbra/user/[~][{username}]/[{folder}]?[{query-params}]fmt={ics, csv, etc}
	//
	public static final String A_REST_URL = "url";
	public static final String A_REST_CONFIGTYPE = "configType";

	public static final String A_REST_USER = "user";
	public static final String A_REST_USERID = "userid";
	public static final String A_REST_FOLDER = "folder";
	public static final String A_REST_RECURSIVE = "recursive";
	public static final String A_REST_FORMAT = "fmt";
	public static final String A_REST_BODY = "body";
	public static final String A_REST_OP = "op";

	public static final String A_REST_METHOD = "method";
	public static final String A_REST_GET = "get";
	public static final String A_REST_POST = "post";

	// GET attributes
	public static final String A_REST_ID = "id";
	public static final String A_VERSION = "version";
	public static final String A_REST_PART = "part";
	public static final String A_REST_QUERY = "query";
	public static final String A_REST_TYPES = "types";
	public static final String A_REST_START = "start";
	public static final String A_REST_END = "end";
	public static final String A_REST_SYNC = "sync";
	public static final String A_REST_AUTH = "auth";
	public static final String A_REST_ZAUTHTOKEN = "zauthtoken";
	public static final String A_REST_VIEW = "view";
	public static final String A_REST_GUEST = "guest";
	public static final String A_REST_PASSWORD = "password";
	public static final String A_REST_BASEPATH = "basepath";	// default: /service/home/
	public static final String A_REST_ACCT = "acct";
	public static final String A_REST_FB_START = "s";
	public static final String A_REST_FB_END = "e";
	public static final String A_REST_PREAUTH_ACCOUNT = "account";
	public static final String A_REST_PREAUTH_BY = "by";
	public static final String A_REST_PREAUTH_TIMESTAMP = "timestamp";
	public static final String A_REST_PREAUTH_EXPIRES = "expires";
	public static final String A_REST_PREAUTH_ADMIN = "admin";
	public static final String E_REST_PREAUTH_PREAUTH = "preauth";


	// POST attributes
	public static final String A_REST_FILENAME = "filename";
	public static final String A_REST_RESOLVE = "resolve";

	public static final QName E_HEADER = QName.get("header", SoapTestCore.NAMESPACE);
	public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);
	public static final QName E_CONTENT = QName.get("content", SoapTestCore.NAMESPACE);
	public static final QName E_SAVEFILE = QName.get("save", SoapTestCore.NAMESPACE);

	public static final String A_ATTR = "attr";
	public static final String A_PATH = "path";
	public static final String A_EMPTYSET = "emptyset";
	public static final String A_SET = "set";
	public static final String A_MATCH = "match";
	public static final String A_FILENAME = "file";
	public static final String A_STRING = "string";
	public static final String A_COUNT = "count";


	// REST servlet URL, ex:  https://dogfood.liquidsys.com/zimbra/user/roland/inbox.rss
	// static protected URL restURL = null;
	protected URI restURI = null;
	protected String restUrlProp	= "restURL";
	protected String restServerProp	= "server.restServlet";


	// The soap test
	/** doc in the soap body */
//	public String detailsRequest;
//	public String detailsResponse;

	/** The HTML headers and body, string format **/
	public Header httpRequestHeaders[];
	public Header httpResponseHeaders[];
	public int httpResponseCode;
	public String httpResponseBody;
	public File httpResponseFile = null;

	/** the request context */
	public Element mRequestContext;

	/** the soap request envelope */
	public Element mSoapRequest;

	/** the soap response envelope */
	public Element mSoapResponse;


	public static class RestURL {

		protected URL restURL = null;
		boolean hasQuery = false;

		public RestURL() {
		}

		public RestURL(URL url) throws HarnessException {

				try {
					restURL = new URL(url.getProtocol(), url.getHost(), url.getPort(), url.getFile());
				} catch (MalformedURLException e) {
					throw new HarnessException("Rest URL " + e.toString(), e);
				}

//				mLog.info("RestURL: " + restURL.toString());

		}

		public URL getURL() {
			return (restURL);
		}

		public String toString() {
			return (restURL.toString());
		}

		public URL addPath(String path) throws HarnessException {

			try {

				restURL = new URL(restURL, path);

			} catch (MalformedURLException e) {
				throw new HarnessException("Rest URL " + e.toString(), e);
			}

			return (restURL);
		}

		public URL addQuery(String parameter, String value) throws HarnessException {

			if ( (parameter == null) || (value == null) ) {
				return (restURL);
			}

			String query = null;
			if ( hasQuery ) {

				// Use & to separate multiple queries
				query = new String("&" + parameter + "=" + value);

			} else {

				// Use ? for the first query added
				query = new String("?" + parameter + "=" + value);
				hasQuery = true;

			}

			try {

				restURL = new URL(restURL.toString() + query);
				mLog.debug("RestURL: " + restURL.toString());

			} catch (MalformedURLException e) {
				throw new HarnessException("Rest URL " + e.toString(), e);
			}

			return (restURL);
		}

		public URL addQuotedQuery(String parameter, String value) throws HarnessException {

			if ( (parameter == null) || (value == null) ) {
				return (restURL);
			}

			return (addQuery(parameter, "\"" + value + "\""));
		}

	}


	public RestServletTest() {
	}

	public RestServletTest(Element e, SoapTestCore core) {

		super(e, core);

		mNumChecks = 0; mNumCheckPass = 0; mNumCheckFail = 0;

	}


	private boolean executeRestPostRequest(Element element) throws HarnessException {

		mLog.debug("executeRestPostRequest execute");



		// Determine the type and id.
		// type will always be get (and it's not used by this harness)
		// id will be the message ID that is requested
		File f = null;
		try {
			String filename = element.getAttribute(A_REST_FILENAME);
			f = new File(filename);
			if ( !f.exists() )
				f = new File(SoapTestCore.rootZimbraQA, filename);
			mLog.debug("fileName: "+ f.getCanonicalPath());
		} catch (ServiceException e) {
			throw new HarnessException("RestServlet POST needs a file to post", e);
		} catch (IOException e) {
			throw new HarnessException("RestServlet POST file exception", e);
		}



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

		// make the post
		PostMethod method = new PostMethod(restURI.toString());

        try {

        	//method.setRequestBody(new FileInputStream(f));
        	//method.setRequestHeader("Content-type", "text/plain");
        	InputStreamRequestEntity inputStreamRequestEntity = new InputStreamRequestEntity(new FileInputStream(f));
    		method.setRequestEntity(inputStreamRequestEntity);

			mLog.debug("RestServlet: "+ restURI.toString());

        	// For logging
			mSetupDetails = restURI.toString() + "  (Uploaded Filename name is: " + f.getCanonicalPath() +")";


        	//FileRequestEntity request = new FileRequestEntity(f, "text/plain");
        	httpResponseCode = client.executeMethod(method);

        	mRequestDetails = "";
        	httpRequestHeaders = method.getRequestHeaders();
        	for (int i=0; i<httpRequestHeaders.length; i++) {
        		mRequestDetails = mRequestDetails.concat(httpRequestHeaders[i].toString());
        	}
        	mRequestDetails = mRequestDetails.concat(".....\n");

        	// For logging
        	ByteArrayOutputStream baos = new ByteArrayOutputStream();
        	inputStreamRequestEntity.writeRequest(baos);
        	mRequestDetails = mRequestDetails.concat(baos.toString());

			// Reset the detailsResponse, which is used by <t:select/>
			//
        	mResponseDetails = "StatusCode: " + httpResponseCode + "\n";
        	mResponseDetails = mResponseDetails.concat(".....\n");


			// parse the response
            if (httpResponseCode != HttpStatus.SC_OK) {
				mLog.debug("Method failed: " + method.getStatusLine());

				httpResponseHeaders = null;
				httpResponseBody = null;

            } else {

				// Add all the HTTP headers (not the message headers, which are added below)
				httpResponseHeaders = method.getResponseHeaders();
				for (int i=0; i < httpResponseHeaders.length; i++) {
					mResponseDetails = mResponseDetails.concat(httpResponseHeaders[i].toString());
				}
				mResponseDetails = mResponseDetails.concat(".....\n");

				httpResponseBody = method.getResponseBodyAsString();
				mResponseDetails = mResponseDetails.concat(httpResponseBody);

            }
        } catch (IOException e) {
            throw new HarnessException("Attachment post failed " + element.toString(), e);
        } finally {
        	method.releaseConnection();
        }

		return (mTestPassed = (httpResponseCode == HttpStatus.SC_OK));

	}

	/** test for the http response
	 *
	 * @param contentType
	 * @return true if the http response contains text
	 */
	private boolean containsText(String contentType) {
		if (contentType.startsWith("text")) {
			return true;
		}
		return false;
	}

	private boolean isBinary(String contentType) {
		if (contentType.equalsIgnoreCase("application/zip")) {
			return true;
		}
		return false;
	}

	private boolean executeRestGetRequest(Element element) throws HarnessException {

		mLog.debug("executeRestGetRequest execute");



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
		mReference = mReference+ "Cookie: " + (authCookie==null ? "\n" : authCookie.getValue()+"\n");
		mReference = mReference+ "Session: " + (sessionCookie==null ? "\n" : sessionCookie.getValue()+"\n");

		// If <guest> or <password> are used, then we must guest authenticate
		//
		String guestName = element.getAttribute(A_REST_GUEST, null);
		String guestPassword = element.getAttribute(A_REST_PASSWORD, null);
		if ( (guestName != null) || (guestPassword != null) ) {

			mLog.info("guest: " + guestName);
			mLog.info("password: " + guestPassword);
			mReference = mReference+ "User Name: " + (guestName==null ? "\n" : guestName+"\n");
			mReference = mReference+ "Password: " + (guestPassword==null ? "\n" : guestPassword+"\n");
			Credentials loginCredentials = new UsernamePasswordCredentials(guestName, guestPassword);
			initialState.setCredentials(AuthScope.ANY, loginCredentials);

		}

		HttpClient client = new HttpClient();
		client.setState(initialState);

		//		 Connect to the rest servlet
		//
		HttpMethod method = new GetMethod(restURI.toString());


		try
		{

			mLog.debug("RestServlet: "+ restURI.toString());

			// Save the URL for logging
			mRequestDetails = restURI.toString();

			httpResponseCode = client.executeMethod(method);

			// Reset the detailsResponse, which is used by <t:select/>
			//
			mResponseDetails = "StatusCode: " + httpResponseCode + "\n";
			mResponseDetails = mResponseDetails.concat(".....\n");

			if ( httpResponseCode != HttpStatus.SC_OK ) {
				mLog.debug("Method failed: " + method.getStatusLine());

				httpResponseHeaders = null;
				httpResponseBody = null;
				processResponseHeaders(method);
			}
			else {

				httpResponseBody = null;
				boolean chunked = false;
				boolean textContent = false;
				
				processResponseHeaders(method);

				mLog.debug("detailsResponse " + mResponseDetails);

			}

		} catch (HttpException e) {
			throw new HarnessException("RestServlet HttpException", e);
	    } catch (IOException e) {
	    	throw new HarnessException("RestServlet IOException", e);
	    } finally {
		      // Release the connection.
		      method.releaseConnection();
	    }

		// Until executeTestResponse is called, assume that 200 is expected for the test
	    return (mTestPassed = (httpResponseCode == HttpStatus.SC_OK));



	}
	
	private void processResponseHeaders(HttpMethod method) {

		boolean chunked = false;
		boolean textContent = false;
		boolean binary = false;

		httpResponseHeaders = method.getResponseHeaders();
		for (int i = 0; i < httpResponseHeaders.length; i++) {
			mResponseDetails = mResponseDetails.concat(httpResponseHeaders[i].toString());
			if (httpResponseHeaders[i].getName().equals("Transfer-Encoding")
					&& httpResponseHeaders[i].getValue().equals("chunked")) {
				chunked = true;
			}
			if (httpResponseHeaders[i].getName().equals("Content-Type")
					&& containsText(httpResponseHeaders[i].getValue())) {
				textContent = true;
			}
			if (httpResponseHeaders[i].getName().equals("Content-Type")
					&& isBinary(httpResponseHeaders[i].getValue())) {
				binary = true;
			}
		}
		mResponseDetails = mResponseDetails.concat(".....\n");

		OutputStream os = null;
		try {
			if ((chunked && !textContent) || binary) {
				InputStream is = method.getResponseBodyAsStream();
				// Put the file in the samle directory as the *.txt file
				os = new FileOutputStream(httpResponseFile = new File(coreController.rootDebugDir, System.currentTimeMillis() + ".txt"));

				int b;
				while ((b = is.read()) != -1) {
					os.write(b);
				}
				os.close();
				is.close();

				// For logging
				mResponseDetails = mResponseDetails.concat("binary data saved in file: " + httpResponseFile);

			} else {
				httpResponseBody = method.getResponseBodyAsString();
				mResponseDetails = mResponseDetails.concat(httpResponseBody);

				// Create a temporary file name
				os = new FileOutputStream(
						httpResponseFile = new File(coreController.rootDebugDir, System.currentTimeMillis() + ".txt"));
				os.write(httpResponseBody.getBytes());
				os.close();

			}
		} catch (IOException e) {
			mLog.warn("IOException while writing data", e);
		} finally {
			Utilities.close(os, mLog);
		}

	}
	public boolean executeRestResponse(Element element) throws HarnessException {

		mLog.debug("executeTestResponse execute");

		mLog.debug(mResponseDetails);


//		test = expandProps(test);
		for (Iterator<Element> it = element.elementIterator(); it.hasNext();) {
			Element e = it.next();
			if (e.getQName().equals(E_SELECT)) {

				doSelect(mResponseDetails, e);

			} else if ( e.getQName().equals(E_CONTENT)) {

				doContent(e);

			} else if ( e.getQName().equals(E_SAVEFILE)) {

				doSave(e);

//			} else {

//				checkGlobals(e);

			}
		}

		return (mTestPassed = (mNumCheckFail == 0));

	}

	public boolean executeTest() throws HarnessException {


		// Pause, if specified
		doDelay();



		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();

		for (Iterator<Element> it = mTest.elementIterator(); it.hasNext();) {
			Element e = it.next();

			if (e.getQName().equals(E_REST_REQUEST)) {

				mLog.debug("executeRestRequest execute");

				try {
					// Make sure we have a rest servlet URL
					restURI = convertElementToURL(e);
					mReference = restURI+"\n";
				} catch (URISyntaxException ex) {
					throw new HarnessException("Invalid REST spec", ex);
				}

				// Send "Get" to executeRestGetRequest
				// Send "Post" to executeRestPostRequest
				// Default: "Get"
				String type = e.getAttribute(A_REST_METHOD, A_REST_GET);
				if ( type.equalsIgnoreCase(A_REST_GET) ) {
					mReference=mReference+"Method: GET \n";
					executeRestGetRequest(e);
				} else if ( type.equalsIgnoreCase(A_REST_POST) ) {
					mReference=mReference+"Method: POST \n";
					executeRestPostRequest(e);
				} else {
					throw new HarnessException("Rest Request: invalid type: " + type);
				}

			} else if (e.getQName().equals(E_REST_RESPONSE)) {

				executeRestResponse(e);

			}

		}


		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false;  // Execution took too long!
		}



		mLog.debug("RestServlet Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return (!testFailed());

	}




	protected void doSelect(String context, Element select) throws HarnessException {

		if ( context == null ) {
			throw new HarnessException("doSelect: context is null");
		}


		String path = select.getAttribute(A_PATH, null);
		String attr = select.getAttribute(A_ATTR, null);
		String match = select.getAttribute(A_MATCH, null);
		String property = select.getAttribute(A_SET, null);
		String emptyset = select.getAttribute(A_EMPTYSET, "0");
		String countStr = select.getAttribute(A_COUNT, "-1");

		String value; // TBD below
		boolean negativeTest = emptyset.equals("1");
		int count = Integer.parseInt(countStr);

		String resultMessage = "doCsSelect: path ("+path+") attr ("+attr+") match ("+match+") set ("+property+") emptyset ("+emptyset+") count ("+count+")";
		mLog.debug(resultMessage);

		// Convert the massive response String into an array of individual lines
		//
		String contextArray[] = context.split("\n");

		boolean matchFound = false;
		boolean attrFound = false;
		int numMatchFound = 0;

		// Parse each line, looking for the requested attribute
		for (int i=0; i < contextArray.length; i++) {


			// End-of-line characters gives the harness fits, strip them.
			contextArray[i] = contextArray[i].trim();

			mLog.debug(contextArray[i]);

			// If attr is specified, get the value from the attribute.  Otherwise
			// get it from the element text.
			if (attr != null) {

			    if ( contextArray[i].startsWith(attr) ) {

					// Format in the text:
			    	// attr:value
			    	//
			    	int colonIndex = contextArray[i].indexOf(':');

			    	// What's the deal with the semicolon - how is it used?  (ical?)
			    	// By selecting the semicolon, it breaks vcf like "EMAIL;TYPE=internet:email@domain.com"
			    	//
			    	int semicolonIndex = contextArray[i].indexOf(';');
					if (semicolonIndex == -1) semicolonIndex = colonIndex;

				int index = colonIndex < semicolonIndex ? colonIndex : semicolonIndex;
				//	int index = colonIndex;
					value = contextArray[i].substring(index + 1).trim();
					while ((i + 1 < contextArray.length) &&
					       (contextArray[i + 1].startsWith(" ") || contextArray[i + 1].startsWith("\t"))) {
					    value = (value.concat(contextArray[++i].substring(1))).trim();
					}
			    } else {
			    	value = null;
			    }
			} else {
			    value = contextArray[i];
			}

//			What if a value is empty ("")?  Shouldn't that still be compared, set, etc.?
//			boolean elementHasValue = !StringUtil.isNullOrEmpty(value);
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
							numMatchFound++;
						}
					} else {
						if (Pattern.matches(match, value)) {
							matchFound = true;
							numMatchFound++;
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
				(match != null && (!matchFound || count >= 0)) ||
				(attr != null && !attrFound)) {
				keepLooking = true;
			}
			if (!keepLooking) {
				break;
			}

		}

		// Process the result
		boolean success = true;

		if ((match != null && count < 0 && !matchFound)) {
			resultMessage = resultMessage.concat(", match not found");
			success = false;
		}
		if ((match != null && count >= 0 && count != numMatchFound)) {
			resultMessage = resultMessage.concat(", match not found " + count + " time(s) (found " + numMatchFound + " time(s)");
			success = false;
		}
		if (attr != null && !attrFound) {
			resultMessage = resultMessage.concat(", attribute does not exist");
			success = false;
		}
		if (contextArray.length == 0) {
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


	}

	protected void doContent(Element select) throws HarnessException {

		mLog.debug("In doContent ...");

		String goldenFilename = select.getAttribute(A_FILENAME, null);
		String goldenRegex = select.getAttribute(A_MATCH, null);

		if ( (goldenFilename == null) && (goldenRegex == null) ) {
			throw new HarnessException("doContent needs something to compare to");
		}

		if ( goldenFilename != null ) {

			if ( httpResponseFile == null ) {
				check(false, "Http response did not include content to compare to");
				return;
			}

			FileInputStream fisTest = null;
			FileInputStream fisGolden = null;

			try {

				fisTest = new FileInputStream(httpResponseFile);
				//fisGolden = new FileInputStream(goldenFilename);
				fisGolden = new FileInputStream(new File(SoapTestCore.rootZimbraQA, goldenFilename));


				int a = 0, b = 0, index = 0;
				while ( true ) {
					a = fisTest.read();
					while ( (a==10) || (a==13) ) {
						a = fisTest.read();
					}
						;
					b = fisGolden.read();
					while ( (b==10) || (b==13) ) {
						b = fisGolden.read();
					}

					mLog.debug("doContent a[" + a + "] b[" + b + "]");

					if ( (a == -1) && (b == -1) ) {
						// Made it through the entire streams
						check(true, "both streams matched");
						break;
					}

					if ( a != b ) {

						// This includes the instand when a = -1 and b does not (and vise versa)
						check(false,
								goldenFilename +
								" did not match the response stream " +
								httpResponseFile +
								" at index " + index +
								" expected " + b +
								" found " + a);
						return; // End here at the first non-match

					}

					index++;
				}

			} catch (IOException e) {
				// Catch the file exceptions here
				throw new HarnessException("IO Error with file", e);
			} finally {
				Utilities.close(fisTest, mLog);
				Utilities.close(fisGolden, mLog);

			}

		}

		if ( goldenRegex != null ) {

			if ( httpResponseBody != null ) {
				// Since content is very likely to be multilined, add DOTALL to make "." match newlines
				if ( Pattern.compile(goldenRegex, Pattern.DOTALL).matcher(httpResponseBody).matches() ) {
					check(true, "HTTP response body matched");
				} else {
					check (false, "(" +goldenRegex+ ") did not match ("+ httpResponseBody +")");
				}
			}

		}

	}

	protected void doSave(Element select) throws HarnessException {

		mLog.debug("In doSave ...");

		String fileName = select.getAttribute(A_FILENAME, null);
		String fileSet = select.getAttribute(A_SET, null);

		File f = new File(coreController.rootDebugDir, fileName == null ? ""+System.currentTimeMillis() : fileName);;

		if ( httpResponseFile == null ) {
			throw new HarnessException("response data never saved to file.  this shouldn't happen");
		}

		if ( httpResponseFile.renameTo(f) ) {
			mTeardownDetails = "data saved/moved to "+ f.getAbsolutePath();
		}
		if ( fileSet != null ) {
			String path = null;
			try {
				path = f.getCanonicalPath();
			} catch (IOException e) {
				throw new HarnessException("Unable to execute doSave()", e);
			}
			if ( path.indexOf('\\') >= 0) {
				int first = path.indexOf('\\');
				path = path.substring(first);
				path = path.replace('\\', '/');
			}
			TestProperties.testProperties.setProperty(fileSet, path);
		}
	}





	protected URI convertElementToURL(Element e) throws HarnessException, URISyntaxException {

		mLog.debug("in convertElementToURL " + e);

		String scheme = TestProperties.testProperties.getProperty("soapservice.mode", "http");
		String host = null;
		int port = Integer.parseInt(TestProperties.testProperties.getProperty("soapservice.port", "80"));

		String path = e.getAttribute(A_PATH, null);
		if(path==null) {
			path = "/service/home";
		}

		HashMap<String, String> queryMap = new HashMap<String, String>();
		String fragment = null;


		// If restURL is set, use that
		String property1 = TestProperties.testProperties.getProperty(restUrlProp, null);
		String property2 = TestProperties.testProperties.getProperty("currentClientServer", null);
		String property3 = TestProperties.testProperties.getProperty(restServerProp, null);
		if (property1 != null) {
			return (new URI(property1));
		} else if (property2 != null) {
			host = property2;
		} else if (property3 != null) {
			host = property3;
		} else {
			throw new HarnessException("need value for "+ restUrlProp +" or currentClientServer or "+ restServerProp);
		}


		// First priority is hardcoded URL.  The XML must specify the user part as well.
		// Just concat what is specified and return it.
		//
		String hardcodedURL = e.getAttribute(A_REST_URL, null);
		if ( hardcodedURL != null ) {

			if ( !hardcodedURL.startsWith("/") )
				hardcodedURL = "/" + hardcodedURL;

			return (new URI(scheme, null, host, port, path + hardcodedURL, QueryToString(queryMap), fragment));

		}

		String basepath = e.getAttribute(A_REST_BASEPATH, null);
		if ( basepath != null ) {

			path = basepath;

		} else {

			// Both folder and ID use the username or userid.
			//
			String userID = e.getAttribute(A_REST_USERID, null);
			if ( userID != null ) {

				// Use the User ID
				path += "/userid/" + userID + "/";

			} else {
				if (path == "/service/home") {
					// Use the User, not the User ID (~ is default)
					String user = e.getAttribute(A_REST_USER, "~");
					path += "/" + user + "/";
				}


			}

		}

		// Seperate the logic for accessing folders vs. IDs
		//
		String folder = e.getAttribute(A_REST_FOLDER, null);
		String id = e.getAttribute(A_REST_ID, null);
		String query = e.getAttribute(A_REST_QUERY, null);
		if ( folder != null ) {

			path += folder;

			String recursive = e.getAttribute(A_REST_RECURSIVE, null);
			if ( recursive != null ) {
				queryMap.put("recursive", "1");
			}

		} else if ( id != null ) {

			queryMap.put("id", id);

			// Part is specific to mail item id?
			String part = e.getAttribute(A_REST_PART, null);
			if ( part != null ) {
				queryMap.put("part", part);
			}

		} else if ( query != null ) {

				queryMap.put("query", "\""+ query + "\"");

		} else {

			// What else is there?
//			throw new HarnessException("rest servlet needs a folder, ID, or query");

			// REST does not require a folder, ID, or query.  example: http://domain.com/home/~/?fmt=tgz to download the mailbox
			mLog.debug("rest servlet: not using folder, ID, or query");

		}

		String zAuthToken = e.getAttribute(A_REST_ZAUTHTOKEN, null);
		if ( zAuthToken != null ) {
			queryMap.put("zauthtoken", zAuthToken);
		}

		// Add constraints that apply to both folders and mail item ID here
		String auth = e.getAttribute(A_REST_AUTH, null);
		if ( auth != null ) {
			queryMap.put("auth", auth);
		}
		
		String configType = e.getAttribute(A_REST_CONFIGTYPE, null);
		if ( configType != null ) {
			queryMap.put("configType", configType);
		}

		String format = e.getAttribute(A_REST_FORMAT, null);
		if ( format != null ) {
			queryMap.put("fmt", format);
		}

		String body = e.getAttribute(A_REST_BODY, null);
		if ( body != null ) {
			queryMap.put("body", body);
		}

		String op = e.getAttribute(A_REST_OP, null);
		if ( op != null ) {
			queryMap.put("op", op);
		}

		String view = e.getAttribute(A_REST_VIEW, null);
		if ( view != null ) {
			queryMap.put("view", view);
		}

		String sync = e.getAttribute(A_REST_SYNC, null);
		if ( sync != null ) {
			queryMap.put("sync", sync);
		}

		String ver = e.getAttribute(A_VERSION, null);
		if ( ver != null ) {
			queryMap.put("ver", ver);
		}

		String acct = e.getAttribute(A_REST_ACCT, null);
		if ( acct != null ) {
			queryMap.put("acct", acct);
		}

		String freebusyStart = e.getAttribute(A_REST_FB_START, null);
		if ( freebusyStart != null ) {
			queryMap.put("s", freebusyStart);
		}

		String freebusyEnd = e.getAttribute(A_REST_FB_END, null);
		if ( freebusyEnd != null ) {
			queryMap.put("e", freebusyEnd);
		}

		Element preauth = e.getOptionalElement(E_REST_PREAUTH_PREAUTH);
		if ( preauth != null ) {

			try {

				String account = preauth.getAttribute(A_REST_PREAUTH_ACCOUNT);
				String by = preauth.getAttribute(A_REST_PREAUTH_BY);
				String timestamp = preauth.getAttribute(A_REST_PREAUTH_TIMESTAMP);
				String expires = preauth.getAttribute(A_REST_PREAUTH_EXPIRES);
				String admin = preauth.getAttribute(A_REST_PREAUTH_ADMIN, null);
				String value = preauth.getTextTrim();

				queryMap.put(A_REST_PREAUTH_ACCOUNT, account);
				queryMap.put(A_REST_PREAUTH_BY, by);
				queryMap.put(A_REST_PREAUTH_TIMESTAMP, timestamp);
				queryMap.put(A_REST_PREAUTH_EXPIRES, expires);
				if ( admin != null ) {
					queryMap.put(A_REST_PREAUTH_ADMIN, admin);
				}
				queryMap.put(E_REST_PREAUTH_PREAUTH, value);

			} catch (ServiceException se) {
				throw new HarnessException("preauth missing required attribute", se);
			}
		}

		String resolve = e.getAttribute(A_REST_RESOLVE, null);
		if ( resolve != null ) {
			queryMap.put("resolve", resolve);
		}

		return (new URI(scheme, null, host, port, path, QueryToString(queryMap), fragment));

	}



	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected String getTestName() {
		return ("RestServletTest");
	}

	protected String QueryToString(HashMap<String, String> map) throws HarnessException {

		// Make sure the map exists
		if ( map == null )
			return (null);

		// Create a string of key/value pairs, separated by a &
		StringBuilder sb = null;
		for (Map.Entry<String, String> entry : map.entrySet()) {
		    if ( sb == null )
		    	sb = new StringBuilder("");
		    else
		    	sb.append("&");
		    sb.append(entry.getKey()).append("=").append(entry.getValue());
		}

		if ( sb == null )
			return (null);

		return (sb.toString());
	}


}
