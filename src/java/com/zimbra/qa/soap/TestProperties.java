/*
 * Created on Apr 27, 2005
 *
 * TODO To change the template for this generated file go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
package com.zimbra.qa.soap;





import java.util.Enumeration;
import java.util.Properties;
import java.util.HashMap;
import java.util.Map;
import java.io.*;
import com.zimbra.common.soap.Element;

import org.apache.log4j.Logger;

import com.zimbra.qa.soap.SoapTestCore.HarnessException;

/**
 * @author Persistent
 *
 * TODO To change the template for this generated type comment go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
public class TestProperties {

	static public Logger mLog = Logger.getLogger(TestProperties.class.getName());	

	public String fDynamicPropertiesFile = null;
	
	/** any properties we have set */
	protected Properties mDynamicProps = null;
	
	// will hold all server's properties
	Map<String,Properties> mapServersProperties = new HashMap<String, Properties>();
	
	// will hold a particular server's properties
	Properties mServerProperties =  new Properties();


	public static TestProperties testProperties = null;
	
	
	public TestProperties() {
		
		mLog.debug("TestProperties.initiailze()");		

		mDynamicProps = new Properties();
		
		if (SoapTestMain.setupPropertiesFile != null) {
			// Recall the setup properties
			mDynamicProps.put("setupPropertiesFile", SoapTestMain.setupPropertiesFile);	
		}
		
		UpdateMachineProperties();
		UpdateMultiNodeInfo();
	}
	
	// Read the multinode info file and update DynamicProps with multi server's address
	private void UpdateMultiNodeInfo(){
		File dir = new File(SoapTestCore.rootZimbraQA + "/conf/Multi-NodeInfo");
		String[] children = dir.list(filter);
		
		if (children == null) {			  
				mLog.info("Either MultiNodeInfo directory does not exist or there is no file in the directory ");
		} else {
				InputStream inputStream= null;
		        // Get filename
		        String filename = children[0];
		        String filePath = SoapTestCore.rootZimbraQA + "/conf/Multi-NodeInfo" +"/" +filename;
		        mLog.debug("Property file Name: "+ filePath);
		        try {
		        	inputStream= new FileInputStream(new File(filePath));
		        	mDynamicProps.load(inputStream);		        	
		        	
				} catch (Exception e) {
					mLog.warn("Unable to read machine properties file "+ filePath, e);
				}finally{
					Utilities.close(inputStream, mLog);
				}
		    }
		}		
	
	
	/* UpdateMachineProperties function will read the property files of the machine and put the server Properties object into a map
	 * 
	 * 
	 */
	
	private void UpdateMachineProperties(){
	
		Element elements = null;		
			
		File dir = new File(SoapTestCore.rootZimbraQA + "/conf/machine");
		String[] children = dir.list(filter);
		
		if (children == null) {			
			 mLog.info("Either machine directory does not exist or there is no file in the directory ");		    
		} else {
			InputStream inputStream = null;
		    for (int i=0; i<children.length; i++) {
		        // Get filename
		        String filename = children[i];
		        String filePath = SoapTestCore.rootZimbraQA + "/conf/machine" +"/" +filename;
		        mLog.debug("Property file Name: "+ filePath);
		        try {
		        	inputStream = new FileInputStream(new File(filePath));
		        	mServerProperties.load(inputStream);
		        	inputStream.close();
		        	
		        	//Get the server name
		        	String sServerName = mServerProperties.getProperty("cn");
		        	
		        	// Put particular server's  properties on hash map
		        	mapServersProperties.put(sServerName, mServerProperties);		        	
		        	
		        	// set to null  and initialize for next server's  properties
		        	mServerProperties= null;
		        	mServerProperties =  new Properties();
		        	
				} catch (Exception e) {
					mLog.warn("Unable to read machine properties file "+ filePath, e);
				}finally{
					Utilities.close(inputStream, mLog);
				}
		    }
		}
		
	}
	
	FilenameFilter filter = new FilenameFilter() {
	    public boolean accept(File dir, String name) {
	        return !name.startsWith(".");
	    }
	};
	
	public String getProperty(String key) throws HarnessException {
		
		mLog.debug("getProperty ("+ key +")");
		
		return (getProperty(key, "UNSET"));

	}
	

	public String getProperty(String key, String defaultValue) {
	
		mLog.debug("getProperty ("+ key +") ("+ defaultValue +")");
		
		if ( key == null ) {
			return (defaultValue);
		}
		
		String value = null;
		
		// Some special case keys
		if ( key.equals("zdesktopuser.password") )
		{

			value = mDynamicProps.getProperty("zdesktopuser.password", "UNSET");
			if (SoapTestMain.setupProperties != null)
				value = SoapTestMain.setupProperties.getProperty("zdesktopuser.password", value);
			value = SoapTestMain.globalProperties.getProperty("zdesktopuser.password", value);

			String zdesktophost = getProperty("zdesktopuser.server", "localhost");
			value = zDesktopTest.getDesktopPassword(zdesktophost, value);

			return (value);
		}
		
		if ( key.equals("zexternal.password") )
		{

			value = mDynamicProps.getProperty("zexternal.password", "UNSET");
			if (SoapTestMain.setupProperties != null)
				value = SoapTestMain.setupProperties.getProperty("zexternal.password", value);
			value = SoapTestMain.globalProperties.getProperty("zexternal.password", value);

			String zexternalhost = getProperty("zexternal.server","localhost");
			value = zDesktopExternalTest.getDesktopPassword(zexternalhost, value);
				
			return (value);
		}
		
		String server = mDynamicProps.getProperty("server.zimbraAccount");
		
		if(server == null)
			server = mDynamicProps.getProperty("server.zimbraMail");
		
		if(server == null)
			server = mDynamicProps.getProperty("zimbraServer.name");
		
		if(server == null) {
			if ( SoapTestMain.setupProperties != null ) {
				server = SoapTestMain.setupProperties.getProperty("zimbraServer.name");
			}
		}
		
		if(server == null) {			
				server = SoapTestMain.globalProperties.getProperty("zimbraServer.name");			
		}		
		
		// First priority is the current server properties for the current XML script
		Properties refServerProperties= mapServersProperties.get(server);	
		
		if(refServerProperties != null){
			if ( key.equals("soapservice.port") )				
			{
				value = refServerProperties.getProperty("zimbraMailPort");
			}else if (key.equals("server.zimbraAccount") || key.equals("server.zimbraMail") ||key.equals("caldav.server")|| key.equals("server.restServlet")){
				value = refServerProperties.getProperty("zimbraMailHost");
			}else{
				value = refServerProperties.getProperty(key);
			}
		}
			
		if ( value != null ) {
			mLog.debug("getProperty found (mapServerProperties): " + key + "=" + value);
			return ( value );
		}
		
		
		// Second priority is the dynamic properties for the current XML script
		value = mDynamicProps.getProperty(key);
		if ( value != null ) {
			mLog.debug("getProperty found (DynamicProps): " + key + "=" + value);
			return ( value );
		}
		
		// Third priority is the values from the XML setup script, if it exists
		if ( SoapTestMain.setupProperties != null ) {
			value = SoapTestMain.setupProperties.getProperty(key);
			if ( value != null ) {
				mLog.debug("getProperty found (SetupProps): " + key + "=" + value);
				return ( value );
			}
		}
		
		
		// Fourth priority is the global properties from ZimbraQA/conf/global.properties
		value = SoapTestMain.globalProperties.getProperty(key);
		if ( value != null ) {
			mLog.debug("getProperty found (GlobalProps): " + key + "=" + value);
			return ( value );
		}

		mLog.debug("getProperty found (defaultValue): " + key + "=" + defaultValue);
		return ( defaultValue );
				
	}
	
			
	public String setProperty(String key, String value) {
		
		mLog.debug("setProperty ("+ key +") ("+ value +")");
		
		if ( value == null )
		{
			clearProperty(key);
			return (null);
		}
		
		if ( key.equalsIgnoreCase(".install_history") ) {
			SoapTestCore.setInstallHistory(value);
		}
		
					
		return ( (String) mDynamicProps.setProperty(key, value) );
		
	}
	
	public void clearProperty(String key)
	{
		
		mLog.debug("clearProperty ("+ key +")");
		
					
		mDynamicProps.remove(key);
		
	}

	public void readProperties() {
		
		mLog.debug("readProperties: " + fDynamicPropertiesFile);
		
		if ( fDynamicPropertiesFile == null ) {
			mLog.warn("readProperties: Load up global properties first");
			return;
		}
		
        FileInputStream fis = null;
		try {

            fis = new FileInputStream(fDynamicPropertiesFile);
            mDynamicProps.load(fis); 
            mDynamicProps.put("propertiesFile", fDynamicPropertiesFile);

        } catch (FileNotFoundException e1) {
            // This is normal at startup, just show a warning
            mLog.warn("Dynamic properties file does not yet exist: " + fDynamicPropertiesFile);
        } catch (IOException e1) {
            mLog.error("Unable to load dynamic properties file: " + fDynamicPropertiesFile, e1);
        } finally {
            Utilities.close(fis, mLog);
        } 


	    for (Enumeration e = mDynamicProps.propertyNames(); e.hasMoreElements();) {
			String key = e.nextElement().toString();
			String value = mDynamicProps.getProperty(key).toString();
			
			mLog.debug("mDynamicProps: " + key +": "+ value);
	    }
		
	}

