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
			theTestObjectMap.put(PstImportTest.E_PSTIMPORTTEST, "com.zimbra.qa.soap.PstImportTest");
			theTestObjectMap.put(SmtpInjectTest.E_SMTPINJECTTEST, "com.zimbra.qa.soap.SmtpInjectTest");
			theTestObjectMap.put(StafTaskTest.E_STAFTEST, "com.zimbra.qa.soap.StafTaskTest");

		}
	}
	

}
