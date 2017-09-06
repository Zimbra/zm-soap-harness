package com.zimbra.qa.bugreports;

import java.io.*;
import java.util.*;

import org.apache.log4j.LogManager;
import org.apache.log4j.Logger;


public class BugStatus extends BugDataFile {
	private static final Logger mLogger = LogManager.getLogger(BugStatus.class);

	public enum BugState {
		UNCONFIRMED,
		NEW,
		ASSIGNED,
		REOPENED,
		IN_PROGRESS,
		RESOLVED,
		VERIFIED,
		CLOSED
	}
	
	/**
	 * Return the current list of "Bug ID" to "Bug Status"
	 * @return
	 * @throws IOException
	 */
	public static Map<String, BugState> getStatusData() throws IOException {
		BugStatus engine = new BugStatus();
		return (engine.getData());
	}
	
	protected static final String DataFilename = "bugStatus.txt";
	
	protected BugStatus() {
		mLogger.info("new " + BugStatus.class.getCanonicalName());
	}

	protected Map<String, BugState> getData() throws IOException {
		
		// New datafile was found.  Clear the map
		Map<String, BugState> bugStatusMap = new HashMap<String, BugState>();
		
		// Read the file and build the map
		BufferedReader reader = null;
		String line;
		
		try {
			
			reader = new BufferedReader(new FileReader(getDatafile(DataFilename)));
			while ( (line=reader.readLine()) != null ) {

				// Example: 50208	RESOLVED
				String[] values = line.split("\\s");
				if ( values.length != 2 ) {
					mLogger.warn("bugStatus: invalid line: "+ line);
					continue;
				}
				
				String bugid = values[0];
				BugState bugState = BugState.valueOf(values[1]);
							
				bugStatusMap.put(bugid, bugState);
				mLogger.debug("bugStatus: put "+ line);
				
			}
			
		} finally {
			if ( reader != null ) {
				reader.close();
				reader = null;
			}
		}

		return (bugStatusMap);
	}
	
}
