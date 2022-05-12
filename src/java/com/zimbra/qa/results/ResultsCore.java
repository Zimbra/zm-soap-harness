package com.zimbra.qa.results;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Options;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.ibm.staf.service.STAFCommandParseResult;
import com.zimbra.cs.util.BuildInfo;

public class ResultsCore {

    // General debug logger
    static public Logger mLog = LogManager.getLogger(ResultsStaf.class);

    // STAF stuff
    STAFCommandParseResult stafRequest = null;

    // Data
    protected int vPassed = 0;
    protected int vFailed = 0;
    protected int vError = 0;

    protected String vSuite = null;
    protected String vArchitecture = null;
    protected String vBits = null;
    protected String vBuild = null;
    protected String vType = null;
    protected String vBranch = null;
    protected String vURL = null;

    protected String dHostname = "zqa-tms.eng.vmware.com";

    // Database stuff
    static protected final String dClass = "org.postgresql.Driver";
    static protected final String dDB = "tms_production";
    static protected final String dLogin = "postgres";
    static protected final String dPassword = "zimbra";
    static protected final String dResultsTable = "results";

    public static void version() {
        BuildInfo.main(null);
    }

    public static void usage(Options o) {
        HelpFormatter hf = new HelpFormatter();
        hf.printHelp("StafTestCore -h | -v | -f <arg>", o, true);
        System.exit(1);
    }

    public ResultsCore() {
        // Add a console appender so that output goes to the console
        // mLog.addAppender(new ConsoleAppender());
        // mLog.setLevel(Level.INFO);
        mLog.info("New StafCore object");
    }

    public ResultsCore(STAFCommandParseResult parsedRequest) throws ResultsException {
        // Add a console appender so that output goes to the console
        // mLog.addAppender(new ConsoleAppender());
        // mLog.setLevel(Level.INFO);
        mLog.info("New StafCore object.  stafRequest: " + parsedRequest);
        stafRequest = parsedRequest;
    }

    protected String recordResults() throws ResultsException {
        mLog.info("StafCore: recordResults");
        vPassed = 0;
        vFailed = 0;
        vError = 0;
        vURL = null;

        StringBuffer columns = new StringBuffer();
        StringBuffer values = new StringBuffer();

        // The following default to 0 if not sepcified
        if (stafRequest.optionTimes(ResultsStaf.pPASSED) > 0) {
            vPassed = Integer.parseInt(stafRequest.optionValue(ResultsStaf.pPASSED));
        }
        if (stafRequest.optionTimes(ResultsStaf.pFAILED) > 0) {
            vFailed = Integer.parseInt(stafRequest.optionValue(ResultsStaf.pFAILED));
        }
        if (stafRequest.optionTimes(ResultsStaf.pERRORS) > 0) {
            vError = Integer.parseInt(stafRequest.optionValue(ResultsStaf.pERRORS));
        }
        if (stafRequest.optionTimes(ResultsStaf.pURL) > 0) {
            vURL = stafRequest.optionValue(ResultsStaf.pURL);
        }

        columns.append(" passed");
        values.append(" " + vPassed);
        columns.append(", failed");
        values.append(", " + vFailed);
        columns.append(", error");
        values.append(", " + vError);

        if (getSuiteID(true) != null) {
            columns.append(", suite_id");
            values.append(", " + getSuiteID(true));
        }

        if (getArchitectureID(true) != null) {
            columns.append(", architecture_id");
            values.append(", " + getArchitectureID(true));
        }

        if (vURL != null) {
            columns.append(", url");
            values.append(", '" + vURL + "'");
        }

        /*
         * Don't use bits for now
         * 
         * if ( getBitsName(true) != null ) { columns.append(", bits");
         * values.append(", " + q(getBitsName(true))); }
         * 
         */

        if (getBuildID(true) != null) {
            columns.append(", build_id");
            values.append(", " + getBuildID(true));
        }

        if (getTypeID(true) != null) {
            columns.append(", testtype_id");
            values.append(", " + getTypeID(true));
        }

        if (getBranchID(true) != null) {
            columns.append(", branch_id");
            values.append(", " + getBranchID(true));
        }
        String insert = new String("INSERT INTO " + dResultsTable + " " + " ( " + columns.toString() + " ) "
                + " VALUES " + " ( " + values.toString() + " ) ");
        int result = dbExecuteUpdate(insert);
        mLog.debug("recordResults: " + insert + " = (" + result + ")");
        return ("Recorded");
    }

