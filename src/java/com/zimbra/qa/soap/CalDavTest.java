package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import javax.servlet.http.HttpServletResponse;

import org.dom4j.DocumentException;
import org.dom4j.QName;

import com.zimbra.common.mime.MimeConstants;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.DomUtil;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.SoapFaultException;
import com.zimbra.common.soap.XmlParseException;
import com.zimbra.cs.dav.DavException;
import com.zimbra.cs.dav.DavContext.Depth;
import com.zimbra.cs.dav.client.CalDavClient;
import com.zimbra.cs.dav.client.DavRequest;
import com.zimbra.cs.dav.client.WebDavClient;
import com.zimbra.cs.service.UserServlet.HttpInputStream;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class CalDavTest extends Test {

    public static final QName E_CALDAVTEST = QName.get("caldav", SoapTestCore.NAMESPACE);
    public static final QName E_REQUEST = QName.get("request", SoapTestCore.NAMESPACE);
	public static final QName E_RESPONSE = QName.get("response", SoapTestCore.NAMESPACE);
	public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);
	public static final QName E_STATUSCODE = QName.get("status", SoapTestCore.NAMESPACE);
    public static final QName E_HEADER = QName.get("header", SoapTestCore.NAMESPACE);

	// Request
	public static final String A_METHOD = "method";
	public static final String A_URI = "uri";
	public static final String A_DEPTH = "depth";
	public static final String A_ETAG = "etag";
	public static final String E_ICAL = "ical";
	public static final String A_HEADERS = "headers";
	public static final String A_USER_AGENT = "useragent";

	// Response
	public static final String A_CODE = "code";

	// Select
	public static final String A_ATTR = "attr";
	public static final String A_PATH = "path";
	public static final String A_EMPTYSET = "emptyset";
	public static final String A_SET = "set";
	public static final String A_QUERY = "query";
	public static final String A_MATCH = "match";
	public static final String A_AID = "aid";
	public static final String A_IID = "id";

	public static final String PROPFIND = "PROPFIND";
	public static final String REPORT = "REPORT";
	public static final String DELETE = "DELETE";
	public static final String MKCOL = "MKCOL";
	public static final String MKCALENDAR = "MKCALENDAR";
	public static final String PROPPATCH = "PROPPATCH";
	public static final String OPTION = "OPTION";

	protected final Pattern idPattern = Pattern.compile("(.*):(.*)");

	public Element mCalDavRequest;
	public String mCalDavRequestMethod;
	public String mCalDavRequestUri;
	public Element mCalDavResponse;

	protected CalDavClient mCalDavClient = null;
	protected String mUri = null;
	protected String mUser = null;
	protected String mPassword = null;
	protected int mResponseCode = 0;
	protected HttpInputStream mResponseStream = null;


    public CalDavTest() {

	}

	public CalDavTest(Element e, SoapTestCore core) {

		super(e, core);

	}


	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected boolean doRequestPut(Element element) throws ServiceException, HarnessException, IOException
	{
		mCalDavRequestUri = element.getAttribute(A_URI);
		String sDepth = element.getAttribute(A_DEPTH, "0");
		String sEtag = element.getAttribute(A_ETAG, null);

		mRequestDetails = element.getElement(E_ICAL).getText();

		// Create a WebDavClient
		// Reuse the existing client if none of the settings have changed
		setWebDavClient();

		// For logging
		mReference = "PUT "+ mUri + mCalDavRequestUri +" Depth("+ sDepth +")";

		HttpInputStream stream = mCalDavClient.sendPut(mCalDavRequestUri, mRequestDetails.getBytes("UTF-8"), MimeConstants.CT_TEXT_CALENDAR, sEtag, null);

		mResponseCode = stream.getStatusCode();
		mTeardownDetails = "Response Code: "+ mResponseCode;

		int byteCount = stream.getContentLength();
		mResponseDetails = "";
		if ( byteCount > 0 ) {
			byte[] bytes = new byte[byteCount];
			if ( stream.read(bytes, 0, byteCount) > 0 )
				mResponseDetails = new String(bytes);
		}


		return (true);
	}

	protected boolean doRequestDelete(Element element) throws HarnessException, IOException, ServiceException
	{


		// Strip the <t:request> part
		mCalDavRequestMethod = element.getAttribute(A_METHOD);


		mCalDavRequestUri = element.getAttribute(A_URI);
		String sDepth = element.getAttribute(A_DEPTH, "0");

		// Create a WebDavClient
		// Reuse the existing client if none of the settings have changed
		setWebDavClient();

		DavRequest davRequest = null;
		davRequest = new DavRequest(mCalDavRequestUri, mCalDavRequestMethod);
		if ( sDepth.equals("0") )
			davRequest.setDepth(Depth.zero);
		else if ( sDepth.equals("1") )
			davRequest.setDepth(Depth.one);
		else
			davRequest.setDepth(Depth.infinity);


		// For logging
		mReference = mCalDavRequestMethod +" "+ mUri + davRequest.getUri() +" Depth("+ sDepth +")";
		mRequestDetails = davRequest.getRequestMessageString();

		try {

			HttpInputStream stream = mCalDavClient.sendRequest(davRequest);
			mResponseCode = stream.getStatusCode();
			mTeardownDetails = "Response Code: "+ mResponseCode;

			mResponseDetails = "";

		} catch (DavException ex) {
			throw new HarnessException("WebDavClient threw exception", ex);
		}


		return (true);
	}


	protected boolean doRequest(Element element) throws HarnessException, IOException, ServiceException
	{


		// Strip the <t:request> part
		mCalDavRequestMethod = element.getAttribute(A_METHOD);

		if ( mCalDavRequestMethod.equalsIgnoreCase("PUT") )
			return (doRequestPut(element));

		if ( mCalDavRequestMethod.equalsIgnoreCase("DELETE") )
			return (doRequestDelete(element));


		mCalDavRequestUri = element.getAttribute(A_URI);
		String sDepth = element.getAttribute(A_DEPTH, "0");

		// Create a WebDavClient
		// Reuse the existing client if none of the settings have changed
		setWebDavClient();

		DavRequest davRequest = null;
		davRequest = new DavRequest(mCalDavRequestUri, mCalDavRequestMethod);
		if (element.elementIterator().hasNext()) {
	        mCalDavRequest = element.elementIterator().next();
	        davRequest.setRequestMessage(mCalDavRequest.toXML().createCopy());
		}
		if ( sDepth.equals("0") )
			davRequest.setDepth(Depth.zero);
		else if ( sDepth.equals("1") )
			davRequest.setDepth(Depth.one);
		else
			davRequest.setDepth(Depth.infinity);

		String headers = element.getAttribute(A_HEADERS, null);
		if (headers != null) {
		    for (String h : headers.split(",")) {
		        int i = h.indexOf(':');
		        if (i <= 0)
		            continue;
		        davRequest.addRequestHeader(h.substring(0,i), h.substring(i+1));
		    }
		}
		String userAgent = element.getAttribute(A_USER_AGENT, null);
		if (userAgent != null)
		    mCalDavClient.setUserAgent(userAgent);

		// For logging
		mReference = mCalDavRequestMethod +" "+ mUri + davRequest.getUri() +" Depth("+ sDepth +")";
		mRequestDetails = davRequest.getRequestMessageString();

		try {

			mResponseStream = mCalDavClient.sendRequest(davRequest);
			mResponseCode = mResponseStream.getStatusCode();
			mTeardownDetails = "Response Code: "+ mResponseCode;

			if (mResponseCode != HttpServletResponse.SC_NO_CONTENT) {
	            BufferedReader br = new BufferedReader(new InputStreamReader(mResponseStream));
	            StringBuilder sb = new StringBuilder();
	            String line = null;
	            while ( (line=br.readLine()) != null )
	                sb.append(line).append("\n");
	            br.close();
	            mResponseDetails = sb.toString();
	            try {

	                mCalDavResponse = Element.parseXML(mResponseDetails);
	                mResponseDetails = DomUtil.toString(mCalDavResponse.toXML(),true);

	            } catch (XmlParseException ex) {
	                mLog.debug("non-xml returned by CalDav", ex);
	            }
			}

		} catch (DavException ex) {
			throw new HarnessException("WebDavClient threw exception", ex);
		}

		return (true);
	}

	protected boolean doResponse(Element element) throws IOException, HarnessException, ServiceException
	{

		for (Iterator<Element> it = element.elementIterator(); it.hasNext();)
		{

			Element e = it.next();

			if (e.getQName().equals(E_SELECT)) {

				doSelect(mCalDavResponse, e);

			} else if (e.getQName().equals(E_STATUSCODE)) {

				String code = e.getAttribute(A_CODE);
				check(mResponseCode == Integer.parseInt(code), "Verify response code matches.  Expect: "+ code +" Found: "+ mResponseCode);

			} else if (e.getQName().equals(E_HEADER)) {
			    String name = e.getAttribute("name");
			    if (name != null) {
			        String expectedValue = e.getText().trim();
			        String value = mResponseStream.getHeader(name);
			        check(value != null && value.indexOf(expectedValue) >= 0, "Header "+name+" does not contain value "+expectedValue+" ("+value+")");
			    }
			}
		}

		return (true);
	}

	protected boolean executeTest() throws HarnessException {

		mLog.debug("CalDavTest execute");

		// Pause, if specified
		doDelay();

		long start = System.currentTimeMillis();

		try {

			for (Iterator<Element> it = mTest.elementIterator(); it.hasNext();) {
				Element e = it.next();

				if (e.getQName().equals(E_REQUEST)) {

					doRequest(e);

				} else if (e.getQName().equals(E_RESPONSE)) {

					doResponse(e);

				}

			}

		} catch (Exception ex) {
			throw new HarnessException("CalDavTest threw an exception", ex);
		}

		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false;  // Execution took too long!
		} else {
			mTestPassed = (mNumCheckFail == 0);
		}


		return (!testFailed());

	}


	protected WebDavClient setWebDavClient() throws HarnessException
	{
		initializeUriProperties();

		String user = TestProperties.testProperties.getProperty("caldav.user", null);
		String password = TestProperties.testProperties.getProperty("caldav.password", null);

		// Determine the host to talk to
		setUri();


		// If we are using the same settings, then just use the current client
		if ( mCalDavClient != null ) {
			if ( (user != null) && (password != null) ) {
				if ( !user.equalsIgnoreCase(mUser) || !password.equalsIgnoreCase(mPassword) )
					return (mCalDavClient);
			}
		}


		mUser = user;
		mPassword = password;

		mCalDavClient = new CalDavClient(mUri);
//		mCalDavClient.setDebugEnabled(true);
		if ( (mUser != null) && (mPassword != null) )
			mCalDavClient.setCredential(user, password);

		return (mCalDavClient);

	}

	@Override
	protected String getTestName() {
		return (mCalDavRequestMethod != null ? mCalDavRequestMethod : "CalDav");
	}

	protected void doSelect(Element context, Element select)
		throws SoapFaultException, IOException, HarnessException {

		String path = select.getAttribute(A_PATH, null);
		String attr = select.getAttribute(A_ATTR, null);
		String match = select.getAttribute(A_MATCH, null);
		String property = select.getAttribute(A_SET, null);
		String query = select.getAttribute(A_QUERY, null);
		String emptyset = select.getAttribute(A_EMPTYSET, "0");
		String value; // TBD below
		String aid = select.getAttribute(A_AID, null);
		String iid = select.getAttribute(A_IID, null);
			String name=select.getAttribute("name", null);
		boolean negativeTest = emptyset.equals("1");

		String resultMessage = "doSelect: path ("+path+") attr ("+attr+") match ("+
		match+") set ("+property+") emptyset ("+emptyset+")";
		mLog.debug(resultMessage);


		// Initialize the property to the variable name
		if ( property != null )
			TestProperties.testProperties.setProperty(property, "UNSET");
		if ( aid != null )
			TestProperties.testProperties.setProperty(aid, "UNSET");
		if ( iid != null )
			TestProperties.testProperties.setProperty(iid, "UNSET");


		// Get elements from path or use the context
		Element[] tests = null;
		if (path != null) {
			if ( context == null ) {
				if ( negativeTest ) {
					check (true, "context was null, so "+ path +" matches empty set");
				}
				else {
					check (false, "path '" + path + "' did not match any elements (element not present)");
				}
				return;
			}
			tests = getElementsFromPath(context, path);
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
			boolean nameFound=false;	//Added by Rajendra
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
			if ( (aid != null || iid != null) && elementHasValue)
			{
				Matcher m = idPattern.matcher(value);
				if ( m.matches() )
				{
					if ( aid != null )
						TestProperties.testProperties.setProperty(aid, m.group(1));
					if ( iid != null )
						TestProperties.testProperties.setProperty(iid, m.group(2));

				}

			}

				//handle name value pairs

				if (name!=null && elementHasValue){

					String check=name+"=";
					nameFound=value.startsWith(check, 0);
					if (nameFound){
						int pos=value.indexOf("=");
						value = value.substring(pos+1);
					}
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

			if ( query != null ) {
				// Save the queried element
				TestProperties.testProperties.setProperty(query, test.toString());
			}

			// Keep looking until all conditions have been satisfied
			boolean keepLooking = false;
			if (!elementHasValue ||
				(match != null && !matchFound) ||
					(attr != null && !attrFound)||
					(name!=null && !nameFound)){

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
			if (name!=null && !nameFound){
				resultMessage = resultMessage.concat(", no name value pairs found");
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
		for (Iterator<Element> it = select.elementIterator(); it.hasNext();) {
			Element e = it.next();
			if ( e.getQName().equals(E_SELECT) ) {
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

    // Returns: true if mUri was changed.  false otherwise
    protected boolean setUri() throws HarnessException {

		initializeUriProperties();

		String server;


		server = TestProperties.testProperties.getProperty("caldav.server", null);
		if ( server != null ) {

			String newUri = mSoapClientMode + "://" + server + ":" + mSoapClientPort;
			if ( newUri.equals(mUri) )
				return (false);		// Reuse the same server setting

			mUri = newUri;
			return (true);
		}

		// Fallthrough: fall back to server.zimbraAccount property setting
		server = TestProperties.testProperties.getProperty("server.zimbraAccount", null);
		if ( server != null ) {

			String newUri = mSoapClientMode + "://" + server + ":" + mSoapClientPort;
			if ( newUri.equals(mUri) )
				return (false);		// Reuse the same server setting

			mUri = newUri;
			return (true);
		}


		// Fallthrough: fall back to hard coded uri setting
		String uri = TestProperties.testProperties.getProperty("uri", null);
		if ( uri != null )
		{
			if ( mUri.equals(uri) )
				return (false);

			mUri = uri;
			return (true);
		}


		// Fallthrough: fall back to global.properties zimbraServer.name property setting
		server = TestProperties.testProperties.getProperty("zimbraServer.name", null);
		if ( server != null )
		{
			String newUri = mSoapClientMode + "://" + server + ":" + mSoapClientPort + "/" + mSoapClientPath;
			if ( mUri.equals(newUri) )		return (false);

			TestProperties.testProperties.setProperty("currentClientServer", server);
			mUri = newUri;
			return (true);
		}

		throw new HarnessException("zimbraServer.name must be set");

    }

    private static boolean IsInitializedUriProperties = false;
    protected static String mSoapClientMode = null;
    protected static String mSoapClientPort = null;
    protected static String mSoapClientPath = null;

    protected void initializeUriProperties() {

    	if ( !IsInitializedUriProperties )
    	{
			mSoapClientMode = TestProperties.testProperties.getProperty("soapservice.mode", SoapTestMain.globalProperties.getProperty("soapservice.mode", "http"));
			mSoapClientPort = TestProperties.testProperties.getProperty("soapservice.port", SoapTestMain.globalProperties.getProperty("soapservice.port", "80"));
			mSoapClientPath = TestProperties.testProperties.getProperty("soapservice.path", SoapTestMain.globalProperties.getProperty("soapservice.path", "service/soap/"));

			IsInitializedUriProperties = true;
    	}

    }
    /**
     * Runs an XPath query on the specified element context and returns the results.
     */
    protected Element[] getElementsFromPath(Element context, String path) {
		org.dom4j.Element d4context = context.toXML();
		org.dom4j.XPath xpath = d4context.createXPath(path);
		xpath.setNamespaceURIs(getURIs());
		org.dom4j.Node node;
		List dom4jElements = xpath.selectNodes(d4context);

		List<Element> zimbraElements = new ArrayList<Element>();
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

	private static Map<String, String> mURIs = null;
	private static Map getURIs() {
		if (mURIs == null) {
			mURIs = new HashMap<String, String>();
			mURIs.put("A", "http://apple.com/ns/ical/");
			mURIs.put("C", "urn:ietf:params:xml:ns:caldav");
			mURIs.put("CS", "http://calendarserver.org/ns/");
			mURIs.put("D", "DAV:");
			mURIs.put("Y", "http://yahoo.com/ns/");
			mURIs.put("x0", "DAV:");
			mURIs.put("x1", "urn:ietf:params:xml:ns:caldav");
			mURIs.put("x2", "http://calendarserver.org/ns/");
		}
		return mURIs;
	}

}
