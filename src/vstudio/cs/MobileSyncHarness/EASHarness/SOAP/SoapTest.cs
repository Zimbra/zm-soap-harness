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
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.XPath;
using System.Globalization;
using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Web.Services.Protocols;
using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Addressing;
using Microsoft.Web.Services3.Messaging;
using NUnit.Framework;
using log4net;
using EASHarness.Harness;

namespace EASHarness.SOAP
{
    public class SoapTest : SoapClient
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        protected static uint counter = 0;
        protected int mNumChecks = 0;
        protected int mNumCheckPass = 0;
        protected int mNumCheckFail = 0;
        protected String mFailReason;

        public SoapTest() : base() {}

        public SoapTest(EndpointReference destination) : base(destination) {}

        /// <summary>
        /// Send a soap request with the specified context and request
        /// </summary>
        /// 
        /// <param name="context">The soap context</param>
        /// <param name="request">The soap body request</param>
        /// 
        public SoapEnvelope RequestResponseMethod(XmlDocument context, XmlDocument body)
        {
            SoapEnvelope envelope = new SoapEnvelope();

            // If a ZimbraContext was created, add it to the envelope
            if (context != null)
            {
                envelope.CreateHeader().AppendChild(envelope.ImportNode(context.DocumentElement, true));
            }

            // Add the specified body request to the envelope
            envelope.CreateBody().AppendChild(envelope.ImportNode(body.DocumentElement, true));

            return (RequestResponseMethod(envelope));
        }

        /// <summary>
        /// Send a soap request with the specified envelope
        /// </summary>
        /// 
        /// <param name="context">The soap context</param>
        /// <param name="request">The soap body request</param>
        /// 
        public SoapEnvelope RequestResponseMethod(SoapEnvelope requestEnvelope)
        {
            // Logging
            tcLog.Info("");
            tcLog.InfoFormat("{0:0000} - {1} - {2}", ++counter, DateTime.Now.ToString("r"), this.Destination.TransportAddress.AbsoluteUri);
            tcLog.Info(PrettyPrint(requestEnvelope.OuterXml));

            SoapEnvelope responseEnvelope = null;

            try
            {
                responseEnvelope = base.SendRequestResponse("JoeBlow", requestEnvelope);
            }
            catch (SoapException soapException)
            {
                responseEnvelope = new SoapEnvelope();
                responseEnvelope.Body.AppendChild(responseEnvelope.ImportNode(soapException.Detail.ParentNode, true));
            }
            catch (Exception e)
            {
                tcLog.Error("NUnit harness caught web exception", e);
                throw;
            }

            tcLog.Info(PrettyPrint(responseEnvelope.OuterXml));

            bool mailQueuePending = false;
            string[] paths = {
                "//mail:SendMsgRequest",
                "//mail:ModifyTaskRequest",
                "//mail:SetTaskRequest",
                "//mail:SetAppointmentRequest",
                "//mail:CreateAppointmentRequest",
                "//mail:ModifyAppointmentRequest",
                "//mail:CancelAppointmentRequest",
                "//mail:SendInviteReplyRequest",
                "//mail:CreateAppointmentExceptionRequest"
            };
            foreach (string path in paths)
            {
                if (requestEnvelope.SelectNodes(path, GetNamespaceManager()).Count > 0)
                {
                    mailQueuePending = true;
                    break; // foreach (string path ...
                }
            }

            if (mailQueuePending)
            {
                string server = this.Destination.Address.Value.DnsSafeHost;
                int delay = Int32.Parse(Properties.getProperty("postfixdelay.msec"));
                zAssert.IsTrue(MailInject.waitForPostfixQueue(delay / 1000, server), "Check that the message queue is cleared");
            }

            return (responseEnvelope);
        }

        /// <summary>
        /// Return a node list of all nodes matching a specified path
        /// </summary>
        /// 
        /// <param name="context">The soap context</param>
        /// <param name="path">The xpath query</param>
        /// 
        public XmlNodeList select(XmlNode context, string path)
        {
            return (context.SelectNodes(path, GetNamespaceManager()));
        }

