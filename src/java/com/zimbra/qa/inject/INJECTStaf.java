package com.zimbra.qa.inject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.StringTokenizer;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.config.Configurator;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFResult;
import com.ibm.staf.service.STAFCommandParseResult;
import com.ibm.staf.service.STAFCommandParser;
import com.ibm.staf.service.STAFServiceInterfaceLevel30;




public class INJECTStaf implements STAFServiceInterfaceLevel30 {
	
    private static Logger mLog = LogManager.getLogger(INJECTStaf.class.getName());
    private static String mLogConfig = "/tmp/log4j.properties";

    protected STAFHandle fHandle;
	private STAFCommandParser fExecuteParser;
	private STAFCommandParser fHelpParser;
	private static String helpString = "Inject Service Help \n" + 
		    "HELP \n" + 
		    "SMTP \n" + 
		    "\t TO <recipients,seperated by ','>\n" +
		    "\t FROM <sender's email address>\n" +
		    "\t SUBJECT <email subject> \n" +
		    "\t MESSAGE <message if injecting a mime message> \n" + 
		    "\t FSERVER<if the source used as message/message body is not the same box as inject service>\n" + 
		    "\t AUTH <set only when you need smtp auth\n" + 
		    "\t USER <smtp auth account name if AUTH is set> PASSWD <smtp auth password if AUTH is set>\n" + 
		    "\t PORT <smtp port if not default>\n" +
		    "\t HOST <smtp host name> \n" + 
		    "\t SSL|STARTLS <security connection setting> \n";

	public final String SMTP = "SMTP";
	public final String HELP = "HELP";

	public final String MESSAGE = "MESSAGE";
	public final String TO = "TO";
	public final String FROM = "FROM";
	public final String SUBJECT = "SUBJECT";

	public final String USER= "USER";
	public final String PASSWD = "PASSWD";
	public final String SSL = "SSL";
	public final String AUTH = "AUTH";
	public final String STARTLS = "STARTLS";
	public final String PORT = "PORT";
	public final String HOST = "HOST";

	
	public STAFResult acceptRequest(RequestInfo info) {
		mLog.debug("acceptRequest " + info.request);

		String request = getRequest(info);

		// Refresh Log4j
		configureLogger();
		
		// call the appropriate method to handle the command
        if (request.equalsIgnoreCase(SMTP)){
        	return handleSmtp(info);
        } else if(request.equalsIgnoreCase(HELP)){
        	return handleHelp(info);
        }else{
            return new STAFResult(STAFResult.InvalidRequestString,"Unknown INJECT (STAF) Request: " + 
                                  request);
        }
	}
	
	private STAFResult handleHelp(RequestInfo info){
		mLog.debug("handleHelp");
		return new STAFResult(STAFResult.Ok, helpString);
	}
	

	
    private void configureLogger()
    {
        File log4jProperties = new File(mLogConfig);
        if (log4jProperties.exists()) {
            Configurator.initialize(null, mLogConfig);
            mLog.debug("Loaded log4j.properites: " + mLogConfig);
        }
        else {
            Configurator.reconfigure();
	    // force root logger to be info to go around default DEBUG level issue
	    Logger root = LogManager.getRootLogger();
	    Configurator.setLevel(LogManager.getRootLogger().getName(), Level.INFO);
	    mLog.debug("Root logger changed to info");

        }
        	

    }
	
