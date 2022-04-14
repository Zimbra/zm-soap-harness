package com.zimbra.qa.soap;


import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Pattern;

import javax.activation.DataHandler;
import javax.mail.BodyPart;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;

import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.data.ParserException;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Component;
import net.fortuna.ical4j.model.Property;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dom4j.QName;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFMarshallingContext;
import com.ibm.staf.STAFResult;
import com.zimbra.common.io.TcpServerInputStream;
import com.zimbra.common.lmtp.LmtpProtocolException;
import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.util.StringUtil;
import com.zimbra.cs.lmtpserver.utils.LmtpInject;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class MailInjectTest extends Test {

	private static Logger mLog = LogManager.getLogger(MailInjectTest.class.getName());

    public static final QName E_MAILINJECTTEST = QName.get("mailinjecttest", SoapTestCore.NAMESPACE);
	public static final QName E_LMTP_INJECT_REQUEST = QName.get("lmtpInjectRequest", SoapTestCore.NAMESPACE);
	public static final QName E_LMTP_INJECT_RESPONSE = QName.get("lmtpInjectResponse", SoapTestCore.NAMESPACE);

	// lmtp
	public static final String A_ADDRESS = "address";
	public static final String A_DIRECTORY = "directory";
	public static final String A_FILENAME = "filename";
	public static final String A_DOMAIN = "domain";
	public static final String A_EVERY = "every";
	public static final String A_PORT = "port";
	public static final String A_QUIET = "quiet";
	public static final String A_RECIPIENT = "recipient";
	public static final String A_STOP_AFTER = "stopafter";
	public static final String A_SENDER = "sender";
	public static final String A_THREADS = "threads";
	public static final String A_TRACE = "trace";
	public static final String A_USERNAME = "username";
	public static final String A_WARMUP_THRESHOLD = "warmupthreshold";
	public static final String A_REPEAT = "repeat";
	public static final String A_RESPONSE_CODE = "code";

	// XML - Staf zmLmtpInject
	public static final String A_LMTP_FILENAME = "filename";
	public static final String A_LMTP_FOLDERNAME = "foldername";
	public static final String A_LMTP_TO = "to";
	public static final String A_LMTP_FROM = "from";
	public static final String A_LMTP_SERVER = "server";
	public static final String A_LMTP_MODIFY = "modify";
	public static final String A_LMTP_MODIFY_HEADER = "header";
	public static final String A_LMTP_MODIFY_ICAL = "ical";
	public static final String A_ICAL_STRING = "ical";


	/** the current server where LMTP is being sent to **/
	protected static String mLmtpServer = null;

	public class LmtpClient {

		private Socket mConnection;
		private String mGreetname;
		private TcpServerInputStream mIn;
		private BufferedOutputStream mOut;
		private boolean mNewConnection;
		private String mResponse;

		public LmtpClient(String host, int port) throws IOException {
			mGreetname = LC.zimbra_server_hostname.value();

			mConnection = new Socket(host, port);
			mOut = new BufferedOutputStream(mConnection.getOutputStream());
			mIn = new TcpServerInputStream(mConnection.getInputStream());

			mNewConnection = true;
		}

		public void close() {
			try {
				sendLine("QUIT");
				mConnection.close();
			} catch (IOException ioe) {
				mLog.warn("IOException closing connection: " + ioe.getMessage(), ioe);
			}
			mConnection = null;
		}

		private final byte[] lineSeparator = { '\r', '\n' };

		private void sendLine(String line, boolean flush) throws IOException {
			mLog.debug("CLI: " + line);
			mOut.write(line.getBytes("iso-8859-1"));
			mOut.write(lineSeparator);
			if (flush) mOut.flush();
		}

		private void sendLine(String line) throws IOException {
			sendLine(line, true);
		}

		private boolean replyOk() throws LmtpProtocolException, IOException {
			boolean positiveReplyCode = false;
			StringBuffer sb = new StringBuffer();

			while (true) {
				String response = mIn.readLine();
				if (response == null) {
					break;
				}
				mLog.debug("SRV: " + response);
				if (response.length() < 3) {
					throw new LmtpProtocolException("response too short: " + response);
				}
				if (response.length() > 3 && response.charAt(3) == '-') {
					sb.append(response);
				} else {
					sb.append(response);
					if (response.charAt(0) >= '1' && response.charAt(0) <= '3') {
						positiveReplyCode = true;
					}
					break;
				}
			}

			mResponse = sb.toString();
			return positiveReplyCode;
		}


	    /**
	     * Sends a MIME message.
	     * @param msg the message body
	     * @param recipients recipient email addresses
	     * @param sender sender email address
	     * @param logLabel context string used for logging status
	     * @return <code>true</code> if the message was successfully delivered to all recipients
	     */
	    public boolean sendMessage(File fileName, List<String> recipients, String sender, String logLabel)
	        throws IOException, LmtpProtocolException
	    {
	        long start = System.currentTimeMillis();
			if (mNewConnection) {
				mNewConnection = false;

				// swallow the greeting
				if (!replyOk()) {
					throw new LmtpProtocolException(mResponse);
				}

				sendLine("LHLO " + mGreetname);
				if (!replyOk()) {
					throw new LmtpProtocolException(mResponse);
				}
			} else {
				sendLine("RSET");
				if (!replyOk()) {
					throw new LmtpProtocolException(mResponse);
				}
			}

			sendLine("MAIL FROM:<" + sender + ">");
			if (!replyOk()) {
				throw new LmtpProtocolException(mResponse);
			}

	        List<String> acceptedRecipients = new ArrayList<String>();
			for (String recipient : recipients) {
				sendLine("RCPT TO:<" + recipient + ">");
				if (replyOk()) {
	                acceptedRecipients.add(recipient);
				} else {
					mLog.warn("Recipient `" + recipient + "' rejected");
				}
			}

			sendLine("DATA");
			if (!replyOk()) {
				throw new LmtpProtocolException(mResponse);
			}
			// Classic case of lazy programmer here.  We read 8bit data from the file.
			// But we want to treat it as String for a little while because we want to
			// apply transparency and BufferedReader.getLine() is handy.  This conversion
			// here has a reverse with getBytes(charset) elsewhere in sendLine().


			BufferedReader inputBReader = null;

			try{
				InputStreamReader inputStreamReader = new InputStreamReader(new FileInputStream(fileName));
				inputBReader = new BufferedReader(inputStreamReader);
				String line;
				while ((line = inputBReader.readLine()) != null) {
					if (line.length() > 0 && line.charAt(0) == '.') {
						if (line.length() > 1 && line.charAt(1) == '.') {
							mLog.debug("don't have to apply transparency");
						} else {
							line = "." + line;
						}
					}
					sendLine(line, false);
				}
			} catch (FileNotFoundException e) {
				mLog.warn("FileNotFoundException during reading  "+ fileName+ " " + e);
			} catch (IOException e) {
				mLog.warn("IOException during reading  " + fileName+ " "+  e);
			}finally{
				Utilities.close(inputBReader, mLog);
			}

			sendLine("", false);
			sendLine(".");

	        boolean allDelivered = true;
	        for (String recipient : acceptedRecipients)
	        {
				if (replyOk()) {
	                long elapsed = System.currentTimeMillis() - start;
                    mLog.debug("Delivery OK msg=" + logLabel + " rcpt=" + recipient + " elapsed=" + elapsed + "ms");
	            } else {
	                allDelivered = false;
	                mLog.error("Delivery failed msg=" + logLabel + " rcpt=" + recipient + " response=" + mResponse);
	            }
	        }
	        return allDelivered;
	    }

	    public String getResponse() {
	    	return (mResponse);
	    }

	}

	public MailInjectTest() {
	}

	public MailInjectTest(Element e, SoapTestCore core) {

		super(e, core);

	}


	// TODO: For some reason, this code does not run in STAF
	// If run from outside of STAF, it works fine.
	// For now, use the STAF PROCESS interface
	@SuppressWarnings("unused")
    private boolean executeLMTP(String qaRoot, Properties props) throws HarnessException {

		mLog.debug("MailInjectTest execute LMTP");


		final String LMTPINJECT_CLASS = "com.zimbra.cs.lmtpserver.utils.LmtpInject";
		// final String LMTPINJECT_MAIN = "main"; //

		String zimbraServer = null;
		String zimbraPort = "7025";
		String mailFolder = null;
		String mailMessage = null;
		String recipient = null;
		String sender = null;

		// Get the lmtp settings from the XML
		zimbraServer = mTest.getAttribute(A_ADDRESS, "localhost");
		zimbraPort = mTest.getAttribute(A_PORT, "7025");
		try {
			mailFolder = mTest.getAttribute(A_DIRECTORY, null);
			mailMessage = mTest.getAttribute(A_FILENAME, null);
			recipient = mTest.getAttribute(A_RECIPIENT);
			sender = mTest.getAttribute(A_SENDER);
		} catch (ServiceException e) {
			throw new HarnessException("MailInjectTest needs value", e);
		}

		// Make sure the file exists
		if ( mailMessage != null ) {
			try {
				File fp = new File(mailMessage);
				mailMessage = fp.getCanonicalPath();
			} catch (IOException e) {
				throw new HarnessException("MailInjectTest file does not exist " + mailMessage);
			}
		}


		// Execute using LMTPInject class
		//
	    try {

			// First, find the method to execute
			Class<LmtpInject> cls = com.zimbra.cs.lmtpserver.utils.LmtpInject.class;
			//Class cls = java.lang.String.class;
			Method mainMethod = cls.getMethod("main", new Class[] { String[].class });


		    // Place whatever args you
		    // want to pass into other
		    // class's main here.
		    Object[] lmtpArgList = new Object[1];
		    lmtpArgList[0] = null;

		    if ( mailMessage != null ) {
		    	lmtpArgList[0] = new String[] {
			    		new String("--address"), new String(zimbraServer),
			    		new String("--port"), new String(zimbraPort),
			    		new String("--recipient"), new String(recipient),
			    		new String("--sender"), new String(sender),
			    		new String(mailMessage),
			    };
		    } else if ( mailFolder != null ) {
		    	lmtpArgList[0] = new String[] {
			    		new String("--address"), new String(zimbraServer),
			    		new String("--directory"), new String(mailMessage),
			    		new String("--port"), new String(zimbraPort),
			    		new String("--recipient"), new String(recipient),
			    		new String("--sender"), new String(sender),
			    };
		    } else {
				// TODO: What to do when xml doesn't have a message file to inject?
				mLog.error("Need either directory or filename for lmtp test");
				return (mTestPassed = false);
		    }

		    // Execute lmtpinject.main
		    mainMethod.invoke(
		    		null,  // main is static, so no object is required
		    		lmtpArgList);

		    // Success!
	        return (mTestPassed = true);



		} catch (NoSuchMethodException ex) {
			mLog.error("Class " + LMTPINJECT_CLASS + " does not define public static void main(String[]).");
	        return (mTestPassed = false);
		} catch (InvocationTargetException ex) {
			mLog.error("Exception while executing " + LMTPINJECT_CLASS + ": " +ex.getTargetException());
	        return (mTestPassed = false);
		} catch (IllegalAccessException ex) {
			mLog.error("main(String[]) in class " + LMTPINJECT_CLASS + " is not public");
	        return (mTestPassed = false);
		}


	}

	private boolean doLMTPInjectFile(Element test, String lmtpFileNameFullPath)
		throws HarnessException, MessagingException, IOException, LmtpProtocolException
	{

		File mimeFile = new File(lmtpFileNameFullPath);
		String mimeFileString = lmtpFileNameFullPath;

		Element elem = test.getOptionalElement(E_LMTP_INJECT_REQUEST);

		String lmtpTo = elem.getAttribute(A_LMTP_TO, null); // TODO: update to support multiple To: recipients
		String lmtpFrom = elem.getAttribute(A_LMTP_FROM, null);

		Element modifyElement = elem.getOptionalElement(A_LMTP_MODIFY);

		String resultMessage = "doLMTPInject: File: (" + lmtpFileNameFullPath +") To ("+lmtpTo+
		") From ("+lmtpFrom+") Server: ("+ mLmtpServer +")";
		mLog.debug(resultMessage);

		if ( StringUtil.isNullOrEmpty(lmtpTo)
			|| StringUtil.isNullOrEmpty(lmtpFrom)
			|| StringUtil.isNullOrEmpty(mLmtpServer) )
		{
			resultMessage = resultMessage + ": doLMTPInject needs a to, from, and server";
			throw new HarnessException(resultMessage);
		}

		// Convert the file to byte[], which LmtpClient requires
		ByteArrayOutputStream bos = new ByteArrayOutputStream();

		if ( modifyElement != null ) {

			// Read in the specified MIME text file into a MimeMessage
            MimeMessage mimeMessage = null;
            FileInputStream fis = null;

            try {

                // Open the text file
                fis = new FileInputStream(lmtpFileNameFullPath);

                // Create a mime message from the file
                Properties props = new Properties();
                Session session = Session.getInstance(props);
                mimeMessage = new MimeMessage(session, fis);

            } finally {
                // flush and close "output" and its underlying streams
                Utilities.close(fis, mLog);
        	}



			// If any modify elements are specified (<modify a="To">foo@bar.com</modify>),
			// then change the mime accordingly
			mimeMessage = expandMime(modifyElement, mimeMessage);

			FileOutputStream fos = null;
			try {

				// Create temp file.
				mimeFile = new File(coreController.rootDebugDir, System.currentTimeMillis() + ".txt");

				mimeFileString = mimeFile.getAbsolutePath();

		        // Write to temp file
		        fos = new FileOutputStream(mimeFile);

				mimeMessage.writeTo(fos);

			} finally {
				Utilities.close(fos, mLog);
			}

		}



		// Save the Mime for logging
		// Re-use the csRequest for this
		mResponseDetails = mResponseDetails + " LMTP File: " + mimeFileString;


		// Although the harness needs to only send to one person, LmtpClient
		// allows for multiple addresses
		List<String> recipients =  new ArrayList<String>(1);
		recipients.add(lmtpTo);

		// Use LmtpClient to send the message
		LmtpClient client = null;
		try {

			client = new LmtpClient(mLmtpServer, 7025);

			mLog.debug("LMTP Inject:\n"+ bos.toString());

			boolean ok = client.sendMessage(mimeFile, recipients, lmtpFrom, mimeFileString);

			if ( test.getOptionalElement(E_LMTP_INJECT_RESPONSE) != null ) {

				if (doLMTPInjectResponse(test.getOptionalElement(E_LMTP_INJECT_RESPONSE), client.getResponse())) {
					return (true);
				}

			} else {

				// Nothing required in the repsonse.  Return true if success, false if failure
				if (ok) {
					mLog.debug("sent "+ mimeFileString);
					resultMessage = resultMessage + ": Sent the file";
					mResponseDetails = mResponseDetails + " ok\n";
					return true;
				} else {
					mResponseDetails = mResponseDetails + " not ok (" + client.getResponse() + ")\n";
				}

			}

		} finally {
			if ( client != null ) {
				client.close();
			}
		}

		return false;

	}

	protected boolean doLMTPInjectResponse(Element test, String lmtpResponse) {

		String code = test.getAttribute(A_RESPONSE_CODE, null);
		mLog.debug("doLMTPInjectResponse code: " + code);
		mLog.debug("doLMTPInjectResponse response: " + lmtpResponse);

		// Response code has the format: 552 5.2.2 Over quota
		if ( lmtpResponse.indexOf(" ") > 0 ) {

			// Strip the code off
			String lmtpCode = lmtpResponse.substring(0, lmtpResponse.indexOf(" ") );

			if ( code != null ) {
				if (Pattern.matches(code, lmtpCode)) {
					mResponseDetails = mResponseDetails + " code(" + code + ")";
					return true;
				}
				else {
					mResponseDetails = mResponseDetails + " code(" + code + ") did not match (" + lmtpResponse + ")";
					return false;
				}
			}

		}

		mResponseDetails = mResponseDetails + " doLMTPInjectResponse no response code!";
		return false;
	}


	protected boolean doLMTPInject(Element test)
		throws HarnessException, ServiceException, MessagingException, IOException, LmtpProtocolException
	{


		// Expand any remaining properties in the request
		mRequestDetails = "";
		mResponseDetails = "";

		Element elem = test.getOptionalElement(E_LMTP_INJECT_REQUEST);
		mLog.debug("elem: "+ elem);

		String lmtpFileName = elem.getAttribute(A_LMTP_FILENAME, null);
		String lmtpFolderName = elem.getAttribute(A_LMTP_FOLDERNAME, null);		
		boolean mZimbraCloud = Boolean.parseBoolean(TestProperties.testProperties.getProperty("server.zimbrax", "false"));
		
		//If deployment is Zimbra Cloud, then get LMTP server value from global.properties. For Zimbra classic, get it from testcase
		if( mZimbraCloud ) 
			mLmtpServer = TestProperties.testProperties.getProperty("zimbraLMTPServer.name", "zmc-lmtp");
		else
			mLmtpServer = elem.getAttribute(A_LMTP_SERVER, null);


		String resultMessage = "doLMTPInject: filename ("+lmtpFileName+
			") foldername ("+lmtpFolderName+") ";
		mLog.debug(resultMessage);


		// File, To, From, and Server attributes must be specified
		if (StringUtil.isNullOrEmpty(lmtpFileName)
				&& StringUtil.isNullOrEmpty(lmtpFolderName))
		{
			resultMessage = resultMessage + ": doLMTPInject needs a filename or foldername";
			throw new HarnessException(resultMessage);
		}

		mRequestDetails = mRequestDetails + "To: " + elem.getAttribute(A_LMTP_TO) + "\n";
		mRequestDetails = mRequestDetails + "From: " + elem.getAttribute(A_LMTP_FROM) + "\n";
		mRequestDetails = mRequestDetails + "Server: " + mLmtpServer + "\n";

		if ( lmtpFileName != null ) {

			File f = new File(SoapTestCore.rootZimbraQA, lmtpFileName);

			mRequestDetails = mRequestDetails + "File: " + f.getAbsolutePath() + "\n";

			return ( mTestPassed = doLMTPInjectFile(test, f.getAbsolutePath()) );

		} else {


			// Open the directory, run each file
			File rootDir = new File(SoapTestCore.rootZimbraQA, lmtpFolderName);
			File files[] = rootDir.listFiles();

			if (files != null && files.length > 0) {


				// First, run test files in this directory.
				for (int i = 0; i < files.length; i++) {
					File f = files[i];

					// Skip directories.
					if (f.isDirectory())
						continue;

					mRequestDetails = mRequestDetails + "File: " + f.getAbsolutePath() + "\n";


					if ( ! doLMTPInjectFile(test, f.getAbsolutePath()) ) {
						return ( mTestPassed = false );
					}

				}

				// TODO: should the harness support recursive directories?
				return ( mTestPassed = true);

			} else {
				throw new HarnessException(resultMessage + " no files!");
			}

		}

	}

	protected void doICalParse(Element elem) throws IOException, HarnessException {

		String iCalString = elem.getAttribute(A_ICAL_STRING, null);

		//boolean success = false; //

		String resultMessage = "doICalParse: ical ("+iCalString+")";

		if ( StringUtil.isNullOrEmpty(iCalString) ) {
			resultMessage = resultMessage + ": ical is null or empty";
// TODO:			check(success, resultMessage);
			return;
		}

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
			mLog.info("ParserException: " + ex);
			throw new HarnessException("Parse exception for " +iCalString, ex);
		}

		for ( Object oComponent : calendar.getComponents() )
		{
		    Component component = (Component)oComponent;
		    mLog.info("Component [" + component.getName() + "]");

		    for ( Object oProperty : component.getProperties() ) {
		        Property property = (Property)oProperty;
	        	mLog.info("Property [" + property.getName() + ", " + property.getValue() + "]");
		    }
		}
	}

	protected MimeMultipart expandICal(Element elem, MimeMessage mime)
		throws HarnessException
	{

		mLog.debug("do expandICal: " + elem);


		String attr = elem.getAttribute("a", null);
		String value = elem.getText();

		if ( StringUtil.isNullOrEmpty(attr) || StringUtil.isNullOrEmpty(value) )
		{
			throw new HarnessException("expandMime needs attr and value");
		}

		mLog.debug("attr: "+attr+", value: "+value);


		MimeMultipart mmp = null;
		String iCalString = null;

		try {


			// Convert the mime to multipart, which is required for iCal
			// If not a mime, an exception will be thrown.
			mmp = (MimeMultipart) mime.getContent();

			for (int i = 0; i < mmp.getCount(); i++) {
				BodyPart bp = mmp.getBodyPart(i);

				if ( bp.isMimeType("text/calendar") ) {
					mLog.info("iCal: " + bp.getContentType());

					// Need to read into a Calendar object for folding/unfolding
					System.setProperty("ical4j.unfolding.relaxed", "true");

					CalendarBuilder builder = new CalendarBuilder();
					Calendar iCal = builder.build(bp.getInputStream(), "utf-8");

					// Convert the iCal to a String, so that we can manipulate it
					// Some of the Calendar manipulations may be limited in what
					// they can accomplish.  Modifying the string directly, should
					// be more flexible for QA
					//
					iCalString = iCal.toString();

					mLog.debug("Initializing iCalString to " + iCalString);


				}

			}

		} catch (Exception e) {
			e.printStackTrace();
			throw new HarnessException("expand iCal exception", e);
		}


		if ( iCalString == null ) {
			throw new HarnessException("expandICal - no calendar part!");
		}

		mLog.debug("iCalString was: \n"+ iCalString);


		// Search for the pattern ^attr:value$
		int start = iCalString.indexOf(attr+":");
		int finish = iCalString.indexOf("\n", start);

		if ( start < 0 || finish < 0 ) {
			throw new HarnessException("expandMime - unable to find attr: " + attr);
		}


		// Replace the current value in the string with  the new one
		iCalString = iCalString.substring(0, start) +
						attr + ":" + value +
						iCalString.substring(finish);

		mLog.debug("iCalString is now: \n"+ iCalString);

		try {

			CalendarBuilder builder = new CalendarBuilder();
			Calendar newICal = new Calendar();

			newICal = builder.build(new ByteArrayInputStream(iCalString.getBytes()), "utf-8");

			for (int i = 0; i < mmp.getCount(); i++) {
				BodyPart bp = mmp.getBodyPart(i);

				if ( bp.isMimeType("text/calendar") ) {

					mmp.removeBodyPart(i);
					BodyPart mbp = new MimeBodyPart();
					mbp.setDataHandler(new DataHandler(new CalendarDataSource(newICal, "", "meeting.ics")));
					mmp.addBodyPart(mbp, i);

				}

			}
		} catch (Exception e) {
			e.printStackTrace();
			throw new HarnessException("Error converting iCal back to MimeMultipart", e);
		}

		return (mmp);

	}

	protected MimeMessage expandMime(Element elem, MimeMessage mime)
			throws HarnessException
	{

		mLog.debug("do expandMime: " + elem);

		if (elem == null ) {
			mLog.debug("expandMime: no modifications specified");
			return (mime);
		}

		for (Iterator<Element> it = elem.elementIterator(); it.hasNext();) {

			Element e = it.next();


			// format: <modify a="attr">value</modify>
			String attr = e.getAttribute("a", null);
			String value = e.getText();

			if ( StringUtil.isNullOrEmpty(attr) || StringUtil.isNullOrEmpty(value) )
			{
				throw new HarnessException("expandMime needs attr and value");
			}

			mLog.debug("attr: "+attr+", value: "+value);

			if (e.getName().equals(A_LMTP_MODIFY_HEADER)) {

				// Take care of To, From, Subject, Cc, Bcc, etc.
				try {
					mime.setHeader(attr, value);
				} catch (MessagingException e1) {
					throw new HarnessException("newMime.setHeader() in expandMime", e1);
				}


			}

			if (e.getName().equals(A_LMTP_MODIFY_ICAL)) {

				MimeMultipart mmp = expandICal(e, mime);

				try {

					mime.setContent(mmp);
					mime.saveChanges();

				} catch (MessagingException e1) {
					e1.printStackTrace();
					throw new HarnessException("Unable to convert from MultipartMime to Mime", e1);
				}

			}


		}


		return mime;

	}



	private boolean executeStafPostqueue() throws HarnessException {

		mTeardownDetails = waitForPostfixQueue();

		return (mTestPassed);

	}

	public boolean executeTest() throws HarnessException {



		mLog.debug("MailInjectTest execute");


		// Pause, if specified
		doDelay();




		// Send SOAP tests through STAF
		long start = System.currentTimeMillis();

		try {

			doLMTPInject(mTest);

		} catch (Exception ex) {
			throw new HarnessException("Exception while executing LMTP test", ex);
		}

		// Now, wait for the queue
		if ( !testFailed() ) {
			executeStafPostqueue();
		}


		long finish = System.currentTimeMillis();

		mTime = finish - start;
		if ( !checkExecutionTimeframe() ) {
			mLog.info("Execution took too long or too short");
			mTestPassed = false;  // Execution took too long!
		}



		mLog.debug("LMTP Inject Test " + (testFailed() ? "failed":"passed") + " in " + mTime + " msec");
		return (!testFailed());

	}

    // A list of servers that run Mailbox, MTA, etc.
    static protected List<String> zimbraMtaServers = new ArrayList<String>();

    static protected void addMtaServer(String mtaServer) {


		if ( mtaServer == null || mtaServer.equals("") ) {
			return;
		}

		if (zimbraMtaServers.contains(mtaServer)) {
			mLog.debug("POSTFIX QUEUE: skipped "+ mtaServer);
			return;  // no more actions are necessary
		}

		// Add the new server to the list
		zimbraMtaServers.add(mtaServer);
		mLog.warn("POSTFIX QUEUE: added "+ mtaServer +" to the zimbraMtaServers list");

	}

	static protected String getMtaServer(String mailboxServer) {

		if ( !usingStaf ) {
			 mLog.warn("usingStaf is set: " + usingStaf);
			return (mailboxServer);
		}


		final String STAF_ZIMBRA_SERVICE = "PROCESS";
		final String STAF_ZIMBRA_COMMAND = "/bin/su ";
		final String ZIMBRA_COMMAND = "zmprov gs "+ mailboxServer +" zimbraSmtpHostname | grep zimbraSmtpHostname";
		final String STAF_ZIMBRA_PARMS = "\"- zimbra -c \\\""+ ZIMBRA_COMMAND +"\\\"\"";


		STAFHandle handle = null;

       	try
        {

            handle = new STAFHandle(SoapTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());


	        try
	        {


	            // Build the STAF PROCESS command
	        	StringBuffer stafCommand = new StringBuffer();
	        	stafCommand.append(" START COMMAND ");
	        	stafCommand.append(STAF_ZIMBRA_COMMAND);
	        	stafCommand.append(" PARMS " + STAF_ZIMBRA_PARMS);
	        	stafCommand.append(" RETURNSTDOUT RETURNSTDERR WAIT ");


        		mLog.debug("Execute STAF " + mailboxServer + " " + STAF_ZIMBRA_SERVICE + " " + stafCommand);

	            STAFResult stafResult = handle.submit2(mailboxServer, STAF_ZIMBRA_SERVICE, stafCommand.toString());

            	// First, check for STAF errors, like unable to contact host
            	if ( stafResult.rc != STAFResult.Ok ) {

	            	mLog.warn("STAF return code:\n" + stafResult.rc);

	            	// Fall back to the mailbox host
	            	return (mailboxServer);

	            }


            	// Unwind the result object.
            	// zmlmtpinject returns 0 on success and >0 on failure
	            //
             	STAFMarshallingContext mc = STAFMarshallingContext.unmarshall(stafResult.result);
            	mLog.debug("zmprov results:\n" + mc.toString());

             	Map resultMap = (Map)mc.getRootObject();
            	List returnedFileList = (List)resultMap.get("fileList");
            	Map stdoutMap = (Map)returnedFileList.get(0);
            	String processOut = (String)stdoutMap.get("data");

            	if ( processOut != null ) {

	            	// Log the postqueue status:
            		mLog.debug("zmprov:\n" + processOut);

            		Properties props = new Properties();
            		try {
                		props.load(new ByteArrayInputStream(processOut.getBytes()));
            		} catch (IOException e) {
        	        	mLog.error("getMtaServer threw exception - returning default", e);
        	        }

            		return ( props.getProperty("zimbraSmtpHostname", mailboxServer) );

            	}
	        } finally {

	            try {
					handle.unRegister();
				} catch (STAFException e) {
		        	mLog.warn("Error unregistering with STAF, RC:" + e.rc, e);
				}

	        }

        } catch (STAFException e) {

        	mLog.warn("Error registering or unregistering with STAF, RC:" + e.rc, e);
        	mLog.warn("Example:  RC: 21 is STAFNotRunning");
        	mLog.warn("See Return Codes here:  http://staf.sourceforge.net/current/STAFJava.htm#Header_STAFResult");

        }


		return (mailboxServer);

	}


	public static String waitForPostfixQueue() throws HarnessException {

		// Wait here until the postfix queue is cleared
		long delay = 15000;
		try {
			delay = Integer.parseInt(SoapTestMain.globalProperties.getProperty("postfixdelay.msec", "15000"));
		} catch (NumberFormatException e) {
			mLog.warn("postfixdelay.msec is not defined, using " + delay);
		}

		StringBuffer buffer = new StringBuffer();
		for (Iterator<String> iter = zimbraMtaServers.iterator(); iter.hasNext(); ) {
			buffer.append(waitForPostfixQueue(delay,iter.next())).append("\n");
		}

		return (buffer.toString());
	}

	static protected String waitForPostfixQueue(long delay, String STAF_POSTFIX_HOST) throws HarnessException {

		if ( delay <= 0 ) {
			return ("specified delay was less than 0");
		}

		if ( !usingStaf )
		{
			try {
				mLog.info("Waiting 3000ms on Windows");
				Thread.sleep(3000);
			} catch (InterruptedException e) {}
			return ("Waited 3000ms on Windows");
		}

		StringBuffer response = new StringBuffer();
		response.append("postqueue -p: Host ").append(STAF_POSTFIX_HOST).append("\n");

		final String STAF_POSTFIX_SERVICE = "PROCESS";
		final String ZIMBRA_POSTFIX_COM = "/opt/zimbra/common/sbin/postqueue ";
		final String ZIMBRA_POSTFIX_PARMS = "-p ";
		final String ZIMBRA_POSTFIX_QUEUE_EMPTY_RESULT = "Mail queue is empty";

		final int step = 1000; // 1000 msec between wait

		STAFHandle handle = null;

       	try
        {

            handle = new STAFHandle(SoapTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());


	        try
	        {


	            // Build the STAF PROCESS command
	        	StringBuffer stafCommand = new StringBuffer();
	        	stafCommand.append(" START COMMAND ");
	        	stafCommand.append(ZIMBRA_POSTFIX_COM);
	        	stafCommand.append(" PARMS " + ZIMBRA_POSTFIX_PARMS);
	        	stafCommand.append(" RETURNSTDOUT RETURNSTDERR WAIT ");


	        	// delay is the total number of msec to wait for
	        	// So, loop here for delay/1000 times, pausing 1000 msec inbetween
	        	for (int i = 0; i < delay; i = i + step ) {

	        		mLog.debug("Execute STAF " + STAF_POSTFIX_HOST + " " + STAF_POSTFIX_SERVICE + " " + stafCommand);

		            STAFResult stafResult = handle.submit2(STAF_POSTFIX_HOST, STAF_POSTFIX_SERVICE, stafCommand.toString());

	            	// First, check for STAF errors, like unable to contact host
	            	if ( stafResult.rc != STAFResult.Ok ) {
		            	mLog.warn("STAF return code:\n" + stafResult.rc);

		            	// Fall back to delaying
		    			try {
		    				long remainder = delay - (step * i);
			            	mLog.debug("Waiting for "+ remainder +" msec");
		    				Thread.sleep(remainder);
		    			} catch (InterruptedException e) {
		    				e.printStackTrace();
		    			}

		            	return ("Couldnt contact STAF on " + STAF_POSTFIX_HOST);
		            }


	            	// Unwind the result object.
	            	// zmlmtpinject returns 0 on success and >0 on failure
		            //
	             	STAFMarshallingContext mc = STAFMarshallingContext.unmarshall(stafResult.result);
	            	mLog.debug("postqueue -p results:\n" + mc.toString());

	             	Map resultMap = (Map)mc.getRootObject();
	            	List returnedFileList = (List)resultMap.get("fileList");
	            	Map stdoutMap = (Map)returnedFileList.get(0);
	            	String processOut = (String)stdoutMap.get("data");

	            	if ( processOut != null ) {

		            	// Log the postqueue status:
	            		mLog.debug("postqueue -p:\n" + processOut);
	            		response.append(new Date()).append(":\n");
	            		response.append(processOut).append("\n");

		            	if ( processOut.trim().equals(ZIMBRA_POSTFIX_QUEUE_EMPTY_RESULT) ) {
		            		// The queue was flushed within the correct time
		            		return (response.toString());
		            	}

	            	}

	            	mLog.debug("postfix queue isn't empty.  wait for a second and check again ...");
	            	mLog.debug("delay is "+delay+"; i is "+i+"; step is "+step);

	    			try {
	    				Thread.sleep(step);
	    			} catch (InterruptedException e) {
	    				e.printStackTrace();
	    			}

            	}

	        	response.append(new Date()).append("Ran out of time\n");

	        	// Try to remove the mail item, so that we won't keep waiting in subsequent tests
	        	response.append(flushPostfixQueue());

	    		return (response.toString());


	        } finally {

	            try {
					handle.unRegister();
				} catch (STAFException e) {
		        	mLog.warn("Error unregistering with STAF, RC:" + e.rc, e);
				}

	        }

        } catch (STAFException e) {

        	mLog.warn("Error registering or unregistering with STAF, RC:" + e.rc, e);
        	mLog.warn("Example:  RC: 21 is STAFNotRunning");
        	mLog.warn("See Return Codes here:  http://staf.sourceforge.net/current/STAFJava.htm#Header_STAFResult");

        }


		return (response.toString());


	}

	static protected String flushPostfixQueue() throws HarnessException {

		if ( !usingStaf )
		{
			return ("Unable to flush queue (postsuper -d ALL) without STAF\n");
		}

		StringBuffer buffer = new StringBuffer();

		for (Iterator<String> iter = zimbraMtaServers.iterator(); iter.hasNext(); ) {
			buffer.append(flushPostfixQueue(iter.next())).append("\n");
		}

		return (buffer.toString());
	}


	static protected String flushPostfixQueue(String STAF_POSTFIX_HOST) throws HarnessException {

		if ( !usingStaf )
		{
			return ("Unable to flush queue (postsuper -d ALL) without STAF\n");
		}

		StringBuffer response = new StringBuffer("");

		final String STAF_POSTFIX_SERVICE = "PROCESS";
		final String ZIMBRA_POSTFIX_COM = "/opt/zimbra/common/sbin/postsuper ";
		final String ZIMBRA_POSTFIX_PARMS = "-d ALL ";
//		final String ZIMBRA_POSTFIX_QUEUE_EMPTY_RESULT = "Mail queue is empty";


		STAFHandle handle = null;

       	try
        {

            handle = new STAFHandle(SoapTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());


	        try
	        {


	            // Build the STAF PROCESS command
	        	StringBuffer stafCommand = new StringBuffer();
	        	stafCommand.append(" START COMMAND ");
	        	stafCommand.append(ZIMBRA_POSTFIX_COM);
	        	stafCommand.append(" PARMS " + ZIMBRA_POSTFIX_PARMS);
	        	stafCommand.append(" RETURNSTDOUT RETURNSTDERR WAIT ");


        		mLog.debug("Execute STAF " + STAF_POSTFIX_HOST + " " + STAF_POSTFIX_SERVICE + " " + stafCommand);
	            response.append("STAF " + STAF_POSTFIX_HOST + " " + STAF_POSTFIX_SERVICE + " " + stafCommand);

	            STAFResult stafResult = handle.submit2(STAF_POSTFIX_HOST, STAF_POSTFIX_SERVICE, stafCommand.toString());

            	// First, check for STAF errors, like unable to contact host
            	if ( stafResult.rc != STAFResult.Ok ) {
	            	mLog.warn("STAF return code:\n" + stafResult.rc);
	            	return ("Couldnt contact STAF on " + STAF_POSTFIX_HOST);
	            }


            	// Unwind the result object.
            	// zmlmtpinject returns 0 on success and >0 on failure
	            //
             	STAFMarshallingContext mc = STAFMarshallingContext.unmarshall(stafResult.result);
            	mLog.debug("postqueue -p results:\n" + mc.toString());

             	Map resultMap = (Map)mc.getRootObject();
            	List returnedFileList = (List)resultMap.get("fileList");
            	Map stdoutMap = (Map)returnedFileList.get(0);
            	String processOut = (String)stdoutMap.get("data");
            	Map stderrMap = (Map)returnedFileList.get(1);
            	String processErr = (String)stderrMap.get("data");

            	if ( processOut != null ) {
            		response.append(processOut + "\n");
            	}

            	if ( processErr != null ) {
            		response.append(processErr + "\n");
            	}

	    		return (response.toString());


	        } finally {

	            try {
					handle.unRegister();
				} catch (STAFException e) {
		        	mLog.warn("Error unregistering with STAF, RC:" + e.rc, e);
				}

	        }

        } catch (STAFException e) {

        	mLog.warn("Error registering or unregistering with STAF, RC:" + e.rc, e);
        	mLog.warn("Example:  RC: 21 is STAFNotRunning");
        	mLog.warn("See Return Codes here:  http://staf.sourceforge.net/current/STAFJava.htm#Header_STAFResult");

        }


		return (response.toString());

	}





	@Override
	protected boolean dumpTest() {
		return false;
	}

	protected String getTestName() {
		return ("MailInjectTest");
	}


}
