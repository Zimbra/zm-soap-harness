package com.zimbra.qa.bugreports;

import java.io.*;
import java.security.*;
import java.util.*;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;


/**
 * A class to help locate the folder containing the Bug Reports
 * @author zimbra
 *
 */
public abstract class BugDataFile {
	private static final Logger mLogger = LogManager.getLogger(BugStatus.class);

	
	/**
	 * A list of directory paths that can contain the bug report information
	 */
	private static final List<File> paths = new ArrayList<File>() {
		private static final long serialVersionUID = 8573313916224770228L;
	{
	    add(new File( "/opt/qa/testlogs/BugReports" )); // Unix path
	    add(new File( "/opt/qa/BugReports" )); 			// Unix path
	    add(new File( "/qa/selenium/BugReports" )); 	// Unix path
	    add(new File( "T:\\BugReports" )); 				// Windows (TMS) path
	    add(new File( "C:\\BugReports" ));				// Windows (Dev) path
	    add(new File( "data/BugReports/bugzilla" ));	// Eclipse (Dev) path
	}};
	
	

	protected BugDataFile() {
		mLogger.info("new " + BugDataFile.class.getCanonicalName());
		
	}


	
	/**
	 * Return the database file, if it exists, in the normal data paths 
	 * @param filename
	 * @return
	 * @throws IOException 
	 * @throws IOException 
	 * @throws NoSuchAlgorithmException 
	 */
	protected File getDatafile(String filename) throws FileNotFoundException {
		
		// Find where the database files are located
		for (File directory : paths) {
			File file = new File(directory, filename);
			if ( file.exists() ) {
				return (file);
			}
		}
		
		throw new FileNotFoundException("Unable to locate "+ filename +" in "+ Arrays.toString(paths.toArray()));
	}
	
}
