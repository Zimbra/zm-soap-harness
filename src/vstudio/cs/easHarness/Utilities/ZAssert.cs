using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using NUnit.Framework;
using System.Xml;
using System.Text.RegularExpressions;
using System.IO;


namespace Utilities
{
    public class ZAssert
    {


        private static int TotalCountTests = 0;
        private static int TotalCountPass = 0;

        private static int CountTests;
        private static int CountPass;

        private static ILog tcLog = LogManager.GetLogger("TestCaseLogger");
        private static ILog log = LogManager.GetLogger(typeof(ZAssert));
        public static void ResetCounts()
        {
            CountTests = 0;
            CountPass = 0;
        }

        public static void DisplayCounts()
        {
            tcLog.Info("");
            tcLog.Info("");
            tcLog.Info("Test Case Result: " + (((CountTests - CountPass) == 0) ? "PASS" : "FAIL"));
            tcLog.Info("Tests Executed: " + CountTests);
            tcLog.Info("Tests Passed:   " + CountPass);
            tcLog.Info("Tests Failed:   " + (CountTests - CountPass));
            tcLog.Info(new String('#', 40));
            tcLog.Info("");
            tcLog.Info("");
        }

        public static void DisplayTotalCounts()
        {
            tcLog.Info("");
            tcLog.Info("");
            tcLog.Info("Total Tests Executed: " + TotalCountTests);
            tcLog.Info("Total Tests Passed:   " + TotalCountPass);
            tcLog.Info("Total Tests Failed:   " + (TotalCountTests - TotalCountPass));
        }

        //[4/8/2011] This method is not used right now. Should delete it at later date.
        public static Boolean IsTimeToReset()
        {

            log.Info("Test Harness: total test cases executed: " + TotalCountTests);
            tcLog.Info("Test Harness: total test cases executed: " + TotalCountTests);

            log.Info("Is total test cases reached 40?: " + TotalCountTests / 40.0);
            tcLog.Info("Is total test cases reached 40?: " + TotalCountTests / 40.0);
            // For every 40 test cases return true
            if (TotalCountTests % 40 == 0)
            {

                return true;
            }
            return false;
        }

