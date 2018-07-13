package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.Writer;
import java.net.CookieHandler;
import java.net.HttpURLConnection;
import java.net.ProtocolException;
import java.net.URI;
import java.net.URL;
import java.net.URLConnection;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import org.dom4j.QName;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.DomUtil;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

/**
 * Ytest class is for integrating Zimbra test automation with Yahoo Mail cascade
 * API. This class allows to call YahooMail cascade API.
 * <p>
 * This class extends the com.zimbra.qa.staf.SoapTest. It mainly reuses the
 * result parsing ability of SoapTest. However the get and post request handling
 * is based on another class com.zimbra.qa.staf.RestServletTest
 * <p>
 * 
 * @author rajwelan
 * 
 */

public class YahooIntegrationBase extends SoapTest {
	public static String strYURL = "cascade_url";
	public static final QName E_YMAILTEST = QName.get("ymailtest",
			SoapTestCore.NAMESPACE); // rajendra
	public static final QName E_YABTEST = QName.get("yabtest",
			SoapTestCore.NAMESPACE); // rajendra
		public static final QName E_YCALTEST = QName.get("ycaltest",
			SoapTestCore.NAMESPACE); // rajendra

	public static final QName E_YURL = QName.get(strYURL,
			SoapTestCore.NAMESPACE); // rajendra
	public static final QName E_GETQRY = QName.get("cascade_query",
			SoapTestCore.NAMESPACE); // rajendra
	public static final QName E_SOAPENV = QName.get("cascade_soapenv",
			SoapTestCore.NAMESPACE);
	public static final QName E_REST_REQUEST = QName.get("restServletRequest",
			SoapTestCore.NAMESPACE);
	public static final QName E_REST_RESPONSE = QName.get(
			"restServletResponse", SoapTestCore.NAMESPACE);
	public static final QName E_CONTENT = QName.get("content",
			SoapTestCore.NAMESPACE);
	public static final QName E_SET_COOKIE = QName.get("setcookie",
			SoapTestCore.NAMESPACE);

	public static final String A_REST_METHOD = "method";
	public static final String A_REST_GET = "get";
	public static final String A_REST_POST = "post";
	public String detailsResponse;
	public String httpResponseFile;

	public static final String A_FILENAME = "file";
	public static final String A_STRING = "string";

	public static final String txtHEADERSTART = "<HEADER>";
	public static final String txtHEADEREND = "</HEADER>";
	public static final String txtCONTENTSTART = "<CONTENT>";
	public static final String txtCONTENEND = "</CONTENT>";

	public static String txtSOAPHeader;

	public static String txtSOAPReqClose;

	static ZCookieHandler manager = null;
	static List<ZCookie> cookieJar;
	static List<ZCookie> cookies;
	static String wssid = null;

	private String requestType = null;
	
	protected static final Map<String, String> methodMap = new HashMap<String, String>()
	{
		private static final long serialVersionUID = 7346488364544651762L;
	{
		put("get_auth_token", "yab.login.url");
		put("get_auth", "yab.login.url");
		put("synchronize", "yab.address.url");
		put("searchContacts", "yab.address.url");
		put("addContacts", "yab.address.url");
		put("ycal_login", " ");
	}};
	
	public YahooIntegrationBase() {
		super();
		setupCookies();
	}

	public YahooIntegrationBase(Element e, SoapTestCore core) {
		super(e, core);
		setupCookies();
	}

