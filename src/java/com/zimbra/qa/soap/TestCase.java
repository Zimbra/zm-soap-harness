/*
 * Created on Apr 27, 2005
 *
 * TODO To change the template for this generated file go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
package com.zimbra.qa.soap;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import org.apache.log4j.Logger;
import org.dom4j.QName;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.qa.soap.SoapTestCore.HarnessException;

/**
 * @author Persistent
 *
 * TODO To change the template for this generated type comment go to
 * Window - Preferences - Java - Code Style - Code Templates
 */
public class TestCase extends AbsTest {

	static Logger mLog = Logger.getLogger(TestCase.class.getName());

	public static final QName E_TESTCASE = QName.get("test_case", SoapTestCore.NAMESPACE);
	public static final QName E_OBJECTIVE = QName.get("objective", SoapTestCore.NAMESPACE);
	public static final QName E_STEPS = QName.get("steps", SoapTestCore.NAMESPACE);
	public static final QName E_TESTLOOP = QName.get("test_loop", SoapTestCore.NAMESPACE);

	public static final String A_BUGIDS = "bugids";
	public static final String A_TESTCASEID = "testcaseid";
	public static final String A_TYPE = "type";
	public static final String A_HOST_COUNT = "hostCount";
	public static final String A_AREAS = "areas";
	public static final String A_DURATION = "duration";
	public static final String A_SUPPORTEDAFTER = "supportedAfter";

	public boolean mSkipped = false;
	public int mNumTestFailures = 0;

	/**
	 NO_TYPE:		Default value for all tests w/o a type definition
	 always:		always execute the test (ping test, authentication)
	 bhr:			bhr test cases
	 smoke:			basic tests to smoke test an installed build as 'sane'
	 functional:	tests of requirements and core functionality
	 feature:		tests of features that are not requirements, but are not negative tests either
	 negative:		negative tests
	 deprecated:	tests that are no longer applicable to the implementation
	**/
	public static final String[] TYPES = {
			"NO_TYPE",
			"always",
			"smoke",
			"bhr",
			"sanity",
			"functional",
			"feature",
			"negative",
			"measurement",
			"full",
			"deprecated",
			"smoke-temp",
			"bhr-temp",
			"sanity-temp",
			"functional-temp",
			"chat",
			"q4fix"
		};

	public static final String[] DURATIONS = {
		"short",
		"long"
	};

	protected String objective;

	protected String[] steps;

	public Element mTestCase;

	public TestCase(Element testcase) throws ServiceException {

		mTestCase = testcase;

		setObjective(testcase.getElement(E_OBJECTIVE).getText());
		Element steps = testcase.getOptionalElement(E_STEPS);
		if (steps != null) {
			setSteps(steps.getText());
		}


	}

	public String getId() {
		try {
			return mTestCase.getAttribute(A_TESTCASEID);
		} catch (ServiceException e) {
			mLog.error("Error testcaseid is a required field", e);
			System.exit(1);
			return null;
		}
	}

	public String getType() {
		String type=mTestCase.getAttribute(A_TYPE, "NO_TYPE");
		for (int i = 0; i < TYPES.length; i++) {
			if(type.equals(TYPES[i]))
				return type;
		}
		try {
			throw (new HarnessException("Given value for type (" + type + ") attribute does not match expected value."));
		} catch (HarnessException e) {
			mLog.error("Given value for type attribute does not match expected value.", e);
			System.exit(1);
			return null;
		}


	}

	public String getAreas(String cmdlineArea) {

		String[] attrAreas= (mTestCase.getAttribute(A_AREAS, "NO_AREAS").split("[,\\s]+"));

		for (int i=0; i< attrAreas.length; i++){
			if(cmdlineArea.equalsIgnoreCase(attrAreas[i].trim()))
				return cmdlineArea;
		}
		return null;
	}

	public String getBugIDs() {
		return mTestCase.getAttribute(A_BUGIDS, "NO_BUGS_LOGGED");
	}

	public int getHostCount() {
		return Integer.parseInt(mTestCase.getAttribute(A_HOST_COUNT, "1"));
	}

