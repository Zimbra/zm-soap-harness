package com.zimbra.qa.bugreports;

import java.io.*;
import java.util.*;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.appender.FileAppender;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.apache.logging.log4j.core.layout.PatternLayout;
import org.dom4j.DocumentException;

import com.zimbra.qa.bugreports.BugStatus.BugState;

public class ResultsCore {
    private static Logger mLogger = LogManager.getLogger(ResultsCore.class);

    /**
     * Build a 'status' string while processing. This string is returned by
     * getStatus() ... i.e. used as the STAF result
     */
    StringBuilder mStatusBuilder = new StringBuilder();

    public ResultsCore() throws IOException {
        mLogger.info("new " + ResultsCore.class.getCanonicalName());

    }

    private List<ReportItem> correlateData(List<TestCaseResult> results, Map<String, BugState> bugStatus,
            Map<String, List<String>> bugTestcase, Map<String, String> bugContact) {
        List<ReportItem> items = new ArrayList<ReportItem>();

        for (TestCaseResult result : results) {

            mLogger.debug("Processing tc: " + result.mTestCaseName + " result: " + result.mTestCaseResult);

            ReportItem item = new ReportItem();
            item.mTestCaseResult = result;

            if (result.mTestCaseResult == TestCaseResult.Status.PASSED) {

                // Loop through the passing test cases
                // If no bug is associated, skip it
                // If a bug is associated and status is OPEN, it needs followup
                // If a bug is associated and status is CLOSED, it doesn't need followup

                if (!bugTestcase.containsKey(result.mTestCaseName)) {
                    mLogger.debug("Passing TC (" + result.mTestCaseName + ") is not associated with a bug.  Skipping.");
                    continue;
                }

                for (String bugID : bugTestcase.get(result.mTestCaseName)) {

                    if (!bugStatus.containsKey(bugID)) {
                        mLogger.error("Unable to determine status bug(" + bugID + ") tc(" + result.mTestCaseName + ")");
                        continue;
                    }

                    BugState state = bugStatus.get(bugID);
                    if (state == BugState.RESOLVED || state == BugState.VERIFIED || state == BugState.CLOSED) {
                        item.mBugID = bugID;
                        item.mBugStatus = state;
                        item.mNeedsFollowUp = false;
                        item.mBugOwner = (bugContact.containsKey(bugID) ? bugContact.get(bugID)
                                : ReportItem.DefaultBugOwner);
                        // Keep searching in case another bug ID needs followup
                    } else {
                        item.mBugID = bugID;
                        item.mBugStatus = state;
                        item.mNeedsFollowUp = true;
                        item.mBugOwner = (bugContact.containsKey(bugID) ? bugContact.get(bugID)
                                : ReportItem.DefaultBugOwner);
                        break; // This bug needs followup, all done here.
                    }

                }

            } else {

                // Loop through the failing test cases
                // If no bug is associated, set as NEW for followup
                // If a bug is associated and status is OPEN, it doesn't need followup
                // If a bug is associated and status is CLOSED, it does need followup

                if (!bugTestcase.containsKey(result.mTestCaseName)) {

                    // Failure without existing bug
                    item.mNeedsFollowUp = true;
                    item.mBugID = null;
                    item.mBugOwner = null;

                } else {

                    for (String bugID : bugTestcase.get(result.mTestCaseName)) {

                        if (!bugStatus.containsKey(bugID)) {
                            mLogger.error(
                                    "Unable to determine status bug(" + bugID + ") tc(" + result.mTestCaseName + ")");
                            continue;
                        }

                        BugState state = bugStatus.get(bugID);
                        if (state == BugState.NEW || state == BugState.ASSIGNED || state == BugState.REOPENED
                                || state == BugState.IN_PROGRESS || state == BugState.UNCONFIRMED) {
                            item.mBugID = bugID;
                            item.mBugStatus = state;
                            item.mNeedsFollowUp = false;
                            item.mBugOwner = (bugContact.containsKey(bugID) ? bugContact.get(bugID)
                                    : ReportItem.DefaultBugOwner);
                            break; // Found the tracking bug, no need to go further
                        } else {
                            item.mBugID = bugID;
                            item.mBugStatus = state;
                            item.mNeedsFollowUp = true;
                            item.mBugOwner = (bugContact.containsKey(bugID) ? bugContact.get(bugID)
                                    : ReportItem.DefaultBugOwner);
                            // Keep searching in case another bug ID needs followup
                        }

                    }

                }

            }

            items.add(item);
        }

        return (items);
    }

