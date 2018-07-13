package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.net.CookieHandler;
/* Commented out because these are JDK 1.6 specific and we are on JDK 1.5 
import java.net.CookieManager;

import java.net.CookiePolicy;
import java.net.CookieStore;
import java.net.HttpCookie;
import java.net.ProtocolException;
*/
import java.util.Iterator;
import java.util.List;



import org.dom4j.QName;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.net.HttpURLConnection;
import java.net.ProtocolException;
import java.net.URL;
import java.net.URLConnection;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;
import com.zimbra.common.soap.Element;


/**
 * Ytest class is for integrating Zimbra test automation with Yahoo Mail cascade API.
 * This class allows to call YahooMail cascade API. 
 * <p>
 * This class extends the com.zimbra.qa.staf.SoapTest. It mainly reuses the result parsing 
 * ability of SoapTest. However the get and post request handling is based on another class
 * com.zimbra.qa.staf.RestServletTest
 * <p>
 * @author rajwelan
 *
 */

public class YABTest extends YahooIntegrationBase {

	public YABTest() {
		super();
		txtSOAPHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"+
		"<!DOCTYPE add-request SYSTEM \"http://l.yimg.com/us.yimg.com/lib/pim/r/abook/xml/2/pheasant.dtd\">";
	/*	
		<add-request>

			"<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:urn=\"urn:yahoo:ymws\">"
			+ "<soapenv:Header>" 
			+ "</soapenv:Header>" + 
			"<soapenv:Body>";
*/
		txtSOAPReqClose=" ";
		//txtSOAPReqClose="<!-- --> ";
		//= "</soapenv:Body></soapenv:Envelope>";

		setupCookies();
	}

	public YABTest(Element e, SoapTestCore core) {	
		super(e, core);
		txtSOAPHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"+
		"<!DOCTYPE add-request SYSTEM \"http://l.yimg.com/us.yimg.com/lib/pim/r/abook/xml/2/pheasant.dtd\">";
	/*	
		<add-request>

			"<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:urn=\"urn:yahoo:ymws\">"
			+ "<soapenv:Header>" 
			+ "</soapenv:Header>" + 
			"<soapenv:Body>";
*/
		txtSOAPReqClose=" ";
		setupCookies();
	}