        /// <summary>
        /// Parse a xml node
        /// </summary>
        /// 
        /// <param name="context">The soap context</param>
        /// <param name="path">The xpath query (null for no query)</param>
        /// <param name="attr">A specific attribute in the context (null to use the context value)</param>
        /// <param name="match">A regex expression to match the value</param>
        /// <param name="set">A variable to set the found value</param>
        /// <param name="occurences">Test the number of occurences that are found</param>
        /// 
        public XmlNode select(XmlNode context, string path, string attr, string match, out string set, int occurences)
        {
            StringBuilder resultMessage = new StringBuilder("path (" + path + ") attr (" + attr +
                ") match (" + match + ") occurences (" + occurences + ") ");

            try
            {
                String value = null;
                set = "UNSET";

                // If there is a path but not context, check for negative tests
                if (path != null)
                {
                    if (context == null)
                    {
                        zAssert.AreEqual(occurences, 0, "path '" + path + "' did not match any elements (element not present)");
                    }
                }

                bool matchFound = false;
                bool attrFound = false;

                XmlNode returnNode = null;
                XmlNodeList nodes = context.SelectNodes(path, GetNamespaceManager());

                if (path != null)
                {
                    if (occurences == 0)
                    {
                        if (attr == null && match == null)
                        {
                            zAssert.AreEqual(0, nodes.Count, "Check that " + path + " doesn't find any nodes");
                        }
                    }
                    else
                    {
                        zAssert.Greater(nodes.Count, 0, "Check that " + path + " find nodes");
                    }
                }

                foreach (XmlNode node in nodes)
                {
                    // returnNode = node.ParentNode;
                    returnNode = node;

                    if (attr != null)
                    {
                        XmlNode attrNode = node.Attributes.GetNamedItem(attr);

                        if (attrNode == null)
                        {
                            value = null;
                        }

                        else
                        {
                            value = attrNode.Value;
                        }
                    }

                    else
                    {
                        value = node.InnerText;
                    }

                    bool elementHasValue = (value != null);

                    if (elementHasValue)
                    {
                        resultMessage = resultMessage.Append("value(" + value + ") ");
                    }

                    attrFound = ((attr != null) && elementHasValue);

                    if ((match != null) && elementHasValue)
                    {
                        try
                        {
                            if (Regex.IsMatch(value, match))
                            {
                                matchFound = true;
                            }
                        }

                        catch (Exception e)
                        {
                            throw new HarnessException("doSelect threw PatternSyntaxException", e);
                        }
                    }

                    if (elementHasValue)
                    {
                        set = value;
                    }

                    bool keepLooking = false;

                    if (!elementHasValue || (match != null && !matchFound) || (attr != null && !attrFound))
                    {
                        keepLooking = true;
                    }

                    if (!keepLooking)
                    {
                        break;
                    }
                }

                //Verify that we did find what we were looking for in the response
                if (attr != null)
                {
                    zAssert.IsTrue(attrFound, "Verify that the attribute (" + attr + ") is found");
                }

                if (match != null)
                {
                    if (occurences == 0)
                    {
                        zAssert.IsTrue(!matchFound, "Verify that the element value (" + match + ") doesn't exist in the response");
                    }

                    else
                    {
                        zAssert.IsTrue(matchFound, "Verify that the expected element value (" + match + ") matched with actual value (" + value + ")");
                    }
                }

                return (returnNode);
            }

            catch (XPathException e)
            {
                throw new HarnessException("select threw exception for path=(" + path + ")", e);
            }

            finally
            {
                tcLog.Info("select: " + resultMessage.ToString());
            }
        }

        /**
         * public DateTime toUTC(XmlNode context, string path)
         * 
         * Return a UTC DateTime for the specified soap date/time element
         * 
         * XmlNode contect: the SOAP Response
         * string xPath: an xPath query that finds the date/time element
         * 
         * Notes:
         * xPath should query for an element such as <s d="20101225T123000" tz="(GMT-08.00) Pacific Time (US &amp; Canada)"/>
         * sample xPath values: "//mail:s", "//mail:e", etc.
         * */
        public DateTime toUTC(XmlNode context, string xPath)
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
            XmlNode xDT = context.Clone().SelectSingleNode(xPath, GetNamespaceManager());
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
            XmlNodeList xTZ = context.SelectNodes("//mail:tz", GetNamespaceManager());
            XmlNode timezoneDefinition = null;

