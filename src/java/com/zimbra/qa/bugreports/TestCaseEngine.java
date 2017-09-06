package com.zimbra.qa.bugreports;

import java.io.*;
import java.util.*;

import org.apache.log4j.*;
import org.dom4j.*;
import org.dom4j.io.SAXReader;

import com.zimbra.qa.bugreports.ResultsCore.ResultsException;

public abstract class TestCaseEngine {
	private static Logger mLogger = LogManager.getLogger(TestCaseEngine.class);

	
	
	/**
	 * A pointer to the corresponding results file.  
	 * 
	 * This value could be a file or folder.
	 * 
	 * Folder: SOAP results
	 * File: Nunit Results.xml file
	 * File: TestNG testng-results.xml file
	 * etc.
	 * 
	 */
	private File mResultsFile = null;

	
	
	/**
	 * Create a new Engine to process the results
	 * @param results A pointer to the corresponding results file or folder
	 */
	protected TestCaseEngine(File results) {
		mLogger.info("new "+ TestCaseEngine.class.getCanonicalName());

		mResultsFile = results;
		
	}
	
	
	/**
	 * Return a map of test case names and pass/fail results based on test results
	 * @return
	 * @throws UnsupportedEncodingException
	 * @throws IOException
	 * @throws DocumentException
	 * @throws ResultsException 
	 */
	public abstract List<TestCaseResult> getData() throws UnsupportedEncodingException, IOException, DocumentException;
	
	

	protected File getResultsFile() {
		return mResultsFile;
	}


	protected void setResultsFile(File resultsFile) {
		mResultsFile = resultsFile;
	}


	/**
	 * Return a Document format of the results file (if XML formatted)
	 * @return
	 * @throws DocumentException 
	 */
	protected Document getResultsDocument() throws DocumentException {
		
		SAXReader reader = new SAXReader();
		return (reader.read(getResultsFile()));

	}
	
	
}
