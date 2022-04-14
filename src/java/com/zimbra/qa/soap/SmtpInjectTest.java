package com.zimbra.qa.soap;


import java.io.File;
import java.io.IOException;
import java.util.Iterator;
import java.util.Random;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dom4j.QName;

import com.ibm.staf.STAFResult;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class SmtpInjectTest extends Test {

	private static Logger mLog = LogManager.getLogger(SmtpInjectTest.class.getName());


    public static final QName E_SMTPINJECTTEST = QName.get("smtpinjecttest", SoapTestCore.NAMESPACE);
	public static final QName E_SMTP_INJECT_REQUEST = QName.get("smtpInjectRequest", SoapTestCore.NAMESPACE);
	public static final QName E_SMTP_INJECT_RESPONSE = QName.get("smtpInjectResponse", SoapTestCore.NAMESPACE);

	// smtp
	public static final String A_ADDRESS = "address";
	public static final String A_FILENAME = "filename";
	public static final String A_MESSAGE = "message";
	public static final String A_RECIPIENT = "recipient";
	public static final String A_SENDER = "sender";
	public static final String A_TLS = "tls";
	public static final String A_AUTH = "auth";
	public static final String A_USER = "user";
	public static final String A_PASSWORD = "password";
	public static final String A_SUBJECT = "subject";


	public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);
	public static final String A_EMPTYSET = "emptyset";
	public static final String A_MATCH = "match";



	public SmtpInjectTest() {
	}

	public SmtpInjectTest(Element e, SoapTestCore core) {

		super(e, core);

	}



	private boolean executeStafPostqueue() throws HarnessException {

		mTeardownDetails = MailInjectTest.waitForPostfixQueue();

		return (mTestPassed);

	}


	private String pushMimeFile(String server, String file) throws HarnessException
	{

		StafTaskTest test = new StafTaskTest(coreController);
		test.StafServer = "local";
		test.StafService = "FS";

		String destination = "/tmp/" + (UUID.randomUUID()) + ".tmp";
		File source = new File(file);

		StringBuffer stafParms = new StringBuffer();
		try {
			stafParms.append("COPY");
			stafParms.append(" FILE " + source.getCanonicalPath());
			stafParms.append(" TOFILE " + destination);
			stafParms.append(" TOMACHINE " + server);
		} catch (IOException ioe) {
			throw new HarnessException("IOException for "+ file, ioe);
		}

		test.StafParams = stafParms.toString();


		test.executeStaf();

		mSetupDetails = test.StafRequest.toString() + "\n" + test.StafResponse.toString();

		return (destination);

	}

	private void deleteMimeFile(String server, String file) throws HarnessException
	{

		StafTaskTest test = new StafTaskTest(coreController);
		test.StafServer = server;
		test.StafService = "FS";
		test.StafParams = "DELETE ENTRY "+ file +" CONFIRM";

		test.executeStaf();

		mTeardownDetails = test.StafRequest.toString() + test.StafResponse.toString();

	}

	private boolean smtpMimeFile(Element request, String remoteFile) throws HarnessException {

		mLog.debug("SmtpInjectTest execute STAF");

		StafTaskTest test = new StafTaskTest(coreController);
		test.StafServer = TestProperties.testProperties.getProperty("smtpServer.name");
		test.StafService = TestProperties.testProperties.getProperty("smtpServer.service", "INJECT");

		// Get the smtp inject options from the XML
        //
		StringBuffer stafCommand = new StringBuffer("SMTP");

		String destination = MailInjectTest.mLmtpServer;	// default
		StringBuffer toList = null;
		String sender = generateRandomEmailAddress();
		for (Iterator<Element> iter = request.elementIterator(); iter.hasNext();)
		{
			Element e = iter.next();

			if (e.getName().equals(A_RECIPIENT))
			{
				if ( toList == null )
					toList = new StringBuffer(e.getText());
				else
					toList.append("," + e.getText());
			}
			else if (e.getName().equals(A_ADDRESS))
			{
				destination = e.getText();
			}
			else if (e.getName().equals(A_SENDER))
			{
				sender = e.getText();
			}
			else if ( e.getName().equals(A_SUBJECT))
			{
				stafCommand.append(" SUBJECT \"" + e.getText() + "\"");
			}
			else if ( e.getName().equals(A_AUTH))
			{
				stafCommand.append(" AUTH");
			}
			else if ( e.getName().equals(A_USER))
			{
				stafCommand.append(" USER "+ e.getText());
			}
			else if ( e.getName().equals(A_PASSWORD))
			{
				stafCommand.append(" PASSWD \"" + e.getText() + "\"");
			}
			else if ( e.getName().equals(A_TLS))
			{
				stafCommand.append(" STARTLS ");
			}
		}
		if ( toList != null )
			stafCommand.append(" TO "+ toList.toString());
		stafCommand.append(" FROM " + sender);
		stafCommand.append(" HOST " + destination);
		stafCommand.append(" MESSAGE \"" + remoteFile + "\"");


		test.StafParams = stafCommand.toString();

		test.executeStaf();

		mRequestDetails = test.StafRequest.toString();
		mResponseDetails = test.StafResponse.toString();


        // Sometimes SMTP returns error codes (e.g. 550)
        // These thrown a STAF UNKNOWN ERROR response (6)
        // So, both Ok and Unknown are ok
        // return (mTestPassed = (stafResult.rc == STAFResult.Ok));
        switch (test.StafResult.rc)
        {
            case STAFResult.Ok:
            case STAFResult.UnknownError:
            	return (mTestPassed = true);
        	default:
        		mResponseDetails = mResponseDetails + System.getProperty("line.separator") + "response code was not " + STAFResult.Ok + " or " + STAFResult.UnknownError;
        		return (mTestPassed = false);
        }

	}

	private boolean executeStaf() throws HarnessException
	{

		String remoteFile = null;

		// Strip the smtpinjecttest part
		Element request = mTest.getOptionalElement(E_SMTP_INJECT_REQUEST);

		// Point smtpServer.name to qa00 (or wherever the SMTP tests run from)
		String STAF_SMTP_HOST = TestProperties.testProperties.getProperty("smtpServer.name");

		try
		{

			File f = new File(SoapTestCore.rootZimbraQA, request.getElement(A_FILENAME).getText());
			remoteFile = pushMimeFile(STAF_SMTP_HOST, f.getAbsolutePath());

			return (smtpMimeFile(request, remoteFile));

		} catch (ServiceException se) {
			throw new HarnessException("You must specify a "+ A_FILENAME, se);
		}
		finally
		{
			try {
				deleteMimeFile(STAF_SMTP_HOST, remoteFile);
			} catch (HarnessException he) {
				mLog.warn("Exception thrown while deleting remote file", he);
			}
		}
	}

	public boolean executeTest() throws HarnessException {



		mLog.debug("SmtpInjectTest execute");


		if ( !usingStaf )
			throw new HarnessException(SmtpInjectTest.E_SMTPINJECTTEST.getName() + " requires staf");

		// Pause, if specified
		doDelay();




		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();


		for (Iterator<Element> i = mTest.elementIterator(); i.hasNext();) {
			Element e = i.next();

			if (e.getQName().equals(E_SMTP_INJECT_REQUEST)) {

				// Execute the request
				executeStaf();


				// Now, wait for the queue
				if ( !testFailed() ) {
					executeStafPostqueue();
				}

			} else if (e.getQName().equals(E_SMTP_INJECT_RESPONSE)) {

				for (Iterator j = e.elementIterator(); j.hasNext(); ) {

					Element select = (Element)j.next();
					if ( select.getQName().equals(E_SELECT) ) {
						doSelect(mResponseDetails, select);
					}
				}

			}

		}


		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			return (mTestPassed = false);  // Execution took too long!
		}



		mLog.debug("SMTP Inject Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return ( mTestPassed ? (mTestPassed = (mNumCheckFail == 0)) : (mTestPassed) );

	}


	protected void doSelect(String context, Element select) throws HarnessException {

		if ( context == null ) {
			throw new HarnessException("doSelect: context is null");
		}


		String match = select.getAttribute(A_MATCH, null);
		String emptyset = select.getAttribute(A_EMPTYSET, "0");

		boolean negativeTest = emptyset.equals("1");

		String resultMessage = "doSmtpSelect: match ("+match+") emptyset ("+emptyset+")";
		mLog.debug(resultMessage);

		// Convert the massive response String into an array of individual lines
		//
		String contextArray[] = context.split("\n");

		// Parse each line, looking for the requested attribute
		for (int i=0; i < contextArray.length; i++) {


			// End-of-line characters gives the harness fits, strip them.
			contextArray[i] = contextArray[i].trim();

			resultMessage += " value("+ contextArray[i] +")";

			mLog.debug("doSmtpSelect: checking [" + contextArray[i] + "]");

			// Handle matches
			if ( (match != null) && (contextArray[i] != null) ) {
				try
				{
					if ( TestProperties.testProperties.getProperty(Test.lowerCaseProp, "false").equals("true") ) {
						// Bug 9092
						if (Pattern.matches(match.toLowerCase(), contextArray[i].toLowerCase())) {
							mLog.debug("doSmtpSelect: found [" + match + "]");
							check(!negativeTest, resultMessage);
							return;
						}
					} else {
						// Normal behavior
						if (Pattern.matches(match, contextArray[i])) {
							mLog.debug("doSmtpSelect: found [" + match + "]");
							check(!negativeTest, resultMessage);
							return;
						}
					}
				} catch (PatternSyntaxException pse) {
					throw new HarnessException("doSelect threw PatternSyntaxException", pse);
				}
			}



		}

		mLog.debug("doSmtpSelect: never found [" + match + "]");
		// Made it through the entire results without finding a match
		// If emptyset was true, then this is a good thing
		check(negativeTest, resultMessage);
		return;

	}






	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected String getTestName() {
		return ("SmtpInjectTest");
	}

	private String generateRandomEmailAddress() {

		Random rand = new Random();
		String chars = "abcdefghijklmnopqrstuvwxyz";
		String email = "12345.67890@example.com";

		StringBuffer buffer = new StringBuffer();

		for ( int i = 0; i < email.length(); i++ ) {

			if ( Character.isDigit(email.charAt(i)) ) {
				buffer.append( chars.charAt(rand.nextInt(chars.length())) );
			} else {
				buffer.append(email.charAt(i));
			}

		}

		mLog.debug("generateRandomEmailAddress returned: [" + buffer.toString() + "]");
		return (buffer.toString());

	}

}
