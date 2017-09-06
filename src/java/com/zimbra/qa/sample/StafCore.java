package com.zimbra.qa.sample;

import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Options;
import org.apache.log4j.ConsoleAppender;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;

import com.zimbra.cs.util.BuildInfo;

public class StafCore {

    // General debug logger
    static Logger mLog = Logger.getLogger(StafCore.class.getName());


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
        mLog.addAppender(new ConsoleAppender());
        mLog.setLevel(Level.INFO);

        mLog.info("New StafCore object");
    	
    }
    
    protected String execute() {
    
    	mLog.info("StafCore: execute");
    	
    	return ( "The time is: " + Long.toString( System.currentTimeMillis() ) );

    		
    }
    


}
