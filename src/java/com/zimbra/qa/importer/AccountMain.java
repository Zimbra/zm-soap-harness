package com.zimbra.qa.importer;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Map;
import java.util.Properties;
import com.zimbra.common.net.SocketFactories;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.GnuParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.config.Configurator;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.soap.SoapProvisioning;

public class AccountMain {

    // General debug logger
    private static Logger mLog = LogManager.getLogger(AccountMain.class.getName());
    private static String log4jproperties = "conf/log4j.properties";
    private static String globalproperties = "conf/global.properties";

    public static String InputFile = null;
    public static String email = null;
    public static String password = null;
    public static String server = null;

	public static void usage(Options o) {
        HelpFormatter hf = new HelpFormatter();
        hf.printHelp("AccountMain -h | -i <arg>", o, true);
        System.exit(1);
	}
	
	public static void parseArgs(String[] args) {
		
		Option h = new Option("h", "help", false, "print usage");
        Option i = new Option("i", "input", true, "text output from \"zmprov ga user@domain.com\"");
        Option e = new Option("e", "email", true, "new account to create (default=account<unique>@domain.com)");
        Option p = new Option("p", "password", true, "new account's password (accountpassword)");
        Option d = new Option("d", "domain", true, "new account's domain (default=domain.com)");
        Option s = new Option("s", "server", true, "zimbra server (default=localhost)");
        Option g = new Option("g", "properties", true, "global properties file (default=conf/global.properties)");
        
        Options options = new Options();
        options.addOption(i).addOption(h).addOption(e).addOption(p).addOption(d).addOption(s).addOption(g);
        
        try {

            CommandLineParser parser = new GnuParser();

            CommandLine cl = parser.parse(options, args);

            if (cl.hasOption("h")) {
                usage(options);
            }

            if ( !cl.hasOption("i") ) {
            	usage(options);            	
            } else {
            	InputFile = cl.getOptionValue("i");
            }

            String domain = "domain.com";
            if ( cl.hasOption("d") ) {
            	domain = cl.getOptionValue("d");
            }

            email = "u" + unique() + "@" + domain;
            if ( cl.hasOption("e") ) {
            	email = cl.getOptionValue("e");
            }

            if ( cl.hasOption("p") ) {
            	password = cl.getOptionValue("p");
            }

            server = "localhost";
            if ( cl.hasOption("s") ) {
            	server = cl.getOptionValue("s");
            }
            if ( cl.hasOption("g") ) {
            	globalproperties = cl.getOptionValue("g");
            }
        } catch (ParseException ex) {
        	mLog.error("Unable to parse arguments", ex);
            usage(options);
        }
	}
	
	public static String execute() throws IOException, URISyntaxException, ServiceException {
		
		StringBuilder result = new StringBuilder();
		
		ParserBase parser = new ParserAccount(InputFile);
		Map<String, Object> attrs = parser.parseInputFile();

		Provisioning mProv = null;
		
		SoapProvisioning sp = new SoapProvisioning();
        // sp.soapSetURI(LC.zimbra_admin_service_scheme.value()+mServer+":"+mPort+AdminConstants.ADMIN_SERVICE_URI);
		URI uri = new URI("https", null, server, 7071, "/service/admin/soap/", null, null);
		sp.soapSetURI(uri.toString());
        sp.soapZimbraAdminAuthenticate();
        mProv = sp;
        
        Account a = mProv.createAccount(email, password, attrs);
        
        result.append("Created account: ").append(a.getId()).append("\n");
        result.append("email: ").append(a.getMail()).append("\n");
        result.append("password: ").append(AccountMain.password).append("\n");
        result.append("host: ").append(a.getMailHost()).append("\n");
        
        return (result.toString());
        
	}
	
	public static void main(String[] args) throws IOException {

		Configurator.reconfigure();
		if ( (new File(log4jproperties)).exists() )
		    Configurator.initialize(null, log4jproperties);
		
        // Set up SSL to accept untrusted certificates
        SocketFactories.registerProtocols(true);
        
        parseArgs(args);
        if ( password==null) {
                try {
            	Properties gProperties= new Properties();
            	gProperties.load(new FileInputStream(new File(globalproperties)));
            	password=gProperties.getProperty("admin.password");
            }catch (IOException e) {
            	mLog.error("Password Not Set: Please specify password with -p option or path of property file with -g option");
            	System.err.println("Password Not Set: Please specify password with -p option or path of property file with -g option");
            	System.exit(1);
            }
        }
		
		
		try {

			mLog.info("\n" + execute());

		} catch (Exception e) {
			mLog.error("Unable to convert account", e);
		}


	}

	private static int counter = 0;
	public static String unique() {
		return ("" + System.currentTimeMillis() + counter++);
	}
}
