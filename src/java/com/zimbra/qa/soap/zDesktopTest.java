package com.zimbra.qa.soap;



import java.util.Hashtable;
import java.util.Iterator;
import java.util.Properties;

import org.apache.log4j.Logger;
import org.dom4j.QName;

import com.ibm.staf.STAFException;
import com.ibm.staf.STAFHandle;
import com.ibm.staf.STAFResult;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.XmlParseException;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;


public class zDesktopTest extends SoapTest {
		
	private static Logger mLog = Logger.getLogger(zDesktopTest.class.getName());
		

    public static final QName E_ZDESKTOPTEST = QName.get("zdesktop", SoapTestCore.NAMESPACE);

	public zDesktopTest() {
		
		super();

	}
	
	public zDesktopTest(Element e, SoapTestCore core) {
	
		super(e, core);
		
	}
    
	protected void adjustContext(Element context) throws HarnessException
	{
		// Add the account by element for the offline request
		String accountDefault = TestProperties.testProperties.getProperty("zdesktopuser.zimbra.login");
		String account = TestProperties.testProperties.getProperty("zdesktopuser.account", accountDefault);
		Element e = context.addElement("account");
		e.addAttribute("by", "name");
		e.addText(account);
	}
        	
    // Returns: true if mUri was changed.  false otherwise
	protected boolean setUri() throws HarnessException {

		String uriString = null;
		
		
		// If zdesktopuser.server is defined, use that value instead
		String server = TestProperties.testProperties.getProperty("zdesktopuser.server", null);
		if ( server != null )
		{
			
			if (mNamespace.equals(AdminConstants.NAMESPACE_STR))
			{
				String httpMode = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.admin.mode", "http");
				String httpPort = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.admin.port", "7633");
				String httpPath = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.admin.path", "service/admin/soap/");

				uriString = httpMode + "://" + server + ":" + httpPort + "/" + httpPath;
			}
			else
			{
				String httpMode = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.soap.mode", "http");
				String httpPort = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.soap.port", "7633");
				String httpPath = TestProperties.testProperties.getProperty("zdesktopuser.soapservice.soap.path", "service/soap/");

				uriString = httpMode + "://" + server + ":" + httpPort + "/" + httpPath;
			}

		}
		else
		{
			uriString = TestProperties.testProperties.getProperty("zdesktopuser.uri","http://localhost:7633/service/soap/");
		}
		
		if ( uriString.equals("") )
			throw new HarnessException("uri must be set");
			
		if ( mUri.equals(uriString) )		return (false);
		
		mUri = uriString;
		return (true);

    }

	private static Hashtable<String, String> zdcPasswords = new Hashtable<String, String>();
	
	public static String getDesktopPassword(String desktopHostname, String defaultPassword)
	{
		// Normalize desktopHostname to local, if applicable
		desktopHostname = (desktopHostname.equalsIgnoreCase("localhost") ? "local" : desktopHostname );
		
		// If global.properties has a value for zdesktopuser.password, use it
		if ( !defaultPassword.equals("UNSET") )
			return (defaultPassword);
		
		// If we already have determined the password, return it
		if ( zdcPasswords.containsKey(desktopHostname) )
			return (zdcPasswords.get(desktopHostname));
				
				
		if ( (zDesktopPassword == null) || (zDesktopHost == null) || (!zDesktopHost.equalsIgnoreCase(desktopHostname)) )
		{
			// New host - need to determine the password
			
			zDesktopHost = desktopHostname;
			
			localConfigProperties = new Properties();
			localConfigProperties.setProperty("zdesktop_installation_key", defaultPassword);

			// Use STAF to look up localconfig.xml
			if ( PingStaf() )
			{
				// An ordered array of possible localconfig.xml files.
				String[] possibleFiles =
				{
					"/opt/zmdesktop/zimbra/zdesktop/conf/localconfig.xml",
					"/home/zmdesktop/zimbra/zdesktop/conf/localconfig.xml",
					"/Documents and Settings/Administrator/Local Settings/Application Data/Zimbra/zdesktop/conf/localconfig.xml",
					"/Documents and Settings/zimbra/Local Settings/Application Data/Zimbra/zdesktop/conf/localconfig.xml",
					"/Documents and Settings/rhoades/Local Settings/Application Data/Zimbra/zdesktop/conf/localconfig.xml",
					"/Documents and Settings/Sarang Vyas/Local Settings/Application Data/Zimbra/zdesktop/conf/localconfig.xml",
					"/Documents and Settings/Prashant Shelke/Local Settings/Application Data/Zimbra/zdesktop/conf/localconfig.xml"
				};
				
				for(String f : possibleFiles)
				{
					if ( FileExistsStaf(f) )
					{
						Properties props = LoadLocalConfigStaf(f);
						if ( props != null )
						{
							// Found a file through staf
							localConfigProperties = props;
							break;
						}
					}
				}

			}
			

			zDesktopPassword = localConfigProperties.getProperty("zdesktop_installation_key", defaultPassword);
		}
		
		if ( (zDesktopPassword != null) && (!zDesktopPassword.equals("UNSET")) )
			zdcPasswords.put(desktopHostname, zDesktopPassword);
		
		return ( zDesktopPassword == null ? defaultPassword : zDesktopPassword );

	}
	
	protected static Properties localConfigProperties = null;
	protected static String zDesktopHost = null;
	protected static String zDesktopPassword = null;
	
