/*
 * Created on Apr 27, 2005
 *
 * TODO To change the template for this generated file go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
package com.zimbra.qa.soap;



/**
 * @author Persistent
 *
 * TODO To change the template for this generated type comment go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
public abstract class AbsTest {


	protected abstract String getDetails();
	protected abstract String getSummary();
	protected abstract boolean dumpTest();
	protected abstract boolean testFailed();

	protected static String lpad(String s, int width) {
		return pad(s, width, false, true);
	}
	
	protected static String rpad(String s, int width) {
		return pad(s, width, false, false);
	}
	
	protected static String lpadz(String s, int width) {
		return pad(s, width, true, true);
	}
	
	protected static String rpadz(String s, int width) {
		return pad(s, width, true, false);
	}
		
	/**
	 * @param testNum
	 * @return
	 */
	protected static String pad(String s, int width, boolean withZero,
			boolean left) {
		int needed = width - s.length();
	
		if (needed <= 0)
			return s;
	
		StringBuffer sb = new StringBuffer(width);
	
		if (left) {
			while (needed-- > 0) {
				sb.append(withZero ? '0' : ' ');
			}
			sb.append(s);
		} else {
			sb.append(s);
			while (needed-- > 0) {
				sb.append(withZero ? '0' : ' ');
			}
		}
		return sb.toString();
	}
	


	
}