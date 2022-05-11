package com.zimbra.qa.bugreports;

import java.io.File;

import org.apache.commons.cli.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.config.Configurator;

public class ResultsMain {
    private static Logger mLogger = LogManager.getLogger(ResultsMain.class);

    public static File mRoot = new File(".");

    public static void usage(Options o) {

        HelpFormatter hf = new HelpFormatter();
        hf.printHelp("ResultsMain -h | -b <arg> -d <arg> [ -l <log4j> ]", o, true);
        System.exit(1);

    }

    protected static void parseArgs(String[] args) {
        Option h = new Option("h", "help", false, "print usage");
        Option l = new Option("l", "log4j", true, "log4j.properties file");
        Option b = new Option("b", "base", true, "base folder (i.e. TestNG folder containing testng-results.xml file");

        Options options = new Options();
        options.addOption(h);
        options.addOption(l);
        options.addOption(b);

        try {
            CommandLineParser parser = new GnuParser();
            CommandLine cl = parser.parse(options, args);
            // Option: -l <log4j.properties>
            if (cl.hasOption("l")) {
                String propertiesFile = cl.getOptionValue("l");
                File log4jProperties = new File(propertiesFile);
                if (log4jProperties.exists()) {
                    Configurator.initialize(null, propertiesFile);
                    mLogger.debug("Loaded log4j.properites: " + propertiesFile);
                }
            }

            if (cl.hasOption("h")) {
                usage(options);
            }

            if (cl.hasOption("b")) {
                mRoot = new File(cl.getOptionValue("b"));
            }

        } catch (ParseException pe) {
            mLogger.error(pe);
            usage(options);
        }
    }

    public static void main(String[] args) throws Exception {
        // Configure logging
        Configurator.reconfigure();
        mLogger.info("Starting ...");

        // Parse any args
        parseArgs(args);

        // Create the new core
        ResultsCore core = new ResultsCore();

        // Execute it
        core.execute(mRoot);

        // Done!
        System.out.println(core.getStatus());
    }
}
