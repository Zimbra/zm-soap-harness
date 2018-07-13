package com.zimbra.qa.soap;



//Zimbra Account Example:
//
//POST /zimbra/desktop/accsetup.jsp?at=36b501d3-96c3-493b-8c35-7f48caf24980 HTTP/1.1
//Accept: image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, application/x-shockwave-flash, application/vnd.ms-excel, application/vnd.ms-powerpoint, application/msword, application/xaml+xml, application/vnd.ms-xpsdocument, application/x-ms-xbap, application/x-ms-application, */*
//Referer: http://localhost:7633/zimbra/desktop/accsetup.jsp?at=36b501d3-96c3-493b-8c35-7f48caf24980
//Accept-Language: en-us,ja;q=0.5
//Content-Type: application/x-www-form-urlencoded
//Accept-Encoding: gzip, deflate
//User-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30; .NET CLR 3.0.04506.648; MS-RTC LM 8; .NET CLR 3.5.21022; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729)
//Host: localhost:7633
//Content-Length: 163
//Connection: Keep-Alive
//Pragma: no-cache
//Cookie: JSESSIONID=6g8y8eossk0g
//
//accountId=&accountFlavor=Zimbra&verb=add&accountName=yahooes1&email=yahooes1@qa60.lab.zimbra.com&password=test123&host=qa60.lab.zimbra.com&port=80&syncFreqSecs=900
//



// YMail account example
//
//POST /zimbra/desktop/accsetup.jsp?at=36b501d3-96c3-493b-8c35-7f48caf24980 HTTP/1.1
//Accept: image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, application/x-shockwave-flash, application/vnd.ms-excel, application/vnd.ms-powerpoint, application/msword, application/xaml+xml, application/vnd.ms-xpsdocument, application/x-ms-xbap, application/x-ms-application, */*
//Referer: http://localhost:7633/zimbra/desktop/accsetup.jsp?at=36b501d3-96c3-493b-8c35-7f48caf24980
//Accept-Language: en-us,ja;q=0.5
//Content-Type: application/x-www-form-urlencoded
//Accept-Encoding: gzip, deflate
//User-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30; .NET CLR 3.0.04506.648; MS-RTC LM 8; .NET CLR 3.5.21022; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729)
//Host: localhost:7633
//Content-Length: 240
//Connection: Keep-Alive
//Pragma: no-cache
//Cookie: JSESSIONID=g4hizwbtfxbj
//
//accountId=&accountFlavor=YMP&domain=yahoo.com&verb=add&accountName=MattYMail&fromDisplay=First+Last&email=email@yahoo.com&password=test123&syncFreqSecs=900&syncAllServerFolders=true&calendarSyncEnabled=on&contactSyncEnabled=on
//


// Gmail account example
// accountId=&accountFlavor=Gmail&domain=gmail.com&verb=add&accountName=_AccountName&fromDisplay=_FullName&email=zimbrazdctest@gmail.com&password=test1234&syncFreqSecs=900
//


import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Iterator;

