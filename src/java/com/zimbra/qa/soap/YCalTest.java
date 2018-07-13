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
import java.net.URI;
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

public class YCalTest extends YahooIntegrationBase {

	String yCookie;
	String ywssid ;
	String yAppID;
	String yappid;
	List<ZCookie> cookieStore;
	StringBuilder strHeader;
	URI yahooURL;
	
		
	
	
	public YCalTest() {
		super();
		
		try{
			yahooURL=new URI("http://www.yahoo.com/");
		
		
		
		}
		catch(Exception ex){
			
		}
		
	
		cookieStore=manager.getCookieStore();
		
		strHeader = new StringBuilder();
    	strHeader.append("<authToken type=\"YAHOO_CALENDAR_AUTH_PROVIDER\">"+"\n");
	   for (ZCookie cookie : cookieStore) {
			     // Remove cookies that have expired
			     if (cookie.hasExpired()) {
			       cookieStore.remove(cookie);
			     } else if (!cookie.matches(yahooURL)) {
			    	
			    	 cookieStore.remove(cookie);
			     }else{ 
			    	 strHeader.append("<a n=\"");
			     	 strHeader.append(cookie.name);
			     	 strHeader.append("\">"+"\n \n");
			     	 strHeader.append("<![CDATA["+   cookie.value+       "]]>");
			     	 strHeader.append("</a>"+"\n");
			     }	
	   }
	   
	   strHeader.append("</authToken></context></soap:Header><soap:Body>");
			     
			     
		
		txtSOAPHeader =	"<soap:Envelope xmlns:soap=\"http://www.w3.org/2003/05/soap-envelope\"><soap:Header><context xmlns=\"urn:zimbra\">"+
						"<userAgent name=\"ZimbraConnectorForOutlook\" version=\"5.5.5202.0\"/><nonotify/><noqualify/>"+ strHeader;
			
			
			
			
			
			
		txtSOAPReqClose="</soap:Body></soap:Envelope> ";
		setupCookies();
	}

	public YCalTest(Element e, SoapTestCore core) {
		super(e, core);
		
		try{
			yahooURL=new URI("http://www.yahoo.com/");
		
		
		
		}
		catch(Exception ex){
			
		}
		
	
		cookieStore=manager.getCookieStore();
		
		strHeader = new StringBuilder();
    	strHeader.append("<authToken type=\"YAHOO_CALENDAR_AUTH_PROVIDER\">"+"\n");
	   for (ZCookie cookie : cookieStore) {
			     // Remove cookies that have expired
			     if (cookie.hasExpired()) {
			       cookieStore.remove(cookie);
			     } else if (!cookie.matches(yahooURL)) {
			    	
			    	 cookieStore.remove(cookie);
			     }else{ 
			    	 strHeader.append("<a n=\"");
			     	 strHeader.append(cookie.name);
			     	 strHeader.append("\">"+"\n");
			     	 strHeader.append("<![CDATA["+   cookie.value+       "]]>");
			     	 strHeader.append("</a>"+"\n");
			     }	
	   }
	   
	   strHeader.append("</authToken></context></soap:Header><soap:Body>");
			     
			     
		
		txtSOAPHeader =	"<soap:Envelope xmlns:soap=\"http://www.w3.org/2003/05/soap-envelope\"><soap:Header><context xmlns=\"urn:zimbra\">"+
						"<userAgent name=\"ZimbraConnectorForOutlook\" version=\"5.5.5202.0\"/><nonotify/><noqualify/>"+ strHeader;
			
			
			
			
			
			
		txtSOAPReqClose="</soap:Body></soap:Envelope> ";
		setupCookies();
	}

}
