package com.zimbra.qa.testrail;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.logging.FileHandler;
import java.util.logging.Logger;
import java.util.logging.SimpleFormatter;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.ObjectMapper;

//This class is used to store values of all testcases name/result as available in Automation harness report
class AutoTests
{
	public String testCaseName, isExecuted, result, testrailTestCaseId, failureMsg;
	
	public AutoTests(String testCaseName, String isExecuted, String result, String failureMsg)
	{
		this.testCaseName = testCaseName;
		this.isExecuted = isExecuted;
		this.result = result;
		this.failureMsg = failureMsg;
	}
	
}

//This class is used to construct JSON file 
class JSONBlock
{
	public int project_id, milestone_id, suite_id;
	public String run_name, description, plan_name;
	public List<String> case_ids;
	public ArrayList<ResultsBlock> results;
}

//This class is used to construct Results block in JSON file
class ResultsBlock
{
	public int status_id;
	public String comment;
	public String case_id;
	
	public ResultsBlock(int status_id, String comment, String case_id)
	{
		this.status_id = status_id;
		this.comment = comment;
		this.case_id = case_id;
	}
}

//This class is used to create JSON file using obect values of AutoTests, JSONBlock and ResultsBlock
public class ProcessXMLToJSON
{
	private static ArrayList<AutoTests> readAllTests(String xmlFileName)
	{
		ArrayList<AutoTests> reportTests = new ArrayList<>();
	    String testCaseName = null;
	    String isExecuted = null;
	    String result = null;
	    String failureMsg = null;
	    XMLInputFactory inputFactory = XMLInputFactory.newFactory();
	    
	    try
	    {
	        //create a stream reader object
	        FileReader fileReader = new FileReader(xmlFileName);
	        XMLStreamReader reader = inputFactory.createXMLStreamReader(fileReader);
	        
	        //read XML file
	        while (reader.hasNext())
	        {
	        	int eventType = reader.getEventType();
	        	switch (eventType)
	        	{	          
	          		case  XMLStreamConstants.START_ELEMENT :
	          			String elementName = reader.getLocalName();
	                  
	          			//Get testcase name, whether executed or not, testcase run status
	          			if (elementName.equals("test-case"))
	          			{
	          				testCaseName = reader.getAttributeValue(null, "name");
	          				isExecuted = reader.getAttributeValue(null, "executed");
	          				result = reader.getAttributeValue(null, "success");	                     
	          			}
	          			
	          			if (elementName.equals("failure"))
	          			{
	          				reader.nextTag();
	          				failureMsg = reader.getElementText();
	          			}
	          			
	          			break;
	          		
	          		case XMLStreamConstants.END_ELEMENT :
	          			elementName = reader.getLocalName();
	          			
	          			if(elementName.equals("test-case"))
	          			{
	          				reportTests.add(new AutoTests(testCaseName, isExecuted, result, failureMsg));
	          			}  
	          			
	          			break; 	                  
	        	}
	         
	        	reader.next();
	        }    
	    }
	    catch (IOException | XMLStreamException e)
	    {
	    	e.printStackTrace();
	    }
	    
	    return reportTests;
	}
	
