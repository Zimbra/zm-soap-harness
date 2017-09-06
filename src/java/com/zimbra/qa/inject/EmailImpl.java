package com.zimbra.qa.inject;

import java.io.IOException;
import java.io.PrintStream;
import java.util.Properties;

import javax.mail.MessagingException;
import javax.mail.NoSuchProviderException;
import javax.mail.Session;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import javax.mail.util.SharedFileInputStream;

import com.sun.mail.smtp.SMTPSSLTransport;
import com.sun.mail.smtp.SMTPTransport;

public class EmailImpl {
    private Session mSession;
    private String serverResponse;

    protected String mHost;
    protected int mPort;
    protected String mUser;
    protected String mPassword;	     
    protected boolean mSsl = false; 
    protected boolean mStarttls = false;
    
    protected static final int defaultSmtp = 25;
    protected static final int defaultSslSmtp = 465;

    private Properties props = new Properties();	 

    /*
     * Need to figure out how to implement DummySSLSocketFactory in a STAF
     * service.  Without the following code, you will get a
     * "javax.net.ssl.SSLHandshakeException" error.  With the code, you will
     * get a "ClassNotFoundException" since STAF doesn't build the classpath
     * for the service.
     */
    static{
    	java.security.Security.setProperty("ssl.SocketFactory.provider",
		  "com.zimbra.qa.trust.DummySSLSocketFactory");
    }
     

    public EmailImpl(String host, int port, String user, String password,
			boolean auth, boolean ssl, boolean startls) {

		mHost = host;
		mPort = port;
		mUser = user;
		mPassword = password;
		mSsl = ssl;
		mStarttls = startls;
		serverResponse="";
		props.setProperty("mail.smtp.connectiontimeout", "1000");

		if (mPort == -1) {
			if (mSsl)
				mPort = defaultSslSmtp;
			else
				mPort = defaultSmtp;
		}

		if (!auth) {
			mUser = null;
			mPassword = null;
		} else {
			if (mSsl)
				props.setProperty("mail.smtps.auth", "true");
			if (!mSsl)
				props.setProperty("mail.smtp.auth", "true");
		}

		if (mSsl)
			props.setProperty("mail.smtp.ssl.protocols", "true");

		if (!mSsl && mStarttls)
			props.setProperty("mail.smtp.starttls.enable", "true");

		
		props.remove("mail.smtp.from");
		
		mSession = Session.getInstance(props);

	}


    public void sendMessage(String mimefilename, String[] to, String sender)
			throws MessagingException, IOException {

		// Convert the list of addresses to internetaddress[]
		StringBuilder sb = new StringBuilder("");
		for (String s : to)
			sb.append(s).append(",");
		InternetAddress[] a = InternetAddress.parse(sb.toString());

		if ( sender != null ) {
			mSession.getProperties().setProperty("mail.smtp.from", sender);
		}
		
		SharedFileInputStream sfis = null;
		MimeMessage mimeMessage = null;
		try {
			
			sfis = new SharedFileInputStream(mimefilename);
			mimeMessage = new MimeMessage(mSession, sfis);

			SMTPTransport transport = null;
			try {

				transport = getTransport();
				transport.connect(mHost, mPort, mUser, mPassword);
				transport.sendMessage(mimeMessage, a);
			} finally {
				// Disconnect
				serverResponse=transport.getLastServerResponse();
				transport.close();
				transport = null;
			}

		} finally {
			if (mimeMessage != null)
			{
				mimeMessage = null;
			}
			if ( sfis != null ) {
				sfis.close();
				sfis = null;
			}
			
		}

	}
     
   private SMTPTransport getTransport() throws NoSuchProviderException {
	   
	   //	   Connect				
	   //mSession.setDebug(true);
	   SMTPTransport transport = null;

	   if (!mSsl)
		   transport = (SMTPTransport) mSession.getTransport("smtp");
	   else
		   transport = (SMTPSSLTransport)mSession.getTransport("smtps");

	   return transport;

   }

   public void setDebugStream(PrintStream out)
   {
	   mSession.setDebugOut(out);

   }
   
   public String getServerResponse() {
	   return serverResponse;
   }
}