	protected String postData(URL url, String soapEnv) throws Exception {
		// return "";

		// more complicated than get.
		StringReader rdr = new StringReader(txtSOAPHeader + soapEnv
				+ txtSOAPReqClose);
		StringWriter wtr = new StringWriter();

		HttpURLConnection urlc = null;

		mLog.debug("data being posted to server is : " + txtSOAPHeader
				+ soapEnv + txtSOAPReqClose);
		try {
			urlc = (HttpURLConnection) url.openConnection();

			try {
				urlc.setRequestMethod("POST");
			} catch (ProtocolException e) {
				throw new Exception(
						"Shouldn't happen: HttpURLConnection doesn't support POST??",
						e);
			}
			urlc.setDoOutput(true);
			urlc.setDoInput(true);
			urlc.setUseCaches(false);
			urlc.setAllowUserInteraction(false);
			/*
			 * Commented out by Rajendra because YAB expectes content type of
			 * application/xml and not text/xml. Ymail works ok with this value.
			 * urlc.setRequestProperty("Content-type", "text/xml; charset="+
			 * "UTF-8");
			 */
			urlc.setRequestProperty("Content-type", "application/xml; charset="
					+ "UTF-8");			
			Writer writer = null;
			try {
				OutputStream out = urlc.getOutputStream();
				writer = new OutputStreamWriter(out, "UTF-8");
				pipe(rdr, writer);
				writer.close();
			} catch (IOException e) {
				mLog.warn("IOException while posting data", e);				
			} finally {					
				Utilities.close(writer, mLog);				
			}

			InputStream in;

			if (urlc.getResponseCode() < 500) {
				in = urlc.getInputStream();
			} else {
				in = urlc.getErrorStream();
			}

			try {
				Reader reader = new InputStreamReader(in);
				pipe(reader, wtr);

				mLog.debug("http post returned" + wtr.toString());
				mLog.debug(printHeaders(urlc));
				mLog.debug(printServerResponse(urlc));
				mLog.debug(printCookies());
				reader.close();

				return wtr.toString();

			} catch (IOException e) {
				mLog.debug(printHeaders(urlc));
				mLog.debug(printServerResponse(urlc));
				throw new Exception("IOException while reading response", e);
			} finally {
				Utilities.close(in, mLog);
			}

		} catch (IOException e) {
			mLog.debug(printHeaders(urlc));
			mLog.debug(printServerResponse(urlc));
			throw new Exception("Connection error (is server running at " + url
					+ " ?): " + e);
		} finally {
			if (urlc != null)
				urlc.disconnect();
		}

	}

	protected static void pipe(Reader reader, Writer writer) throws IOException {
		char[] buf = new char[1024];
		int read = 0;
		while ((read = reader.read(buf)) >= 0) {
			writer.write(buf, 0, read);
		}
		writer.flush();
	}

	protected static void setupCookies() {
		// if cookie manager is not initialized, set it up, else do nothing
		try {
			if (manager == null) {
				manager = new ZCookieHandler();
				// manager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
				CookieHandler.setDefault(manager);
			}
		} catch (Exception e) {

		}

	}

	protected String printCookies() throws Exception {
		String setCookies = new String();
		cookieJar = manager.getCookieStore();
		// cookies = cookieJar.getCookies();
		for (ZCookie cookie : cookieJar) {
			setCookies = setCookies.concat(cookie.getName() + " :"
					+ cookie.getValue() + "\n");
		}
		mLog.debug("Cookies are" + setCookies);
		return setCookies;

	}

	protected String printHeaders(URLConnection conn) throws Exception {

		String hdrString, hdrKey, hdrVal;

		int i = 1;
		hdrVal = new String();
		hdrVal = "<HEADERSET>";
		while ((hdrString = conn.getHeaderField(i)) != null) {

			hdrKey = conn.getHeaderFieldKey(i);

			hdrVal = hdrVal.concat("<" + hdrKey + ">" + hdrString + "</"
					+ hdrKey + ">" + "\n");
			i++;
		}
		hdrVal = hdrVal + "</HEADERSET>";
		mLog.debug("Headers are " + hdrVal);
		return hdrVal;

	}

	
	
	protected String cleanUpData(String dirtyData)
	{

		String[] response = dirtyData.split(">");


			
			StringBuffer outString = new StringBuffer();
	
			String lineTxt;
			int i = 0;
	
			for (i = 0; i < response.length; i++) {
				lineTxt = response[i].trim();
	
				if (!lineTxt.toUpperCase().contains("?XML")
						&& !lineTxt.toUpperCase().contains("!DOCTYPE")
						&& (lineTxt.length() > 0)
						&& !lineTxt.toUpperCase().contains("<!--")) {
					outString.append(response[i]);
					if (response.length>1){
						outString.append(">");
						}
				}
			}

			return outString.toString();

	}
	