    private String writeReportEntry(ReportItem item) {

        StringBuilder sb = new StringBuilder();

        if (item.mNeedsFollowUp) {
            sb.append("* ");
        }

        if (item.mBugID == null) {
            sb.append("NEW ");
        } else {
            sb.append(item.mBugID).append(' ');
            sb.append(item.mBugStatus).append(' ');
        }

        sb.append(item.mTestCaseResult.mTestCaseName.replace("com.zimbra.qa.selenium.projects.", "...")).append(' ');

        if (item.mBugID == null) {
            sb.append("-- http://bugzilla.zimbra.com/enter_bug.cgi");
        } else {
            sb.append("-- http://bugzilla.zimbra.com/show_bug.cgi?id=").append(item.mBugID).append(' ');
        }

        if (item.mBugOwner != null) {
            sb.append("( ").append(item.mBugOwner).append(" )");
        }

        return (sb.toString());

    }

    /**
     * Compare a ReportItem to another
     * <p>
     * Sort according to:<br>
     * 1. Needs Follow UP<br>
     * 2. Bug state<br>
     * 3. Bug ID<br>
     * <p>
     * 
     * @author Matt Rhoades
     *
     */
    private static class ReportItemComparator implements Comparator<ReportItem> {

        private static final int LessThan = -1;
//		private static final int EqualTo = 0;
        private static final int GreaterThan = 1;

        @Override
        public int compare(ReportItem a, ReportItem b) {

            // NeedsFollowUp bugs are first
            if (a.mNeedsFollowUp && !b.mNeedsFollowUp) {
                return (LessThan);
            }

            if (!a.mNeedsFollowUp && b.mNeedsFollowUp) {
                return (GreaterThan);
            }

            // NeedsFollowUp are equal (either both need it or both don't)

            // If one of the items doesn't have a bug ID, then it is first
            if (a.mBugID == null && b.mBugID != null) {
                return (LessThan);
            }

            if (a.mBugID != null && b.mBugID == null) {
                return (GreaterThan);
            }

            // If BugStatus is not equal, return based on Status order, i.e. UNCONFIRMED,
            // NEW, ASSIGNED, REOPENED, RESOLVED, VERIFIED, CLOSED
            if (a.mBugStatus != b.mBugStatus) {
                return (a.mBugStatus.compareTo(b.mBugStatus));
            }

            // BugStatus are equal

            // Return based on Test Case
            return (a.mTestCaseResult.mTestCaseName.compareTo(b.mTestCaseResult.mTestCaseName));
        }

    }

    private void writeReport(File root, List<ReportItem> items) throws IOException {
        int countPass = 0;
        int countFail = 0;
        int countSkipped = 0;
        int countException = 0;

        // Sort the items
        Collections.sort(items, new ReportItemComparator());

        // Create the BugReport.txt file as a log4j logger
        String filename = root.getAbsolutePath() + "/BugReports/BugReport.txt";
        FileAppender appender = FileAppender.newBuilder().setName("file")
                .setLayout(PatternLayout.newBuilder().withPattern("%m%n").build()).withFileName(filename).build();
        Logger report = LogManager.getLogger("report");
        LoggerContext context = (LoggerContext) LogManager.getContext(false);
        LoggerConfig loggerConfig = context.getConfiguration().getLoggerConfig(report.getName());
        loggerConfig.addAppender(appender, Level.INFO, null);
        context.updateLoggers();
        appender.start();
        try {

            report.info("--------------------------------------------------------------------------------------------");
            report.info("");
            report.info("Automated Bug Report:");
            report.info("");
            report.info("");
            report.info("Date: " + new Date());
            report.info("");
            report.info("Bug Reports:");
            report.info("(Items with an asterisk are out of sync and need follow up)");
            report.info("");

            report.info("");
            report.info("FAILED Testcases:");
            for (ReportItem item : items) {

                if (item.mTestCaseResult.mTestCaseResult == TestCaseResult.Status.FAILED) {
                    report.info(writeReportEntry(item));
                    countFail++;
                }

                else if (item.mTestCaseResult.mTestCaseResult == TestCaseResult.Status.UNKNOWN) {
                    report.info(writeReportEntry(item));
                    countFail++;
                }
            }

            report.info("");
            report.info("PASSED Testcases:");
            for (ReportItem item : items) {

                if (item.mTestCaseResult.mTestCaseResult == TestCaseResult.Status.PASSED) {
                    report.info(writeReportEntry(item));
                    countPass++;
                }

            }

            report.info("");
            report.info("SKIPPED Testcases:");
            for (ReportItem item : items) {

                if (item.mTestCaseResult.mTestCaseResult == TestCaseResult.Status.SKIPPED) {
                    report.info(writeReportEntry(item));
                    countSkipped++;
                }

            }

            report.info("");
            report.info("Exceptions:");
            for (ReportItem item : items) {

                if (item.mTestCaseResult.mTestCaseResult == TestCaseResult.Status.EXCEPTION) {
                    report.info(writeReportEntry(item));
                    countException++;
                }

            }

            report.info("");
            report.info("");

        } finally {
            loggerConfig.removeAppender(report.getName());
        }

        // Update the status string
        mStatusBuilder.append("\t").append(countPass).append(" PASSED Testcases:\n");
        mStatusBuilder.append("\t").append(countFail).append(" FAILED Testcases:\n");
        mStatusBuilder.append("\t").append(countSkipped).append(" SKIPPED Testcases:\n");
        mStatusBuilder.append("\t").append(countException).append(" EXCEPTIONS:\n");

    }