    protected String queryResults() throws ResultsException {
        mLog.info("StafCore: queryResults");
        StringBuffer result = new StringBuffer();
        try {
            StringBuffer where = new StringBuffer();

            // Initialize the 'where' with a constraint that will be true
            where.append(p(" id > 0 "));

            if (getSuiteID(false) != null) {
                where.append(" AND " + p("suite_id = " + q(getSuiteID(false))));
            }

            if (getArchitectureID(false) != null) {
                where.append(" AND " + p("architecture_id = " + getArchitectureID(false)));
            }

            /*
             * Don't use bits for now
             * 
             * if ( getBitsName(false) != null ) { where.append( " AND " + p("bits = "+
             * q(getBitsName(false))) ); }
             * 
             */
            if (getBuildID(false) != null) {
                where.append(" AND " + p("build_id = " + getBuildID(false)));
            }

            if (getTypeID(false) != null) {
                where.append(" AND " + p("test_type = " + q(getTypeID(false))));
            }

            if (getBranchID(false) != null) {
                where.append(" AND " + p("branch_id = " + getBranchID(false)));
            }

            String query = new String("SELECT build_id, passed, failed, error FROM  " + dResultsTable + " WHERE "
                    + p(where.toString()) + ";");

            ResultSet rs = dbExecuteQuery(query);

            while (rs.next()) {
                mLog.info(getBuildName(rs.getString("build_id")) + ": " + "Passed(" + rs.getString("passed") + ") "
                        + "Failed(" + rs.getString("failed") + ") " + "Script Errors(" + rs.getString("error") + ")");

                result.append(getBuildName(rs.getString("build_id")) + ": " + "Passed(" + rs.getString("passed") + ") "
                        + "Failed(" + rs.getString("failed") + ") " + "Script Errors(" + rs.getString("error") + ")\n");
            }
        } catch (SQLException e) {
            result.append("SQLException while querying results");
            throw new ResultsException("SQLException while querying results", e);
        }
        return (result.toString());
    }

    private String getArchitectureID(boolean required) throws ResultsException {
        // Throw an exception if a required argument is not found
        if ((stafRequest.optionTimes(ResultsStaf.pARCHITECTURE) <= 0) && (required)) {
            throw new ResultsException(ResultsStaf.pARCHITECTURE + " is a required argument");
        }
        String architecture = stafRequest.optionValue(ResultsStaf.pARCHITECTURE);
        if (architecture.equals("")) {
            return (null);
        }
        // Convert to upper case
        architecture = architecture.toUpperCase();
        String id = null;
        String query = "SELECT id FROM architectures WHERE UPPER(name) = '" + architecture + "';";
        try {
            ResultSet rs = dbExecuteQuery(query);
            while (rs.next()) {
                id = rs.getString("id");
            }

            if (id == null) {
                throw new ResultsException("Could not find architecture: " + architecture);
            }

        } catch (SQLException e) {
            throw new ResultsException("SQLException while looking for architecture", e);
        }
        return (id);
    }

    private String getBranchID(boolean required) throws ResultsException {

        // Throw an exception if a required argument is not found
        if ((stafRequest.optionTimes(ResultsStaf.pBRANCH) <= 0) && (required)) {
            throw new ResultsException(ResultsStaf.pBRANCH + " is a required argument");
        }
        String branch = stafRequest.optionValue(ResultsStaf.pBRANCH);
        if (branch.equals("")) {
            return (null);
        }
        branch = branch.toUpperCase();
        String id = null;
        String query = "SELECT id FROM branches WHERE UPPER(name) = '" + branch + "';";

        try {
            ResultSet rs = dbExecuteQuery(query);
            while (rs.next()) {
                id = rs.getString("id");
            }
            if (id == null) {
                throw new ResultsException("Could not find branch: " + branch);
            }
        } catch (SQLException e) {
            throw new ResultsException("SQLException while looking for branch", e);
        }
        return (id);
    }

    // TODO: need to incorporate a list of builds as returned
    private String getBuildID(boolean required) throws ResultsException {

        // Throw an exception if a required argument is not found
        if ((stafRequest.optionTimes(ResultsStaf.pBUILD) <= 0) && (required)) {
            throw new ResultsException(ResultsStaf.pBUILD + " is a required argument");
        }

        String build = stafRequest.optionValue(ResultsStaf.pBUILD);
        if (build.equals("")) {
            return (null);
        }

        // Add FOSS or NETWORK, is specified
        if (stafRequest.optionTimes(ResultsStaf.pBITS) > 0) {
            String type = stafRequest.optionValue(ResultsStaf.pBITS).toUpperCase();
            String append = "";
            if (type.equals("NETWORK"))
                append = "%_NETWORK";
            if (type.equals("FOSS"))
                append = "%_FOSS";
            if (type.equals("ZDESKTOP"))
                append = "_ZDESKTOP";
            build = build + append;
        }

        // Add OS, if specified
        StringBuilder architecture = new StringBuilder("");
        if (stafRequest.optionTimes(ResultsStaf.pARCHITECTURE) > 0) {
            architecture.append(" AND " + p("architecture_id = " + getArchitectureID(false)));
        }

        // Convert to upper case
        build = build.toUpperCase();

        String id = null;

        String query = "SELECT id FROM builds WHERE UPPER(name) like '%" + build + "%' " + architecture.toString()
                + " ;";

        try {
            ResultSet rs = dbExecuteQuery(query);
            while (rs.next()) {
                id = rs.getString("id");
            }

            if (id == null) {
                throw new ResultsException("Could not find build: " + build);
            }
        } catch (SQLException e) {
            throw new ResultsException("SQLException while looking for build", e);
        }
        return (id);
    }

