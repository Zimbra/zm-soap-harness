using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Xml;
using log4net;
using System.Net;


namespace Utilities
{
    public class ClientSoap : ClientHttp
    {
        private new ILog logger = LogManager.GetLogger(typeof(ClientSoap));


        protected ZimbraAccount MyZimbraAccount = null;
        private XmlDocument MyRequest = null;
        private XmlDocument MyResponse = null;

        public ClientSoap(ZimbraAccount account)
        {
            MyZimbraAccount = account;
        }

        public XmlDocument sendSoap(XmlDocument envelope)
        {
            XmlNodeList nodes;
            XmlNode header = null;
            XmlNode context = null;
            XmlNode body = null;
            XmlNode request = null;

            nodes = envelope.SelectNodes("//soap:Header", ZAssert.NamespaceManager);
            if (nodes.Count == 1)
            {
                header = nodes.Item(0);
                context = header.FirstChild;
            }

            nodes = envelope.SelectNodes("//soap:Body", ZAssert.NamespaceManager);
            if (nodes.Count == 1)
            {
                body = nodes.Item(0);
                request = body.FirstChild;
            }

            // Determine the destination URI
            this.DestinationURI = this.getURI(request);
            this.DestinationContentType = "text/xml; charset=\"utf-8\"";
            this.DestinationPayload = ClientSoap.PrettyPrint(envelope.OuterXml);

            try
            {

                // For tracing, clear the response
                // Otherwise, the previous response is traced
                //
                MyResponse = new XmlDocument();

                // For tracing, remember the request
                MyRequest = envelope;

                // Post the SOAP REQUEST
                this.doPost();

                // Parse the SOAP RESPONSE
                MyResponse.LoadXml(this.MyDestinationResponseData);

                if (requiresPostqueue(envelope))
                {
                    // TODO: this only checks the source queue.  It needs to check all queues on all hosts.
                    int msDelay = Int32.Parse(HarnessProperties.getString("postfixdelay.msec", "5000"));
                    ZAssert.IsTrue(MailInject.waitForPostfixQueue(msDelay / 1000, this.MyZimbraAccount.ZimbraMailHost), "Check that the message queue is cleared");
                }

                return (MyResponse);
            }
            finally
            {
                // TRACE
                LogManager.GetLogger("TestCaseLogger").Info(toTrace());
            }
        }

        /// <summary>
        /// Send a SOAP request
        /// </summary>
        /// <param name="request">The Request</param>
        /// <returns></returns>
        public XmlDocument sendSoap(String request)
        {

            // The request
            XmlDocument requestDocument = new XmlDocument();
            requestDocument.LoadXml(request);
            XmlNode requestNode = requestDocument.DocumentElement;

            // The context
            XmlNode contextNode = null;
            String context = this.createContext();
            if (context != null)
            {
                XmlDocument contextDocument = new XmlDocument();
                contextDocument.LoadXml(context);
                contextNode = contextDocument.DocumentElement;
            }

            return (sendSoap(contextNode, requestNode));

        }

        public XmlDocument sendSoap(XmlNode context, XmlNode request)
        {
            XmlDocument document = new XmlDocument();
            XmlNode envelope = document.CreateElement(null, "Envelope", "http://www.w3.org/2003/05/soap-envelope");
            document.AppendChild(envelope);

            XmlNode header = document.CreateElement(null, "Header", "http://www.w3.org/2003/05/soap-envelope");
            envelope.AppendChild(header);
            XmlNode body = document.CreateElement(null, "Body", "http://www.w3.org/2003/05/soap-envelope");
            envelope.AppendChild(body);

            if (context != null)
            {
                header.AppendChild(document.ImportNode(context, true));
            }

            if (request != null)
            {
                body.AppendChild(document.ImportNode(request, true));
            }

            return (sendSoap(document));
        }


        public XmlNode selectSoap(XmlNode node, String xpath)
        {
            XmlNodeList nodes = node.SelectNodes(xpath, ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                return (nodes.Item(0));
            }
            return (null);
        }


        public String selectSoap(XmlNode node, String xpath, String attr)
        {
            XmlNodeList nodes = node.ChildNodes;
            if (xpath != null)
            {
                nodes = node.SelectNodes(xpath, ZAssert.NamespaceManager);
            }

            String value = null;
            foreach (XmlNode n in nodes)
            {
                value = n.InnerText;
                if (attr != null)
                {
                    // If the attr does not exist, then return null
                    value = null;

                    foreach (XmlAttribute a in n.Attributes)
                    {
                        if (a.Name.Equals(attr))
                        {
                            value = a.Value;
                            return (value);
                        }
                    }
                }
                return (value);
            }

            return (value);
        }

