package com.zimbra.qa.inject;

import java.io.IOException;

import javax.mail.MessagingException;

import com.ibm.staf.STAFResult;
import com.zimbra.qa.inject.INJECTStaf.SmtpConfig;

public class Driver {

	/**
	 * @param args
	 * @throws IOException 
	 * @throws MessagingException 
	 */
	public static void main(String[] args) throws MessagingException, IOException {

		SmtpConfig config = new SmtpConfig();
		config.sendto = "admin@qa60.lab.zimbra.com";
		config.from = "admin@qa60.lab.zimbra.com";
		config.host = "qa60.lab.zimbra.com";
		config.msg = "/p4/matt/main/ZimbraQA/data/TestMailRaw/email01/msg01.txt";
		config.auth = false;
		config.ssl = false;
		config.startls = false;
		config.user = "admin@qa60.lab.zimbra.com";
		config.password = "test123";

		INJECTStaf staf = new INJECTStaf();	
		staf.createParser();
		STAFResult r = staf.smtpExecute(config);
		System.out.print(r.result);
		System.out.print("RC: "+ r.rc);
		
	}

}
