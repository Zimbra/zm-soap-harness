using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using log4net;
using Utilities;
using System.Xml;
using System.Net;

namespace Zimbra.EasHarness.ActiveSync
{
    // This structure is used to store command-specific
    // parameters (MS-ASCMD section 2.2.1.1.1.2.5)
    public struct CommandParameter
    {
        public string Parameter;
        public string Value;
    }

    public class ZRequest
    {
        protected ILog logger = LogManager.GetLogger(typeof(ZRequest));

        private String MyCommand = null;

        private String MyHttpMethod = "POST";

        private byte[] MyDestinationPayload = null;
        private String MyDestinationContentType = null;
        private String MyDestinationPayloadXML = null;
        private String MyDestinationPayloadText = null;

        private Boolean MyUseEncodedRequestLine = false;
        private String MyProtocolVersion = "12.1";
        private CommandParameter[] MyCommandParameters = null;

        private ZimbraAccount MyAccount = null;

        #region Property Accessors

        public virtual ZimbraAccount Account
        {
            get { return (MyAccount); }
            set { MyAccount = value; }
        }

        public String HttpMethod
        {
            get { return (MyHttpMethod); }
            set { MyHttpMethod = value; }
        }


        public String Command
        {
            get { return (MyCommand); }
            set { MyCommand = value; }
        }

        public virtual byte[] DestinationPayload
        {
            get { return (MyDestinationPayload); }
            set { MyDestinationPayload = value; }
        }

        public virtual String DestinationContentType
        {
            get { return (MyDestinationContentType); }
            set { MyDestinationContentType = value; }
        }

        /// <summary>
        /// Set this destination payload when sending text content (i.e. MIME)
        /// </summary>
        public virtual String DestinationPayloadText
        {
            get
            {
                return (MyDestinationPayloadText);
            }
            set
            {
                MyDestinationPayloadText = value;
                DestinationPayload = Encoding.ASCII.GetBytes(MyDestinationPayloadText);
                DestinationContentType = "text/plain";

            }
        }

        /// <summary>
        /// Set this destination payload when sending XML content (i.e. WBXML encoded data)
        /// </summary>
        public virtual String DestinationPayloadXML
        {
            get
            {
                return (MyDestinationPayloadXML);
            }
            set
            {
                MyDestinationPayloadXML = value;
                // Loading XML causes immediate encoding
                // MS-ASHTTP section 2.2.1.1.2.2
                if (MyDestinationPayloadXML != "")   //Handling this condition for blank body in case of Ping requests
                {

                    DestinationPayload = EncodeXMLString(MyDestinationPayloadXML);
                    DestinationContentType = "application/vnd.ms-sync.wbxml";
                }
            }
        }

        /// <summary>
        /// Whether to encode the URI request line
        /// Default: true
        /// </summary>
        public Boolean UseEncodedRequestLine
        {
            get { return (MyUseEncodedRequestLine); }
            set { MyUseEncodedRequestLine = value; }
        }

        /// <summary>
        /// The Protocol Version being used
        /// Default: 14.1 (?)
        /// </summary>
        public String ProtocolVersion
        {
            get { return (MyProtocolVersion); }
            set { MyProtocolVersion = value; }
        }

        ///// <summary>
        ///// ???
        ///// </summary>
        //public UInt32 PolicyKey
        //{
        //    get { return (MyPolicyKey); }
        //    set { MyPolicyKey = value; }
        //}

        /// <summary>
        /// ???
        /// </summary>
        public CommandParameter[] CommandParameters
        {
            get { return (MyCommandParameters); }
            set { MyCommandParameters = value; }
        }


        #endregion

        public ZRequest(ZimbraAccount account)
        {
            logger.Info("new " + typeof(ZRequest));

            Account = account;
        }

        public ZRequest(ZimbraAccount account, String xml)
        {
            logger.Info("new " + typeof(ZRequest) + " with payload");

            Account = account;

            // Set the XML payload
            DestinationPayloadXML = xml;

        }

        public virtual ZResponse WrapResponse(HttpWebResponse response)
        {
            throw new NotImplementedException("Extending class must define");
        }