        public int countNodes(XmlNode node, String xpath)
        {
            XmlNodeList nodes = node.SelectNodes(xpath, ZAssert.NamespaceManager);
            
            return nodes.Count;
        }

        protected String createContext()
        {
            /*
             * Example:
             * <context xmlns="urn:zimbra">
             *  <authToken> ... </authToken>
             * </context>
             */

            if (this.MyZimbraAccount.AuthToken == null)
            {
                return (null);
            }


            XmlDocument document = new XmlDocument();
            document.LoadXml("<context xmlns='urn:zimbra'><authToken/></context>");

            foreach (XmlNode n in document.SelectNodes("//zimbra:authToken", ZAssert.NamespaceManager))
            {
                XmlText text = document.CreateTextNode(this.MyZimbraAccount.AuthToken);
                n.AppendChild(text);
            }

            return (document.InnerXml);
        }


        /// <summary>
        /// Based on the request being sent, this method
        /// will return true if a postqueue check should
        /// be sent after request/response is received
        /// (i.e. if a message is sent due to the request)
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        protected bool requiresPostqueue(XmlNode node)
        {

            String[] requests = HarnessProperties.getString("postfixrequests.list").Split(',');
            foreach (String request in requests)
            {
                String xpath = "//" + request.Replace(" ", string.Empty);
                XmlNodeList list = node.SelectNodes(xpath, ZAssert.NamespaceManager);
                if (list.Count > 0)
                {
                    // The request matched one of the required
                    return (true);
                }
            }

            // No matches
            return (false);
        }


        /// <summary>
        /// Based on the request being sent, this method
        /// will return the URI the request should be sent to
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        protected Uri getURI(XmlNode request)
        {

            String scheme = HarnessProperties.getString("server.scheme", "https");
            String host = MyZimbraAccount.ZimbraMailHost;
            String p = HarnessProperties.getString("server.port", "443");
            int port = Convert.ToInt32(p);
            String path = "/";
            String query = null;
            String fragment = null;

            if (host.Equals("host.local"))
            {
                scheme = "http";
                host = HarnessProperties.getString("server.host");
                port = 80;
            }

            String ns = request.NamespaceURI;
            logger.Debug("namespace: " + ns);

            if (ns.Equals("urn:zimbraAdmin"))
            {

                // https://server.com:7071/service/admin/soap/
                scheme = "https";
                path = "/service/admin/soap/";
                port = 7071;

            }
            else if (ns.Equals("urn:zimbraAccount"))
            {

                // http://server.com:80/service/soap/
                path = "/service/soap/";

            }
            else if (ns.Equals("urn:zimbraMail"))
            {

                // http://server.com:80/service/soap/
                path = "/service/soap/";

            }
            else if (ns.Equals("urn:zimbra"))
            {

                // http://server.com:80/service/soap/
                path = "/service/soap/";

            }
            else
            {
                throw new HarnessException("Unsupported qname: " + ns + ".  Need to implement setURI for it.");
            }

            UriBuilder builder = new UriBuilder();
            builder.Scheme = scheme;
            builder.Host = host;
            builder.Port = port;
            builder.Path = path;
            builder.Query = query;
            builder.Fragment = fragment;

            Uri uri = builder.Uri;

            logger.Info("ClientSOAP using URI: " + builder.Uri.AbsoluteUri);

            return (builder.Uri);

        }
        



        public override String toTrace()
        {
            StringBuilder sb = new StringBuilder(Environment.NewLine);

            sb.Append(ClientCounter).Append(" ").Append(CurrentTimestamp()).Append(Environment.NewLine);

            String destination = String.Empty;
            if (this.DestinationURI != null)
            {
                destination = this.DestinationURI.AbsoluteUri;
            }
            sb.Append("--- Request ").Append(destination).Append(Environment.NewLine);
            if (MyRequest != null)
            {
                sb.Append(PrettyPrint(MyRequest.OuterXml)).Append(Environment.NewLine);
            }
            sb.Append("---").Append(Environment.NewLine);

            sb.Append("--- Response").Append(Environment.NewLine);
            if (MyResponse != null && (MyResponse.OuterXml != null && !MyResponse.OuterXml.Trim().Equals("")) )
            {
                sb.Append(PrettyPrint(MyResponse.OuterXml)).Append(Environment.NewLine);
            }
            sb.Append("---").Append(Environment.NewLine);

            return (sb.ToString());
        }


        /// <summary>
        /// Pretty Print an XML string
        /// </summary>
        /// <param name="XML"></param>
        /// <returns></returns>
        public static String PrettyPrint(String XML)
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

    }
}