            foreach (XmlNode x in xTZ)
            {
                if ((x.Attributes != null) && (x.Attributes["id"] != null))
                {
                    if (x.Attributes["id"].Value.Equals(aTZ))
                    {
                        tcLog.Debug("timezone definition: " + PrettyPrint(x.OuterXml));
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

        private TimeSpan determineUtcOffset(DateTime t, XmlNode x)
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

            if (x.SelectSingleNode("//mail:standard", GetNamespaceManager()) != null)
            {
                DateTime standardStart = tzTransitionDateTime(x.SelectSingleNode("//mail:standard", GetNamespaceManager()), t.Year);
                DateTime daylightStart = tzTransitionDateTime(x.SelectSingleNode("//mail:daylight", GetNamespaceManager()), t.Year);

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

        private DateTime tzTransitionDateTime(XmlNode tz, int year)
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

        private static XmlNamespaceManager xmlNamespaceManager = null;
        private static NameTable nameTable = null;

        public static XmlNamespaceManager GetNamespaceManager()
        {
            if (xmlNamespaceManager == null)
            {
                nameTable = new NameTable();
                xmlNamespaceManager = new XmlNamespaceManager(nameTable);

                xmlNamespaceManager.AddNamespace("zimbra", "urn:zimbra");
                xmlNamespaceManager.AddNamespace("acct", "urn:zimbraAccount");
                xmlNamespaceManager.AddNamespace("mail", "urn:zimbraMail");
                xmlNamespaceManager.AddNamespace("offline", "urn:zimbraOffline");
                xmlNamespaceManager.AddNamespace("admin", "urn:zimbraAdmin");
                xmlNamespaceManager.AddNamespace("voice", "urn:zimbraVoice");
                xmlNamespaceManager.AddNamespace("im", "urn:zimbraIM");
                xmlNamespaceManager.AddNamespace("test", "urn:zimbraTestHarness");
                xmlNamespaceManager.AddNamespace("soap", "http://www.w3.org/2003/05/soap-envelope");
                xmlNamespaceManager.AddNamespace("soap12", "http://www.w3.org/2003/05/soap-envelope");
                xmlNamespaceManager.AddNamespace("soap11", "http://schemas.xmlsoap.org/soap/envelope/");
            }

            return (xmlNamespaceManager);
        }

        public string SetDestination(Uri uri)
        {
            this.Destination = new EndpointReference(uri);
            return (this.Destination.ToString());
        }

        public string SetDestination(string server, XmlNode request)
        {
            string nameSpace = GetRequestNamespace(request);
            string mode, port, path;

            // zimbraAdmin requests
            if (nameSpace.Equals("urn:zimbraAdmin"))
            {
                // https://qa60.liquidsys.com:7071/service/admin/soap/
                // <admin.mode>://<server.zimbraAdmin>:<admin.port>/<admin.path>
                try
                {
                    mode = Properties.getProperty("admin.mode");
                    port = Properties.getProperty("admin.port");
                    path = Properties.getProperty("admin.path");

                    return (SetDestination(new Uri(mode + "://" + server + ":" + port + "/" + path)));
                }
                catch (Exception e)
                {
                    throw new HarnessException("Must set server.zimbraAdmin, admin.mode, admin.port, and admin.path", e);
                }
            }

            // By default, use server.zimbraAccount if server.zimbraMail is not defined
            if (nameSpace.Equals("urn:zimbraAccount") || nameSpace.Equals("urn:zimbraMail") || nameSpace.Equals("urn:zimbraIM"))
            {
                // https://qa60.liquidsys.com:7071/service/admin/soap/
                // <admin.mode>://<server.zimbraAdmin>:<admin.port>/<admin.path>

                try
                {
                    mode = Properties.getProperty("soapservice.mode");
                    port = Properties.getProperty("soapservice.port");
                    path = Properties.getProperty("soapservice.path");

                    return (SetDestination(new Uri(mode + "://" + server + ":" + port + "/" + path)));
                }
                catch (Exception e)
                {
                    throw new HarnessException("Must set server.zimbraAccount, admin.mode, admin.port, and admin.path", e);
                }
            }

            throw new HarnessException("uri not set (example: server.zimbraAdmin, server.zimbraMail, server.zimbraAccount, etc.)");
        }

        private string GetRequestNamespace(XmlNode n)
        {
            Regex regex = new Regex("(xmlns=\\\"([^\"]+)\\\")");
            Match match = regex.Match(n.OuterXml);
            if (match.Success)
            {
                // Group 1 = xmlns="urn:xyz"
                // Group 2 = urn:xyz
                return (match.Groups[2].Value);
            }

            return ("");
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

            catch (XmlException) {}

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
    }
}
