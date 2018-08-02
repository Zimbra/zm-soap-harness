package com.zimbra.qa.soap;


import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import org.dom4j.DocumentException;
import org.dom4j.QName;

import com.zimbra.common.auth.ZAuthToken;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.DomUtil;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.Element.JSONElement;
import com.zimbra.common.soap.HeaderConstants;
import com.zimbra.common.soap.SoapFaultException;
import com.zimbra.common.soap.SoapParseException;
import com.zimbra.common.soap.SoapProtocol;
import com.zimbra.common.soap.SoapUtil;
import com.zimbra.common.util.StringUtil;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.data.ParserException;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Component;
import net.fortuna.ical4j.model.Property;

public class SoapTest extends Test {

    public static final String A_XMLFILE = "filename";
    public static final String A_CLIENT = "client";
    public static final String A_SERVER = "server";


    public static final QName E_SOAPTEST = QName.get("soaptest", SoapTestCore.NAMESPACE);
    public static final QName E_TESTTEST = QName.get("test", SoapTestCore.NAMESPACE);

    public static final QName E_REQUEST = QName.get("request", SoapTestCore.NAMESPACE);
    public static final QName E_RESPONSE = QName.get("response", SoapTestCore.NAMESPACE);
    public static final QName E_REQUEST_CONTEXT = QName.get("requestContext",SoapTestCore.NAMESPACE);
    public static final QName E_ICAL_PARSE = QName.get("iCalParse", SoapTestCore.NAMESPACE);

