package com.zimbra.qa.bugreports;

import java.io.*;
import java.util.*;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dom4j.*;

public class TestCaseEngineNUnit extends TestCaseEngine {
    private static Logger mLogger = LogManager.getLogger(TestCaseEngineNUnit.class);

    public TestCaseEngineNUnit(File results) {
        super(results);
        mLogger.info("new " + TestCaseEngineNUnit.class.getCanonicalName());

    }

    @SuppressWarnings("rawtypes")
    @Override
    public List<TestCaseResult> getData() throws UnsupportedEncodingException, IOException, DocumentException {

        List<TestCaseResult> results = new ArrayList<TestCaseResult>();

        Document document = this.getResultsDocument();
        List nodes = document.getRootElement().selectNodes("//test-case");
        for (Object n : nodes) {
            if (n instanceof Element) {
                Element e = (Element) n;

                String name = e.attributeValue("name", "undefined");
                String executed = e.attributeValue("executed", "False");
                String success = e.attributeValue("success", "False");
                String time = e.attributeValue("time", "-1");
                String asserts = e.attributeValue("asserts", "-1");

                mLogger.info(String.format("%s: executed %s, success %s, time %s, asserts %s", name, executed, success,
                        time, asserts));
                if (e.element("failure") != null && e.element("failure").elementText("message").contains("SyncHarness.HarnessException"))
                    results.add(new TestCaseResult(name, "exception"));
                else {
                    // In nunit results, if the test case is ignored, the "executed" property of the
                    // "test-case" will be false. So to provide Ignored count, we need to pass
                    // "skipped".
                    if (executed.equalsIgnoreCase("false"))
                        results.add(new TestCaseResult(name, "skipped"));
                    else
                        results.add(new TestCaseResult(name, success));
                }
            }
        }
        return (results);
    }

}
