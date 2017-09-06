using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using log4net;
using System.Net;
using System.Xml;
using System.IO;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZResponse
    {
        protected ILog logger = LogManager.GetLogger(typeof(ZResponse));


        private byte[] MyWbxmlBytes = null;
        private string MyXmlString = null;
        private String MyErrorString = null;
        private HttpStatusCode MyHttpStatus = HttpStatusCode.OK;

        #region Property Accessorts

        public virtual HttpStatusCode StatusCode
        {
            get { return (MyHttpStatus); }
            set { MyHttpStatus = value; }
        }

        public String ErrorContent
        {
            get { return (MyErrorString); }
            set { MyErrorString = value; }
        }

        public string XmlString
        {
            get
            {
                return MyXmlString;
            }
        }

        public XmlElement XmlElement
        {
            get
            {
                if (XmlDoc == null)
                {
                    return (null);
                }
                return (XmlDoc.DocumentElement);
            }
        }

        public XmlDocument XmlDoc
        {
            get
            {
                if (XmlString == null)
                {
                    return (null);
                }
                XmlDocument doc = new XmlDocument();
                doc.LoadXml(XmlString);
                return (doc);
            }
        }

        #endregion

        public ZResponse()
        {
            logger.Debug("new " + typeof(ZResponse));
        }

        public ZResponse(HttpWebResponse httpResponse)
        {
            logger.Debug("new " + typeof(ZResponse) +" with response");

            if (httpResponse == null)
            {
                return;
            }

            try
            {
                StatusCode = httpResponse.StatusCode;

                #region Convert the stream to XML

                Stream responseStream = httpResponse.GetResponseStream();
                List<byte> bytes = new List<byte>();
                byte[] byteBuffer = new byte[256];
                int count = 0;

                // Read the WBXML data from the response stream
                // 256 bytes at a time.
                count = responseStream.Read(byteBuffer, 0, 256);
                while (count > 0)
                {
                    // Add the 256 bytes to the List
                    bytes.AddRange(byteBuffer);

                    if (count < 256)
                    {
                        // If the last read did not actually read 256 bytes
                        // remove the extra.
                        int excess = 256 - count;
                        bytes.RemoveRange(bytes.Count - excess, excess);
                    }

                    // Read the next 256 bytes from the response stream
                    count = responseStream.Read(byteBuffer, 0, 256);
                }

                // The raw content
                MyWbxmlBytes = bytes.ToArray();

                if (StatusCode == HttpStatusCode.Unauthorized || StatusCode == HttpStatusCode.InternalServerError)
                {
                    ErrorContent = System.Text.Encoding.UTF8.GetString(bytes.ToArray());
                }
                else
                {
                    
                    // Decode the WBXML
                    MyXmlString = DecodeWBXML(MyWbxmlBytes);
                }

            }
            finally
            {
                if (httpResponse != null)
                {
                    httpResponse.Close();
                    httpResponse = null;
                }
            }


            #endregion


        }


        /// <summary>
        /// Get the matching element.
        /// Throw a harness exception if more than 1 node matches
        /// </summary>
        /// <param name="nodeXpath">The node level to match (e.g. //AirSync:Add)</param>
        /// <param name="matchXpath">The nodes to match (e.g. //Email:From[text() = foo@example.com]</param>
        /// <returns>The list of matching Elements (e.g. will return all 'Add' Elements that are from foo@example.com)</returns>
        
        public static XmlElement getMatchingElement(XmlElement context, String nodeXpath, String matchXpath)
        {
            List<XmlElement> nodes = ZSyncResponse.getMatchingElements(context, nodeXpath, matchXpath);
            ZAssert.AreEqual(1, nodes.Count, "Verify that only 1 XML element matched the query");
            return (nodes[0]);
        }

        public static List<XmlElement> getMatchingElements(XmlElement context, String nodeXpath, String matchXpath)
        {


            if (context == null)
            {
                throw new HarnessException("context is null!");
            }


            List<XmlElement> elements = new List<XmlElement>();

            //XmlNodeList nodes = context.SelectNodes(nodeXpath, ZAssert.NamespaceManager);
            //for (int i = 1; i <= nodes.Count; i++)
            //{

            //    // Expand the query, e.g. "//Add[2]//Subject[text()='value']"
            //    //
            //    XmlElement matching = context.SelectSingleNode(nodeXpath + "[" + i + "]" + matchXpath, ZAssert.NamespaceManager) as XmlElement;
            //    if ( matching != null ) {

            //        // Need to clone so we can return elements
            //        XmlElement element = context.SelectSingleNode(nodeXpath + "[" + i + "]", ZAssert.NamespaceManager).CloneNode(true) as XmlElement;
            //        if (element != null)
            //        {
            //            elements.Add(element);
            //        }
            //    }

            //}

            foreach (XmlNode node in context.SelectNodes(nodeXpath, ZAssert.NamespaceManager))
            {

                XmlElement found = node.CloneNode(true) as XmlElement;
                if (found == null)
                {
                    continue;
                }

                XmlNode matching = found.SelectSingleNode(matchXpath, ZAssert.NamespaceManager);
                if (matching == null)
                {
                    continue;
                }

                // Found it
                elements.Add(found);

            }

            return (elements);
        }

        // This function uses the ASWBXML class to decode
        // a WBXML stream into XML.

        private string DecodeWBXML(byte[] wbxml)
        {
            try
            {
                EASWbxml decoder = new EASWbxml();
                decoder.LoadBytes(wbxml);
                return decoder.GetXml();
            }
            catch (Exception ex)
            {
                throw new HarnessException("Unable to decode WBXML", ex);
            }
        }

        public virtual String toTrace()
        {
            StringBuilder sb = new StringBuilder();

            sb.Append("Code: ").Append(StatusCode).Append(Environment.NewLine);

            if (ErrorContent != null)
            {
                sb.Append("--- Response (Error)").Append(Environment.NewLine);
                sb.Append(ErrorContent).Append(Environment.NewLine);
                sb.Append("---").Append(Environment.NewLine);
            }
            else
            {
                Boolean logWBXML = HarnessProperties.getString("harness.trace.wbxml.enabled").ToLower().Equals("true");
                if (logWBXML && MyWbxmlBytes != null)
                {
                    int i = 0; // For pretty printing 10 hex to a line
                    sb.Append("--- Response (WBXML)").Append(Environment.NewLine);
                    foreach (byte b in MyWbxmlBytes)
                    {
                        sb.AppendFormat("0x{0:x2} ", b);
                        if ((++i) % 10 == 0)
                        {
                            sb.Append(Environment.NewLine);
                        }
                    }
                    sb.Append(Environment.NewLine).Append("---").Append(Environment.NewLine);
                }

                if (MyXmlString != null)
                {
                    sb.Append("--- Response (XML)").Append(Environment.NewLine);
                    sb.Append(MyXmlString).Append(Environment.NewLine);
                    sb.Append("---").Append(Environment.NewLine);
                }
            }

            return (sb.ToString());
        }

    }
}