        public static void IsTrue(bool condition, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} == True) [{2}]", "IsTrue", condition, message);
            try
            {
                Assert.IsTrue(condition, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void IsFalse(bool condition, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} == False) [{2}]", "IsFalse", condition, message);
            try
            {
                Assert.IsFalse(condition, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void IsNull(object anObject, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} == null) [{2}]", "IsNull", anObject, message);
            try
            {
                Assert.IsNull(anObject, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void IsNotNull(object anObject, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} != null) [{2}]", "IsNotNull", anObject, message);
            try
            {
                Assert.IsNotNull(anObject, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void AreEqual(decimal expected, decimal actual, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} == {2}) [{3}]", "AreEqual", expected, actual, message);
            try
            {
                Assert.AreEqual(expected, actual, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void AreEqual(object expected, object actual, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} == {2}) [{3}]", "AreEqual", expected, actual, message);
            try
            {
                Assert.AreEqual(expected, actual, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        //Added AreEqual overloaded function to compare datetime-string values 
        public static void AreEqual(string expected, string actual, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} == {2}) [{3}]", "AreEqual", expected, actual, message);
            try
            {
                Assert.AreEqual(expected, actual, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void That(bool condition, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} == True) [{2}]", "That", condition, message);
            try
            {
                Assert.That(condition, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void Greater(int expectedGreaterValue, int expectedLesserValue, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} > {2}) [{3}]", "Greater", expectedGreaterValue, expectedLesserValue, message);
            try
            {
                Assert.Greater(expectedGreaterValue, expectedLesserValue, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void Less(int expectedLesserValue, int expectedGreaterValue, string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- ({1} < {2}) [{3}]", "Less", expectedLesserValue, expectedGreaterValue, message);
            try
            {
                Assert.Less(expectedLesserValue, expectedGreaterValue, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void StringContains(string str, string substr, string message)
        {
            CountTests++; TotalCountTests++;

            // For logging
            StringBuilder stringBuilder = new StringBuilder();
            tcLog.InfoFormat("{0,15} -- ({1} contains {2}) [{3}]", "StringContains", str, substr, message);

            try
            {
                StringAssert.Contains(substr, str, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;

        }

        public static void StringDoesNotContain(string str, string substr, string message)
        {
            CountTests++; TotalCountTests++;

            // For logging
            StringBuilder stringBuilder = new StringBuilder();
            tcLog.InfoFormat("{0,15} -- ({1} does not contain {2}) [{3}]", "StringDoesNotContain", str, substr, message);

            try
            {
                StringAssert.DoesNotContain(substr, str, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;

        }

        public static void Contains(object expected, System.Collections.ICollection actual, string message)
        {
            CountTests++; TotalCountTests++;

            // For logging
            StringBuilder stringBuilder = new StringBuilder();
            foreach (object o in actual)
            {
                stringBuilder.Append(o.ToString() + ", ");
            }
            tcLog.InfoFormat("{0,15} -- ({1} is contained in '{2}') [{3}]", "Contains", expected, stringBuilder.ToString(), message);

            try
            {
                Assert.Contains(expected, actual, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
            CountPass++; TotalCountPass++;
        }

        public static void DoesNotContain(object expected, System.Collections.ICollection actual, string message)
        {
            CountTests++; TotalCountTests++;

            // For logging
            StringBuilder stringBuilder = new StringBuilder();
            foreach (object o in actual)
            {
                stringBuilder.Append(o.ToString() + ", ");
            }
            tcLog.InfoFormat("{0,15} -- ({1} is not contained in '{2}') [{3}]", "DoesNotContain", expected, stringBuilder.ToString(), message);

            bool found = false;
            foreach (object o in actual)
            {
                if (o.Equals(expected))
                {
                    found = true;
                }
            }

            if (found)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true));
                throw new AssertionException("ZAssert.DoesNotContain found the object");
            }

            CountPass++; TotalCountPass++;
        }


        public static void Fail(string message)
        {
            CountTests++; TotalCountTests++;
            tcLog.InfoFormat("{0,15} -- {1}", "Fail", message);
            try
            {
                Assert.Fail(message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }
        }

        public static void AddException(string error, Exception e)
        {
            tcLog.Error(error, e);
            CountTests++; TotalCountTests++;
        }

        #region XML methods

        /*
         * public DateTime toUTC(XmlNode context, string path)
         * 
         * Return a UTC DateTime for the specified soap date/time element
         * 
         * XmlNode contect: the SOAP Response
         * string xPath: an xPath query that finds the date/time element
         * 
         * Notes:
         * 
         * xPath should query for an element such as <s d="20101225T123000" tz="(GMT-08.00) Pacific Time (US &amp; Canada)"/>
         * sample xPath values: "//mail:s", "//mail:e", etc.
         * 
         * */
        public static DateTime toUTC(XmlNode context, string xPath)
        {

            // Error checking
            if (context == null)
                throw new HarnessException("toUTC: context cannot be null");
            if (xPath == null)
                throw new HarnessException("toUTC: path cannot be null");

            // Find the specified path (e.g. //mail:s)
            //
            // It seems that SelectSingleNode will also search the ParentNode, I'm not sure why
            // So, take a clone, which will copy the context into a new object with ParentNode=null
            //
            XmlNode xDT = context.Clone().SelectSingleNode(xPath, MyNamespaceManager);
            if (xDT == null)
            {
                throw new HarnessException("toUTC: " + xPath + " didn't match " + PrettyPrint(context.OuterXml));
            }

            // Parse the d and tz attributes (e.g. <s d="20101225T123000" tz="(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana"/>
            string aD = (xDT.Attributes["d"] != null ? xDT.Attributes["d"].Value : null);
            string aTZ = (xDT.Attributes["tz"] != null ? xDT.Attributes["tz"].Value : null);

            #region Check for format yyyyMMdd

            if (aD.Length == 8)
            {
                return (DateTime.ParseExact(aD, "yyyyMMdd", System.Globalization.CultureInfo.InvariantCulture));
            }

            #endregion


            #region Check for format yyyyMMddTHHmmssZ

            if (aD.EndsWith("Z"))
            {

                // The "d" attribute is in UTC.  Just return the conversion to local time
                return (DateTime.ParseExact(aD, "yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture));

            }

            #endregion


            #region Check for format time with timezone

            // If timezone is not specified, then that is a SOAP error
            if (aTZ == null)
            {
                throw new HarnessException("non UTC time specified without timezone " + PrettyPrint(xDT.OuterXml));
            }

            // "d" is specified as localtime with timezone
            DateTime dateTimeLocal = DateTime.ParseExact(aD, "yyyyMMdd'T'HHmmss", System.Globalization.CultureInfo.InvariantCulture);

            // Look for the specified timezone in the SOAP TZ definitions
            XmlNodeList xTZ = context.SelectNodes("//mail:tz", MyNamespaceManager);
            XmlNode timezoneDefinition = null;

            foreach (XmlNode x in xTZ)
            {
                if ((x.Attributes != null) && (x.Attributes["id"] != null))
                {
                    if (x.Attributes["id"].Value.Equals(aTZ))
                    {
                        log.Debug("timezone definition: " + PrettyPrint(x.OuterXml));
                        timezoneDefinition = x;
                        break; // foreach (XmlNode ...
                    }
                }
            }

            if (timezoneDefinition == null)
            {
                throw new HarnessException("Unable to determine timezone definition");
            }

            TimeSpan currentOffset = determineUtcOffset(dateTimeLocal, timezoneDefinition);

            return (dateTimeLocal.Add(-(currentOffset)));

            #endregion

        }

        private static TimeSpan determineUtcOffset(DateTime t, XmlNode x)
        {
            // Sample:
            //
            // <tz dayoff="-420" stdoff="-480" id="(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana">
            //  <standard sec="0" hour="2" wkday="1" min="0" mon="11" week="1" />
            //  <daylight sec="0" hour="2" wkday="1" min="0" mon="3" week="2" />
            // </tz>


            if ((x.Attributes == null) || (x.Attributes["stdoff"] == null))
            {
                throw new HarnessException("tz definition requires a stdoff " + PrettyPrint(x.OuterXml));
            }

            if (x.SelectSingleNode("//mail:standard", MyNamespaceManager) != null)
            {
                DateTime standardStart = tzTransitionDateTime(x.SelectSingleNode("//mail:standard", MyNamespaceManager), t.Year);
                DateTime daylightStart = tzTransitionDateTime(x.SelectSingleNode("//mail:daylight", MyNamespaceManager), t.Year);

                if ((standardStart < t) && (daylightStart < t))
                {
                    if (standardStart < daylightStart)
                    {
                        standardStart = standardStart.AddYears(1);
                    }
                    else
                    {
                        daylightStart = daylightStart.AddYears(1);
                    }
                }
                if ((t < standardStart) && (t < daylightStart))
                {
                    if (standardStart < daylightStart)
                    {
                        daylightStart = daylightStart.AddYears(-1);
                    }
                    else
                    {
                        standardStart = standardStart.AddYears(-1);
                    }
                }

                if ((standardStart < t) && (t < daylightStart))
                {
                    // t is in standard time
                    return (new TimeSpan(0, Int32.Parse(x.Attributes["stdoff"].Value), 0));
                }

                // t is in daylight time
                return (new TimeSpan(0, Int32.Parse(x.Attributes["dayoff"].Value), 0));

            }

            // If <standard/> and <daylight/> are not specified, then just return stdoff
            return (new TimeSpan(0, Int32.Parse(x.Attributes["stdoff"].Value), 0));

        }

        private static DateTime tzTransitionDateTime(XmlNode tz, int year)
        {
            // Sample:
            //
            //  <standard sec="0" hour="2" wkday="1" min="0" mon="11" week="1" />
            // OR
            //  <daylight sec="0" hour="2" wkday="1" min="0" mon="3" week="2" />
            //

            // mon is required
            int mon = Int32.Parse(tz.Attributes["mon"].Value);
            int mday = 1;

            if (tz.Attributes["mday"] != null)
            {
                mday = Int32.Parse(tz.Attributes["mday"].Value);
            }
            else
            {
                // Use week, wkday to determine mday
                int week = Int32.Parse(tz.Attributes["week"].Value);
                int wkday = Int32.Parse(tz.Attributes["wkday"].Value);

                DateTime temp = new DateTime(year, mon, 1);

                // Add number of days so we are on the correct day of the week
                // Zimbra wkday is 1 based (1=Sunday)
                // MS DayOfWeek is 0 based (0=Sunday)
                // Add 1 to DayOfWeek so that they are in line
                //
                int dayOfWeek = (int)temp.DayOfWeek + 1;
                temp = temp.AddDays(wkday - dayOfWeek);

                // If the wkday falls in a different month, then add 7 more days
                if (temp.Month != mon)
                {
                    temp = temp.AddDays(7);
                }

                // Then, add the number of weeks
                temp = temp.AddDays(7 * (week - 1));

                mday = temp.Day;

            }

            int hour = Int32.Parse(tz.Attributes["hour"].Value); ;
            int min = 0;
            int sec = 0;

            if (tz.Attributes["min"] != null)
                min = Int32.Parse(tz.Attributes["min"].Value);
            if (tz.Attributes["sec"] != null)
                sec = Int32.Parse(tz.Attributes["sec"].Value);

            return (new DateTime(year, mon, mday, hour, min, sec));

        }

        private static XmlNamespaceManager MyNamespaceManager = null;
        public static XmlNamespaceManager NamespaceManager
        {
            get
            {
                if (MyNamespaceManager == null)
                {
                    MyNamespaceManager = new XmlNamespaceManager(new NameTable());

                    #region Zimbra SOAP

                    MyNamespaceManager.AddNamespace("zimbra", "urn:zimbra");
                    MyNamespaceManager.AddNamespace("acct", "urn:zimbraAccount");
                    MyNamespaceManager.AddNamespace("mail", "urn:zimbraMail");
                    MyNamespaceManager.AddNamespace("offline", "urn:zimbraOffline");
                    MyNamespaceManager.AddNamespace("admin", "urn:zimbraAdmin");
                    MyNamespaceManager.AddNamespace("voice", "urn:zimbraVoice");
                    MyNamespaceManager.AddNamespace("im", "urn:zimbraIM");
                    MyNamespaceManager.AddNamespace("mapi", "urn:zimbraMapi");
                    MyNamespaceManager.AddNamespace("sync", "urn:zimbraSync");
                    MyNamespaceManager.AddNamespace("cs", "urn:zimbraCS");
                    MyNamespaceManager.AddNamespace("test", "urn:zimbraTestHarness");
                    MyNamespaceManager.AddNamespace("soap", "http://www.w3.org/2003/05/soap-envelope");
                    MyNamespaceManager.AddNamespace("soap12", "http://www.w3.org/2003/05/soap-envelope");
                    MyNamespaceManager.AddNamespace("soap11", "http://schemas.xmlsoap.org/soap/envelope/");

                    #endregion

                    #region Zimbra Mobile Sync

                    MyNamespaceManager.AddNamespace("AirSync", "AirSync");
                    MyNamespaceManager.AddNamespace("AirSyncBase", "AirSyncBase");
                    MyNamespaceManager.AddNamespace("FolderHierarchy", "FolderHierarchy");
                    MyNamespaceManager.AddNamespace("Search", "Search");
                    MyNamespaceManager.AddNamespace("GAL", "GAL");
                    MyNamespaceManager.AddNamespace("Email", "Email");
                    MyNamespaceManager.AddNamespace("email", "Email");
                    MyNamespaceManager.AddNamespace("Contacts", "Contacts");
                    MyNamespaceManager.AddNamespace("contacts", "Contacts");
                    MyNamespaceManager.AddNamespace("Calendar", "Calendar");
                    MyNamespaceManager.AddNamespace("calendar", "Calendar");
                    MyNamespaceManager.AddNamespace("POOMMAIL", "POOMMAIL");
                    MyNamespaceManager.AddNamespace("POOMCAL", "POOMCAL");
                    MyNamespaceManager.AddNamespace("POOMCONTACTS", "Contacts");
                    MyNamespaceManager.AddNamespace("MeetingResponse", "MeetingResponse");
                    MyNamespaceManager.AddNamespace("tasks", "Tasks");
                    MyNamespaceManager.AddNamespace("Ping", "Ping");
                    MyNamespaceManager.AddNamespace("Move", "Move");
                    MyNamespaceManager.AddNamespace("ItemOperations", "ItemOperations");

                    #endregion
                }
                return (MyNamespaceManager);
            }
        }

        private static String PrettyPrint(String XML)
        {
            String Result = "";

            MemoryStream memoryStream = new MemoryStream();
            XmlTextWriter W = new XmlTextWriter(memoryStream, Encoding.Unicode);
            XmlDocument D = new XmlDocument();

            try
            {
                // Load the XmlDocument with the XML.
                StringReader sr = new StringReader(XML);
                D.Load(sr);
                sr.Close();
                sr = null;

                W.Formatting = Formatting.Indented;

                // Write the XML into a formatting XmlTextWriter
                D.WriteContentTo(W);
                W.Flush();
                memoryStream.Flush();

                // Have to rewind the MemoryStream in order to read
                // its contents.
                memoryStream.Position = 0;

                // Read MemoryStream contents into a StreamReader.
                StreamReader SR = new StreamReader(memoryStream);

                // Extract the text from the StreamReader.
                String FormattedXML = SR.ReadToEnd();

                Result = FormattedXML;
            }
            catch (XmlException)
            {
            }
            finally
            {
                if (memoryStream != null)
                    memoryStream.Close();
                if (W != null)
                    W.Close();
                memoryStream = null;
                W = null;
                D = null;
            }
            return Result;
        }


        /// <summary>
        /// Apply the specified xpath to the xml.  Check that it matches at least 1 node.
        /// </summary>
        /// <param name="xml">The XML</param>
        /// <param name="xpath">An xpath query</param>
        /// <param name="expected">The expected number of matched nodes</param>
        /// <param name="message">The objective</param>
        public static void XmlXpath(XmlElement xml, String xpath, String message)
        {
            CountTests++; TotalCountTests++;

            // Apply the xpath
            XmlNodeList nodes = xml.SelectNodes(xpath, ZAssert.NamespaceManager);

            // Determine the number of nodes found
            int found = ( (nodes == null) ? 0 : nodes.Count);

            tcLog.InfoFormat("{0,15} -- (xpath:'{1}' ... {2} > 0) [{3}]", "XmlXpath", xpath, found, message);
            try
            {
                Assert.Greater(found, 0, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }

            CountPass++; TotalCountPass++;

        }

        /// <summary>
        /// Apply the specified xpath to the xml.  Check that the found node count is expected.
        /// </summary>
        /// <param name="xml">The XML</param>
        /// <param name="xpath">An xpath query</param>
        /// <param name="expected">The expected number of matched nodes</param>
        /// <param name="message">The objective</param>
        public static void XmlXpathCount(XmlElement xml, String xpath, int expected, String message)
        {
            CountTests++; TotalCountTests++;

            // Apply the xpath
            XmlNodeList nodes = xml.SelectNodes(xpath, ZAssert.NamespaceManager);

            // Determine the number of nodes found
            int found = ((nodes == null) ? 0 : nodes.Count);

            tcLog.InfoFormat("{0,15} -- (xpath:'{1}' ... {2} == {3}) [{4}]", "XmlXpathCount", xpath, found, expected, message);
            try
            {
                Assert.AreEqual(expected, found, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }

            CountPass++; TotalCountPass++;

        }

        /// <summary>
        /// Check that the specified xpath (and optional attr) matches the regex
        /// </summary>
        /// <param name="xml">The XML</param>
        /// <param name="xpath">An xpath query</param>
        /// <param name="attr">An optional attribute (if null, then use the found value)</param>
        /// <param name="regex"></param>
        /// <param name="message"></param>
        public static void XmlXpathMatch(XmlElement xml, String xpath, String attr, String regex, String message)
        {
            CountTests++; TotalCountTests++;


            // Apply the xpath
            //
            XmlNodeList nodes = xml.SelectNodes(xpath, ZAssert.NamespaceManager);
            if (nodes == null)
            {
                ZAssert.IsNotNull(nodes, message);
            }

            // Search for values, either the element inner text, or attribute value (if attr!=null)
            //
            Boolean found = false;
            String value = null;
            XmlNode node = null;
            foreach (XmlNode n in nodes)
            {
                // Remember the node for logging
                node = n;

                // The inner text
                value = n.InnerText;

                // If attr is specified, then use the attr value
                if (attr != null)
                {
                    value = null;
                    foreach (XmlAttribute a in n.Attributes)
                    {
                        if (a.Name.Equals(attr))
                        {
                            value = a.Value;
                            break;
                        }
                    }

                    if (value == null)
                    {
                        // Searched for a value, but none were matches
                        continue;
                    }
                }

                // Check if the value matched
                // If not, then continue looking for other nodes
                if (Regex.IsMatch(value, regex))
                {
                    found = true;
                    break;
                }

            }

            // XmlXpathMatch -- (<DisplayName xmlns="FolderHierarchy">Inbox</DisplayName> matches Inbox) [Verify the system Inbox is returned]
            tcLog.InfoFormat("{0,15} -- (xpath:'{1}' ... {2} matches {3}) [{4}]", "XmlXpathMatch", xpath, node == null ? "null" : node.OuterXml, regex, message);
            try
            {
                Assert.IsTrue(found, message);
            }
            catch (AssertionException e)
            {
                tcLog.Error(new System.Diagnostics.StackTrace(true), e);
                throw;
            }

            CountPass++; TotalCountPass++;

        }

        /// <summary>
        /// Get the value after applying the specified xpath matches the regex
        /// </summary>
        /// <param name="xml">The XML</param>
        /// <param name="xpath">An xpath query</param>
        public static String XmlXpathValue(XmlElement xml, String xpath)
        {

            // Apply the xpath
            XmlNodeList nodes = xml.SelectNodes(xpath, ZAssert.NamespaceManager);

            XmlNode node = nodes.Item(0);
            return node.InnerText;

        }


        #endregion

        #region Methods to write the current counts to a text file for STAF reporting


        private static uint TestCaseCountTotal = 0;
        private static uint TestCasePassTotal = 0;
        private static List<string> FailedTests = new List<string>();

        public static void RecordTestCaseResult(string testcasename)
        {
            TestCaseCountTotal++;
            if (CountTests == CountPass)
            {
                TestCasePassTotal++;
            }
            else
            {
                FailedTests.Add(testcasename);
            }
            //writeRecord();
        }

        //private static string OutputFilename = UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\current.txt";

        //private static void writeRecord()
        //{
        //    TextWriter writer = null;
        //    try
        //    {
        //        writer = new StreamWriter(OutputFilename);
        //        writer.WriteLine("TestCaseTotal=" + TestCaseCountTotal);
        //        writer.WriteLine("TestCasePass=" + TestCasePassTotal);
        //        writer.WriteLine("TestCaseFail=" + (TestCaseCountTotal - TestCasePassTotal));
        //        writer.WriteLine("AssertTotal=" + ZAssert.TotalCountTests);
        //        writer.WriteLine("AssertPass=" + ZAssert.TotalCountPass);
        //        writer.WriteLine("AssertFail=" + (ZAssert.TotalCountTests - ZAssert.TotalCountPass));
        //        StringBuilder sb = null;
        //        foreach (string t in FailedTests)
        //        {
        //            if (sb == null)
        //                sb = new StringBuilder(t);
        //            else
        //                sb.Append(',').Append(t);
        //        }
        //        writer.WriteLine(String.Format("FailedTests={0}", (sb == null ? "" : sb.ToString())));
        //    }
        //    finally
        //    {
        //        if (writer != null)
        //        {
        //            writer.Flush();
        //            writer.Close();
        //        }
        //    }
        //}

        #endregion

    }
}