	public String getDuration() {
		String duration=mTestCase.getAttribute(A_DURATION, "short");
		for (int i = 0; i < DURATIONS.length; i++) {
			if(duration.equals(DURATIONS[i]))
				return duration;
		}
		try {
			throw (new HarnessException("duration="+ duration));
		} catch (HarnessException e) {
			mLog.error("Given value for type attribute does not match expected value.", e);
			System.exit(1);
			return null;
		}
	}

	public String getSupportedAfter()
	{
		return (mTestCase.getAttribute(A_SUPPORTEDAFTER, null));
	}

	public void setObjective(String o) {
		objective = o.trim();
	}

	public void setSteps(String s) {
		steps = s.split("\\s*;\\s*");
	}


	public void setSkipped(boolean status) {
		mSkipped = status;
	}

	public boolean hasType(String[] type_array) {
		for (int i = 0; i < type_array.length; i++) {
			if (hasType(type_array[i])) // call the String version of hasType
				return true;
		}
		return false;
	}

	public boolean hasType(String type) {
			return (type.equals(getType()));
	}

	public boolean hasArea(List<String> list) {

		if (list == null)
			return true;

		for (Iterator<String> i = list.iterator(); i.hasNext();)
		{
			if ( getAreas(i.next()) != null )
				return true;
		}
		return false;
	}

	public boolean hasArea(String[] tempAreas) {
		return (hasArea(new ArrayList<String>(Arrays.asList(tempAreas))));
	}

	private int releaseToInt(String major, String minor, String patch)
	{
		return (releaseToInt(Integer.parseInt(major), Integer.parseInt(minor), Integer.parseInt(patch)));
	}

	private int releaseToInt(int major, int minor, int patch)
	{
		int value = patch;
		value += minor * 100;
		value += major * 10000;

		return (value);
	}


	// Returns true if the install path
	// includes builds that were earlier than
	// the release that the feature was first
	// supported in
	public boolean installPathShouldSkip(SoapTestCore core)
		throws HarnessException
	{
		String supportedAfter = getSupportedAfter();

		if ( supportedAfter == null )
		{
			return (false); // If supportedAfter is not specified, then it was always supported
		}

		if ( supportedAfter.equalsIgnoreCase("*") )
		{
			// supportedAfter="*" means all releases support the feature
			return (false);
		}

		if ( SoapTestCore.installHistory == null )
		{
			throw new HarnessException("Need to define .install_history property, i.e. <t:system command=\"cat\" parms=\"/opt/zimbra/.install_history\" stdout=\".install_history\"/>");
		}

		// Parse through the install history
		// If any install history release is earlier
		// than the supportedAfter value, then skip the test
		String[] myParts = supportedAfter.split("\\.");
		int myRelease = releaseToInt(myParts[0], myParts[1], myParts[2]);

		Iterator<String> i = SoapTestCore.installHistory.iterator();
		while (	i.hasNext() )
		{
			String[] parts=i.next().split("\\.");
			int release = releaseToInt(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));

			if ( release < myRelease )
			{
				return (true);
			}
		}