    public static void main(String[] args)
    {
    	final Logger logger = Logger.getLogger(ProcessXMLToJSON.class.getName());
    	FileHandler fh;
    	SimpleDateFormat format = new SimpleDateFormat("M-d_HHmmss");
    	
    	List<String> listOfCaseIds = new ArrayList<String>();
    	ArrayList<ResultsBlock> rb = new ArrayList<>();
    	int testcaseRunStatus;
    	Properties propMap = new Properties();
    	Properties propConfig = new Properties();
    	
    	String packagePath = "com/zimbra/qa/testrail/";
    	String projectPath = null;
    	
        try
    	{
    		String rootPath = new File(".").getCanonicalPath();
    		int length = rootPath.length();
    		int index = length - 5;
    		String folderName = rootPath.substring(index);
    		logger.info("Root path is: " + rootPath + " Root folder is: " + folderName);
    		
    		if(folderName.equals("zm-qa"))
    		{
    			projectPath = "src/java/" + packagePath;
    		}
    		else
    			projectPath = packagePath; 		
    		
    	}
    	catch (IOException | NullPointerException e)
		{
			logger.info("Exception thrown: " + e.getStackTrace());
			e.printStackTrace();
		}
    	
		String mappingPropFileName = projectPath + "mapping.properties";
		String configPropFileName = packagePath + "config.properties";

		String mapKey = null;
		String mapValue = null;
		String comment = null;
		Map<String, String> testrailMapping = new HashMap<String, String>();
		
		logger.info("Mapping and config file paths: " + mappingPropFileName + " " + configPropFileName);
		
		
		try
		{
			//Create logger
			fh = new FileHandler(projectPath + "Log" + format.format(Calendar.getInstance().getTime()) + ".log");  
			logger.addHandler(fh);
	        SimpleFormatter formatter = new SimpleFormatter();  
	        fh.setFormatter(formatter);
	        
			//Read config file for making Teatrail API request
	        logger.info("Config file is: " + ProcessXMLToJSON.class.getClassLoader().getResourceAsStream(configPropFileName));
			propConfig.load(ProcessXMLToJSON.class.getClassLoader().getResourceAsStream(configPropFileName));	
	        
			//Create mapping.properties file if config createmapping=true 
			String createmapping = propConfig.getProperty("createmapping");
			
			if(createmapping.equals("true"))
			{
				logger.info("As createmapping=true, creating mapping.properties by fetching id (Testrail testcase-id) and custom_auto_caseid (Harness testcase-id)");
				String username = propConfig.getProperty("testrail_user");
				String password = propConfig.getProperty("testrail_userkey");
				String base_url = propConfig.getProperty("testrail_url");
				String project_id = propConfig.getProperty("project_id");
				String suite_id = propConfig.getProperty("suite_id");
				String url_full = base_url + "get_cases/" + project_id + "&suite_id=" + suite_id;
				logger.info("Getting testcases information using Testrail API..");
				logger.info("Testrail API full URL is: " + url_full);
				
			
				//Example:: URL for getting testcases from ZimbraQE project and Testapi suite
				//URL url = new URL("http://testrail01.buf.synacor.com/testrail/index.php?/api/v2/get_cases/16&suite_id=1130"); 
				URL url = new URL(url_full);
			
				//Create Http GET request to Testrail API for getting information of all testcases fields for given suite
				HttpURLConnection conn = (HttpURLConnection) url.openConnection();
				conn.setRequestMethod("GET");
				conn.addRequestProperty("Content-Type", "application/json");
			
				String userpass = username + ":" + password;
				String basicAuth = "Basic " + javax.xml.bind.DatatypeConverter.printBase64Binary(userpass.getBytes());

				conn.setRequestProperty ("Authorization", basicAuth);
			
				InputStream istream;
				int status = conn.getResponseCode();
				if (status != 200)
				{
					istream = conn.getErrorStream();
					if (istream == null)
					{
						logger.info("TestRail API return HTTP " + status + " (No additional error message received)");
						System.exit(0); 
					}
				}
				else 
				{
					istream = conn.getInputStream();
				}

			
				/*BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));

				String output;
				System.out.println("Output from Server .... \n");
				while ((output = br.readLine()) != null) {
					System.out.println(output);
				}*/			
				
				//Parse the API get response (JSON formay) and store in Hashmap
				JsonFactory jsonFactory = new JsonFactory();
				long start_time = System.currentTimeMillis();
				JsonParser jsonParser = jsonFactory.createParser(new InputStreamReader(istream));
				//JsonParser jsonParser = jsonFactory.createParser(istream);
				long end_time = System.currentTimeMillis();
				double difference = (end_time - start_time);
				logger.info("Time for parsing Testrail get response in milliseconds is: " +difference);
				
				while(jsonParser.nextToken() != JsonToken.END_ARRAY)
				{
					String name = jsonParser.getCurrentName();
					//logger.info("Element Name is: " + name); //Debug statement in case of Testrail Json parsing fails
					
					if("id".equals(name))
					{
						jsonParser.nextToken();
						mapValue = jsonParser.getText();
					}
					else if("custom_auto_caseid".equals(name))
					{
						jsonParser.nextToken();
						mapKey = jsonParser.getText();
						//logger.info("Hashmap key is: " + mapKey);
						//logger.info("Hashmap value is: " + mapValue);
						testrailMapping.put(mapKey, mapValue);					
					}
					else if("expected".equals(name))
					{
						jsonParser.nextToken(); 
						//String name1 = jsonParser.getCurrentName();
						//logger.info("Debug Element1 Name is: " + name1);
						jsonParser.nextToken();
						//String name2 = jsonParser.getCurrentName();
						//logger.info("Debug Element2 Name is: " + name2);
						jsonParser.nextToken();
						//String name3 = jsonParser.getCurrentName();
						//logger.info("Debug Element3 Name is: " + name3);					
					}
				}
				//logger.info("Current element name is : " + jsonParser.getCurrentName());
				
				jsonParser.close();
				
				conn.disconnect();
			
				logger.info("Storing testcases information (id and custom_auto_caseid) returned by Testrail API in temporary Java Hashmap");
				
				Properties properties = new Properties();  
		    
				for (Map.Entry<String, String> entry : testrailMapping.entrySet()) 
				{
					String key = entry.getKey().toString();
					String value = entry.getValue();
					//Use below for debugging purpose
					//logger.info("Hashmap: key = " + key + " value = " + value);
					
					//Save the Hashmap key/values in Java properties object
					properties.setProperty(key, value); 
				}
				
				//Save Java properties object in mapping.properties file
				logger.info("Creating mapping.properties (id and custom_auto_caseid) from Hashmap");
				properties.store(new FileOutputStream(mappingPropFileName), "Writing properties file");
			}
			else
				logger.info("Re-using existing mapping.properties");
				
			
		}
		catch (MalformedURLException e) 
		{
			logger.info("Exception thrown: " + e.getStackTrace());
			e.printStackTrace();
		} 
		catch (IOException | NullPointerException e)
		{
			logger.info("Exception thrown: " + e.getStackTrace());
			e.printStackTrace();
		}
		
		
		JSONBlock JSONBlockObject = new JSONBlock();
		
		try
		{
			JSONBlockObject.project_id = Integer.parseInt(propConfig.getProperty("project_id"));
			JSONBlockObject.run_name = propConfig.getProperty("run_name");
			JSONBlockObject.description = propConfig.getProperty("description");
			
			if(!propConfig.getProperty("milestone_id").equals(""))
				JSONBlockObject.milestone_id = Integer.parseInt(propConfig.getProperty("milestone_id"));
			
			JSONBlockObject.suite_id = Integer.parseInt(propConfig.getProperty("suite_id"));
			JSONBlockObject.plan_name = propConfig.getProperty("plan_name");
			
			//This comment would be added for all automation tests assuming tests passed
			String defaultComment = propConfig.getProperty("comment");
			
			
			//Read mapping file which defines mapping between automation testcases and corresponding Testrail TestcaseID
			propMap.load(new FileInputStream(mappingPropFileName));		
			
			logger.info("Reading Harness Test XML report and getting testcase information like Testcase-id, execution status i.e. passed/failed");
			ArrayList<AutoTests> autoTests = readAllTests(args[0]);
			logger.info("Total number of testcases in Harness Test XML report is: " + autoTests.size());
        
			for (AutoTests t:autoTests)
			{
				t.testrailTestCaseId = propMap.getProperty(t.testCaseName);
				//Use below for debugging purpose
				//logger.info("XML report test case values are: " + t.testCaseName + " " + t.isExecuted + " " + t.result + " " + t.testrailTestCaseId + " " + t.failureMsg + "\n");
				
				if(t.testrailTestCaseId == null)
					logger.info("Testrail testcases with missing mapping and need correction >> name/id: " + t.testCaseName + " " + t.testrailTestCaseId);
				
				listOfCaseIds.add(t.testrailTestCaseId);
			}
      
			//Update list of all case_ids in Java object
			JSONBlockObject.case_ids = listOfCaseIds;
			
			for (AutoTests t:autoTests)
			{
				
				if(t.result.equals("True"))
				{
					comment = defaultComment;
					testcaseRunStatus = 1;
				}
				else
				{
					testcaseRunStatus = 5;
					comment = t.failureMsg;
				}
				
				rb.add(new ResultsBlock(testcaseRunStatus, comment, t.testrailTestCaseId));
				
			}
			
			//Update results block (case_id and status for all tests) in Java object
			JSONBlockObject.results = rb;
			
			//Write Java object to JSON
			ObjectMapper mapper = new ObjectMapper();
			logger.info("Creating json file populating correct project/suite and updating case_id, status_id, comment for all testcases");
			mapper.writeValue(new File(projectPath + "TestrailResult.json"), JSONBlockObject);
        
		}
		catch (IOException | NullPointerException e)
		{
			logger.info("Exception thrown: " + e.getStackTrace());
			e.printStackTrace();
		}
		
	}
  
}
