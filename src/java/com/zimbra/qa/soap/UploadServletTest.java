package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import javax.activation.MimetypesFileTypeMap;

import org.apache.commons.httpclient.Cookie;
import org.apache.commons.httpclient.Header;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.commons.httpclient.methods.multipart.FilePart;
import org.apache.commons.httpclient.methods.multipart.MultipartRequestEntity;
import org.apache.commons.httpclient.methods.multipart.Part;
import org.apache.commons.httpclient.methods.multipart.PartBase;
import org.apache.commons.httpclient.methods.multipart.StringPart;
import org.apache.commons.httpclient.params.HttpConnectionParams;
import org.apache.log4j.Logger;
import org.dom4j.QName;

import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class UploadServletTest extends Test {

	static Logger mLog = Logger.getLogger(UploadServletTest.class.getName());

    public static final QName E_UPLOADSERVLETTEST = QName.get("uploadservlettest", SoapTestCore.NAMESPACE);
	public static final QName E_US_REQUEST = QName.get("uploadServletRequest", SoapTestCore.NAMESPACE);
	public static final QName E_US_RESPONSE = QName.get("uploadServletResponse", SoapTestCore.NAMESPACE);
	public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);
	public static final QName E_HEADER = QName.get("header", SoapTestCore.NAMESPACE);



    public static final String A_XMLFILE = "filename";
	public static final String A_CONTENT_TYPE = "contenttype";
	public static final String A_XFER_ENCODING = "contenttransferencoding";
	public static final String A_CLIENT = "client";
	public static final String A_SERVER = "server";
	public static final String A_US_FILENAME = "filename";
	public static final String A_MODIFY = "modify";
	public static final String A_ATTR = "attr";
	public static final String A_PATH = "path";
	public static final String A_EMPTYSET = "emptyset";
	public static final String A_SET = "set";
	public static final String A_MATCH = "match";

	protected final String STAF_SOAP_HOST = "LOCAL";
	protected final String STAF_SOAP_SERVICE = "SOAP";
	protected final String STAF_SOAP_COMMAND = "HELP";





	/** File upload servlet URL, ex:  https://dogfood.liquidsys.com/service/upload/ */
	protected URL usURL = null;
	protected String uploadServletServerName = null;
	
	protected ProxySoapHttpTransport mTransport = null;
	



	public UploadServletTest() {
	}

	public UploadServletTest(Element e, SoapTestCore core) {

		super(e, core);

		mNumChecks = 0; mNumCheckPass = 0; mNumCheckFail = 0;

	}



	private static MimetypesFileTypeMap contentTypeMap = new MimetypesFileTypeMap();

	private boolean executeUploadRequest(Element element) throws HarnessException {

//		mLog.setLevel(Level.DEBUG);
		mLog.debug("executeUploadRequest execute");


		// Determine the type and id.
		// type will always be get (and it's not used by this harness)
		// id will be the message ID that is requested
		String filename = element.getAttribute(A_US_FILENAME, null);
		if ( filename == null )
			throw new HarnessException("UploadServletTest needs a filename element");

		String jwt = element.getAttribute("jwtToken", null);
		
		String contentType = element.getAttribute(A_CONTENT_TYPE, contentTypeMap.getContentType(new File(filename)));
		String encoding = element.getAttribute(A_XFER_ENCODING, FilePart.DEFAULT_TRANSFER_ENCODING);
		mLog.debug("fileName: " + filename + ", content type: " + contentType + ", encoding: " + encoding);


		// If required, modify the iCal as specified
		File f = modifyICal(filename, element.getOptionalElement(A_MODIFY));
		mLog.debug("full path: "+ f.getAbsolutePath());


		String uploadServletURL = usURL.toString();
		mReference = usURL;
		mLog.debug("uploadServletURL: "+ uploadServletURL);
		mLog.debug("Cookie host [" + usURL.getHost() + "] ...");

		String mAuthToken = TestProperties.testProperties.getProperty("authToken", null);
		String mSessionId = TestProperties.testProperties.getProperty("sessionId", null);
		String jwtSalt = TestProperties.testProperties.getProperty("jwtSalt", null);
		mLog.debug("mAuthToken [" + mAuthToken + "] ...");
		mLog.debug("mSessionID [" + mSessionId + "] ...");



		//Build the cookies to connect to the content servlet
		
		//***************** Custom JWT code
		HttpState initialState = new HttpState();
		if(mAuthToken != null && jwtSalt == null )
		{
			
			Cookie authCookie = new Cookie(usURL.getHost(), "ZM_AUTH_TOKEN", mAuthToken, "/", null, false);
			Cookie sessionCookie = new Cookie(usURL.getHost(), "JSESSIONID", mSessionId, "/zimbra", null, false);
			initialState.addCookie(authCookie);
			initialState.addCookie(sessionCookie);
		}
		else if (jwtSalt != null)
		{
			Cookie authCookie = new Cookie(usURL.getHost(), "ZM_JWT", jwtSalt, "/", null, false);
			initialState.addCookie(authCookie);
		}


        // make the post
		PostMethod mPost = new PostMethod(uploadServletURL);


		HttpClient client = new HttpClient();
		client.setState(initialState);


		HttpConnectionParams params = client.getHttpConnectionManager().getParams();
		params.setConnectionTimeout(5 * 1000);

        int code = 0;
        try {

        	// For logging
        	mSetupDetails = "Uploaded Filename: " + f.getAbsolutePath();

//        	PartBase charset = new StringPart("_charset_", "utf-8");

        	PartBase filename1 = new StringPart("filename1", f.getAbsolutePath());

        	FilePart fp = new FilePart(f.getName(), f);
        	fp.setContentType(contentType);

        	Part[] parts = { filename1, fp };

        	MultipartRequestEntity request = new MultipartRequestEntity(parts, mPost.getParams());
        	mPost.setRequestEntity( request );
        	
        	if (mAuthToken != null && jwtSalt != null) {
        		mPost.setRequestHeader("Authorization", "Bearer " + mAuthToken);
        	}

        	code = client.executeMethod(mPost);

        	// For logging
        	mRequestDetails = "";
        	Header[] postHeaders = mPost.getRequestHeaders();
        	for (int i = 0; i < postHeaders.length; i++)
        	{
        		mRequestDetails += postHeaders[i];
        	}
        	mRequestDetails += "\n";
        	ByteArrayOutputStream baos = new ByteArrayOutputStream();
        	request.writeRequest(baos);
        	//mRequestDetails += baos.toString();

        	mResponseDetails = "";
        	Header[] responseHeaders = mPost.getResponseHeaders();
        	for (int i = 0; i < responseHeaders.length; i ++)
        	{
        		mResponseDetails += responseHeaders[i];
        	}
        	mResponseDetails += "\n";
        	mResponseDetails += mPost.getResponseBodyAsString();

			// For logging
        	mTeardownDetails = "StatusCode: " + code + "\n";

			// parse the response
            if (code != HttpStatus.SC_OK) {
            	mLog.error("Method failed: " + mPost.getStatusLine());
            } else {

                mLog.debug("response is: \n" + mPost.getResponseBodyAsString());

            	// paw through the returned HTML and get the attachment id
                // example: loaded(<code>,'null','<id>')
                //
                int firstQuote = mPost.getResponseBodyAsString().indexOf("','") + 3;
                int lastQuote = mPost.getResponseBodyAsString().lastIndexOf("'");
                if (lastQuote == -1 || firstQuote == -1)
                    throw new HarnessException("Attachment post failed, unexpected response: " + mPost.getResponseBodyAsString());
                mTeardownDetails = mTeardownDetails.concat("id: " + new String(mPost.getResponseBodyAsString().substring(firstQuote, lastQuote)) + "\n");

            }
        } catch (IOException e) {
            throw new HarnessException("Attachment post failed " + element.toString(), e);
        } finally {
        	mPost.releaseConnection();
        }


		return (mTestPassed = (code == HttpStatus.SC_OK));


	}

	public boolean executeUploadResponse(Element element) {

		mLog.debug("executeUploadResponse execute");

		mLog.debug(element.toString());

		try
		{
			for (Iterator it = element.elementIterator(); it.hasNext();) {
				Element e = (Element) it.next();
				if (e.getQName().equals(E_SELECT)) {

					doSelect(mResponseDetails, e);

	//			} else {

	//				checkGlobals(e);

				}
			}

		} catch (Exception e) {

			mLog.error("Error while running SOAP XML: ", e);

		}

		return (mTestPassed = (mNumCheckFail == 0));

	}

	public boolean executeTest() throws HarnessException {


		mLog.debug("UploadServletTest execute " + mTest.toString());

		// Pause, if specified
		doDelay();


		usURL = setURL();


		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();

		for (Iterator it = mTest.elementIterator(); it.hasNext();) {
			Element e = (Element) it.next();

			if (e.getQName().equals(E_US_REQUEST)) {

				executeUploadRequest(e);

			} else if (e.getQName().equals(E_US_RESPONSE)) {

				executeUploadResponse(e);

			}

		}


		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false;  // Execution took too long!
		}



		mLog.debug("UploadServlet Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return (!testFailed());

	}



	protected void doSelect(String context, Element select) throws HarnessException {
		String path = select.getAttribute(A_PATH, null);
		String attr = select.getAttribute(A_ATTR, null);
		String match = select.getAttribute(A_MATCH, null);
		String property = select.getAttribute(A_SET, null);
		String emptyset = select.getAttribute(A_EMPTYSET, "0");
		String value; // TBD below
		boolean negativeTest = emptyset.equals("1");

		String resultMessage = "doCsSelect: path ("+path+") attr ("+attr+") match ("+match+") set ("+property+") emptyset ("+emptyset+")";
		mLog.debug(resultMessage);

		// Convert the massive response String into an array of individual lines
		//
		String a[] = mResponseDetails.split("\n");
		String b[] = mTeardownDetails.split("\n");

		String contextArray[] = new String[a.length + b.length];
		int c = 0;
		for (String s: a) {
			contextArray[c++] = s;
		}
		for (String s: b) {
			contextArray[c++] = s;
		}

		boolean matchFound = false;
		boolean attrFound = false;

		// Parse each line, looking for the requested attribute
		for (int i=0; i < contextArray.length; i++) {


			// End-of-line characters gives the harness fits, strip them.
			contextArray[i] = contextArray[i].trim();

			mLog.debug(contextArray[i]);

			// If attr is specified, get the value from the attribute.  Otherwise
			// get it from the element text.
			if (attr != null) {
			    if ( contextArray[i].startsWith(attr) ) {
				int colonIndex = contextArray[i].indexOf(':');
				int semicolonIndex = contextArray[i].indexOf(';');
				if (semicolonIndex == -1) semicolonIndex = colonIndex;
				int index = colonIndex < semicolonIndex ? colonIndex : semicolonIndex;
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
						}
					} else {
						// Normal behavior
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



	private URL setURL() throws HarnessException {

		// If usURL property is set, use that
		// If another usURL property was already set, use that
		// Else, check for uploadServletServer property
		// Else, throw a Harness Exception

		// Make sure we have a upload servlet URL
		String usUrlString = TestProperties.testProperties.getProperty("usURL", null);
		String usClientServerString = TestProperties.testProperties.getProperty("currentClientServer", null);
		String usServerString = TestProperties.testProperties.getProperty("uploadServletServer", null);
		String usZDesktopServerString = TestProperties.testProperties.getProperty("uploadServletServer.zdesktop", null);
		try {

			if ( usUrlString != null )				return (new URL(usUrlString));

//			if ( usURL != null )					return (usURL);

			if ( (usZDesktopServerString != null) && (!usZDesktopServerString.equals("")) )
			{
				String mode = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.mode", "http");
				String port = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.port", "7633");
				String path = TestProperties.testProperties.getProperty("uploadservlet.path", "service/upload?fmt=raw");

				// http://usServerString:80/service/upload
				return (new URL (mode + "://" + usZDesktopServerString + ":" + port + "/" + path) );
			}

			if ( usClientServerString != null )
			{
				String mode = TestProperties.testProperties.getProperty("soapservice.mode", "http");
				String port = TestProperties.testProperties.getProperty("soapservice.port", "80");
				String path = TestProperties.testProperties.getProperty("uploadservlet.path", "service/upload?fmt=raw");

				// http://usServerString:80/service/upload
				return (new URL (mode + "://" + usClientServerString + ":" + port + "/" + path) );
			}

			// The default format is:
			// http://usServerString:80/service/upload
			//
			if ( usServerString != null ) {

				String mode = TestProperties.testProperties.getProperty("soapservice.mode", "http");
				String port = TestProperties.testProperties.getProperty("soapservice.port", "80");
				String path = TestProperties.testProperties.getProperty("uploadservlet.path", "service/upload?fmt=raw");

				// http://usServerString:80/service/upload
				return (new URL (mode + "://" + usServerString + ":" + port + "/" + path) );
			}


		} catch (MalformedURLException e) {

			throw new HarnessException("Invalid upload servlet URL", e);

		}

		// Couldn't figure out how to create the URL
		throw new HarnessException("Need a value for usURL or uploadServletServer");

	}



    /**
     * Runs an XPath query on the specified element context and returns the results.
     */
    private Element[] getElementsFromPath(Element context, String path) {
		org.dom4j.Element d4context = context.toXML();
		org.dom4j.XPath xpath = d4context.createXPath(path);
		xpath.setNamespaceURIs(getURIs());
		org.dom4j.Node node;
		List dom4jElements = xpath.selectNodes(d4context);

		List zimbraElements = new ArrayList();
		Iterator iter = dom4jElements.iterator();
		while (iter.hasNext()) {
			node = (org.dom4j.Node)iter.next();
			if (node instanceof org.dom4j.Element) {
				Element zimbraElement = Element.convertDOM((org.dom4j.Element) node);
				zimbraElements.add(zimbraElement);
			}
		}

		Element[] retVal = new Element[zimbraElements.size()];
		zimbraElements.toArray(retVal);
		return retVal;
    }

	private static Map mURIs = null;
	private static Map getURIs() {
		if (mURIs == null) {
			mURIs = new HashMap();
			mURIs.put("zimbra", "urn:zimbra");
			mURIs.put("acct", "urn:zimbraAccount");
			mURIs.put("mail", "urn:zimbraMail");
			mURIs.put("admin", "urn:zimbraAdmin");
			mURIs.put("offline", "urn:zimbraOffline");
			mURIs.put("mapi", "urn:zimbraMapi");
			mURIs.put("test", "urn:zimbraTestHarness");
			mURIs.put("soap", "http://www.w3.org/2003/05/soap-envelope");
			mURIs.put("soap12", "http://www.w3.org/2003/05/soap-envelope");
			mURIs.put("soap11", "http://schemas.xmlsoap.org/soap/envelope/");
		}
		return mURIs;
	}


	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected String getTestName() {
		return ("UploadServletTest");
}

	protected File modifyICal(String filename, Element mod) throws HarnessException {

		mLog.debug("modifyICal");

		// If no modifications are required, just return the file
		if ( mod == null ) {

			mLog.debug("modifyICal - mod is null");
			return (new File(SoapTestCore.rootZimbraQA, filename));

		}

		File retFile = new File(coreController.rootDebugDir, System.currentTimeMillis() + ".txt");
		mLog.debug("modifyICal - writing to " + retFile.getAbsolutePath());

		BufferedReader inBuffer = null;

		try {

			inBuffer = new BufferedReader(new FileReader(new File(SoapTestCore.rootZimbraQA, filename)));

			StringBuffer outBuffer = new StringBuffer();

			String line;
			while ((line = inBuffer.readLine()) != null) {


			    mLog.debug("modifyICal - line: " + line);
			    boolean matched = false;

			    for (Iterator it = mod.elementIterator(); it.hasNext();) {

			    	Element elem = (Element) it.next();

			    	if ( elem.getName().equals("ical") ) {

				    	// format: <modify a="attr">value</modify>
				    	String attr = elem.getAttribute("a", null);
				    	String value = elem.getText();

				    	// format in ical: ^attr:value$
				    	// grouping: (^(attr)(:)(value)$)  .... ((2)(3)(4))
				    	// TODO: handle multi-lined values

				    	Pattern p = Pattern.compile("(^(" + attr + ")(:)(.*)$)");
				    	Matcher m = p.matcher(line);
				    	while (m.find()) {

							mLog.debug("modifyICal - found it(0): " + m.group(0));
							mLog.debug("modifyICal - found it(4): " + m.group(4));

							mLog.debug("modifyICal - replacing " + m.group(4) + " with " + value);
							m.appendReplacement(outBuffer, "$2$3" + value);
							outBuffer.append(System.getProperty("line.separator"));
							matched = true;

				    	} // while

			    	} //if

			    } // for

			    // If no match, just write the line
			    if ( ! matched ) {
			    	outBuffer.append(line).append(System.getProperty("line.separator"));
			    }

			} // while

			Writer outputWriter = null;
			try {
				outputWriter = new BufferedWriter(new FileWriter(retFile));
				outputWriter.write(outBuffer.toString());
				outputWriter.close();
			} catch (FileNotFoundException e) {
				mLog.warn("FileNotFoundException during writing  "+ retFile+ " " + e);
			} catch (IOException e) {
				mLog.warn("IOException during writing  " + retFile+ " "+  e);
			}finally{
				Utilities.close(outputWriter, mLog);
			}

		} catch (FileNotFoundException e) {
			mLog.warn("FileNotFoundException during reading  "+ filename+ " " + e);
		} catch (IOException e) {
			mLog.warn("IOException during reading  " + filename+ " "+  e);
		}finally{
			Utilities.close(inBuffer, mLog);
		}

		return (retFile);
	}

}
