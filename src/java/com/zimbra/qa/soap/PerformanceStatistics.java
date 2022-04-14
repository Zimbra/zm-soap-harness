package com.zimbra.qa.soap;

import java.io.*;
import java.util.*;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.appender.FileAppender;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.apache.logging.log4j.core.layout.PatternLayout;

/**
 * Record SOAP performance metrics.  Output a summary at the end of the test.
 * @author zimbra
 *
 */
public class PerformanceStatistics {
	protected static Logger mLog = LogManager.getLogger(PerformanceStatistics.class.getName() + ".debugger");
	protected static Logger mReport = LogManager.getLogger(PerformanceStatistics.class.getName());

    /** to trace each request performance time - all tests **/
    protected static HashMap<String, Long> statistics = null;
	
	/**
	 * Initialize all the performance measurement statistics
	 */
	public static void initialize() {
		statistics = new HashMap<String, Long>();
	}
	
	/**
	 * Write the statistics to a particular folder
	 * @param output The folder to place 'performance.txt'
	 */
	public static void writeReport(String output) {
	    String filename = output + File.separator + "performance.txt";
        FileAppender appender = FileAppender.newBuilder()
                .setName("file")
                .setLayout(PatternLayout.newBuilder()
                        .withPattern("%m%n")
                        .build())
                .withFileName(filename)
                .build();
        LoggerContext context = (LoggerContext) LogManager.getContext(false);
        LoggerConfig loggerConfig = context.getConfiguration().getLoggerConfig(mReport.getName());
        loggerConfig.addAppender(appender, Level.INFO, null);
        context.updateLoggers();

		// Add an output file in the output folder
        try {
	        writeReport();
		} catch (Exception e) {
			mReport.error("Unable to write the performance report", e);
		} finally {
		    loggerConfig.removeAppender(appender.getName());
		}

	}
	

	/**
	 * Write the statistics to the general log4j debug file (INFO level, com.zimbra.qa.soap.PerformanceStatistics logger)
	 */
	public static void writeReport() {
		mLog.debug("writeReport()");

    	if ( (statistics == null) || (statistics.isEmpty()) ) {
    		mLog.debug("No results");
    		return;
    	}
    	

    	// Need to sort the map by values
    
    	// Convert to list (since maps can't be sorted by value)
		List<Map.Entry<String, Long>> list = new LinkedList<Map.Entry<String, Long>>(statistics.entrySet());
		 
		// Sort the list based on comparator (highest to lowest values)
		Collections.sort(
				list, 
				new Comparator() {
					public int compare(final Object o1, final Object o2) {
						return ((Comparable) ((Map.Entry) (o2)).getValue()).compareTo(((Map.Entry) (o1)).getValue());
					}
				}
			);
 
		mReport.info("Performance:");

		// Iterate the list
		// Print to the report
		for ( Map.Entry<String, Long> entry : list ) {
			
			mReport.info(String.format("%6s ms %s", entry.getValue().toString(), entry.getKey()));
			
		}

		mReport.info("");
		mReport.info("");
		
	}
	
	/**
	 * Remove the performance statistics
	 */
	public static void destroy() {
		statistics = null;
	}
	
	/**
	 * Record a SOAP request performance value
	 * @param key the SOAP request
	 * @param value the request time, in msec
	 */
	public static void record(String key, long value) {
		mLog.debug("Record perf: "+ key +" - "+ value);
		
		if ( statistics == null ) {
			initialize();
		}
		
		if ( statistics.containsKey(key) ) {
			
			if ( value > statistics.get(key) ) {
				
				// New longest request
				statistics.put(key, new Long(value));
				
			}

		} else {
			
			// Create a new record for the new request
			statistics.put(key, new Long(value));
			
		}
		
		
	}
	
	
}