	protected STAFResult smtpParse(RequestInfo info, SmtpConfig config)
	{
		mLog.debug("smtpParse");
		
		config.machine = info.machine;
		STAFCommandParseResult result = fExecuteParser.parse(info.request);
		if ( result.rc != STAFResult.Ok) 
		{
			return (new STAFResult(STAFResult.InvalidRequestString, result.errorBuffer));
		}
		
		if (result.optionTimes(SUBJECT) > 0)
			config.sub = result.optionValue(SUBJECT);		
		if(result.optionTimes(TO)>0)
			config.sendto = result.optionValue(TO);
		if(result.optionTimes(FROM)>0)
			config.from = result.optionValue(FROM);		
		if(result.optionTimes(HOST)>0)
			config.host = result.optionValue(HOST);
		if(result.optionTimes(AUTH)>0){			
			if(result.optionTimes(USER)>0){
				config.user = result.optionValue(USER);
			}
			if(result.optionTimes(PASSWD)>0){
				config.password = result.optionValue(PASSWD);
			}	
			config.auth = true; 
		}
		if(result.optionTimes(SSL)>0)
			config.ssl = true; 
		if(result.optionTimes(PORT)>0){
			String s = result.optionValue(PORT);
			config.port = Integer.parseInt(s);
		}
		
		if(result.optionTimes(STARTLS)>0)
			config.startls = true;		
		
		if(result.optionTimes(MESSAGE)>0)
			config.msg = result.optionValue(MESSAGE);

		return (new STAFResult(STAFResult.Ok));

	}
	
	private final int FileSizeLimit = 10000; // bytes
	protected STAFResult smtpExecute(SmtpConfig config)
	{
		mLog.debug("smtpExecute");
		
		EmailImpl smtp = new EmailImpl(config.host, config.port, config.user, config.password, config.auth, config.ssl, config.startls);
		
		ByteArrayOutputStream baos = null;

		// Only log messages that are smaller than FileSizeLimit bytes
		File mime = new File(config.msg);
		if ( mime.length() < FileSizeLimit) 
		{
			baos = new ByteArrayOutputStream();
			PrintStream ps = new PrintStream(baos);
			smtp.setDebugStream(ps);
		}
		
		try
		{
			smtp.sendMessage(config.msg, config.sendto.split(","), config.from);			
		}
		catch (javax.mail.MessagingException e)
		{
			return (new STAFResult(STAFResult.Ok, readStackTrace(new ByteArrayOutputStream(), e)));
		} catch (IOException e) {
			return (new STAFResult(STAFResult.Ok, e.getMessage()));
		}
				
		return new STAFResult(STAFResult.Ok, baos == null ? "SMTP trace not logged - message size larger than "+ FileSizeLimit : smtp.getServerResponse());

	}
	
	private STAFResult handleSmtp(RequestInfo info)	
	{
		mLog.debug("handleSmtp");
		
		SmtpConfig config = new SmtpConfig();
		
		STAFResult parseResult = smtpParse(info, config);
		if ( parseResult.rc != STAFResult.Ok )
			return (parseResult);
		
		STAFResult smtpResult = smtpExecute(config);
		
		mLog.debug(smtpResult.result);
		return (smtpResult);
			
	}
	
	
	
	
	protected String getRequest(RequestInfo info) {
		StringTokenizer requestTokenizer = new StringTokenizer(info.request);
		String request = requestTokenizer.nextToken();
		return request;

	}

	public STAFResult init(InitInfo info) {

		// Refresh Log4j
		configureLogger();		
		mLog.debug("init");
		
		try {
			registerHandle(info);
		}catch(Exception e){
			return (new STAFResult(STAFResult.STAFRegistrationError, e.toString()));			
		}
		createParser();				

		return (new STAFResult(STAFResult.Ok));
	}
	protected void createParser() {
		mLog.debug("createParser");
		createSmtpParser();		
	}
	
