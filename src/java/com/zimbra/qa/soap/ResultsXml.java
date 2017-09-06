package com.zimbra.qa.soap;

import java.io.*;
import java.util.*;
import java.util.Map.Entry;

import org.apache.log4j.Logger;
import org.dom4j.*;
import org.dom4j.io.*;

/**
 * This class creates results-soap.xml
 * @author Matt Rhoades
 *
 */
public class ResultsXml {
	private static Logger mLog = Logger.getLogger(SoapTestCore.class.getName());

	public enum ResultStatus {
		Pass, Fail, Skipped, Exception
	}
	
	public static void initialize() {
		results = new HashMap<String, TestResult>();
	}

	public static TestResult addTestCase(String name) {
		if ( name == null ) {
			name = "null";
		}

		if ( results.containsKey(name) ) {	
			return (results.get(name));
		}

		TestResult result = new TestResult();
		results.put(name, result);
		return (result);

	}

	public static void addTestCaseResults(String name, ResultStatus status) {
		addTestCaseResults(name, status.name());
	}

	public static void addTestCaseResults(String name, String status) {
		TestResult result = addTestCase(name);
		result.mTestResultStatus = status;
	}

	public static void addTestCaseException(String name, String exception) {
		TestResult result = addTestCase(name);
		result.mTestResultStatus = "Exception";
		result.mTestResultException = exception;
	}

	public static void writeResultsFile(String directory) {

		if ( directory == null ) {
			directory = ".";
		}
		
		XMLWriter writer = null;

		try {
			
			try {

				writer = new XMLWriter(new FileOutputStream(directory + "/results-soap.xml"), OutputFormat.createPrettyPrint());
				writer.write(createDocument());
				writer.flush();

			} finally {
				if ( writer != null ) {
					writer.close();
					writer = null;
				}
			}
			
		} catch (IOException e) {
			mLog.warn("Unable to write results-soap.xml", e);
		}
	}

	public static Document createDocument() {

		Document document = DocumentHelper.createDocument();
		Element tests = document.addElement("tests");

		for ( Entry<String, TestResult> entry : results.entrySet() ) {

			Element test = tests.addElement("test");

			test.addAttribute("name", entry.getKey());

			if ( entry.getValue().mTestResultStatus != null ) {
				test.addAttribute("status", entry.getValue().mTestResultStatus);
			}

			if ( entry.getValue().mTestResultException != null ) {
				test.addAttribute("exception", entry.getValue().mTestResultException);
			}

		}

		return (document);
	}

	private ResultsXml() {
	}

	protected static Map<String, TestResult> results = null;

	protected static class TestResult {
		protected String mTestResultStatus = null;
		protected String mTestResultException = null;
	}
}
