package com.zimbra.qa.soap;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Properties;
import org.apache.log4j.Logger;
import org.dom4j.QName;
import com.jcraft.jsch.Channel;
import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class SecureChannelTest extends Test {
    private static Logger mLog = Logger.getLogger(SecureChannelTest.class.getName());
    public static final QName E_SECURECHANNELTEST = QName.get("schTest", SoapTestCore.NAMESPACE);
    public static final QName E_REQUEST = QName.get("request", SoapTestCore.NAMESPACE);
    public static final QName E_RESPONSE = QName.get("response", SoapTestCore.NAMESPACE);
    public static final QName E_SELECT = QName.get("select", SoapTestCore.NAMESPACE);
    public static final String E_SERVER = "server";
    public static final String E_COMMAND = "command";
    public static final String A_FILE = "file";
    public static final String A_REGEX = "regex";
    public static final String A_GROUP = "group";
    public static final String A_SET = "set";
    public static final String A_EMPTY = "emptyset";
    public static final int SERVER_PORT = 22;
    public JSch jsch = new JSch();
    public Properties config = new Properties();

    public String SchCommand = "";
    public String SchServer = "local";

    public StringBuilder SchRequest = new StringBuilder();
    public StringBuilder SchResponse = new StringBuilder();
    public SecureChannelTest() {
    }

    public SecureChannelTest(Element e, SoapTestCore core) {
        super(e, core);
    }

    public SecureChannelTest(SoapTestCore core) {
        coreController = core;
    }

    @Override
    protected boolean executeTest() throws HarnessException {
        mLog.debug("SecureChannelTest execute");

        long start = System.currentTimeMillis();
        for (Iterator<Element> i = mTest.elementIterator(); i.hasNext();) {
            Element e = i.next();
            if (e.getQName().equals(E_REQUEST)) {
                try {
                    Element eServer = e.getOptionalElement(E_SERVER);
                    if ( eServer != null )
                        SchServer = eServer.getTextTrim();
                    Element eCommand = e.getElement(E_COMMAND);
                    SchCommand = eCommand.getTextTrim();
                } catch (ServiceException se) {
                    throw new HarnessException("Invalid SecureChannel " + e, se);
                }
                // Execute the request
                executeSecureChannelTask();
            } 
        }
        mTestPassed = (mNumCheckFail == 0);
        if ( SchCommand.contains("start") || SchCommand.contains("stop") || SchCommand.contains("restart") )
        {
            int delay = 60000;
            mLog.debug("Waiting "+ delay +" msec for mailbox to be ready for soap");
            try {
                Thread.sleep(delay);
            } catch (InterruptedException e) {
                mLog.warn("Exception thrown while waiting for mailboxdctl", e);
            }
        }
        long finish = System.currentTimeMillis();
        mTime = finish - start;
        if ( !checkExecutionTimeframe() ) {
            mLog.info("Execution took too long or too short");
            return (mTestPassed = false);  // Execution took too long!
        }
        return false;
    }
    
    public void executeSecureChannelTask() throws HarnessException {
        String user;
        ArrayList<String> out = new ArrayList<String>();
        try {
            user = TestProperties.testProperties.getProperty("serverUser");
            String password = TestProperties.testProperties.getProperty("serverPassword");
            if (SchServer == null) {
                SchServer = TestProperties.testProperties.getProperty("zimbraServer.name");
            }
            config.put("StrictHostKeyChecking", "no");

            Session session = jsch.getSession(user, SchServer, SERVER_PORT);
            session.setPassword(password);
            session.setConfig(config);
            session.connect();
            Channel channel = session.openChannel("exec");
            ((ChannelExec) channel).setCommand(SchCommand);
            channel.setInputStream(null);
            ((ChannelExec) channel).setErrStream(System.err);

            InputStream in = channel.getInputStream();
            channel.connect();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in));
            String line;
            while ((line = reader.readLine()) != null) {
                out.add(line);
            }
            channel.disconnect();
            session.disconnect();
        } catch (Exception e) {
            throw new HarnessException(e.getMessage());
        }

        mLog.debug(out.toString());

    }
    
    @Override
    protected boolean dumpTest() {
        return false;
    }

    @Override
    protected String getTestName() {
        return "SecureChannelTest";
    }
}
