
package com.zimbra.qa.soap;

import com.zimbra.common.soap.Element;

import java.io.Closeable;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.apache.log4j.Logger;

public class Utilities {
    
     /**
     * Runs an XPath query on the specified element context and returns the results.
     */
    
    public static Element[] getElementsFromPath(Element context, String path) {
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
    
    public static Map getURIs() {
        if (mURIs == null) {
            mURIs = new HashMap<String, String>();
            mURIs.put("zimbra", "urn:zimbra");
            mURIs.put("acct", "urn:zimbraAccount");
            mURIs.put("mail", "urn:zimbraMail");
            mURIs.put("offline", "urn:zimbraOffline");
            mURIs.put("admin", "urn:zimbraAdmin");
            mURIs.put("voice", "urn:zimbraVoice");
            mURIs.put("im", "urn:zimbraIM");
            mURIs.put("mapi", "urn:zimbraMapi");
            mURIs.put("sync", "urn:zimbraSync");
            mURIs.put("cs", "urn:zimbraCS");
            mURIs.put("test", "urn:zimbraTestHarness");
            mURIs.put("soap", "http://www.w3.org/2003/05/soap-envelope");
            mURIs.put("soap12", "http://www.w3.org/2003/05/soap-envelope");
            mURIs.put("soap11", "http://schemas.xmlsoap.org/soap/envelope/");
            mURIs.put("ewstype","http://schemas.microsoft.com/exchange/services/2006/types");
            mURIs.put("ewsmsg","http://schemas.microsoft.com/exchange/services/2006/messages");
        }
        return mURIs;
    }

    /**
     * Close a stream.  If an exception is thrown, just log it.
     * @param c the stream to close
     */
    public static void close(Closeable c , Logger mLog) {
        if ( c == null ) {
            return;
        }
        try {
            c.close();
        } catch (IOException e) {
            mLog.error("Unable to close during finally", e);
        }
    }
}