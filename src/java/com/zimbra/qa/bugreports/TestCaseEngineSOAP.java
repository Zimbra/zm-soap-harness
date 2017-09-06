package com.zimbra.qa.bugreports;

import java.io.*;
import java.util.*;

import org.apache.log4j.*;
import org.dom4j.*;

public class TestCaseEngineSOAP extends TestCaseEngine {
	private static Logger mLogger = LogManager.getLogger(TestCaseEngineSOAP.class);

	public TestCaseEngineSOAP(File results) {
		super(results);
		mLogger.info("new "+ TestCaseEngineSOAP.class.getCanonicalName());
	}

	@Override
	public List<TestCaseResult> getData() throws UnsupportedEncodingException, IOException, DocumentException {

		List<TestCaseResult> results = new ArrayList<TestCaseResult>();

		
		Document document = this.getResultsDocument();
		List<?> nodes = document.getRootElement().selectNodes("//test");
		for ( Object n : nodes ) {
			if ( n instanceof Element ) {
				Element e = (Element)n;
				
	        	String name = e.attributeValue("name", "undefined");
	        	String status = e.attributeValue("status", "Skipped");
	        	String exception = e.attributeValue("exception", "none");
	        	
	        	mLogger.info(String.format("%s: status %s, exception %s",
	        			name, status, exception));

	        	if ( "skipped".equalsIgnoreCase(status) ) {
	        		// For SOAP results, don't process "Skipped" status
	        		continue;
	        	}
	        	
        		results.add(new TestCaseResult(name, status));
        		
			}
		}
		
		return (results);

	}

}
