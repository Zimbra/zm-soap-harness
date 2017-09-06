package com.zimbra.qa.bugreports;

import java.util.*;


public class TestCaseResult {
	
	public enum Status {
		PASSED("Passed"),
		FAILED("Failed"),
		SKIPPED("Skipped"),
		EXCEPTION("Exception"), 
		UNKNOWN("Unknown");
		
		private String mName = null;
		private Status(String name) {
			mName = name;
		}
		
		public String toString() {
			return (mName);
		}
	}
	

	protected String mTestCaseName = null;
	protected Status mTestCaseResult = Status.UNKNOWN;
	
	public TestCaseResult(String name, Status result) {
		mTestCaseName = name;
		mTestCaseResult = result;
	}
	
	public TestCaseResult(String name, String result) {
		this(name, fromString(result));
	}

	public static Status fromString(String status) {
		
		if ( "pass".equalsIgnoreCase(status) ) {
			return Status.PASSED;
		}
		
		if ( "true".equalsIgnoreCase(status) ) {
			return Status.PASSED;
		}
		
		if ( "fail".equalsIgnoreCase(status) ) {
			return Status.FAILED;
		}
		
		if ( "false".equalsIgnoreCase(status) ) {
			return Status.FAILED;
		}
		
		if ( "skipped".equalsIgnoreCase(status) ) {
			return Status.SKIPPED;
		}

		if ( "exception".equalsIgnoreCase(status) ) {
			return Status.EXCEPTION;
		}
		return Status.UNKNOWN;

	}
	
	/**
	 * Count the number of items in the specified collection that match the given status
	 * @param c
	 * @param s
	 * @return
	 */
	public static int frequency(Collection<TestCaseResult> c, Status s) {
		int count = 0;
		for ( TestCaseResult r : c ) {
			if ( r.mTestCaseResult == s ) {
				count++;
			}
		}
		return (count);
	}
	
}