	protected String printServerResponse(HttpURLConnection conn)
			throws Exception {
		
		String result="";

		BufferedReader rd = null;;

		// if soap request returns failure, the HTTP response has HTTP500 return
		// code. In that case need to read from error stream and not output
		// stream
		try{
			if (conn.getResponseCode() < 500) {
				rd = new BufferedReader(
						new InputStreamReader(conn.getInputStream()));
			} else {
				rd = new BufferedReader(
						new InputStreamReader(conn.getErrorStream()));
			}
	
			StringBuffer sb = new StringBuffer();
			String line;
			
			
			sb.append("<SERVERRESPONSE>");
	
			while ((line = rd.readLine()) != null) {
					sb.append("<RESPONSE>" + cleanUpData(line) + "</RESPONSE>");
				
			}
			sb.append("</SERVERRESPONSE>");
			rd.close();
			result = sb.toString();
		}catch(IOException e){
			throw new Exception("IOException while reading data", e);
		}finally{			
			Utilities.close(rd, mLog);
		}
	
		mLog.debug("Server Response is" + result);
		return result;

	}

	public String sendGetRequest(URL url) throws Exception {

		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		String strResult;

		conn.connect();

		strResult = "";
		strResult = "<GetResponse>";
		try {
			strResult = strResult + "<StatusCode>" + conn.getResponseCode()
					+ "</StatusCode>";
		} catch (Exception e) {
			strResult = strResult + "<StatusCode>" + e.toString()
					+ e.fillInStackTrace() + "</StatusCode>";
		}
		strResult = strResult + printServerResponse(conn);
		strResult = strResult + "</GetResponse>";
		mLog.debug(strResult);
		mLog.debug(this.printCookies());
		return strResult;

	}

	public boolean executeTest() throws HarnessException {

		// Pause, if specified
		doDelay();

		long start = System.currentTimeMillis();

		for (Iterator<Element> it = mTest.elementIterator(); it.hasNext();) {
			Element e = it.next();

			if (e.getQName().equals(E_REST_REQUEST)) {

				mTestPassed = executeRestRequest(e);

			} else if (e.getQName().equals(E_REST_RESPONSE)) {

				mTestPassed = executeRestResponse(e);

//			} else if (e.getQName().equals(E_SET_COOKIE)) {
//				executeSetCokie(e);
//
			}

		}

		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if (!checkExecutionTimeframe()) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false; // Execution took too long!
		}

		mLog.debug("RestServlet Test " + (testFailed() ? "failed" : "passed")
				+ " in " + mTime + " msec");
		return (!testFailed());