    private void writeEmailSummary(File root, List<TestCaseResult> results) throws IOException {

        String filename = root.getAbsolutePath() + "/BugReports/email-results-summary.txt";
        FileAppender appender = FileAppender.newBuilder().setName("file")
                .setLayout(PatternLayout.newBuilder().withPattern("%m%n").build()).withFileName(filename).build();
        Logger report = LogManager.getLogger("report");
        LoggerContext context = (LoggerContext) LogManager.getContext(false);
        LoggerConfig loggerConfig = context.getConfiguration().getLoggerConfig(report.getName());
        loggerConfig.addAppender(appender, Level.INFO, null);
        context.updateLoggers();
        appender.start();
        try {
            report.info("Total Tests: " + results.size());

            for (TestCaseResult.Status s : TestCaseResult.Status.values()) {

                report.info(s.toString() + " : " + TestCaseResult.frequency(results, s));

            }

        } finally {
            loggerConfig.removeAppender(report.getName());
        }

    }

    private void writeTestSummary(File root, List<TestCaseResult> results) throws IOException {

        Properties properties = new Properties();
        int failCount = 0;

        for (TestCaseResult.Status s : TestCaseResult.Status.values()) {
            if (!(s.toString().equalsIgnoreCase("passed")))
                failCount += TestCaseResult.frequency(results, s);
            else
                properties.setProperty(s.toString(), "" + TestCaseResult.frequency(results, s));

        }

        properties.setProperty(TestCaseResult.Status.FAILED.toString(), "" + failCount);
        // Currently what should Errors represent is not known. Hence setting it to
        // zero. Once we know exactly what Error is, need to modify code.
        // int errors = results.size() - TestCaseResult.frequency(results,
        // TestCaseResult.Status.PASSED) - TestCaseResult.frequency(results,
        // TestCaseResult.Status.FAILED);
        properties.setProperty("Errors", "" + 0);

        OutputStream os = null;
        try {

            os = new FileOutputStream(root.getAbsolutePath() + "/testsummary.txt");
            properties.store(os, null);

        } finally {
            if (os != null) {
                os.close();
                os = null;
            }
        }

    }

    /**
     * Create the Bug Report
     * 
     * @param root The base folder containing the test results
     * @throws UnsupportedEncodingException
     * @throws IOException
     * @throws DocumentException
     * @throws ResultsException
     */
    public void execute(File root)
            throws UnsupportedEncodingException, IOException, DocumentException, ResultsException {

        /*
         * Build a list of passed and failed test cases, based on the TestNG XML files
         */
        List<TestCaseResult> results = new ArrayList<TestCaseResult>();
        List<TestCaseEngine> testCaseEngines = TestCaseEngineFactory.getEngines(root);

        for (TestCaseEngine testCaseEngine : testCaseEngines) {
            results.addAll(testCaseEngine.getData());
        }
        writeTestSummary(root, results);
        writeEmailSummary(root, results);

        /*
         * Build Maps of the bug data, ID vs TestCase vs QAContact
         */
        Map<String, BugState> bugStatus = BugStatus.getStatusData();
        Map<String, List<String>> bugTestcase = BugTestcase.getTestcaseData();
        Map<String, String> bugContact = BugQAContact.getQAContactData();

        mLogger.info("Processing " + root.getAbsolutePath() + " ...");

        /*
         * Correlate the Pass/Fail results with the bugzilla content
         */
        List<ReportItem> reportItems = correlateData(results, bugStatus, bugTestcase, bugContact);

        /*
         * Write the bug report to a text file
         */
        writeReport(root, reportItems);

        mLogger.info("Done!");

    }

    public String getStatus() {

        return ("Report: Wrote\n" + mStatusBuilder.toString());

    }

    private static class ReportItem {
        public static final String DefaultBugOwner = "None";

        public TestCaseResult mTestCaseResult = null;

        public String mBugID = null;
        public BugState mBugStatus = BugState.NEW;
        public String mBugOwner = ReportItem.DefaultBugOwner;
        public boolean mNeedsFollowUp = true;
    }

    public static class ResultsException extends Exception {
        private static Logger mLogger = LogManager.getLogger(ResultsException.class);

        private static final long serialVersionUID = 7716078373482619354L;

        public ResultsException(String message) {
            super(message);
            mLogger.error(message, this);
        }

        public ResultsException(Throwable cause) {
            super(cause);
            mLogger.error(cause.getMessage(), cause);
        }

        public ResultsException(String message, Throwable cause) {
            super(message, cause);
            mLogger.error(message, cause);
        }

    }

}
