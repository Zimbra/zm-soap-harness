package com.zimbra.qa.soap;



import org.apache.log4j.Logger;

import org.dom4j.QName;

import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class zDesktopExternalTest extends zDesktopTest {
		
	private static Logger mLog = Logger.getLogger(zDesktopExternalTest.class.getName());
	
    public static final QName E_ZEXTERNALTEST = QName.get("zexternal", SoapTestCore.NAMESPACE);

	
	public zDesktopExternalTest()
	{
		super();
		mLog.debug("new zDesktopExternalTest");
	}
	
	public zDesktopExternalTest(Element e, SoapTestCore core) {
	
		super(e, core);
		
	}
    
	protected void adjustContext(Element context) throws HarnessException
	{
		// Add the account by element for the offline request
		String account = TestProperties.testProperties.getProperty("zexternal.account", null);
		if ( (account == null) || (account.equals("")) )
				throw new HarnessException("account must be set (zexternal.account)");
		
		Element e = context.addElement("account");
		e.addAttribute("by", "name");
		e.addText(account);
		
	}
        	
    // Returns: true if mUri was changed.  false otherwise
	protected boolean setUri() throws HarnessException {

		String uriString = null;
		
		// If zdesktopuser.server is defined, use that value instead
		String server = TestProperties.testProperties.getProperty("zexternal.server", null);
		if ( server != null )
		{
			if (mNamespace.equals(AdminConstants.NAMESPACE_STR))
			{
				String httpMode = TestProperties.testProperties.getProperty("zexternal.soapservice.admin.mode", "http");
				String httpPort = TestProperties.testProperties.getProperty("zexternal.soapservice.admin.port", "7633");
				String httpPath = TestProperties.testProperties.getProperty("zexternal.soapservice.admin.path", "service/admin/soap/");

				uriString = httpMode + "://" + server + ":" + httpPort + "/" + httpPath;
			}
			else
			{
				String httpMode = TestProperties.testProperties.getProperty("zexternal.soapservice.soap.mode", "http");
				String httpPort = TestProperties.testProperties.getProperty("zexternal.soapservice.soap.port", "7633");
				String httpPath = TestProperties.testProperties.getProperty("zexternal.soapservice.soap.path", "service/soap/");

				uriString = httpMode + "://" + server + ":" + httpPort + "/" + httpPath;
			}
		}
		else
		{
			uriString = TestProperties.testProperties.getProperty("zexternal.uri","http://localhost:7633/service/soap/");
		}
		
		if ( uriString.equals("") )
			throw new HarnessException("uri must be set");
			
		if ( mUri.equals(uriString) )		return (false);
		
		mUri = uriString;
		return (true);

    }

	

}