	protected void createSmtpParser() {
		
		mLog.debug("createSmtpParser");
		
		/* SMTP 
		 * TO <Address>... 
		 * FROM <user@company.com>
		 * SUBJECT <Subject>
		 * MESSAGE <Message File> 
		 * FILE <File> 
		 * TEXTATTACHMENT <file>
		 * BINARYATTACHMENT <file>
		 * FSERVER <Machine where the msg/file is stored> 
		 * AUTH 
		 * USER  < user name used only when you specify auth>
		 * PASSWD < password used only when you specify auth>
		 * PORT <port>
		 * HOST <host>
		 * SSL 
		 * STARTLS                     
		 */	
		
		fHelpParser = new STAFCommandParser();
		fHelpParser.addOption(HELP, 1, STAFCommandParser.VALUENOTALLOWED);

		fExecuteParser = new STAFCommandParser();
		fExecuteParser.addOption(SMTP, 1, STAFCommandParser.VALUENOTALLOWED);
		fExecuteParser.addOption(TO, 1, STAFCommandParser.VALUEREQUIRED); 		// comma, seperate for a list of recipients
		fExecuteParser.addOption(FROM, 1, STAFCommandParser.VALUEREQUIRED);
		fExecuteParser.addOption(SUBJECT, 1, STAFCommandParser.VALUEREQUIRED);
		fExecuteParser.addOption(MESSAGE, 1, STAFCommandParser.VALUEREQUIRED);
		fExecuteParser.addOption(USER, 1, STAFCommandParser.VALUEREQUIRED);
		fExecuteParser.addOption(PASSWD, 1, STAFCommandParser.VALUEREQUIRED);
		fExecuteParser.addOption(PORT, 1, STAFCommandParser.VALUEREQUIRED);
		fExecuteParser.addOption(HOST, 1, STAFCommandParser.VALUEREQUIRED);
		fExecuteParser.addOption(SSL, 1, STAFCommandParser.VALUENOTALLOWED);
		fExecuteParser.addOption(AUTH, 1, STAFCommandParser.VALUENOTALLOWED);
		fExecuteParser.addOption(STARTLS, 1, STAFCommandParser.VALUENOTALLOWED);

		// Make sure that all the options line up correctly.
		fExecuteParser.addOptionNeed(SMTP, HOST);

		fExecuteParser.addOptionNeed(SUBJECT, SMTP);
		fExecuteParser.addOptionNeed(FROM, SMTP);
		fExecuteParser.addOptionNeed(TO, SMTP);
		fExecuteParser.addOptionNeed(HOST, SMTP);

		fExecuteParser.addOptionNeed(AUTH, USER);
		fExecuteParser.addOptionNeed(AUTH, PASSWD);
		fExecuteParser.addOptionGroup(SSL + " " + STARTLS, 0, 1);

	}

	public STAFResult term() {
		mLog.debug("term");
		
		try {
			unRegisterHandle();
		} catch (STAFException ex) {
			return (new STAFResult(STAFResult.STAFRegistrationError));
		}		

		return (new STAFResult(STAFResult.Ok));
	}
	
    protected void registerHandle(InitInfo info) throws STAFException {		
		mLog.debug("registerHandle");
		fHandle = new STAFHandle("STAF/SERVICE/" + info.name);
	}

	protected void unRegisterHandle() throws STAFException {
		mLog.debug("unRegisterHandle");
		fHandle.unRegister();
	}
	
	private static final String LineSeparator = System.getProperty("line.separator");
	protected static String readStackTrace(OutputStream os, Throwable e)
	{
		StringWriter sw;
		PrintWriter pw;
		
		StringBuilder sb = new StringBuilder();
		
		// Print the SMTP trace
		sb.append(os.toString()).append(LineSeparator);
		
		// Print the main exception
		sb.append(e.getMessage()).append(LineSeparator);
		sw = new StringWriter();
		pw = new PrintWriter(sw);
		e.printStackTrace(pw);
		sb.append(sw.toString()).append(LineSeparator);
		
		if ( e.getCause() != null )
		{
			sb.append(e.getCause().getMessage()).append(LineSeparator);
		}

		return (sb.toString());
	}
	
	public static class SmtpConfig
	{
		public String machine = null;
		public String sub = null;
		public String sendto = null;
		public String from = null;
		public String host = null;
		public String user = null;
		public String password = null;
		public String binary = null;
		public String text = null;
		public String msg = null;
		public String file = null;
		public String fserver = null;
		public boolean ssl = false;
		public boolean startls = false;
		public boolean auth = false;
		public int port = -1; 

	}
}