import org.apache.commons.httpclient.Header;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.commons.httpclient.methods.RequestEntity;
import org.apache.commons.httpclient.methods.StringRequestEntity;
import org.apache.log4j.Logger;
import org.dom4j.QName;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class zDesktopAcctTest extends Test {

	static Logger mLog = Logger.getLogger(zDesktopAcctTest.class.getName());


	// XML definitions
    public static final QName E_ZDESKTOPACCT = QName.get("zdesktopacct", SoapTestCore.NAMESPACE);

    public static final QName E_REQUEST = QName.get("request", SoapTestCore.NAMESPACE);
	public static final QName E_RESPONSE = QName.get("response", SoapTestCore.NAMESPACE);

	public static final String A_VERB = "verb";	// add, del, etc.



	// Static definitions
	public static final String S_VERB_ADD = "add";
	public static final String S_VERB_DEL = "del";
	public static final String S_FLAVOR_ZIMBRA = "Zimbra";
	public static final String S_FLAVOR_YMP = "YMP";
	public static final String S_FLAVOR_GMAIL = "Gmail";



	// REST servlet URL, ex:  https://dogfood.liquidsys.com/zimbra/user/roland/inbox.rss
	// static protected URL restURL = null;
	protected URL mAccountURL = null;

	protected PostMethod mPostMethod = null;




	public zDesktopAcctTest() {
	}

	public zDesktopAcctTest(Element e, SoapTestCore core) {

		super(e, core);

	}

	public boolean executeTest() throws HarnessException {

		mLog.debug("executeTest execute");

		// Pause, if specified
		doDelay();


		// Determine the URL to post to
		setURI();


		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();

		for (Iterator<Element> it = mTest.elementIterator(); it.hasNext();) {
			Element e = it.next();

			if (e.getQName().equals(E_REQUEST)) {

				doRequest(e);

			} else if (e.getQName().equals(E_RESPONSE)) {

				doResponse(e);

			}

		}


		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false;  // Execution took too long!
		}



		mLog.debug("zDesktopAcctTest " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return (!testFailed());

	}


	private boolean doRequest(Element element) throws HarnessException {

		mLog.debug("doRequest execute");

		// Send "Get" to executeRestGetRequest
		// Send "Post" to executeRestPostRequest
		// Default: "Get"
		String type = element.getAttribute(A_VERB, "UNSET");

		if ( type.equalsIgnoreCase(S_VERB_ADD) ) {
			return (doAdd(element));
		}

		throw new HarnessException("Verb = " + type + " is not supported yet");

	}

	private boolean doResponse(Element element) throws HarnessException {

		mLog.debug("doResponse execute");

		throw new HarnessException(S_VERB_ADD + " is not supported yet");

	}


	protected boolean doAdd(Element element) throws HarnessException {


		// Build the payload
		StringBuilder sb = new StringBuilder("accountId=&verb=add");

		Element e = null;
		try {

			for (Iterator<Element> it = element.elementIterator(); it.hasNext();) {

				e = it.next();

				String name = e.getAttribute("name");
				String value = e.getText();

				validateAttribute(name, value);

				// Use "&" on all other elements
				sb.append("&"+ name + "=" + value);

			}

		} catch (ServiceException ex) {
			throw new HarnessException("Element must contain name attribute " + (e==null?"":e.prettyPrint()), ex);
		}





		//Build the cookies to connect to the rest servlet
		//
		HttpState initialState = new HttpState();


		// Create an HttpClient
    	HttpClient client = new HttpClient();
		client.setState(initialState);

		// make the post
		PostMethod method = new PostMethod(mAccountURL.toString());

		int httpResponseCode = HttpStatus.SC_OK;

		try {

			StringRequestEntity entity = new StringRequestEntity(sb.toString(), "application/x-www-form-urlencoded", null);
			method.setRequestEntity(entity);

        	httpResponseCode = client.executeMethod(method);

            if (httpResponseCode != HttpStatus.SC_OK)
				mLog.warn("Method failed: " + method.getStatusLine());

            // For logging
        	detailsHttpRequestHeaders = method.getRequestHeaders();
        	detailsHttpRequestEntity = method.getRequestEntity();
        	detailsHttpResponse = method.getStatusLine().toString();
        	detailsHttpResponseBody = method.getResponseBodyAsString();
        	detailsHttpResponseHeaders = method.getResponseHeaders();


        } catch (IOException ioException) {
            throw new HarnessException("Account post failed " + element.toString(), ioException);
        } finally {
        	method.releaseConnection();
        }

		return (mTestPassed = (httpResponseCode == HttpStatus.SC_OK));

	}

	protected boolean doDel(Element element) throws HarnessException {


		// Example:
		// accountId=86572223-e0e0-4099-8213-cf0448bc5308&accountName=MyAccountName&accountType=imap&accountFlavor=YMP&verb=del
		//
		throw new HarnessException("doDel is not supported yet");


	}


	private static String validAttributes =
		"verb accountId accountFlavor " +
		"accountName email password host port " +
		"fromDisplay syncAllServerFolders calendarSyncEnabled contactSyncEnabled " +
		"syncFreqSecs debugTraceEnabled domain";

	protected boolean validateAttribute(String name, String value) throws HarnessException
	{
		if ( name.equals("debugTraceEnabled") )
			if ( !(value.equals("on") || value.equals("off")) )
				throw new HarnessException("Attribute "+ name +" must be either \"on\" or \"off\"");

		if (!validAttributes.contains(name))
			throw new HarnessException("Attribute name (" + name + ") must be one of " + validAttributes);

		return (true);

	}




	protected boolean setURI() throws HarnessException {

		String uriString = null;

		// If zdesktopuser.server is defined, use that value instead
		String server = TestProperties.testProperties.getProperty("zdesktopuser.server", null);
		if ( server != null )
		{
			String httpMode = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.mode", "http");
			String httpPort = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.port", "7633");
			String httpPath = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.path", "service/soap/");

			uriString = httpMode + "://" + server + ":" + httpPort + "/" + httpPath;

		}
		else
		{
			uriString = TestProperties.testProperties.getProperty("zdesktopuser.uri","http://localhost:7633/service/soap/");
		}

		if ( uriString.equals("") )
			throw new HarnessException("hostname must be set (zdesktopuser.server)");

		try {

			URL soapURL = new URL(uriString);

			String host = soapURL.getHost();
			int port = soapURL.getPort();
			String protocol = soapURL.getProtocol();
			String password = TestProperties.testProperties.getProperty("zdesktopuser.password");
			String file = "/zimbra/desktop/accsetup.jsp?at=" + password;

			mAccountURL = new URL(protocol, host, port, file );

			mLog.debug("zDesktopAcctTest using: " + mAccountURL.toString());

		} catch (MalformedURLException e) {
			throw new HarnessException("zdesktopuser.server was malformed " + uriString, e);
		}


		return (true);

	}

	protected RequestEntity detailsHttpRequestEntity = null;
	protected Header[] detailsHttpRequestHeaders = null;
	protected String detailsHttpResponse = "detailsHttpResponse";
	protected String detailsHttpResponseBody = "detailsHttpResponseBody";
	protected Header[] detailsHttpResponseHeaders = null;

	protected String getDetails() {

		StringBuffer details = new StringBuffer();

		// Header
		details.append(lpadz(mTestNum + "", 4) + " - " + mTimeStamp.toString() + " - " + mAccountURL + "\n");

		// POST
		details.append("----\n");
		details.append("POST\n");
		if ( detailsHttpRequestHeaders != null )
			for (int i = 0; i < detailsHttpRequestHeaders.length; i++)
				details.append(detailsHttpRequestHeaders[i]);
		if ( detailsHttpRequestEntity != null )
		{
			try {
				ByteArrayOutputStream stream = new ByteArrayOutputStream();
				detailsHttpRequestEntity.writeRequest(stream);
				details.append("\n\n" + stream.toString() + "\n\n");
			} catch (IOException e) {
				details.append("unable to convert request to ByteArrayOutputStream");
			}
		}

		// Response
		details.append("----\n");
		//details.append(detailsHttpResponseBody);
		details.append(detailsHttpResponse + "\n");
		if ( detailsHttpResponseHeaders != null )
			for (int i = 0; i < detailsHttpResponseHeaders.length; i++)
				details.append(detailsHttpResponseHeaders[i]);

		details.append("----\n");

		return details.toString();

	}


	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected String getTestName() {
		return ("zDesktopAcctTest");
}


//Delete:
//
//POST /zimbra/desktop/accsetup.jsp?at=b1fdfddb-c48d-4334-b001-8e8111aff8d2 HTTP/1.1
//Accept: image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, application/x-shockwave-flash, application/vnd.ms-excel, application/vnd.ms-powerpoint, application/msword, application/xaml+xml, application/vnd.ms-xpsdocument, application/x-ms-xbap, application/x-ms-application, */*
//Referer: http://localhost:7633/zimbra/?at=b1fdfddb-c48d-4334-b001-8e8111aff8d2&loginOp=logout
//Accept-Language: en-us,ja;q=0.5
//Content-Type: application/x-www-form-urlencoded
//Accept-Encoding: gzip, deflate
//User-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 3.0.04506.30; .NET CLR 3.0.04506.648; MS-RTC LM 8; .NET CLR 2.0.50727; .NET CLR 3.5.21022)
//Host: localhost:7633
//Content-Length: 126
//Connection: Keep-Alive
//Pragma: no-cache
//Cookie: JSESSIONID=glvbkv6nbnrz
//
//accountId=0c129b4f-bdf5-4f2a-a9c3-53ca6bbcae69&accountName=zimbrazdctest@yahoo.com&accountType=imap&accountFlavor=YMP&verb=del


// Add Yahoo:
//
//POST /zimbra/desktop/accsetup.jsp?at=b1fdfddb-c48d-4334-b001-8e8111aff8d2 HTTP/1.1
//Accept: image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, application/x-shockwave-flash, application/vnd.ms-excel, application/vnd.ms-powerpoint, application/msword, application/xaml+xml, application/vnd.ms-xpsdocument, application/x-ms-xbap, application/x-ms-application, */*
//Referer: http://localhost:7633/zimbra/desktop/accsetup.jsp?at=b1fdfddb-c48d-4334-b001-8e8111aff8d2
//Accept-Language: en-us,ja;q=0.5
//Content-Type: application/x-www-form-urlencoded
//Accept-Encoding: gzip, deflate
//User-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 3.0.04506.30; .NET CLR 3.0.04506.648; MS-RTC LM 8; .NET CLR 2.0.50727; .NET CLR 3.5.21022)
//Host: localhost:7633
//Content-Length: 212
//Connection: Keep-Alive
//Pragma: no-cache
//Cookie: JSESSIONID=glvbkv6nbnrz
//
//accountId=&accountFlavor=YMP&domain=yahoo.com&verb=add&accountName=AccountName&fromDisplay=YourFullName&email=zimbrazdctest@yahoo.com&password=test123&syncFreqSecs=900&calendarSyncEnabled=on&contactSyncEnabled=on
//


}
