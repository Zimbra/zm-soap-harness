package com.zimbra.qa.soap;

import java.util.Iterator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dom4j.QName;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFMarshallingContext;
import com.ibm.staf.STAFResult;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;


/**
 * <t:staftask>
 * 	<t:request>
 * 		<service>staf service name</service>
 * 		<params>staf service parameters</params>
 * 		[ <server>staf server name</server> ]	// default: localhost
 * 	</t:request>
 * 	<t:response>
 * 		<t:select regex="regex" set="var">
 * 			<t:select regex="regex" set="var2"/>
 * 		</t:select>
 * 	</t:response>
 * </t:staftask>
 */






/**
 *
 * @author rhoades
 *
 */
public class StafTaskTest extends Test {

	private static Logger mLog = LogManager.getLogger(StafTaskTest.class.getName());


    public static final QName E_STAFTEST = QName.get("staftask", SoapTestCore.NAMESPACE);

    public static final QName E_REQUEST = QName.get("request", SoapTestCore.NAMESPACE);
	public static final QName E_RESPONSE = QName.get("response", SoapTestCore.NAMESPACE);

	public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);

	public static final String E_SERVICE = "service";
	public static final String E_PARAMS = "params";
	public static final String E_SERVER = "server";

	public static final String A_FILE = "file";
	public static final String A_REGEX = "regex";
	public static final String A_GROUP = "group";
	public static final String A_SET = "set";
	public static final String A_EMPTY = "emptyset";


	public String StafService = null;
	public String StafParams = "";
	public String StafServer = "local";
	public STAFResult StafResult = null;

	public StringBuilder StafRequest = new StringBuilder();
	public StringBuilder StafResponse = new StringBuilder();

	public static final String LineSeparator = System.getProperty("line.separator");



	public StafTaskTest() {
	}

	public StafTaskTest(Element e, SoapTestCore core) {
		super(e, core);
	}

	public StafTaskTest(SoapTestCore core) {
		coreController = core;
	}

    public void compact() {
        super.compact();
        StafRequest = null;
        StafResponse = null;
    }

	protected boolean executeStaf() throws HarnessException {

		STAFHandle handle = null;

		try
		{

			handle = new STAFHandle(StafTaskTest.class.getName());

	        try
	        {

	        	StafRequest.append("STAF ").append(StafServer).append(" ").append(StafService).append(" ").append(StafParams).append(LineSeparator);

	        	mLog.debug("Execute " + StafRequest.toString());

	            StafResult = handle.submit2(StafServer, StafService, StafParams);

	            StafResponse.append("RC: ").append(StafResult.rc).append(LineSeparator);
	            if ( (StafResult.result != null) && (!StafResult.result.trim().equals("")) )
	            {
	            	if ( STAFMarshallingContext.isMarshalledData(StafResult.result) )
	            	{
	            		STAFMarshallingContext mc = STAFMarshallingContext.unmarshall(StafResult.result);
	            		StafResponse.append(STAFMarshallingContext.formatObject(mc)).append(LineSeparator);
	            	}
	            	else
	            	{
	            		StafResponse.append(StafResult.result).append(LineSeparator);
	            	}
	            }

        		StafResponse.append(LineSeparator);
	            return (StafResult.rc != STAFResult.Ok);

			} finally {

	            try {

					handle.unRegister();

				} catch (STAFException e) {
		        	throw new HarnessException("Error unregistering with STAF, RC:" + e.rc, e);
				}

			}

		}
		catch (STAFException e)
		{
        	throw new HarnessException("Error registering or unregistering with STAF, RC:" + e.rc, e);
		}


	}

	protected boolean executeTest() throws HarnessException {

		mLog.debug("SmtpInjectTest execute");



		if ( !usingStaf )
			throw new HarnessException(StafTaskTest.E_STAFTEST.getName() + " requires staf");


		// Pause, if specified
		doDelay();




		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();


		for (Iterator<Element> i = mTest.elementIterator(); i.hasNext();) {
			Element e = i.next();

			if (e.getQName().equals(E_REQUEST)) {

				try {

					Element eServer = e.getOptionalElement(E_SERVER);
					if ( eServer != null )
						StafServer = eServer.getTextTrim();

					Element eService = e.getElement(E_SERVICE);
					StafService = eService.getTextTrim();

					Element eParams = e.getElement(E_PARAMS);
					StafParams = eParams.getTextTrim();

				} catch (ServiceException se) {
					throw new HarnessException("Invalid StafTask " + e, se);
				}

				// Execute the request
				executeStaf();

			} else if (e.getQName().equals(E_RESPONSE)) {

				for (Iterator<Element> j = e.elementIterator(); j.hasNext(); ) {

					Element select = j.next();
					if ( select.getQName().equals(E_SELECT) ) {
						doSelect(StafResponse.toString(), select);
					}
				}

			}

		}

		mTestPassed = (mNumCheckFail == 0);


		long finish = System.currentTimeMillis();

		// Bug 37055
		// If mailboxdct was used, we need to wait a while to let the server fully come up
		if ( StafParams.contains("zmmailboxdctl") || StafParams.contains("zmcontrol") )
		{
			int delay = 60000;
			mLog.debug("Waiting "+ delay +" msec for mailbox to be ready for soap");
			try {
				Thread.sleep(delay);
			} catch (InterruptedException e) {
				mLog.warn("Exception thrown while waiting for mailboxdctl", e);
			}
		}

		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			return (mTestPassed = false);  // Execution took too long!
		}



		mLog.debug("Staf Task Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return (!testFailed());

	}

	protected void doSelect(String context, Element select) throws HarnessException
	{
		String file = select.getAttribute(A_FILE, null);
		String regex = select.getAttribute(A_REGEX, null);
		String group = select.getAttribute(A_GROUP, null);
		String set = select.getAttribute(A_SET, null);
		boolean negativeTest = select.getAttribute(A_EMPTY, "0").equals("1");

		String value = null;
		int iGroup = 0;
		if ( group != null )
			iGroup = Integer.parseInt(group);

		// TODO: process 'file' (stdout) and (stderr)
		Pattern p = Pattern.compile(regex);
		Matcher m = p.matcher(context);

		if ( m.matches() )
		{
			value = m.group(iGroup);
		}

		boolean found = (value != null);
		if ( !found )
			value = "UNSET";

		if ( found )
		{
			if ( set != null )
				TestProperties.testProperties.setProperty(set, value);

		}

		if ( negativeTest )
		{
			check(!found, "negative test: not found");
		}
		else
		{
			check(found, "regex matched");
		}

		// Handle sub-selects
		for (Iterator<Element> i = select.elementIterator(); i.hasNext();) {
			Element e = i.next();
			if ( e.getQName().equals(E_SELECT) ) {
				if (value != null) {
					doSelect(value, e);
				}
			}
		}

	}


	protected String getDetails() {

		mRequestDetails = StafRequest.toString();
		mResponseDetails = StafResponse.toString();

		return (super.getDetails());

	}

	@Override
	protected boolean dumpTest() {
		return false;
	}

	@Override
	protected String getTestName() {
		return ("StafTaskTest");
	}


}
