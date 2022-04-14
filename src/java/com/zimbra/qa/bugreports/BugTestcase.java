package com.zimbra.qa.bugreports;

import java.io.*;
import java.util.*;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;


public class BugTestcase extends BugDataFile {
	private static final Logger mLogger = LogManager.getLogger(BugStatus.class);

	/**
	 * Return the current list of "Test Case" to "List of BugIDs"
	 * @return
	 * @throws IOException
	 */
	public static Map<String, List<String>> getTestcaseData() throws IOException {
		BugTestcase engine = new BugTestcase();
		return (engine.getData());
	}
	
	protected static final String mDataFilename = "bugTestcase.txt";
	
	protected BugTestcase() {
		mLogger.info("new " + BugTestcase.class.getCanonicalName());
	}

	protected Map<String, List<String>> getData() throws IOException {
		
		Map<String, List<String>> bugTestcaseMap = new HashMap<String, List<String>>();
		
		// Read the file and build the map
		BufferedReader reader = null;
		String line;
		
		try {
			
			reader = new BufferedReader(new FileReader(getDatafile(mDataFilename)));
			while ( (line=reader.readLine()) != null ) {
	
				// Example: genesis/data/zmstatctl/basic.rb	29149 40782
				String[] values = line.split("\\s");
				if ( values.length <= 1 ) {
					mLogger.warn("bugTestcase: invalid line: "+ line);
					continue;
				}
				
				String bugtestcase = values[0];
				values = line.replace(bugtestcase, "").split("\\s");
				
				bugTestcaseMap.put(bugtestcase, Arrays.asList(values));
				mLogger.debug("bugTestcase: put "+ line);

			}
			
		} finally {
			if ( reader != null ) {
				reader.close();
				reader = null;
			}
		}

		
		return (bugTestcaseMap);
	}

}
