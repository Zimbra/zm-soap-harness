package com.zimbra.qa.soap;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.util.HashMap;

import org.dom4j.QName;

import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

public class TestFactory {
	
	static public void AddQNameMap(QName qname, String classname) {
		Initialize();
		theTestObjectMap.put(qname, classname);
	}

	public boolean isTestObjectType(Element e) {
		Initialize();
		return (theTestObjectMap.containsKey(e.getQName()));
	}

	public Test createTestObject(Element e, SoapTestCore core) throws HarnessException
	{
		Initialize();
		Test t = null;
		
		if ( !isTestObjectType(e) )
			throw new HarnessException("Cannot createTestObject for element "+ e);
		
		String className = theTestObjectMap.get(e.getQName());
		
		try {
			
			Class<?> c = Class.forName(className);
			Class<?> argTypes[] = new Class[2];
			argTypes[0] = Element.class;
			argTypes[1] = SoapTestCore.class;
			Constructor<?> constructor = c.getConstructor(argTypes);
			Object argList[] = new Object[2];
			argList[0] = e;
			argList[1] = core;
			t = (Test)constructor.newInstance(argList);
			
		} catch (ClassNotFoundException ex) {
			throw new HarnessException("createTestObject", ex);
		} catch (SecurityException ex) {
			throw new HarnessException("createTestObject", ex);
		} catch (NoSuchMethodException ex) {
			throw new HarnessException("createTestObject", ex);
		} catch (IllegalArgumentException ex) {
			throw new HarnessException("createTestObject", ex);
		} catch (InstantiationException ex) {
			throw new HarnessException("createTestObject", ex);
		} catch (IllegalAccessException ex) {
			throw new HarnessException("createTestObject", ex);
		} catch (InvocationTargetException ex) {
			throw new HarnessException("createTestObject", ex);
		}
		
		return (t);
		
	}
	
	
	
	static private HashMap<QName, String> theTestObjectMap = null;
	
	static private void Initialize()
	{
		if (theTestObjectMap==null)
		{
			theTestObjectMap = new HashMap<QName, String>();
			theTestObjectMap.put(ContactsServletTest.E_CSVSERVLETTEST, "com.zimbra.qa.soap.ContactsServletTest");
			theTestObjectMap.put(DeliverServletTest.E_DELIVERTEST, "com.zimbra.qa.soap.DeliverServletTest");
			theTestObjectMap.put(MailInjectTest.E_MAILINJECTTEST, "com.zimbra.qa.soap.MailInjectTest");
			theTestObjectMap.put(RestServletTest.E_RESTSERVLETTEST, "com.zimbra.qa.soap.RestServletTest");
			theTestObjectMap.put(SoapTest.E_TESTTEST, "com.zimbra.qa.soap.SoapTest");
			theTestObjectMap.put(SoapTest.E_SOAPTEST, "com.zimbra.qa.soap.SoapTest");
			theTestObjectMap.put(UploadServletTest.E_UPLOADSERVLETTEST, "com.zimbra.qa.soap.UploadServletTest");
			theTestObjectMap.put(YABTest.E_YABTEST, "com.zimbra.qa.soap.YABTest");
			theTestObjectMap.put(YMailTest.E_YMAILTEST, "com.zimbra.qa.soap.YMailTest");
			theTestObjectMap.put(YCalTest.E_YCALTEST, "com.zimbra.qa.soap.YCalTest");
			theTestObjectMap.put(MigrationTest.E_MIGRATIONTEST, "com.zimbra.qa.soap.MigrationTest");
			theTestObjectMap.put(PstImportTest.E_PSTIMPORTTEST, "com.zimbra.qa.soap.PstImportTest");
			theTestObjectMap.put(SmtpInjectTest.E_SMTPINJECTTEST, "com.zimbra.qa.soap.SmtpInjectTest");
			theTestObjectMap.put(StafTaskTest.E_STAFTEST, "com.zimbra.qa.soap.StafTaskTest");
//			theTestObjectMap.put(WizardVersionTest.E_WIZARDVERSIONTEST, "com.zimbra.qa.soap.WizardVersionTest");
			theTestObjectMap.put(zDesktopAcctTest.E_ZDESKTOPACCT, "com.zimbra.qa.soap.zDesktopAcctTest");
			theTestObjectMap.put(zDesktopExternalTest.E_ZEXTERNALTEST, "com.zimbra.qa.soap.zDesktopExternalTest");
			theTestObjectMap.put(zDesktopTest.E_ZDESKTOPTEST, "com.zimbra.qa.soap.zDesktopTest");

  			theTestObjectMap.put(CalDavTest.E_CALDAVTEST, "com.zimbra.qa.soap.CalDavTest");

		}
	}
	

}
