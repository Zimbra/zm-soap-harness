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
using System.Xml;
using System.Text;
using System.Collections.Generic;
using log4net;
using EASHarness.ActiveSync.WBXML;

namespace EASHarness.Harness
{
    public class UtilFunctions
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private static int MAX = 100;
        private static int MAXCHAR = 9;
        private byte[] wbxml = null;
        private static Random random = new Random();

        UTF8Encoding encoding = new System.Text.UTF8Encoding();

        // Find out exact file path of Program Files. In 64bit machine it is C:\Program Files (x86).
        // In 32bit machine it is C:\Program Files.
        public static string ProgramFilesLocation = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);

        public UtilFunctions(){}

        public static string RandomStringGenerator()
        {
            return RandomStringGenerator(MAXCHAR);
        }

        public static string RandomStringGenerator(int size)
        {
            StringBuilder builder = new StringBuilder();
            char ch;
            for (int j = 0; j < size; j++)
            {
                ch = Convert.ToChar(Convert.ToInt32(Math.Floor(26 * random.NextDouble() + 65)));
                builder.Append(ch);
            }

            return (builder.ToString().ToLower());
        }

        public static string RandomUpperLowerStringGenerator()
        {
            return (RandomUpperLowerStringGenerator(MAXCHAR));
        }

        public static string RandomUpperLowerStringGenerator(int size)
        {
            StringBuilder builder = new StringBuilder();
            char ch;
            for (int j = 0; j < size; j++)
            {
                ch = Convert.ToChar(Convert.ToInt32(Math.Floor(26 * random.NextDouble() + 65)));

                if (j % 2 == 0)
                {
                    builder.Append(ch.ToString().ToUpper());
                }
                else
                {
                    builder.Append(ch.ToString().ToLower());
                }
            }

            return (builder.ToString());
        }

        public static string RandomNumberStringGenerator()
        {
            return RandomNumberStringGenerator(8, 0, 9);
        }

        public static int RandomNumberGenerator()
        {
            return RandomNumberGenerator(0);
        }

        public static string RandomNumberStringGenerator(int size, int min, int max)
        {
            StringBuilder builder = new StringBuilder();

            for (int j = 0; j < size; j++)
            {
                builder.Append(random.Next(min, max));
            }

            return ((string)builder.ToString());
        }

        public static int RandomNumberGenerator(int min, int max)
        {
            return random.Next(min, max);
        }

        public static int RandomNumberGenerator(int min)
        {
            return RandomNumberGenerator(min, MAX);
        }

        // Method to parse the wbxml.log file and generate the equivalent XML document.
        public void WBXMLLogParser()
        {
            FileInfo logFileInfo = new FileInfo(ProgramFilesLocation + @"\ZimbraQA\wbxml.log");

            StreamReader logStreamReader = new StreamReader(logFileInfo.ToString());

            tcLog.Info("Reading WBXML Log File... ");
            string strLog = logStreamReader.ReadToEnd();
            string strWBXMLStream = strLog.Trim().Replace("  ", " ").Replace(" \r\n", " ").Replace(" ", "-");

            wbxml = WBXMLStringToBytes(strWBXMLStream);

            try
            {
                ASWBXML decoder = new ASWBXML();
                decoder.LoadBytes(wbxml);
                string decodedXML = decoder.GetXML();

                tcLog.Info("Please find the decoded log (in XML Format)... \r\n\r\n" + decodedXML.ToString() + "\r\n");
            }
            catch (Exception ex)
            {
                throw new InvalidDataException(string.Format("Attempting to decode the WBXML results in invalid XML: {0}.", ex));
            }
        }

        // Method to convert Hex Strings to Bytes
        private static byte[] WBXMLStringToBytes(string WBXMLStream)
        {
            tcLog.Info("Attempting to generate WBXML Byte Stream ... ");

            const string HEX_CHARS = "0123456789ABCDEF";

            if (WBXMLStream.Length == 0)
                return new byte[0];

            if ((WBXMLStream.Length + 1) % 3 != 0)
                throw new FormatException();

            byte[] bytes = new byte[(WBXMLStream.Length + 1) / 3];

            int state = 0; // 0 = Expect 1st digit, 1 = Expect 2nd digit, 2 = Expect hyphen
            int currentByte = 0;
            int x;
            int value = 0;

            foreach (char c in WBXMLStream)
            {
                switch (state)
                {
                    case 0:
                        x = HEX_CHARS.IndexOf(Char.ToUpperInvariant(c));
                        if (x == -1)
                            throw new FormatException();
                        value = x << 4;
                        state = 1;
                        break;

                    case 1:
                        x = HEX_CHARS.IndexOf(Char.ToUpperInvariant(c));
                        if (x == -1)
                            throw new FormatException();
                        bytes[currentByte++] = (byte)(value + x);
                        state = 2;
                        break;

                    case 2:
                        if (c != '-')
                            throw new FormatException();
                        state = 0;
                        break;
                }
            }

            tcLog.Info("Successfully generated the WBXML Byte Stream ... ");
            return bytes;
        }
    }
}
