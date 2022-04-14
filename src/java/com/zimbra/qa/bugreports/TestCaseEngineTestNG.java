package com.zimbra.qa.bugreports;

import java.io.*;
import java.util.*;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dom4j.*;


public class TestCaseEngineTestNG extends TestCaseEngine {
	private static Logger mLogger = LogManager.getLogger(TestCaseEngineTestNG.class);




	public TestCaseEngineTestNG(File results) {
		super(results);
		mLogger.info("new "+ TestCaseEngineTestNG.class.getCanonicalName());

	}


	@Override
	public List<TestCaseResult> getData() throws UnsupportedEncodingException, IOException, DocumentException 
	{

		List<TestCaseResult> results = new ArrayList<TestCaseResult>();
		List<String> sResults = new ArrayList<String>();


		// Open the testng-results.xml file and convert to Element
		Document document = this.getResultsDocument();
		for ( Object i : document.getRootElement().selectNodes("//groups/group/method") ) {
			if ( i instanceof Element ) {
				Element eMethod = (Element)i;
				
				String clazz = eMethod.attributeValue("class", "undefined");
				String method = eMethod.attributeValue("name", "undefined");

				mLogger.info("processing: "+ clazz +"."+ method);

				for ( Object j : document.getRootElement().selectNodes("//class[@name='"+ clazz +"']/test-method[@name='"+ method+"']") ) {
					if ( j instanceof Element ) {
						Element eTestmethod = (Element)j;
						
						String description = eTestmethod.attributeValue("description", "undefined");
						String status = eTestmethod.attributeValue("status", "FAIL");

						mLogger.info(String.format("processed: testcase %s, description %s, status %s",
								clazz + "." + method, description, status));

						// To avoid duplicate entries as in soapws harness one test case can be part more than one group.
						if(!sResults.contains(clazz + "." + method))	{
							sResults.add(clazz + "." + method);
							results.add(new TestCaseResult(clazz + "." + method, status));
						}
					}
				}
			}
		}
		sResults=null;
		return (results);
	}



}
