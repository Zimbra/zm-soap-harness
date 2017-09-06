package com.zimbra.qa.soap;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Iterator;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.internet.MimeMessage;

import org.apache.commons.httpclient.Cookie;
import org.apache.commons.httpclient.Header;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.methods.InputStreamRequestEntity;
import org.apache.commons.httpclient.methods.PostMethod;
import org.dom4j.QName;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.RestServletTest.RestURL;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

/**
 * 
 * @author rhoades
 * See http://bugzilla.zimbra.com/show_bug.cgi?id=36973#c3
 */
public class DeliverServletTest extends Test {

    public static final QName E_DELIVERTEST = QName.get("delivertest", SoapTestCore.NAMESPACE);

    public static final QName E_REQUEST = QName.get("request", SoapTestCore.NAMESPACE);
	public static final QName E_RESPONSE = QName.get("response", SoapTestCore.NAMESPACE);
	public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);

	public static final String A_DELIVER_URL = "url";
	public static final String A_DELIVER_QUERY = "query";
	public static final String A_DELIVER_QUERY_NAME = "n";

	public static final String A_DELIVER_MIME = "mime";
	public static final String A_DELIVER_FILENAME = "filename";	
	public static final String A_DELIVER_MODIFY = "modify";
	public static final String A_DELIVER_MODIFY_HEADER = "header";
	public static final String A_DELIVER_MODIFY_HEADER_NAME = "n";

	public static final String A_RESPONSE_HEADER_ID = "id";
	public static final String A_RESPONSE_HEADER_MATCH = "match";
	
	protected RestURL restURL = null;
	protected String restUrlProp	= "restURL";
	protected String restServerProp	= "server.restServlet";

	/** The HTML headers and body, string format **/
	public Header httpResponseHeaders[];
	public int httpResponseCode;
	public String httpResponseBody;
	public File httpResponseFile = null;

	
	public DeliverServletTest() {}
	public DeliverServletTest(Element e, SoapTestCore core) {
		super(e, core);		
	}

	private boolean doRequestFile(Element request, File f) throws HarnessException
	{
		
		String mAuthToken = TestProperties.testProperties.getProperty("authToken", null);
		String mSessionId = TestProperties.testProperties.getProperty("sessionId", null);
		mLog.debug("mAuthToken [" + mAuthToken + "] ...");
		mLog.debug("mSessionID [" + mSessionId + "] ...");
		
		
		mLog.debug("doRequestFile final URL: "+ restURL.toString());

		
		
		//Build the cookies to connect to the rest servlet
		//
		HttpState initialState = new HttpState();
		Cookie authCookie = new Cookie(restURL.getURL().getHost(), "ZM_AUTH_TOKEN", mAuthToken, "/", null, false);
		Cookie sessionCookie = new Cookie(restURL.getURL().getHost(), "JSESSIONID", mSessionId, "/zimbra", null, false);
		initialState.addCookie(authCookie);
		initialState.addCookie(sessionCookie);

		

    	HttpClient client = new HttpClient();
		client.setState(initialState);

		// make the post
		PostMethod method = new PostMethod(restURL.toString());

        try {

        	//method.setRequestBody(new FileInputStream(f));
        	method.setRequestHeader("Content-type", "message/rfc822");
        	InputStreamRequestEntity inputStreamRequestEntity = new InputStreamRequestEntity(new FileInputStream(f));
    		method.setRequestEntity(inputStreamRequestEntity);
        	
			mLog.debug("RestServlet: "+ restURL);

        	// For logging
			mSetupDetails = restURL.toString() + "  (Uploaded Filename: " + f.getCanonicalPath() +")";
        	
        	        	
        	//FileRequestEntity request = new FileRequestEntity(f, "text/plain");
        	httpResponseCode = client.executeMethod(method);

        	// For logging
        	ByteArrayOutputStream baos = new ByteArrayOutputStream();
        	inputStreamRequestEntity.writeRequest(baos);
        	mRequestDetails = baos.toString();
        	
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
            throw new HarnessException("Attachment post failed " + request.toString(), e);
        } finally {
        	method.releaseConnection();
        }
		
		return (mTestPassed = (httpResponseCode == HttpStatus.SC_OK));

	}
	

	protected boolean doRequest(Element request) throws HarnessException, ServiceException, MessagingException, IOException
	{
		mLog.debug("executeRestPostRequest execute");
		
		File fFilename = null;
		restURL = new RestURL(setURL());

		for (Iterator it = request.elementIterator(); it.hasNext();) {
			Element e = (Element) it.next();

			if (e.getName().equals(A_DELIVER_MIME)) {
				String sFilename = e.getAttribute(A_DELIVER_FILENAME, null);
				if ( sFilename == null )
					throw new HarnessException("DeliverServletTest requires a filename");
				fFilename = new File(SoapTestCore.rootZimbraQA, sFilename);
				Element mod = e.getElement(A_DELIVER_MODIFY);
				if ( mod != null )
					fFilename = updateMime(fFilename, mod);
			} else if (e.getName().equals(A_DELIVER_URL)) {
				updateURL(restURL, e);
				mReference = restURL;
			}
		}

		if (fFilename == null)
			throw new HarnessException("DeliverServletTest must have a filename");
		
		
		if ( fFilename.isDirectory() )
		{
			
			// Open the directory, run each file
			File files[] = fFilename.listFiles();
			String sFilename = "";
	
			if (files != null && files.length > 0) {
	
				
				// First, run test files in this directory.
				for (int i = 0; i < files.length; i++) {
					File f = files[i];
					sFilename = f.getAbsolutePath();
	
					// Skip directories.
					if (f.isDirectory())
						continue;
	
					mRequestDetails = mRequestDetails + "File: " + sFilename + "\n";
						
	
					if ( ! doRequestFile(request, f) ) {
						return ( mTestPassed = false );
					}
						
				}
	
				// TODO: should the harness support recursive directories?
				return ( mTestPassed = true);
			
			} else {
				throw new HarnessException(sFilename + " no files!");
			}
	

		}
		else
		{
			
			mRequestDetails = mRequestDetails + "File: " + fFilename.getAbsolutePath() + "\n";
			return ( mTestPassed = doRequestFile(request, fFilename) );

		}
		
	}
	
	protected boolean doSelect(Element header, String[] headers) throws HarnessException
	{
		String id = header.getAttribute(A_RESPONSE_HEADER_ID, null);
		String match = header.getAttribute(A_RESPONSE_HEADER_MATCH, null);
		
		String resultMessage = "doSelect: id ("+id+") match ("+match+")";
		
		Pattern p = null;
		if ( match != null )
			p = Pattern.compile(match);
		
		boolean found = false;
		boolean matched = false;
		String value = null;

		if ( id != null )
		{
			
			// Search for the ID part
			for (int i = 0; i < headers.length; i++)
			{
				int j = headers[i].indexOf(':');
				if ( j > 0 )
				{

					String h = headers[i].substring(0, j);
					String v = headers[i].substring(j + 1).trim();
					
					if ( id != null ) {
						if ( id.equals(h) ) {
							found = true;
							value = v;
						}
					}

					if ( p != null ) {
						
						if ( value == null ) {
							continue;
						} else {
							resultMessage = resultMessage + " value("+ v + ")";
						}
						
						Matcher m = p.matcher(value);
						if ( m.matches() ) {
							matched = true;
							break; // All done - found the match
						}

					}

				}
			}
		}

		if ( p == null ) {
			check(found, resultMessage);	// no regex specified.  Just matching the header
		} else {
			check(found && matched, resultMessage);
		}
		
	
				
		return (true);
	}
	
	protected void doResponse(Element response) throws HarnessException
	{
		String[] headers = mResponseDetails.split("\n");
		for (Iterator it = response.elementIterator(); it.hasNext();) {
			Element e = (Element) it.next();

			if (e.getQName().equals(E_SELECT)) {
				doSelect(e, headers);
			}
		}

	}
	
	protected boolean executeTest() throws HarnessException {

		
		mLog.debug("DeliverServletTest execute");

			
		// Pause, if specified
		doDelay();
		


		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();
			
		try {
			
			for (Iterator it = mTest.elementIterator(); it.hasNext();) {
				Element e = (Element) it.next();

				if (e.getQName().equals(E_REQUEST)) {
					
					doRequest(e);
					
				} else if (e.getQName().equals(E_RESPONSE)) {
					
					doResponse(e);
					
				}

			}
			
		} catch (ServiceException e) {
			throw new HarnessException("DeliverServletTest threw exception", e);
		} catch (MessagingException e) {
			throw new HarnessException("DeliverServletTest threw exception", e);
		} catch (IOException e) {
			throw new HarnessException("DeliverServletTest threw exception", e);
		}
		
		// Now, wait for the queue
		if ( !testFailed() ) {
			mTeardownDetails = MailInjectTest.waitForPostfixQueue();
		}
			

		long finish = System.currentTimeMillis();
				
		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			check(false, "Execution took too long or too short");
		}
		

		
		mLog.debug("DeliverServletTest " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return (mTestPassed = (mNumCheckFail == 0));

	}

	protected File updateMime(File f, Element mod) throws MessagingException, IOException, ServiceException	{
		
		// Read in the specified MIME text file into a MimeMessage
        File ret = f;
        MimeMessage mimeMessage = null;
        FileInputStream fis = null;

        try {

            // Open the text file
            fis = new FileInputStream(f);

            // Create a mime message from the file
            Properties props = new Properties();
            Session session = Session.getInstance(props);
            mimeMessage = new MimeMessage(session, fis);

        } finally {
        	if (fis != null) {
                fis.close();
                fis = null;
            }
    	} 
		
        for (Iterator<Element> i = mod.elementIterator(A_DELIVER_MODIFY_HEADER); i.hasNext();)
        {
        	Element e = i.next();
        	String attr = e.getAttribute(A_DELIVER_MODIFY_HEADER_NAME);
        	String value = e.getText();
        	
        	mimeMessage.setHeader(attr, value);
        	
        }

		
		FileOutputStream fos = null;
		try {
			
			// Create temp file.
			ret = new File(coreController.rootDebugDir, System.currentTimeMillis() + ".txt");
			fos = new FileOutputStream(ret);
			mimeMessage.writeTo(fos);
			
		} finally {
			if ( fos != null )
				fos.close();
		}

		return (ret);

	}
	
	protected String updateURL(RestURL url, Element update) throws HarnessException {
		
		mLog.debug("in updateURL " + update);

		if ( update != null )
		{
			
			for (Iterator it = update.elementIterator(); it.hasNext();) {
				Element e = (Element) it.next();
				
				if (e.getAttribute(A_DELIVER_QUERY_NAME, null) == null)
					continue;
				String name = e.getAttribute(A_DELIVER_QUERY_NAME, null);
				String value = e.getText();
				url.addQuery(name, value);
	
			}
			
		}

		mLog.debug("exiting updateURL " + url.getURL().toString());
		return (url.getURL().toString());
		
	}
	
	
	protected URL setURL() throws HarnessException {
		
		// If restURL is set, use that
		// Secondly, use "currentClientServer", if set
		// Lastly, use server.restServlet
		// Otherwise, throw a HarnessException
		String retVal = "";
		
		String urlString = TestProperties.testProperties.getProperty(restUrlProp, null);
		String urlClientServerString = TestProperties.testProperties.getProperty("currentClientServer", null);
		String restServletString = TestProperties.testProperties.getProperty(restServerProp, null);
		
		String soapMode = TestProperties.testProperties.getProperty("deliverservice.mode", "http");
		String soapPort = TestProperties.testProperties.getProperty("deliverservice.port", "7072");

		try {

			// If restURL is set, use that
			if ( urlString != null ) {
				retVal = urlString;
				return (new URL(retVal));
			}
			
			// Secondly, use "currentClientServer", if set
			if (urlClientServerString != null) {

				// The default format is:
				// http://urlClientServerString:80/service/upload
				//
				String mode = TestProperties.testProperties.getProperty("deliverservlet.mode", soapMode);
				String port = TestProperties.testProperties.getProperty("deliverservlet.port", soapPort);
				String path = TestProperties.testProperties.getProperty("deliverservlet.path", "service/deliver");
				
				// http://usServerString:80/service/upload
				retVal = mode + "://" + urlClientServerString + ":" + port + "/" + path;
				return (new URL(retVal) );

			}
			
			// Lastly, use server.restServlet
			if ( restServletString != null ) {
				
				// The default format is:
				// http://usServerString:80/service/upload
				//
					
				String mode = TestProperties.testProperties.getProperty("deliverservlet.mode", soapMode);
				String port = TestProperties.testProperties.getProperty("deliverservlet.port", soapPort);
				String path = TestProperties.testProperties.getProperty("deliverservlet.path", "service/deliver");
				
				// http://usServerString:80/service/upload
				retVal = mode + "://" + restServletString + ":" + port + "/" + path;
				return (new URL (retVal) );

			}
								
			throw new HarnessException("need value for "+ restServerProp +" or "+ restUrlProp);

		} catch (MalformedURLException e) {
			throw new HarnessException("invalid deliverURL " + retVal, e);
		}
		
	}
	

	@Override
	protected String getTestName() {
		return ("DelverServletTest");
	}
	
	@Override
	protected boolean dumpTest() {
		return false;
	}

}