		// return true;
	}

	private void executeSetCokie(URI uri) throws HarnessException /*
											 * throws SoapFaultException,
											 * IOException, HarnessException
											 */{
		try {
			
			// Get elements from path or use the context
			String cookieval = TestProperties.testProperties.getProperty("cookie.value", null);
			String cookieExpiry = TestProperties.testProperties.getProperty("timeout.value", null);
			
			if ( cookieval == null || cookieExpiry == null )
				return; // No cookie data is available
			
			Long lTime;

			Date expiry = new Date();

			lTime = expiry.getTime();
			lTime = lTime + (Integer.parseInt(cookieExpiry) * 10000);

			expiry.setTime(lTime);

			SimpleDateFormat formater = new SimpleDateFormat(
					"E, dd-MMM-yyyy kk:mm:ss 'GMT'", Locale.US);

			String formattxt = formater.format(expiry);

			ZCookie cookie = new ZCookie(uri, cookieval + "; expires=" + formattxt + ";");
			manager.put(cookie);

		} catch (Exception excp) {
			excp.printStackTrace();
			throw new HarnessException("Unable to set Cookie", excp);
		}

	}

	protected boolean executeRestRequest(Element element)
			throws HarnessException {

		mLog.debug("executeRestRequest execute");
		
		// Send "Get" to executeRestGetRequest
		// Send "Post" to executeRestPostRequest
		String type = element.getAttribute(A_REST_METHOD, A_REST_GET);
		if (type.equalsIgnoreCase(A_REST_GET)) {
			return (executeRestGetRequest(element));
		} else if (type.equalsIgnoreCase(A_REST_POST)) {
			return (executeRestPostRequest(element));
		}

		throw new HarnessException("Rest Request: invalid type: " + type);

	}

	protected boolean executeRestGetRequest(Element element)
			throws HarnessException {

		String qryString;
		String urlString;
		URL finalURL;

		mLog.debug("executeRestGetRequest execute");

		try {

			urlString = parseUrlElement(element);
			qryString = parseQueryElement(element);

			finalURL = new URL(urlString + "?" + qryString);
			
			mLog.debug("rest servlet base URL: " + finalURL);

			mLog.debug("In http get the request URL is " + finalURL);
			
			// coreController.mResultLogger.info(finalURL);
			mReference = finalURL;

			executeSetCokie(new URI(urlString));

			detailsResponse = sendGetRequest(finalURL);

			mLog.debug("Response from Server is\n" + detailsResponse);
			
			// coreController.mResultLogger.info(detailsResponse);
			mRequestDetails = "";
			
			mResponseDetails = DomUtil.toString(Element.parseXML(detailsResponse).toXML(),true);

			return (mTestPassed = (detailsResponse != null));
			// return true;

		} catch (Exception e) {
			e.printStackTrace();
			throw new HarnessException("no query string", e);

		}

		// return true;
	}

	protected boolean executeRestPostRequest(Element element)
			throws HarnessException {

		String soapEnv;
		String qryString;
		String urlString;
		URL finalURL;

		try {
			mLog.debug("executeRestPostRequest execute");

			urlString = parseUrlElement(element);
			qryString = parseQueryElement(element);
			
			finalURL = new URL(urlString + "?" + qryString);
	
			
			executeSetCokie(new URI(urlString));

			mLog.debug("rest servlet base URL: " + finalURL);

			// Get the inner xml from E_SOAPENV
			Element soapElement = element.getElement(E_SOAPENV);
			Iterator<Element> i = soapElement.elementIterator();
			
			// Convert to String
			soapEnv = DomUtil.toString(i.next().toXML(),true);

			mLog.debug("In post method; URL is " + finalURL);
			mLog.debug("In post method; soap req is " + soapEnv);
			
			
			// coreController.mResultLogger.info(finalURL);
			// coreController.mResultLogger.info(soapEnv);
			mReference = finalURL;
			mRequestDetails = soapEnv;
			

			detailsResponse = null;

			//detailsResponse = postData(finalURL, soapEnv);
			detailsResponse = cleanUpData(postData(finalURL, soapEnv));
/*
			String[] response = detailsResponse.split(">");

			StringBuffer outString = new StringBuffer();

			String lineTxt;
			int i = 0;

			for (i = 0; i < response.length; i++) {
				lineTxt = response[i].trim();

				if (!lineTxt.toUpperCase().contains("?XML")
						&& !lineTxt.toUpperCase().contains("!DOCTYPE")
						&& (lineTxt.length() > 0)
						&& !lineTxt.toUpperCase().contains("<!--")) {
					outString.append(response[i] + ">");

				}
			}

			detailsResponse = outString.toString();
*/
			mLog.debug("Response from server is\n" + detailsResponse);
			
			// coreController.mResultLogger.info(detailsResponse);
			mResponseDetails = DomUtil.toString(Element.parseXML(detailsResponse).toXML(),true);

		} catch (Exception e) {
			throw new HarnessException("no query string", e);
		}
		return (mTestPassed = (detailsResponse != null));

	}

	private String parseUrlElement(Element request) throws HarnessException {
		
		// Parse the <a/> elements:
		//		<t:cascade_query method="get_auth_token">
		//			<a n="appid">${yab_appid}</a>
		//			<a n="login">${yab_userName}</a>
		//			<a n="passwd">${yab_password}</a>				
		//		</t:cascade_query>
		//

		String urlString = null;
		
		requestType = request.getAttribute("type", null);
		if ( requestType == null )
			throw new HarnessException("cascade_query requires a method");
		
		
		Element urlElement = request.getOptionalElement(E_YURL);
		if ( (urlElement == null) || (urlElement.getTextTrim().equals("")) )
		{
			// Use the global.properties value
			String key = methodMap.get(requestType);
			urlString = TestProperties.testProperties.getProperty(key, null);
			if ( urlString == null )
				urlString=TestProperties.testProperties.getProperty(strYURL, null);
				if (urlString==null){
					throw new HarnessException("need property value for "+ key);
				}
				else{
					return (urlString + "/" + requestType);
					// edit by Rajendra on 6/5/09; Earlier only the URL string was being returned. This is wrong. 
					// the request type has to be appended to the urlString as well.
					//return urlString;
					
				}
		}
		else
		{
			urlString = urlElement.getTextTrim();
		}
		
		return (urlString + "/" + requestType);
		
	}

	private String parseQueryElement(Element restServletRequest) throws HarnessException, ServiceException {
		
		// Parse the <a/> elements:
		//		<t:restServletRequest method="GET" type="get_auth_token"> 
		//			<t:cascade_query method="get_auth_token">
		//				<a n="appid">${yab_appid}</a>
		//				<a n="login">${yab_userName}</a>
		//				<a n="passwd">${yab_password}</a>				
		//			</t:cascade_query>
		//		</t:restServletRequest> 
		//
		
		StringBuilder sb = null;

		
		// First priority, if "type" attribute is specified, build default
		String type = restServletRequest.getAttribute("type", null);
		if ( type != null )
		{

			if ( type.equalsIgnoreCase("get_auth_token") )
			{
				sb = new StringBuilder();
				sb.append("appid=").append(TestProperties.testProperties.getProperty("yab_appid"));
				String yab_userName = TestProperties.testProperties.getProperty("yab_userName");
				if ( yab_userName.indexOf('@') > 0)
				{
					// We only want the user part of user@domain.com
					yab_userName = yab_userName.substring(0, yab_userName.indexOf('@'));
				}
				sb.append("&login=").append(yab_userName);
				sb.append("&passwd=").append(TestProperties.testProperties.getProperty("yab_password"));
			}
			
			if ( type.equalsIgnoreCase("get_auth") )
			{
				sb = new StringBuilder();
				sb.append("appid=").append(TestProperties.testProperties.getProperty("yab_appid"));
				sb.append("&token=").append(TestProperties.testProperties.getProperty("authToken.value"));
			}

			if ( type.equalsIgnoreCase("synchronize") )
			{
				sb = new StringBuilder();
				sb.append("format=xml");
				sb.append("&appid=").append(TestProperties.testProperties.getProperty("yab_appid"));
				sb.append("&WSSID=").append(TestProperties.testProperties.getProperty("wssid.value"));
			}

			if ( type.equalsIgnoreCase("searchContacts") )
			{
				sb = new StringBuilder();
				sb.append("format=xml");
				sb.append("&appid=").append(TestProperties.testProperties.getProperty("yab_appid"));
				sb.append("&WSSID=").append(TestProperties.testProperties.getProperty("wssid.value"));
			}

			if ( type.equalsIgnoreCase("addContacts") )
			{
				sb = new StringBuilder();
				sb.append("format=xml");
				sb.append("&appid=").append(TestProperties.testProperties.getProperty("yab_appid"));
				sb.append("&WSSID=").append(TestProperties.testProperties.getProperty("wssid.value"));
			}


		}

		Element cascadeQuery = restServletRequest.getOptionalElement(E_GETQRY);
		if ( cascadeQuery != null )
		{
			for (Iterator<Element> i = cascadeQuery.elementIterator(); i.hasNext();)
			{
				Element a = i.next();
				try {
					String name = a.getAttribute("n");
					String value = a.getText();
					if ( sb == null )
					{
						sb = new StringBuilder();
						sb.append(name).append('=').append(value);
					}
					else
					{
						sb.append('&').append(name).append('=').append(value);
					}
				} catch (ServiceException ex) {
					throw new HarnessException("invalid element "+ a.prettyPrint(), ex);
				}
	
			}
		}

		return ( sb == null ? "" : sb.toString());
	}

	protected boolean executeRestResponse(Element element)
			throws HarnessException {

		mLog.debug("executeTestResponse execute");

		mLog.debug(detailsResponse);

		try {

			Element res = Element.parseXML(detailsResponse);

			for (Iterator<Element> it = element.elementIterator(); it.hasNext();) {
				Element e = it.next();
				if (e.getQName().equals(E_SELECT)) {

					doSelect(res, e);

//				} else if (e.getQName().equals(E_CONTENT)) {

					// doContent(res,e);

					// } else {

					// checkGlobals(e);

				} else {
					throw new HarnessException("Unknown element type: "+ e.prettyPrint());
				}
			}

			return (mTestPassed = (mNumCheckFail == 0));
			// return true;
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}

	}

	protected void doContent(Element select, Element e) throws HarnessException {

		mLog.debug("In doContent ...");

		String goldenFilename = select.getAttribute(A_FILENAME, null);
		String goldenRegex = select.getAttribute(A_MATCH, null);

		if ((goldenFilename == null) && (goldenRegex == null)) {
			throw new HarnessException(
					"doContent needs something to compare to");
		}

		if (goldenFilename != null) {

			httpResponseFile = detailsResponse;
			if (httpResponseFile == null) {
				check(false,
						"Http response did not include content to compare to");
				return;
			}

			FileInputStream fisTest = null;
			FileInputStream fisGolden = null;
			
			try {
				fisTest = new FileInputStream(httpResponseFile);
				// fisGolden = new FileInputStream(goldenFilename);
				fisGolden = new FileInputStream(new File(
						SoapTestCore.rootZimbraQA, goldenFilename));

				int a = 0, b = 0, index = 0;
				while (true) {
					a = fisTest.read();
					while ((a == 10) || (a == 13)) {
						a = fisTest.read();
					}
					;
					b = fisGolden.read();
					while ((b == 10) || (b == 13)) {
						b = fisGolden.read();
					}

					mLog.debug("doContent a[" + a + "] b[" + b + "]");

					if ((a == -1) && (b == -1)) {
						// Made it through the entire streams
						check(true, "both streams matched");
						break;
					}

					if (a != b) {

						// This includes the instand when a = -1 and b does
						// not (and vise versa)
						check(false, goldenFilename
								+ " did not match the response stream "
								+ httpResponseFile + " at index " + index
								+ " expected " + b + " found " + a);
						return; // End here at the first non-match

					}

					index++;
				}

			} catch (IOException ex) {
				// Catch the file exceptions here
				throw new HarnessException("IO Error with file", ex);
			}finally {				
				Utilities.close(fisTest, mLog);				
				Utilities.close(fisGolden, mLog);				
			}			

		}

		if (goldenRegex != null) {

			String httpResponseBody = detailsResponse;
			if (httpResponseBody != null) {
				// Since content is very likely to be multilined, add DOTALL to
				// make "." match newlines
				if (Pattern.compile(goldenRegex, Pattern.DOTALL).matcher(
						httpResponseBody).matches()) {
					check(true, "HTTP response body matched");
				} else {
					check(false, "(" + goldenRegex + ") did not match ("
							+ httpResponseBody + ")");
				}
			}

		}

	}

	protected String getTestName() {
		return (requestType != null ? requestType : "cascade");
	}

}