		// Scrolled through all the releases, none were less than the required
		return (false);

	}

	public boolean testPassed() {
		return (!testFailed());
	}

	public boolean testFailed() {
		return (mNumTestFailures > 0);
	}

	public int addTestStepFailure(int count) {
		mNumTestFailures += count;
		return (mNumTestFailures);
	}

	public boolean testSkipped() {
		return (mSkipped);
	}

	public String getSummary() {
		return ("Test Case Object: getSummary() TODO");
	}
	public boolean dumpTest() {
		return (false);
	}
	public String getDetails() {
		StringBuffer status = new StringBuffer();

		status.append("\n##############\n");
		status.append("Test Case ID: " + getId() + "\n");
		status.append("BugIDs: " + getBugIDs() + "\n");
		status.append("Type: " + getType() + "\n");
		status.append("Objective: " + objective + "\n");
		if (getSupportedAfter() != null) {
			status.append("First Supported in: " + getSupportedAfter());
		}
		if (steps != null) {
			status.append("Steps:\n");
			for (int i = 0; i < steps.length; i++)
				status.append("\t" + steps[i] + "\n");
		}
		return status.toString();
	}

	protected boolean shouldSkip(SoapTestCore core) throws HarnessException
	{

		if ( SoapTestMain.testCaseId != null ) {
			if ( getId().equalsIgnoreCase(SoapTestMain.testCaseId) ) {
				return (false);
			}
			if ( getType().equalsIgnoreCase("always")) {
				return (false);
			}
			return (true); // skip all others
		}

		if ( hasType("deprecated") ) {

			mLog.debug("shouldSkip: Never Run Deprecated");
			return true;

		}

		if ( hasArea("selfcheck".split(",")) ) {

			// Skip test cases with area="selfcheck",
			// unless the harness is running the self check

			if ( SoapTestCore.testAreas == null ) {
				// Skip this test - no AREAS were specified, so the selfcheck is not being executed
				return (true);
			}
			for (Iterator<String> i = SoapTestCore.testAreas.iterator(); i.hasNext();)
			{
				if ( i.next().equalsIgnoreCase("selfcheck") ) {
					return (false); // Don't skip
				}
			}

			// We made it through the list of areas and didn't find selfcheck
			return (true); // Skip the test

		}

		if ( getHostCount() > SoapTestCore.hostCount ) {

			mLog.debug("shouldSkip: The required hosts for the test case are more than the SUT has.  Don't run the test.");
			return ( true );

		}

		// If any excludes are specified, and the excludes match the test case, then skip
		if ( (SoapTestCore.testExcludes != null) && (!SoapTestCore.testExcludes.isEmpty()) ) {

			mLog.debug("shouldSkip: If there are excludes to skip, skip this test if there is a match");
			if ( hasArea(SoapTestCore.testExcludes) ) {
				return (true);
			}
		}


		if ( (SoapTestCore.testAreas != null) && (!SoapTestCore.testAreas.isEmpty()) )
		{

			mLog.debug("shouldSkip: If the test is not a TestCase, then don't run.  If it is a TestCase, run it if the area matches");
			return ( !hasArea(SoapTestCore.testAreas) );

		}

		if ( (SoapTestCore.testAreasToSkip != null) && (!SoapTestCore.testAreasToSkip.isEmpty()) ) {

			mLog.debug("shouldSkip: If there are areas to skip, skip this test if there is a match");
			if ( hasArea(SoapTestCore.testAreasToSkip) ) {
				return (true);
			}

		}

		// Check the supportedAfter attribute
		// Make sure that all server versions (i.e. upgrades)
		// are after the specified supportedAfter value
		if ( installPathShouldSkip(core) )
		{
			// The test case is not supported in the release.  Skip it.
			return (true);
		}

		if ( SoapTestCore.testServerBits.equalsIgnoreCase("open") )
		{

			// Skip the following test areas if the open source tests are being asked for
			// Use "network" when a feature is available for both network and OSS, but behaves differently for network
			String[] networkAreas = { "network", "verity", "backup", "restore", "cluster", "mapi", "crossMailboxSearch", "HSM", "domainAdmin" };

			if ( hasArea(networkAreas) ) {
				mLog.debug("shouldSkip: If the server is running OSS, then skip Network features");
				return ( true );
			}

			String[] comcastAreas = { "voicemail" };
			if ( hasArea(comcastAreas) ) {
				mLog.debug("shouldSkip: If the server is running OSS, then skip Comcast features");
				return ( true );
			}

		}

		if ( SoapTestCore.testServerBits.equalsIgnoreCase("network") )
		{

			// Skip the following test areas if the network tests are being asked for
			// Use "open" when a feature is available for both network and OSS, but behaves differently for OSS
			String[] openAreas = { "open" };


			if ( hasArea(openAreas) ) {
				mLog.debug("shouldSkip: If the server is running Network, then skip open features");
				return ( true );
			}

			String[] comcastAreas = { "voicemail" };
			if ( hasArea(comcastAreas) ) {
				mLog.debug("shouldSkip: If the server is running OSS, then skip Comcast features");
				return ( true );
			}

		}

		if ( SoapTestCore.testServerBits.equalsIgnoreCase("comcast") )
		{

			// Skip the following test areas if the network tests are being asked for
			// Use "open" when a feature is available for both network and OSS, but behaves differently for OSS
			String[] openAreas = { "open" };


			if ( hasArea(openAreas) ) {
				mLog.debug("shouldSkip: If the server is running Network, then skip open features");
				return ( true );
			}

		}


		/* If the specified test duration was not specified, then only run short */
		if ( SoapTestCore.testDuration == null ) {
			if ( getDuration().equalsIgnoreCase("long") ) {
				return (true); // When duration not specified, skip long tests
			}
		} else { // testDuration is specified

			if ( (SoapTestCore.testDuration.equalsIgnoreCase("short")) && (getDuration().equalsIgnoreCase("long")) ) {
				return (true); // When duration is short, skip long tests
			}

			if ( SoapTestCore.testDuration.equalsIgnoreCase("long") ) {

				// If running long tests, always run type="always"
				// but, skip type!=always and duration=short
				if ( (!hasType("always")) && (getDuration().equalsIgnoreCase("short")) ) {
					return (true);
				}

			}

		}

		if (SoapTestCore.testType == null) {

			/* If the test type (-t option) is not specified, always run everything */
			return false;

		}


		/* The type was specified */


		/* If the test type is sanity, run always and sanity */
		/* If the test type is smoke, run always and smoke */
		/* If the test type is bhr, run always and bhr */
		/* If the test type is functional, run always, smoke, and functional */
		/* If the test type is feature, run always, smoke, and feature */
		/* If the test type is negative, run always, smoke, and negative */
		String[] SMOKE_TYPES = {"always","smoke"};
		String[] BHR_TYPES = {"always","bhr"};
		String[] SANITY_TYPES = {"always","sanity"};
		String[] FUNCTIONAL_TYPES = {"always","functional"};
		String[] FEATURE_TYPES = {"always","feature"};
		String[] NEGATIVE_TYPES = {"always","negative"};
		String[] MEASUREMENT_TYPES = {"always","measurement"};
		String[] FULL_TYPES = {"always","smoke","bhr"};
		String[] SMOKE_TEMP_TYPES = {"always","smoke-temp"};
		String[] BHR_TEMP_TYPES = {"always","bhr-temp"};
		String[] SANITY_TEMP_TYPES = {"always","sanity-temp"};
		String[] FUNCTIONAL_TEMP_TYPES = {"always","functional-temp"};
		String[] CHAT_TYPES = {"always","chat"};

		for (Iterator<String> iterator = SoapTestCore.testType.iterator(); iterator.hasNext(); ) {
			String type = iterator.next();

			if (type.equalsIgnoreCase("smoke")) {
				if (hasType(SMOKE_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("bhr")) {
				if (hasType(BHR_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("sanity")) {
				if (hasType(SANITY_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("functional")) {
				if (hasType(FUNCTIONAL_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("feature")) {
				if (hasType(FEATURE_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("negative")) {
				if (hasType(NEGATIVE_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("measurement")) {
				if (hasType(MEASUREMENT_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("full")) {
				if (hasType(FULL_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("smoke-temp")) {
				if (hasType(SMOKE_TEMP_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("bhr-temp")) {
				if (hasType(BHR_TEMP_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("sanity-temp")) {
				if (hasType(SANITY_TEMP_TYPES)) {
					return false;
				}
			}

			if (type.equalsIgnoreCase("functional-temp")) {
				if (hasType(FUNCTIONAL_TEMP_TYPES)) {
					return false;
				}
			}
			if (type.equalsIgnoreCase("functional-temp")) {
				if (hasType(CHAT_TYPES)) {
					return false;
				}
			}
		}

		mLog.debug("shouldSkip: No match - skip the test");
		return true;
	}
}