	/*public String postData(URL url, String soapEnv) throws Exception {
//		return "";
		
		// more complicated than get.
		StringReader rdr = new StringReader(txtSOAPHeader + soapEnv	+ txtSOAPReqClose);
		StringWriter wtr = new StringWriter();

		HttpURLConnection urlc = null;

		try {
			urlc = (HttpURLConnection) url.openConnection();

			// there is a strange reason why cookies are set specifically. While
			// debugging with Fiddler,
			// the cookies in the cookie manager were sent without any code. BUT
			// when I connected directly
			// the cookies were not sent automatically. So specifically setting
			// it

			//String cookieString = new String();

			//cookieJar = manager.getCookieStore();
			//cookies = cookieJar.getCookies();
			
			 * Commented out this section because with the new JDK 1.5 based implementation, 
			 * the cookies were being sent automatically like they should...
			
			for (ZCookie cookie : cookieJar) {
				cookieString = cookieString + cookie + "; ";
				mLog.debug("Cookie to be added is "+cookie);
				mLog.debug("CookieString is "+cookieString);
			}
			mLog.debug("Coockie to be set is : " + cookieString);

			urlc.setRequestProperty("cookie", cookieString);
			
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
			urlc.setRequestProperty("Content-type", "text/xml; charset="+ "UTF-8");
			OutputStream out = urlc.getOutputStream();
			try {
				Writer writer = new OutputStreamWriter(out, "UTF-8");
				pipe(rdr, writer);
				writer.close();
			} catch (IOException e) {
				throw new Exception("IOException while posting data", e);
			} finally {
				if (out != null)
					out.close();
			}


			InputStream in;

			// ideally could have used printserverresponse here
			// TBD : use it
			// TBD : The exception handling part needs to be cleaned up
			if (urlc.getResponseCode() < 500) {
				in = urlc.getInputStream();
			} else {
				in = urlc.getErrorStream();
			}

			try {
				Reader reader = new InputStreamReader(in);
				pipe(reader, wtr);
				reader.close();
				mLog.debug(printHeaders(urlc));
				mLog.debug(printServerResponse(urlc));
				mLog.debug(printCookies());
				mLog.debug("http post returned" + wtr.toString());
				return wtr.toString();

			} catch (IOException e) {
				mLog.debug(printHeaders(urlc));
				mLog.debug(printServerResponse(urlc));
				throw new Exception("IOException while reading response", e);
			} finally {
				if (in != null)
					in.close();
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

	private static void pipe(Reader reader, Writer writer) throws IOException {
		char[] buf = new char[1024];
		int read = 0;
		while ((read = reader.read(buf)) >= 0) {
			writer.write(buf, 0, read);
		}
		writer.flush();
	}

	private static void setupCookies() {
		// if cookie manager is not initialized, set it up, else do nothing
		try {
			if (manager == null) {
				manager = new ZCookieHandler();
				//manager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
				CookieHandler.setDefault(manager);
			}
		} catch (Exception e) {

		}

	}

	private String printCookies() throws Exception {
		String setCookies = new String();
		cookieJar = manager.getCookieStore();
		//cookies = cookieJar.getCookies();
		for (ZCookie cookie : cookieJar) {
			setCookies = setCookies.concat(cookie.getName() + " :"
					+ cookie.getValue() + "\n");
		}
		return setCookies;

	}

	private String printHeaders(URLConnection conn) throws Exception {

		String hdrString, hdrKey, hdrVal;

		int i = 1;
		hdrVal = new String();
		while ((hdrString = conn.getHeaderField(i)) != null) {

			hdrKey = conn.getHeaderFieldKey(i);

			hdrVal = hdrVal.concat(txtHEADER + hdrKey + " = " + hdrString
					+ " \n");
			i++;
		}
		return hdrVal;

//		return "";
		}

	private String printServerResponse(HttpURLConnection conn) throws Exception {
		String result;

		BufferedReader rd;

		// if soap request returns failure, the HTTP response has HTTP500 return
		// code. In that case need to read from error stream and not output
		// stream
		if (conn.getResponseCode() < 500) {
			rd = new BufferedReader(
					new InputStreamReader(conn.getInputStream()));
		} else {
			rd = new BufferedReader(
					new InputStreamReader(conn.getErrorStream()));
		}

		StringBuffer sb = new StringBuffer();
		String line;
		while ((line = rd.readLine()) != null) {
			sb.append(line);
		}
		rd.close();
		result = sb.toString();
		mLog.debug(result);
		return result;

}

	public String sendGetRequest(URL url) throws Exception {

		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		String strResult;

		conn.connect();

		strResult = "";

		strResult = "<StatusCode>" + conn.getResponseCode() + "</StatusCode>";
		strResult = strResult + printServerResponse(conn);
		mLog.debug(strResult);
		return strResult;

	}

	public boolean executeTest() throws HarnessException {

		// Pause, if specified
		doDelay();

		// Make sure we have a rest servlet URL
		// restURL = new RestURL(setURL());

		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();

		for (Iterator<Element> it = mTest.elementIterator(); it.hasNext();) {
			Element e = it.next();

			if (e.getQName().equals(E_REST_REQUEST)) {

				mTestPassed=executeRestRequest(e);

			} else if (e.getQName().equals(E_REST_RESPONSE)) {

				mTestPassed=executeRestResponse(e);

			}

		}

		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if (!checkExecutionTimeframe()) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false; // Execution took too long!
		}

		mLog.debug("RestServlet Test " + (testFailed() ? "failed" : "passed")+ " in " + mTime + " msec");
		return (!testFailed());

//		return true;
	}

	private boolean executeRestRequest(Element element) throws HarnessException {

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

	private boolean executeRestGetRequest(Element element)
			throws HarnessException {

		Element qryElement, urlElement;
		URL finalURL;
		String finalURLString=null;
		
		mLog.debug("executeRestGetRequest execute");

		try {

			qryElement = element.getElement(E_GETQRY);
			
			try{
				urlElement = element.getElement(E_YURL);
			}
			catch (Exception e){
				urlElement=null;
			}
			if ((urlElement == null) || (urlElement.getTextTrim() == "")) {
				finalURLString=coreController.testProperties.getProperty(strYURL,null);
				if (finalURLString==null){
					throw new HarnessException("need value for restURL");
				}
				else
				{
					finalURL=new URL(finalURLString+ "?"+ qryElement.getTextTrim());
				}
			}
			else
			{
				finalURL = new URL(urlElement.getTextTrim()+ "?"+ qryElement.getTextTrim());
			}

			mLog.debug("rest servlet base URL: " + finalURL);
			
			
			
			


			mLog.debug("In http get the request URL is " + finalURL);
			coreController.mResultLogger.info(finalURL);
			
			detailsResponse = sendGetRequest(finalURL);

			mLog.debug("Response from Server is\n" + detailsResponse);
			coreController.mResultLogger.info(detailsResponse);
			
			return (mTestPassed = (detailsResponse != null));
			//return true;

		} catch (Exception e) {
			throw new HarnessException("no query string");

		}


//	return true;	
	}

	private boolean executeRestPostRequest(Element element)
			throws HarnessException {

		Element qryElement, urlElement;
		URL finalURL;
		String soapEnv;
		String finalURLString;

		try {
			mLog.debug("executeRestPostRequest execute");

			
			try{
				urlElement = element.getElement(E_YURL);
			}
			catch (Exception e){
				urlElement=null;
			}
			if ((urlElement == null) || (urlElement.getTextTrim() == "")) {
				finalURLString=coreController.testProperties.getProperty(strYURL,null);
				if (finalURLString==null){
					throw new HarnessException("need value for restURL");
				}
				else
				{
					finalURL=new URL(finalURLString);
				}
			}
			else
			{
				finalURL = new URL(urlElement.getTextTrim());
			}

			mLog.debug("rest servlet base URL: " + finalURL);
			qryElement = element.getElement(E_SOAPENV);

			soapEnv = "";

			for (Element elem : qryElement.listElements("")) {
				soapEnv = soapEnv + elem.prettyPrint();

			}

			mLog.debug("In post method; URL is " + finalURL);
			mLog.debug("In post method; soap req is " + soapEnv);
			coreController.mResultLogger.info(finalURL);
			coreController.mResultLogger.info(soapEnv);
			
			
			detailsResponse = null;

			detailsResponse = postData(finalURL, soapEnv);

			mLog.debug("Response from server is\n" + detailsResponse);
			coreController.mResultLogger.info(detailsResponse);

		} catch (Exception e) {
			throw new HarnessException("no query string");
		}
		return (mTestPassed = (detailsResponse != null));


	}

	public boolean executeRestResponse(Element element) throws HarnessException {

		mLog.debug("executeTestResponse execute");

		mLog.debug(detailsResponse);

		try {

			Element res = Element.parseXML(detailsResponse);

			for (Iterator<Element> it = element.elementIterator(); it.hasNext();) {
				Element e = it.next();
				if (e.getQName().equals(E_SELECT)) {

					doSelect(res, e);

				} else if (e.getQName().equals(E_CONTENT)) {

					// doContent(res,e);

					// } else {

					// checkGlobals(e);

				}
			}

			return (mTestPassed = (mNumCheckFail == 0));
			//return true;
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}

	}

*/
}