    public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);
    public static final QName E_HEADER = QName.get("header", SoapTestCore.NAMESPACE);

    public static final String A_ICAL_STRING = "ical";

    public static final String A_ATTR = "attr";
    public static final String A_PATH = "path";
    public static final String A_EMPTYSET = "emptyset";
    public static final String A_SET = "set";
    public static final String A_QUERY = "query";
    public static final String A_MATCH = "match";
    public static final String A_AID = "aid";
    public static final String A_IID = "id";
    public static final String A_EQUALS = "equals";
    public static final String A_CONTAINS = "contains";
    protected static final String STAF_SOAP_HOST = "LOCAL";
    protected static final String STAF_SOAP_SERVICE = "SOAP";
    protected static final String STAF_SOAP_COMMAND = "HELP";

    // The soap test
    /** doc in the soap body */
    public Element mDocRequest;

    /** doc in the soap body */
    public Element mDocResponse;

    /** the request context */
    public Element mRequestContext;

    /** the soap request envelope */
    public Element mSoapRequest;

    /** the soap response envelope */
    public Element mSoapResponse;


    protected SoapProtocol mSoapProto = null;
    protected String mCurrentProtocol = "soap";
    protected ProxySoapHttpTransport mTransport = null;
    protected int mTransCount = 0;
    protected String mUri = "";


    static protected HashMap<String, String> mSessionMap = new HashMap<String, String>();
    static protected HashMap<String, String> mSequenceMap = new HashMap<String, String>();


    protected static final Pattern mNamespacePattern = Pattern.compile("(xmlns=\\\"([^\"]+)\\\")");
    protected String mNamespace = "";

    protected static String mSoapClientMode = null;
    protected static String mSoapClientPort = null;
    protected static String mSoapClientPath = null;

    protected static String mSoapAdminMode = null;
    protected static String mSoapAdminPort = null;
    protected static String mSoapAdminPath = null;

    protected static String mMapiClientMode = null;
    protected static String mMapiClientPort = null;
    protected static String mMapiClientPath = null;

    protected static String mEwsPath = null;

    public SoapTest() {
        if ( mSoapProto == null ) {
            mSoapProto = SoapProtocol.Soap12;
        }
        mNumChecks = 0; mNumCheckPass = 0; mNumCheckFail = 0;

    }

    public SoapTest(Element e, SoapTestCore core) {

        super(e, core);

        if ( mSoapProto == null ) {
            mSoapProto = SoapProtocol.Soap12;
        }
        mNumChecks = 0; mNumCheckPass = 0; mNumCheckFail = 0;

        setNamespace(mTest);

    }



    protected boolean executeSoapXML() throws HarnessException {

        mLog.debug("executeSoapXML execute");

        try {

            for (Iterator it = mTest.elementIterator(); it.hasNext();) {
                Element e = (Element) it.next();

                if (e.getQName().equals(E_REQUEST)) {

                    doRequest(e);

                } else if (e.getQName().equals(E_RESPONSE)) {

                    doResponse(e);

                } else if (e.getQName().equals(E_ICAL_PARSE)) {

                    doICalParse(e);

                } else if ( e.getQName().equals(E_REQUEST_CONTEXT) ) {

                    doRequestContext(e);

                }

            }

        } catch (Exception e) {

            throw new HarnessException("Error while running SOAP XML", e);

        } finally {

            if (mTransport != null)
                mTransport.shutdown();

        }

        return (mTestPassed = (mNumCheckFail == 0));


    }

    public boolean executeTest() throws HarnessException {


        mLog.debug("SoapTest execute");


        // Pause, if specified
        doDelay();

        String xmlFile = mTest.getAttribute("filename", null);


        // Send SOAP tests through STAF
        long start = System.currentTimeMillis();

        if (xmlFile != null) {

            coreController.mResultLogger.warn("Unable to execute SoapTest with filename specifier - requires STAF");
            // If a file name is specified, then run the entire file
            // executeStafFile();

        } else {

            // Otherwise, assume that the XML specifies a SOAP request/response
            executeSoapXML();

        }

        long finish = System.currentTimeMillis();

        mTime = finish - start;
        if ( !checkExecutionTimeframe() ) {
            mLog.info("Execution took too long or too short");
            mTestPassed = false;  // Execution took too long!
        }



        mLog.debug("SOAP Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
        return (!testFailed());

    }


    protected String getDetails() {


        // Convert the SOAP/JSON to strings
        if ( mSoapRequest != null )
            mRequestDetails = DomUtil.toString(mSoapRequest.toXML(),true);
        if ( mSoapResponse != null ) {

                if ( mCurrentProtocol.equalsIgnoreCase("js")) {

                    // Print JSON, not XML
                    try {
                        Element json = JSONElement.parseJSON("" + mSoapResponse);
                        mResponseDetails = json.prettyPrint();
                    } catch (SoapParseException e) {
                        // If unable to parse, just print the text
                        mResponseDetails = "" + mSoapResponse;
                    }

                } else {

                    // Pretty Print XML
                    mResponseDetails = DomUtil.toString(mSoapResponse.toXML(),true);

                }

        }

        // Then, use the basic function to determine the formatting
        return (super.getDetails());

    }

    public String getDocReqName() {
        return (mDocRequest != null ? mDocRequest.getQualifiedName() : "");
    }

    public String getDocRespName() {
        return mDocResponse.getQualifiedName();
    }

    protected void doRequest(Element request) throws DocumentException, IOException, HarnessException, ServiceException {


        boolean isEws = request.getAttributeBool("ews", false);

        // Skip <t:test>???
        Element testElement = request.elementIterator().next();
        String strElement = testElement.prettyPrint();
        Element tElement = Element.parseXML(strElement);
        String username = "";
        String password = "";

//      tElement = expandProps(tElement);
        mDocRequest = tElement ;
        mDocRequest.detach();
        if (isEws) {
            mSoapProto = SoapProtocol.Soap11;
            username =  request.getAttribute("username");
            password = request.getAttribute("password");
            mSoapRequest = mDocRequest;
            setTransport(isEws, username, password);
            mSoapResponse = mTransport.invokeRaw(mSoapRequest);
            mDocResponse = mSoapProto.getBodyElement(mSoapResponse);
            return;
         }
        
        
        Element context = null;
        if (mRequestContext != null) {

            // XML test script specified the context, use it
            //
            context = mRequestContext;

        } else if ( (Utilities.getElementsFromPath(mDocRequest, "//acct:AuthRequest").length > 0) ||
                (Utilities.getElementsFromPath(mDocRequest, "//admin:AuthRequest").length > 0) ){

            // Bug 29021
            // clear the authToken/sessionId for all AuthRequests
            TestProperties.testProperties.clearProperty("authToken");
            int jwtTypeAuth  = Utilities.getElementsFromPath(mDocRequest, "//acct:AuthRequest/acct:jwtToken").length;
            mLog.debug("jwtTypeAuth: " + jwtTypeAuth);
            if (jwtTypeAuth == 0) {
                TestProperties.testProperties.clearProperty("jwtSalt");
            }
            TestProperties.testProperties.clearProperty("sessionId");

            // The currentClientServer value will be set in setUri() before the SOAP is sent
            TestProperties.testProperties.clearProperty("currentClientServer");


            // Since the harness is sending an AuthRequest, don't set the context
            //
            context = null;

            // Bug 29021
            // Set "nosession" for client AuthRequests
            if ( Utilities.getElementsFromPath(mDocRequest, "//acct:AuthRequest").length > 0 )
            {
                context = SoapUtil.toCtxt(mSoapProto, null, null);
                context.addElement("nosession");
            }


        } else if (TestProperties.testProperties.getProperty("authToken",null) == null) {

            // Auth token is not set, don't send a context
            //
            // context = SoapUtil.toCtxt(mSoapProto, null, null, -1);
            context = null;

        } else {

            // Use the default context, use the authToken, sessionId, and
            // <notify/> sequence number, if available
            //


            ZAuthToken zat = new ZAuthToken(null, TestProperties.testProperties.getProperty("authToken", null), null);
            String sessionId = mSessionMap.get(TestProperties.testProperties.getProperty("authToken", null));
            String target = TestProperties.testProperties.getProperty("target", null);
            String salt = TestProperties.testProperties.getProperty("jwtSalt", null);
            if ( sessionId == null )
            {
                if (salt == null) {
                    context = SoapUtil.toCtxt(mSoapProto, zat, null);
                } else {
                    context = toJwtContxt(mSoapProto, zat, null, salt);
                }
                
            }
            else
            {
                int sequenceId = -1;
                if ( sessionId != null ) {
                    String sequence = mSequenceMap.get(sessionId);
                    if ( sequence != null ) {
                        try {
                            sequenceId = Integer.parseInt(sequence);
                        } catch (Exception e) { }
                    }
                }
                context = SoapUtil.toCtxt(mSoapProto, zat, sessionId, sequenceId);
                if ( sequenceId != -1 ) {
                    Element e = context.addElement("notify");
                    e.addAttribute("seq", String.valueOf(sequenceId));
                }
            }

            if ( (target != null) && (!target.equals("")) )
            {
                if (context == null)
                    throw new HarnessException("Unable to set target account because context == null");

                context.addUniqueElement(HeaderConstants.E_ACCOUNT).addAttribute(HeaderConstants.A_BY, HeaderConstants.BY_NAME).setText(target);
            }

            adjustContext(context);

        }

        mSoapRequest = mSoapProto.soapEnvelope( mDocRequest, context );
        setTransport();
        mReference = mUri;
        
        String salt = TestProperties.testProperties.getProperty("jwtSalt", null);
        if (salt != null) {
            mTransport.setJwtSalt(salt);
        }

        mTransport.setAuthTokenS(TestProperties.testProperties.getProperty("authToken", null));

        mSoapResponse = mTransport.invokeRaw(mSoapRequest);
        mDocResponse = mSoapProto.getBodyElement(mSoapResponse);

        if ( Utilities.getElementsFromPath(mSoapResponse, "//zimbra:session").length > 0 )
        {
            Element[] sessions = Utilities.getElementsFromPath(mSoapResponse, "//zimbra:session");
            for (int i = 0; i < sessions.length; i++ )
            {
                mSessionMap.put(TestProperties.testProperties.getProperty("authToken"), sessions[i].getText());
            }
        }

        if ( Utilities.getElementsFromPath(mSoapResponse, "//zimbra:refer").length > 0 )
        {
            Element[] refers = Utilities.getElementsFromPath(mSoapResponse, "//zimbra:refer");
            for (int i = 0; i < refers.length; i++ )
            {
                TestProperties.testProperties.setProperty("currentClientServer", refers[i].getText());
            }
        }
        
//        if (mTransport.getJwtSalt() != null) {
//            TestProperties.testProperties.setProperty("jwtSalt", mTransport.getJwtSalt());
//        }

        // Remember the sequence number, if returned in the response
        //
        try {
            Element mHeaderResponse = mSoapProto.getHeader(mSoapResponse);
            if ( mHeaderResponse != null ) {

                String authToken = TestProperties.testProperties.getProperty("authToken", null);
                if ( authToken != null )
                {
                    String sessionId = mSessionMap.get(authToken);
                    if ( sessionId != null ) {

                        // If the server sends a seq num, remember it for the next request
                        Element notify = mHeaderResponse.getElement("context").getElement("notify");
                        String sequenceNum = notify.getAttribute("seq");
                        mSequenceMap.put(sessionId, sequenceNum);
                        mLog.debug("new notify sequence " + sequenceNum);

                    }
                }

            }
        } catch (ServiceException e) {
            // If the sequence ID can't be found, but that's ok
            mLog.debug("Couldn't find the notify element, not using sequence ID");
        }

        // If the SOAP request is a CreateAccountRequest, then
        // remember the zimbraMailHost as one of the postfix queues to check
        if ( usingStaf )
        {
            if ( Utilities.getElementsFromPath(mSoapResponse, "//admin:CreateAccountResponse").length > 0) {

                Element[] zimbraMailHosts = Utilities.getElementsFromPath(mSoapResponse, "//admin:CreateAccountResponse/admin:account/admin:a[@n='zimbraMailHost']");
                for (int i = 0; i < zimbraMailHosts.length; i++) {
                    Element e = zimbraMailHosts[i];
                    String host = e.getText();
                    mLog.debug("CreateAccountResponse host: " + host);
                    SoapTest.addMailboxServer(host);
                }
            }
        }

    }

    /**
     * @param soapProto
     * @param zat
     * @param object
     * @return
     */
    private Element toJwtContxt(SoapProtocol protocol, ZAuthToken authToken, String csrfToken, String salt) {
         Element ctxt = protocol.getFactory().createElement(HeaderConstants.CONTEXT);

         Element eAuthToken = ctxt.addElement("jwtToken");
         
         eAuthToken.setText(authToken.getValue());
         
         Element saltElm = ctxt.addElement("jwtSalt");
         saltElm.setText(salt);
         return ctxt;
        
    }

    protected void doResponse(Element test) throws SoapFaultException,
    IOException, HarnessException {

//      test = expandProps(test);

        for (Iterator it = test.elementIterator(); it.hasNext();) {
            Element e = (Element) it.next();
            if (e.getQName().equals(E_SELECT)) {

                // Check if we are using JSON
                if ( mCurrentProtocol.equalsIgnoreCase("js") ) {

                    // Convert JSON to XML, and then parse as SOAP
                    Element xml = Element.parseJSON(mSoapResponse.toString());
                    doSelect(xml, e);

                } else {

                    // Not using JS, parse as SOAP
                    Element context = mSoapProto.getBodyElement(mSoapResponse);
                    doSelect(context, e);

                }

            } else if (e.getQName().equals(E_HEADER)) {

                Element context = mSoapProto.getHeader(mSoapResponse);
                doSelect(context, e);

            }
        }

    }

    protected void doRequestContext(Element rc) throws HarnessException {
//      rc = expandProps(rc);
        Element ctxt = mSoapProto.getFactory().createElement(HeaderConstants.CONTEXT);
        for (Iterator it = rc.elementIterator(); it.hasNext();) {
            Element e = (Element) it.next();
            // ctxt.add(e.createCopy());
            ctxt.addElement(e.detach());

            // if the context specifies format type="js", then use JS to parse the response
            if ( e.getName().equalsIgnoreCase("format") ) {
                if ( e.getAttribute("type", "soap").equalsIgnoreCase("js") ) {
                    mLog.debug("switching to JS");
                    mCurrentProtocol = "js";
                }
            }

        }
        mRequestContext = ctxt;
    }

    protected void doICalParse(Element elem) throws IOException, HarnessException {

        mDocRequest = elem;
        mSoapRequest = elem;

        String iCalString = elem.getAttribute(A_ICAL_STRING, null);
        String resultMessage = "doICalParse: ical ("+iCalString+")";
        mLog.debug(resultMessage);

        check(!StringUtil.isNullOrEmpty(iCalString), "ical is null or empty");
        if ( StringUtil.isNullOrEmpty(iCalString) ) {
            return;
        }

        mTeardownDetails = iCalString;

        // Convert the string into a Calendar object
        ByteArrayInputStream is = new ByteArrayInputStream(iCalString.getBytes());

        // Turn on unfolding settings
        System.setProperty("ical4j.unfolding.relaxed", "true");

        // Run through generic format checks here.  Add new checks as necessary
        //
        CalendarBuilder builder = new CalendarBuilder();
        Calendar calendar = null;
        try {
            calendar = builder.build(is, "utf-8");
        } catch (ParserException ex) {
            throw new HarnessException("Parse exception for " +iCalString, ex);
        }

        for (Iterator i = calendar.getComponents().iterator(); i.hasNext();) {
            Component component = (Component) i.next();
            mLog.info("Component [" + component.getName() + "]");

            for (Iterator j = component.getProperties().iterator(); j.hasNext();) {
                Property property = (Property) j.next();
                mLog.info("Property [" + property.getName() + ", " + property.getValue() + "]");
            }
        }
    }

    protected final Pattern idPattern = Pattern.compile("(.*):(.*)");

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
        String equals = select.getAttribute(A_EQUALS, null);
        String contains = select.getAttribute(A_CONTAINS, null);
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
        boolean equalsFound = false;
        boolean containsFound=false;
        boolean attrFound = false;
        boolean nameFound=false;    //Added by Rajendra
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

            if (equals != null && elementHasValue) {
                mLog.debug("value="+value);
                mLog.debug("equals="+equals);
                if (equals.equals(value)) {
                    equalsFound = true;
                }
            }
            if (contains != null && elementHasValue) {
                mLog.debug("value="+value);
                mLog.debug("contains="+contains);
                if (value.contains(contains)) {
                    containsFound = true;
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
                (equals != null && !equalsFound) ||
                (contains!=null && !containsFound) ||
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
        if ((equals != null && !equalsFound)) {
            resultMessage = resultMessage.concat(", not equal");
            success = false;
        }
        if ((contains != null && !containsFound)) {
            resultMessage = resultMessage.concat(", does not contain");
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
        for (Iterator it = select.elementIterator(); it.hasNext();) {
            Element e = (Element) it.next();
            if ( e.getQName().equals(E_SELECT) || e.getQName().equals(E_HEADER)) {
                if (test != null) {
                    // xxx bburtin: per previous behavior, subselects only operate on the
                    // last element selected by the path.  I'm already creating enough
                    // churn in this code for now.  We can revisit this issue if it comes
                    // up.
                    doSelect(test, e);
                }
            } else {
                mLog.debug("subselect?" + e.prettyPrint());
            }
        }
    }

     protected void setTransport() throws HarnessException {
         setTransport(false, null, null);
     }

    protected void setTransport(boolean isEws, String username, String Password) throws HarnessException {

        try {

            // Reset the URI if mUri changes or every 10 messages

            if ( (setUri() == false) && (mTransCount <= 10) ) {

                mLog.debug("Didn't change mTransport");

                // The URI was the same, and we haven't reached the limit
                // We do not need to reconnect
                return;

            }



            synchronized (mSoapProto) {

                if (mTransport != null) {

                    mLog.debug("mTransport shutting down");

                    mTransport.shutdown();
                    mTransport = null;

                }

                if (isEws) {
                    mUri =  mUri.replace(mSoapClientPath, mEwsPath);
                    mTransport = new ProxySoapHttpTransport(mUri, username, Password);
                } else {
                    mTransport = new ProxySoapHttpTransport(mUri);
                }
                mTransCount = 0;

                mLog.debug("mTransport pointing at " + mUri);

            }

        } finally {
            mTransCount++;
        }

    }

    private static boolean IsInitializedUriProperties = false;

    protected void initializeUriProperties() {

        if ( !IsInitializedUriProperties )
        {
            mSoapAdminMode = TestProperties.testProperties.getProperty("admin.mode", SoapTestMain.globalProperties.getProperty("admin.mode", "https"));
            mSoapAdminPort = TestProperties.testProperties.getProperty("admin.port", SoapTestMain.globalProperties.getProperty("admin.port", "7071"));
            mSoapAdminPath = TestProperties.testProperties.getProperty("admin.path", SoapTestMain.globalProperties.getProperty("admin.path", "service/admin/soap/"));

            mSoapClientMode = TestProperties.testProperties.getProperty("soapservice.mode", SoapTestMain.globalProperties.getProperty("soapservice.mode", "http"));
            mSoapClientPort = TestProperties.testProperties.getProperty("soapservice.port", SoapTestMain.globalProperties.getProperty("soapservice.port", "80"));
            mSoapClientPath = TestProperties.testProperties.getProperty("soapservice.path", SoapTestMain.globalProperties.getProperty("soapservice.path", "service/soap/"));

            mMapiClientMode = TestProperties.testProperties.getProperty("mapiservice.mode", SoapTestMain.globalProperties.getProperty("mapiservice.mode", "http"));
            mMapiClientPort = TestProperties.testProperties.getProperty("mapiservice.port", SoapTestMain.globalProperties.getProperty("mapiservice.port", "80"));
            mMapiClientPath = TestProperties.testProperties.getProperty("mapiservice.path", SoapTestMain.globalProperties.getProperty("mapiservice.path", "service/mapi/soap/Service.asmx"));

            mEwsPath = TestProperties.testProperties.getProperty("ewsservice.path", SoapTestMain.globalProperties.getProperty("ewsservice.path", "ews/Exchange.asmx"));
        }

    }

    protected void adjustContext(Element context) throws HarnessException
    {
        // Use this virtual method to adjust the SOAP context as needed
    }

    // Returns: true if mUri was changed.  false otherwise
    protected boolean setUri() throws HarnessException {

        initializeUriProperties();
        
        // Post 8.7.0, all requests to mailbox will go via proxy.
        if ( mNamespace.equals(AdminConstants.NAMESPACE_STR)  ) {

            String server = SoapTestMain.globalProperties.getProperty("zimbraServer.name");
            if ( server != null ) {

                String newUri = mSoapAdminMode + "://" + server + ":" + mSoapAdminPort + "/" + mSoapAdminPath;
                if ( mUri.equals(newUri) )      return (false);

                TestProperties.testProperties.setProperty("currentClientServer", server);
                mUri = newUri;
                return (true);
            }
        }
        String server = SoapTestMain.globalProperties.getProperty("zimbraServer.name");
        if ( server != null )
        {
            String newUri = mSoapClientMode + "://" + server + ":" + mSoapClientPort + "/" + mSoapClientPath;
            if ( mUri.equals(newUri) )      return (false);

            TestProperties.testProperties.setProperty("currentClientServer", server);
            mUri = newUri;
            return (true);
        }


        String newUri = TestProperties.testProperties.getProperty("uri",mUri);
        if ( newUri.equals("") )
            throw new HarnessException("uri must be set");

        if ( mUri.equals(newUri) )      return (false);

        mUri = newUri;
        return (true);

    }
    
    private String setNamespace(Element e) {

        mLog.debug("setNamespace: " + e.toString());
        Matcher matcher = mNamespacePattern.matcher(e.toString());
        while (matcher.find()) {

            // Group 1 = xmlns="urn:xyz"
            // Group 2 = urn:xyz
            mNamespace = matcher.group(2);

            if (mNamespace.equals(SoapTestCore.NAMESPACE_STR)) {

                // Since the harness needs to know only the namespace of the SOAP request,
                // skip any occurences of the Soap Harness namespace elements
                //

                mLog.debug("mNamespace was "+ SoapTestCore.NAMESPACE_STR + " - skipping");
                continue;
            }

            mLog.debug("setNamespace returning: " + mNamespace);
            return (mNamespace);
        }

        // We could throw an exception here, but that will cause a lot
        // of handling code to be written
        // Throw the exception later in the setURI() function
        //
        mLog.debug("setNamespace: mNamespace was not defined - " + e.toString());
        return (mNamespace = "NOT DEFINED");

    }


    // A list of servers that run Mailbox, MTA, etc.
    static protected List<String> zimbraMailboxServers = new ArrayList<String>();

    static protected void addMailboxServer(String mailboxServer) {

        if ( mailboxServer == null || mailboxServer.equals("") ) {
            return;
        }

        if (zimbraMailboxServers.contains(mailboxServer)) {
            mLog.debug("POSTFIX QUEUE: skipped "+ mailboxServer);
            return;  // no more actions are necessary
        }

        // Add the new server to the list
        zimbraMailboxServers.add(mailboxServer);
        mLog.debug("POSTFIX QUEUE: added "+ mailboxServer +" to the zimbraMailboxServers list");

        // Determine which MTA servers the host uses
        MailInjectTest.addMtaServer(MailInjectTest.getMtaServer(mailboxServer));

    }


    @Override
    protected boolean dumpTest() {
        return false;
    }

    protected String getTestName() {
            return (mDocRequest != null ? mDocRequest.getQualifiedName() : "");
    }

}