	// STAF functions
	protected static boolean PingStaf()
	{

		// Example: 
		// Request:  STAF localhost PING PING
		// Response: PONG
		//
		
		final String STAF_PING_SERVICE = "PING";
		final String STAF_PING_COMMAND = "PING";

		STAFHandle handle = null;
       	
       	try
        {
       		
            handle = new STAFHandle(zDesktopTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());
            
 
	        try
	        {
	        	
	        	mLog.debug("Execute STAF " + zDesktopHost + " " + STAF_PING_SERVICE + " " + STAF_PING_COMMAND);
	            
	            STAFResult stafResult = handle.submit2(zDesktopHost, STAF_PING_SERVICE, STAF_PING_COMMAND);

            	// First, check for STAF errors, like unable to contact host
            	if ( stafResult.rc != STAFResult.Ok ) {
            		mLog.error("Unable to ping staf at "+ zDesktopHost);
            		return (false);
	            }
	            

            	if ( !stafResult.result.equalsIgnoreCase("PONG") ) 
            	{
            		mLog.error("STAFResult was not PONG => " + stafResult.result);
            		return (false);
            	}
	            
	        } finally {
	        	
	            try {
					handle.unRegister();
				} catch (STAFException e) {
		        	mLog.warn("Error unregistering with STAF, RC:" + e.rc, e);
				}
	        
	        }
			
        } catch (STAFException e) {
    		mLog.error("Error registering or unregistering with STAF, RC:" + e.rc, e);
    		return (false);
        } 

		// Successfully pinged STAF
        return (true);
		
	}
	
	protected static Properties LoadLocalConfigStaf(String filename)
	{
		
		
		// Example: 
		// Request:  STAF localhost FS GET filename
		// Response: file contents, if exists
		// 			 error code, if not exist
		//
		
		final String STAF_FILE_SERVICE = "FS";

		Properties props = null;
		
		STAFHandle handle = null;
       	
       	try
        {
       		
       		String stafCommand = "GET FILE \""+ filename + "\"";
       		
            handle = new STAFHandle(zDesktopTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());
            
 
	        try
	        {
	        	
	        	mLog.debug("Execute STAF " + zDesktopHost + " " + STAF_FILE_SERVICE + " " + stafCommand);
	            
	            STAFResult stafResult = handle.submit2(zDesktopHost, STAF_FILE_SERVICE, stafCommand);

	            if ( stafResult.rc != STAFResult.Ok )
	            {
		        	mLog.warn("Execute STAF " + zDesktopHost + " " + STAF_FILE_SERVICE + " " + stafCommand);
		        	mLog.warn("Execute STAF " + zDesktopHost + " " + STAF_FILE_SERVICE + " " + stafCommand);
		        	mLog.warn("Execute STAF Result (" + stafResult.rc +") " + stafResult.result);		        	
		        	
	            	return (props);
	            }
	            
	            props = new Properties();
	            
	            Element localconfig = Element.parseXML(stafResult.result);
	            for (Iterator<Element> i = localconfig.elementIterator(); i.hasNext();)
	            {
	                // e = expandProps(e.createCopy());
	                Element e = i.next();
	                if (e.getName().equalsIgnoreCase("key"))
	                {
	                	String name = e.getAttribute("name", "");
	                	if ( !name.equals("") )
                		{
	                		Element value = e.getOptionalElement("value");
	                		if ( value != null )
	                		{
	                			String text = value.getText();
	                			props.setProperty(name, text);
	                		}
                		}
	                }

	            }
	            
			} catch (XmlParseException e) {
				mLog.warn("Unable to parse localconfig.xml", e);
            } finally {
	        	
	            try {
					handle.unRegister();
				} catch (STAFException e) {
		        	mLog.warn("Error unregistering with STAF, RC:" + e.rc, e);
				}
	        
	        }
			
        } catch (STAFException e) {
    		mLog.error("Error registering or unregistering with STAF, RC:" + e.rc, e);
        } 

        return (props);

	}
	
	protected static boolean FileExistsStaf(String filename)
	{
		
		
		// Example: 
		// Request:  STAF localhost FS GET filename
		// Response: file contents, if exists
		// 			 error code, if not exist
		//
		
		final String STAF_FILE_SERVICE = "FS";

		STAFHandle handle = null;
       	
       	try
        {
       		
       		String stafCommand = "GET FILE \""+ filename +"\"";
       		
            handle = new STAFHandle(zDesktopTest.class.getName());
            mLog.debug("My handle is: " + handle.getHandle());
            
 
	        try
	        {
	        	
	        	mLog.debug("Execute STAF " + zDesktopHost + " " + STAF_FILE_SERVICE + " " + stafCommand);
	            
	            STAFResult stafResult = handle.submit2(zDesktopHost, STAF_FILE_SERVICE, stafCommand);

	            if ( stafResult.rc != STAFResult.Ok )
	            {
		        	mLog.warn("Execute STAF " + zDesktopHost + " " + STAF_FILE_SERVICE + " " + stafCommand);
		        	mLog.warn("Execute STAF Result (" + stafResult.rc +") " + stafResult.result);		        	
	            }	            
	            
	            return (stafResult.rc == STAFResult.Ok);
	            		            
	        } finally {
	        	
	            try {
					handle.unRegister();
				} catch (STAFException e) {
		        	mLog.warn("Error unregistering with STAF, RC:" + e.rc, e);
				}
	        
	        }
			
        } catch (STAFException e) {
    		mLog.error("Error registering or unregistering with STAF, RC:" + e.rc, e);
    		return (false);
        } 


	}

	
	

}