        /// <summary>
        /// Convert a generic XML string to the appropriate ZRequest type
        /// </summary>
        /// <param name="xml"></param>
        /// <returns></returns>
        public static ZRequest loadXml(ZimbraAccount account, String xml)
        {
            ZRequest request = null;
            XmlNodeList nodes = null;


            // Convert the String to an XML object so we can parse
            XmlDocument xmlDocument = new XmlDocument();
            xmlDocument.LoadXml(xml);

            #region Parse the XML.  Based on the contents, create the correct type.
            
            // SyncA
            nodes = xmlDocument.SelectNodes("//AirSync:Sync", ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                request = new ZSyncRequest(account, xml);
            }

            // FolderSync
            nodes = xmlDocument.SelectNodes("//FolderHierarchy:FolderSync", ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                request = new ZFolderSyncRequest(account, xml);
                if (account != null)
                {
                    ((ZFolderSyncRequest)request).Account = account;
                }
            }

            // FolderCreate
            nodes = xmlDocument.SelectNodes("//FolderHierarchy:FolderCreate", ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                request = new ZFolderCreateRequest(account, xml);
                if (account != null)
                {
                    ((ZFolderCreateRequest)request).Account = account;
                }
            }

            // FolderUpdate
            nodes = xmlDocument.SelectNodes("//FolderHierarchy:FolderUpdate", ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                request = new ZFolderUpdateRequest(account, xml);
                if (account != null)
                {
                    ((ZFolderUpdateRequest)request).Account = account;
                }
            }

            // FolderDelete
            nodes = xmlDocument.SelectNodes("//FolderHierarchy:FolderDelete", ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                request = new ZFolderDeleteRequest(account, xml);
                if (account != null)
                {
                    ((ZFolderDeleteRequest)request).Account = account;
                }
            }

            // Search
            nodes = xmlDocument.SelectNodes("//Search:Search", ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                request = new ZSearchRequest(account, xml);
            }

            // MoveItems
            nodes = xmlDocument.SelectNodes("//Move:Move", ZAssert.NamespaceManager);
            if (nodes.Count > 0)
            {
                request = new ZMoveItemsRequest(account, xml);
            }

            #endregion


            if (request == null)
            {
                throw new HarnessException("Unable to parse XML request: " + xml);
            }

            return (request);
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
                throw new HarnessException("Unable to Decode WBXML", ex);
            }
        }

        // This function uses the ASWBXML class to encode
        // XML into a WBXML stream.
        private byte[] EncodeXMLString(string xmlString)
        {
            try
            {
                EASWbxml encoder = new EASWbxml();
                encoder.LoadXml(xmlString);
                return encoder.GetBytes();
            }
            catch (Exception ex)
            {
                throw new HarnessException("Unable to encode Xml String", ex);
            }
        }

        public virtual String toTrace()
        {
            StringBuilder sb = new StringBuilder();

            Boolean logWBXML = HarnessProperties.getString("harness.trace.wbxml.enabled").ToLower().Equals("true");
            if (logWBXML && DestinationPayload != null)
            {
                int i = 0; // For pretty printing 10 hex to a line
                sb.Append("--- Request (WBXML)").Append(Environment.NewLine);
                foreach (byte b in DestinationPayload)
                {
                    sb.AppendFormat("0x{0:x2} ", b);
                    if ((++i) % 10 == 0)
                    {
                        sb.Append(Environment.NewLine);
                    }
                }
                sb.Append(Environment.NewLine).Append("---").Append(Environment.NewLine);
            }

            if (DestinationPayloadXML != null)
            {
                sb.Append("--- Request (XML)").Append(Environment.NewLine);
                sb.Append(DestinationPayloadXML).Append(Environment.NewLine);
                sb.Append("---").Append(Environment.NewLine);
            }

            if (DestinationPayloadText != null)
            {
                sb.Append("--- Request (Text)").Append(Environment.NewLine);
                sb.Append(DestinationPayloadText).Append(Environment.NewLine);
                sb.Append("---").Append(Environment.NewLine);
            }

            return (sb.ToString());
        }


    }
}
