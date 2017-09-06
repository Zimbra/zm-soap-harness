/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using NUnit.Framework;
using log4net;

namespace EASHarness.Harness
{
    public class zAssert 
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private static int TotalCountTests = 0;
        private static int TotalCountPass = 0;
        private static int CountTests;
        private static int CountPass;

        public static void ResetCounts()
        {
            CountTests = 0;
            CountPass = 0;
        }

        public static void DisplayCounts()
        {
            tcLog.Info("");
            tcLog.Info("========================================");
            tcLog.Info("Test Case Result: " + ((CountTests != 0 && (CountTests - CountPass) == 0) ? "PASS" : "FAIL"));
            tcLog.Info("");
            tcLog.Info("Tests Executed: " + CountTests);
            tcLog.Info("Tests Passed:   " + CountPass);
            tcLog.Info("Tests Failed:   " + (CountTests - CountPass));
            tcLog.Info("");
        }

        public static void DisplayTotalCounts()
        {
            tcLog.Info("");
            tcLog.Info("Total Tests Executed: " + TotalCountTests);
            tcLog.Info("Total Tests Passed:   " + TotalCountPass);
            tcLog.Info("Total Tests Failed:   " + (TotalCountTests - TotalCountPass));
            tcLog.Info("");
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

        //AreEqual overloaded function to compare datetime-string values 
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
                throw new AssertionException("zAssert.DoesNotContain found the object");
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

        #region Methods to write the current counts to a text file for STAF reporting

        private static string OutputFilename = UtilFunctions.ProgramFilesLocation + @"\ZimbraQA\TestResults.txt";

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
            writeRecord();
        }

        private static void writeRecord()
        {
            TextWriter writer = null;
            try
            {
                writer = new StreamWriter(OutputFilename);
                writer.WriteLine("========================================");
                writer.WriteLine("Total number of Test Cases = " + TestCaseCountTotal);
                writer.WriteLine("Passed Test Cases = " + TestCasePassTotal);
                writer.WriteLine("Failed Test Cases = " + (TestCaseCountTotal - TestCasePassTotal));
                writer.WriteLine("");
                writer.WriteLine("Total number of Assertions = " + zAssert.TotalCountTests);
                writer.WriteLine("Passed Assertions = " + zAssert.TotalCountPass);
                writer.WriteLine("Failed Assertions = " + (zAssert.TotalCountTests - zAssert.TotalCountPass));
                writer.WriteLine("----------------------------------------");
                writer.WriteLine("");
                StringBuilder sb = null;
                foreach (string t in FailedTests)
                {
                    if (sb == null)
                        sb = new StringBuilder(t);
                    else
                        sb.Append(',').Append(t);
                }
                writer.WriteLine(String.Format("Failed Tests: {0}", (sb == null ? "None!" : sb.ToString())));
                writer.WriteLine("");
                writer.WriteLine("========================================");

            }
            finally
            {
                if (writer != null)
                {
                    writer.Flush();
                    writer.Close();
                }
            }
        }

        #endregion
    }
}