    private String getSuiteID(boolean required) throws ResultsException {
        // Throw an exception if a required argument is not found
        if ((stafRequest.optionTimes(ResultsStaf.pSUITE) <= 0) && (required)) {
            throw new ResultsException(ResultsStaf.pSUITE + " is a required argument");
        }
        String suite = stafRequest.optionValue(ResultsStaf.pSUITE);
        if (suite.equals("")) {
            return (null);
        }
        // Convert to upper case
        suite = suite.toUpperCase();
        String id = null;
        String query = "SELECT id FROM suites WHERE UPPER(name) = '" + suite + "';";
        try {
            ResultSet rs = dbExecuteQuery(query);
            while (rs.next()) {
                id = rs.getString("id");
            }
            if (id == null) {
                throw new ResultsException("Could not find suite: " + suite);
            }
        } catch (SQLException e) {
            throw new ResultsException("SQLException while looking for suite", e);
        }
        return (id);
    }

    private String getTypeID(boolean required) throws ResultsException {

        // Throw an exception if a required argument is not found
        if ((stafRequest.optionTimes(ResultsStaf.pTYPE) <= 0) && (required)) {
            throw new ResultsException(ResultsStaf.pTYPE + " is a required argument");
        }

        String type = stafRequest.optionValue(ResultsStaf.pTYPE);
        if (type.equals("")) {
            return (null);
        }

        // Convert to upper case
        type = type.toUpperCase();

        String id = null;

        String query = "SELECT id FROM testtypes WHERE UPPER(name) = '" + type + "';";

        try {
            ResultSet rs = dbExecuteQuery(query);
            while (rs.next()) {
                id = rs.getString("id");
            }
            if (id == null) {
                throw new ResultsException("Could not find type: " + type);
            }
        } catch (SQLException e) {
            throw new ResultsException("SQLException while looking for type", e);
        }
        return (id);
    }

//    private String getBitsName(boolean required) throws ResultsException {
//        
//    	// Throw an exception if a required argument is not found
//    	if ( (stafRequest.optionTimes(ResultsStaf.pBITS) <= 0) && (required) ) {
//        	throw new ResultsException(ResultsStaf.pBITS + " is a required argument");
//    	}
//    	        
//    	String bits = stafRequest.optionValue(ResultsStaf.pBITS);
//        if ( bits.equals("") ) {
//        	return (null);
//        }
//
//        return ( bits.equals("NETWORK") ? "NETWORK" : "FOSS" );
//        
//    }

    private String getBuildName(String id) throws ResultsException {
        // TODO: Need to incorporate the specified bits (OPEN, NETWORK), if any
        String name = null;
        String query = "SELECT name FROM builds WHERE id = " + id + ";";
        try {
            ResultSet rs = dbExecuteQuery(query);
            while (rs.next()) {
                name = rs.getString("name");
            }

            if (name == null) {
                throw new ResultsException("Could not find build with id: " + id);
            }

        } catch (SQLException e) {
            throw new ResultsException("SQLException while looking for build", e);
        }
        return (name);
    }

    private ResultSet dbExecuteQuery(String query) throws ResultsException {
        
        mLog.info("dbExecuteQuery: \"" + query + "\"");
        ResultSet rs = null;
        try {
            String dURL = getURL();
            Class.forName(dClass);
            Connection connection = DriverManager.getConnection(dURL, dLogin, dPassword);
            Statement s = connection.createStatement();
            rs = s.executeQuery(query);
            connection.close();
        } catch (ClassNotFoundException e) {
            throw new ResultsException("recordResults threw ClassNotFoundException", e);
        } catch (SQLException e) {
            throw new ResultsException("recordResults threw SQLException", e);
        }
        return (rs);
    }

    private int dbExecuteUpdate(String update) throws ResultsException {
        mLog.info("dbExecuteUpdate: (" + update + ")");
        int result = 0;
        try {
            String dURL = getURL();
            Class.forName(dClass);
            Connection connection = DriverManager.getConnection(dURL, dLogin, dPassword);
            Statement s = connection.createStatement();
            result = s.executeUpdate(update);
            mLog.info("dbExecuteUpdate: result (" + result + ")");
            connection.close();
        } catch (ClassNotFoundException e) {
            throw new ResultsException("recordResults threw ClassNotFoundException", e);
        } catch (SQLException e) {
            throw new ResultsException("recordResults threw SQLException", e);
        }
        return (result);
    }

    private String getURL() {
        // Example: "jdbc:postgresql://zqa-004.eng.vmware.com/tms_production"
        return ("jdbc:postgresql://" + dHostname + "/tms_production");
    }

    private String q(String s) {
        return ("'" + s + "'");
    }

    private String p(String s) {
        return ("(" + s + ")");
    }

    /**
     * Exit status is 0 if no failures, 1 otherwise.
     */
    public static void main(String args[]) throws Exception {
        String theTime = "ResultsCore cannot run outside of staf";
        System.out.print(theTime);
        System.exit(theTime != null ? 1 : 0);
    }

    public static class ResultsException extends Exception {
        private static final long serialVersionUID = -1744781649020329498L;
        public ResultsException(String message) {
            super(message);
        }
        public ResultsException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