//	public void writeProperties() throws HarnessException {
//		writeProperties(null);
//	}
	
	public void writeProperties(String path) throws HarnessException {
		
		mLog.debug("writeProperties: " + fDynamicPropertiesFile);

		if ( fDynamicPropertiesFile == null ) {			
                try {
                    if (path == null) {
                    	setDynamicPropertyFile(System.currentTimeMillis() + ".txt");
                    } else {
                        setDynamicPropertyFile(path + File.separator + System.currentTimeMillis() + ".txt");
                    }
				} catch (IOException e) {
					throw new HarnessException("Cannot write to TestProperties file", e);
				}
 		}

        	
        FileOutputStream fos = null;
        try {
            mLog.debug("setDynamicProperty: Writing to " + fDynamicPropertiesFile + " ...");
            fos = new FileOutputStream(fDynamicPropertiesFile);
            mDynamicProps.store(fos, null);          

        } catch (Exception e) {

            mLog.error("Unable to save " + fDynamicPropertiesFile, e);
            e.printStackTrace();

        } finally {
        	Utilities.close(fos,mLog);           
        } 
	}

	public void clearProperties() {
	
		mLog.debug("clearProperties");

		// Just clear the dynamic properites
		mDynamicProps.clear();
		if ( fDynamicPropertiesFile != null ) {
			mDynamicProps.put("propertiesFile", fDynamicPropertiesFile);
		}
		// writeProperties();  // Clear the properties file, too
		
	}

	public Properties getProperties() {
		return(mDynamicProps);
	}

	private String setDynamicPropertyFile(String filename) throws IOException {

		mLog.debug("setDynamicPropertyFile: old("+ fDynamicPropertiesFile +") new("+ filename +")");

		File f = new File (filename);
		
		fDynamicPropertiesFile = f.getCanonicalPath();
		
		mDynamicProps.put("propertiesFile", fDynamicPropertiesFile);
		
		return (fDynamicPropertiesFile);
		
	}
	
}