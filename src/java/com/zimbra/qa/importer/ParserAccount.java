package com.zimbra.qa.importer;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

public class ParserAccount extends ParserBase {

    // General debug logger
    private static Logger mLog = LogManager.getLogger(ParserAccount.class.getName());

    public ParserAccount(String inputFile) {
        super(inputFile);
    }

    public HashMap<String, Object> parseInputFile() throws IOException {
        mLog.debug("ParserAccount.parseInputFile()");
        // Use the base parser to get all the attribute values
        HashMap<String, Object> attrs = super.parseInputFile();

        // Then, handle some special cases

        // TODO:
        // Why does zimbraZimletAvailableZimlets throw an exception: invalid attr type:
        // zimbraZimletAvailableZimlets [Ljava.lang.Object;

        // TODO:
        // Why does zimbraPrefStandardClientAccessilbityMode throw an exception:
        // createAccount invalid attr name: [LDAP: error code 17 -
        // zimbraPrefStandardClientAccessilbityMode: attribute type undefined]

        // Remove any skipped attributes
        List<String> skipped = Arrays.asList("cn", "mail", "objectClass", "sn", "uid", "userPassword", "zimbraId",
                "zimbraMailHost", "zimbraMailTransport", "zimbraLastLogonTimestamp", "zimbraMailDeliveryAddress",
                "zimbraZimletAvailableZimlets", "zimbraPrefStandardClientAccessilbityMode");

        for (String key : skipped) {
            if (attrs.containsKey(key))
                attrs.remove(key);
        }

        // BEGIN: zimbraMailSieveScript - a multiline attribute
        RandomAccessFile rafReader = null;
        try {
            rafReader = new RandomAccessFile(InputFile, "r");
            String line;
            StringBuilder sb = null;
            while ((line = rafReader.readLine()) != null) {

                if (line.startsWith("zimbraMailSieveScript: ")) {
                    sb = new StringBuilder();
                    sb.append(line.substring("zimbraMailSieveScript: ".length())).append("\n");
                    while ((line = rafReader.readLine()) != null) {
                        if (line.startsWith("zimbra"))
                            break;
                        sb.append(line).append("\n");
                    }
                    break;
                }
            }
            if (sb != null) {
                if (attrs.containsKey("zimbraMailSieveScript"))
                    attrs.remove("zimbraMailSieveScript");
                attrs.put("zimbraMailSieveScript", sb.toString());
            }
            // END: zimbraMailSieveScript

            // BEGIN: zimbraQuotaWarnMessage - the default message contains the ":"
            // character, which breaks the ParserBase.parseInputFile() method
            String zimbraQuotaWarnMessage = null;
            for (String key : attrs.keySet()) {
                if (key.startsWith("zimbraQuotaWarnMessage")) {
                    zimbraQuotaWarnMessage = key;
                    break;
                }
            }
            attrs.remove(zimbraQuotaWarnMessage);

            rafReader.seek(0);

            while ((line = rafReader.readLine()) != null) {

                if (line.startsWith("zimbraQuotaWarnMessage: ")) {
                    attrs.put("zimbraQuotaWarnMessage", line.substring("zimbraQuotaWarnMessage: ".length()));
                    break;
                }
            }
            // END: zimbraQuotaWarnMessage
            // BEGIN: zimbraInterceptSubject - the default message contains the ":"
            // character, which breaks the ParserBase.parseInputFile() method
            String zimbraInterceptSubject = null;
            for (String key : attrs.keySet()) {
                if (key.startsWith("zimbraInterceptSubject")) {
                    zimbraInterceptSubject = key;
                    break;
                }
            }
            attrs.remove(zimbraInterceptSubject);

            rafReader.seek(0);
            while ((line = rafReader.readLine()) != null) {

                if (line.startsWith("zimbraInterceptSubject: ")) {
                    attrs.put("zimbraInterceptSubject", line.substring("zimbraInterceptSubject: ".length()));
                    break;
                }
            }
            // END: zimbraInterceptSubject
            // BEGIN: zimbraNewMailNotificationBody - the default message contains the ":"
            // character, which breaks the ParserBase.parseInputFile() method
            String zimbraNewMailNotificationBody = null;
            for (String key : attrs.keySet()) {
                if (key.startsWith("zimbraNewMailNotificationBody")) {
                    zimbraNewMailNotificationBody = key;
                    break;
                }
            }
            attrs.remove(zimbraNewMailNotificationBody);

            rafReader.seek(0);
            while ((line = rafReader.readLine()) != null) {

                if (line.startsWith("zimbraNewMailNotificationBody: ")) {
                    attrs.put("zimbraNewMailNotificationBody",
                            line.substring("zimbraNewMailNotificationBody: ".length()));
                    break;
                }
            }
            // END: zimbraNewMailNotificationBody
            return (attrs);
        } catch (FileNotFoundException e) {
            mLog.warn("FileNotFoundException during reading  " + InputFile + " " + e);
        } catch (IOException e) {
            mLog.warn("IOException during reading  " + InputFile + " " + e);
        } finally {
            if (rafReader != null) {
                try {
                    rafReader.close();
                } catch (IOException e) {
                    mLog.error("Unable to close rafReader in finally", e);
                }
            }
        }
        return attrs;
    }
}
