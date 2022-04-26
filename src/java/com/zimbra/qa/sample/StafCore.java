package com.zimbra.qa.sample;

import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Options;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.appender.ConsoleAppender;
import org.apache.logging.log4j.core.config.LoggerConfig;

import com.zimbra.cs.util.BuildInfo;

public class StafCore {

    // General debug logger
    static Logger mLog = LogManager.getLogger(StafCore.class.getName());


    public static void version() {
        BuildInfo.main(null);
    }

    public static void usage(Options o) {

        HelpFormatter hf = new HelpFormatter();
        hf.printHelp("StafTestCore -h | -v | -f <arg>", o, true);
        System.exit(1);

    }

    /**
     * Exit status is 0 if no failures, 1 otherwise.
     */
    public static void main(String args[]) throws Exception {

        StafCore core = new StafCore();
        
        String theTime = core.execute();
        
        System.out.print(theTime);
        
        System.exit(theTime != null ? 1 : 0);
        
    }


    public StafCore() {

        // Add a console appender so that output goes to the console
        ConsoleAppender appender = ConsoleAppender.newBuilder()
                .setName("console")
                .setTarget(ConsoleAppender.Target.SYSTEM_OUT)
                .build();
        LoggerContext context = (LoggerContext) LogManager.getContext(false);
        LoggerConfig loggerConfig = context.getConfiguration().getLoggerConfig(mLog.getName());
        loggerConfig.addAppender(appender, Level.INFO, null);
        context.updateLoggers();
		appender.start();
        mLog.info("New StafCore object");
    	
    }
    
    protected String execute() {
    
    	mLog.info("StafCore: execute");
    	
    	return ( "The time is: " + Long.toString( System.currentTimeMillis() ) );

    		
    }
    


}
