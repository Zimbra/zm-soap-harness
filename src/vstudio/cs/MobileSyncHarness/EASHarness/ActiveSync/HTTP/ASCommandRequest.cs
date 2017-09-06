/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * Developer: Arindam Bhattacharya
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Xml;
using System.Net;
using System.Text;
using System.Collections.Generic;
using log4net;
using EASHarness.Harness;
using EASHarness.ActiveSync.WBXML;

namespace EASHarness.ActiveSync.HTTP
{
    internal struct CommandParameter
    {
        internal string Parameter;
        internal string Value;
    }

    // Base class for ActiveSync command requests
    internal class ASCommandRequest
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private string emailaddress = null;
        private string aliasaddress = null;
        private string password = null;
        private string server = null;      
        private string username = null;
        private string domain = null;        
        private string deviceID = null;
        private string deviceType = null;
        private string useragent = null;
        private string credential = null;
        private string xmlString = null;
        private string protocolVersion = null;
        private string requestLine = null;
        private string command = null;
        private string parsedResponseHeader = "";
        private string parsedResponse = "";
        private string responseStatusMsg = "";
        private bool useSSL = true;
        private bool useUPNAuth = true;
        private bool useAlias = false;
        private bool useEncodedRequestLine = false;
        private bool isInitialSync = true;
        private byte[] wbxmlBytes = null;
        private UInt32 policyKey = 0;
        private int responseStatusCode = 0;
        private CommandParameter[] parameters = null;
        
        #region Property Accessors
        internal string EmailAddress
        {
            set { emailaddress = value; }
        }

        internal string AliasAddress
        {
            set { aliasaddress = value; }
        }

        internal string Password
        {
            set { password = value; }
        }

        internal string Server
        {
            get { return server; }

            set { server = value; }
        }

        internal string Username
        {
            get { return username; }

            set { username = value; }
        }

        internal string Domain
        {
            set { domain = value; }
        }

        internal string DeviceID
        {
            get { return deviceID; }

            set { deviceID = value; }
        }

        internal string DeviceType
        {
            get { return deviceType; }

            set { deviceType = value; }
        }

        internal string UserAgent
        {
            get { return useragent; }

            set { useragent = value; }
        }

        internal bool UseSSL
        {
            get { return useSSL; }

            set { useSSL = value; }
        }

        internal bool UPNAuth
        {
            get { return useUPNAuth; }

            set { useUPNAuth = value; }
        }

        internal bool UseAlias
        {
            get { return useAlias; }

            set { useAlias = value; }
        }

        internal int ResponseStatusCode
        {
            get { return responseStatusCode; }
        }

        internal string ResponseStatusMessage
        {
            get { return responseStatusMsg; }
        }

        internal string RequestLine
        {
            get
            {
                // Generate on demand
                BuildRequestLine();

                return requestLine;
            }

            set { requestLine = value; }
        }

        internal bool UseEncodedRequestLine
        {
            get { return useEncodedRequestLine; }

            set { useEncodedRequestLine = value; }
        }

        internal string ProtocolVersion
        {
            get { return protocolVersion; }

            set { protocolVersion = value; }
        }

        internal string XMLString
        {
            get { return xmlString; }

            set
            {
                xmlString = value;

                // Loading XML causes immediate encoding
                wbxmlBytes = EncodeXMLString(xmlString);
            }
        }

        internal byte[] WBXMLBytes
        {
            get { return wbxmlBytes; }

            set
            {
                wbxmlBytes = value;

                // Loading WBXML bytes causes immediate decoding
                xmlString = DecodeWBXML(wbxmlBytes);
            }
        }

        internal string Command
        {
            get { return command; }

            set { command = value; }
        }

        public UInt32 PolicyKey
        {
            get { return policyKey; }

            set { policyKey = value; }
        }

        internal CommandParameter[] CommandParameters
        {
            get { return parameters; }

            set { parameters = value; }
        }
        #endregion

        // This function sends the request and returns the response.
        internal ASCommandResponse GetResponse()
        {
            GenerateXMLPayload();

            string strURI = string.Format("{0}//{1}/Microsoft-Server-ActiveSync?{2}", UseSSL ? "https:" : "http:", Server, RequestLine);
            Uri URI = new Uri(strURI);

            EncodedCredentials Credential = new EncodedCredentials();

            if (!UPNAuth)
            {
                credential = Credential.getEncodedCredentials(username, password, domain);
            }
            else
            {
                credential = Credential.getEncodedCredentials(emailaddress, password);
            }

            if (server != null && credential != null)
            {
                HttpWebRequest webRequest = (HttpWebRequest)WebRequest.Create(strURI);

                webRequest.Method = "POST";
                webRequest.ProtocolVersion = HttpVersion.Version11;
                webRequest.UserAgent = this.UserAgent;
                webRequest.ContentType = "application/vnd.ms-sync.wbxml";
                webRequest.Headers.Add("Authorization", "Basic " + credential);
                
                if (!UseEncodedRequestLine)
                {
                    // Encoded request lines include the protocol version and policy key in the request line.
                    // Non-encoded request lines require that those values be passed as headers.
                    webRequest.Headers.Add("MS-ASProtocolVersion", ProtocolVersion);
                    webRequest.Headers.Add("X-MS-PolicyKey", PolicyKey.ToString());
                }

                try
                {
                    Stream requestStream = webRequest.GetRequestStream();
                    requestStream.Write(WBXMLBytes, 0, WBXMLBytes.Length);
                    requestStream.Close();

                    StringBuilder requestStreamString = new StringBuilder();
                    requestStreamString.Append(webRequest.Method.ToString() + " ").AppendLine(webRequest.RequestUri.ToString());
                    requestStreamString.Append("HTTP/").AppendLine(webRequest.ProtocolVersion.ToString());
                    requestStreamString.Append("ContentLength: ").AppendLine(webRequest.ContentLength.ToString());
                    requestStreamString.Append("KeepAlive: ").AppendLine(webRequest.KeepAlive.ToString());
                    requestStreamString.AppendLine(webRequest.Headers.ToString());
                    tcLog.Info("Sending " + Command + " Request... \r\n\r\n" + requestStreamString.ToString());

                    HttpWebResponse webResponse = (HttpWebResponse)webRequest.GetResponse();

                    responseStatusCode = (int)webResponse.StatusCode;
                    responseStatusMsg = webResponse.StatusDescription.ToString();

                    if (webResponse == null)
                    { /* TBD: Find out what happens when response is NULL */ }

                    //No body, but we parse out the return headers
                    int responseHeadersCount = webResponse.Headers.Count;

                    for (int i = 0; i < responseHeadersCount; i++)
                    {
                        parsedResponseHeader += webResponse.Headers.Keys[i] + ":" +
                            webResponse.Headers.Get(i) + "\r\n";
                    }

                    StringBuilder responseStreamString = new StringBuilder();
                    responseStreamString.Append("HTTP/" + webResponse.ProtocolVersion.ToString() + " ").
                        AppendLine((int)webResponse.StatusCode + " " + webResponse.StatusDescription.ToString());
                    responseStreamString.AppendLine(parsedResponseHeader);
                    tcLog.Info("Received " + Command + " Response... \r\n\r\n" + responseStreamString.ToString());

                    ASCommandResponse response = WrapHttpWebResponse(webResponse);
                    webResponse.Close();

                    return response;

                }
                catch (WebException ex)
                {
                    responseStatusMsg = ex.Status.ToString();

                    parsedResponse += parseHTTPException(ex);

                    tcLog.Info("Received " + Command + " Response... \r\n\r\n" + parsedResponse.ToString());

                    return null;
                }
            }
            else
            {
                throw new HarnessException("ASCommandRequest not initialized... ");
            }
        }

        // This function generates an ASCommandResponse from an HTTP response.
        protected virtual ASCommandResponse WrapHttpWebResponse(HttpWebResponse webResponse)
        {
            return new ASCommandResponse(webResponse);
        }

        // This function builds a request line from the class properties.
        protected virtual void BuildRequestLine()
        {
            if (Command == null || Username == null || DeviceID == null || DeviceType == null)
                throw new InvalidDataException("ASCommandRequest not initialized... ");

            if (UseEncodedRequestLine == true)
            {
                // Use the EncodedRequest class to generate an encoded request line
                EncodedRequest encRequest = new EncodedRequest();

                encRequest.ProtocolVersion = Convert.ToByte(Convert.ToSingle(ProtocolVersion) * 10);
                encRequest.SetCommandCode(Command);
                encRequest.SetLocale("en-us");
                encRequest.DeviceId = DeviceID;
                encRequest.DeviceType = DeviceType;
                encRequest.PolicyKey = PolicyKey;

                // Add the User parameter to the request line
                encRequest.AddCommandParameter("User", Username);

                // Add any command-specific parameters
                if (CommandParameters != null)
                {
                    for (int i = 0; i < parameters.Length; i++)
                    {
                        encRequest.AddCommandParameter(CommandParameters[i].Parameter, CommandParameters[i].Value);
                    }
                }

                // Generate the request line
                RequestLine = encRequest.GetBase64EncodedString();
            }
            else
            {
                // Generate a plain-text request line.
                RequestLine = string.Format("User={0}&DeviceId={1}&DeviceType={2}&Cmd={3}", Username, DeviceID, DeviceType, Command);

                if (CommandParameters != null)
                {
                    for (int i = 0; i < parameters.Length; i++)
                    {
                        RequestLine = string.Format("{0}&{1}={2}", RequestLine, CommandParameters[i].Parameter, CommandParameters[i].Value);
                    }
                }
            }
        }

        // This function generates an XML payload.
        protected virtual void GenerateXMLPayload()
        {
            // For the base-class, this is a no-op.
            // Classes that extend this class to implement commands override this function to generate
            // the XML payload based on the command's request schema
        }

        // This function uses the ASWBXML class to encode XML into a WBXML stream.
        private byte[] EncodeXMLString(string stringXML)
        {
            try
            {
                ASWBXML encoder = new ASWBXML();
                encoder.LoadXML(stringXML);
                byte[] encodedWBXMLPayload = encoder.GetBytes();

                string strWBXMLPayload = BitConverter.ToString(encodedWBXMLPayload).Replace("-", " ");

                tcLog.Info("Generated " + Command.ToUpper() + " Request Payload (WBXML Encoded)... \r\n\r\n" + strWBXMLPayload + "\r\n");

                return encodedWBXMLPayload;
            }
            catch (Exception ex)
            {
                throw new InvalidDataException(string.Format("Encoding XML results in invalid WBXML: {0}.", ex));
            }
        }

        // This function uses the ASWBXML class to decode a WBXML stream into XML.
        private string DecodeWBXML(byte[] wbxml)
        {
            try
            {
                ASWBXML decoder = new ASWBXML();
                decoder.LoadBytes(wbxml);
                return decoder.GetXML();
            }
            catch (Exception ex)
            {
                throw new InvalidDataException(string.Format("Decoded WBXML results in invalid XML: {0}.", ex));
            }
        }

        private string parseHTTPException(WebException WebEx)
        {
            string parsedEx = null;

            switch (WebEx.Status.ToString())
            {
                case ("NameResolutionFailure"):
                    parsedEx += WebEx.Message.ToString() + "\r\n\r\n";
                    parsedEx += "Possible Reason: DNS lookup failed or server is not reachable by hostname. \r\n";
                    parsedEx += "Suggestion: Try connecting using IP address. \r\n";
                    parsedEx += "Status: FAIL! \r\n";
                    break;

                case ("ConnectFailure"):
                    parsedEx += WebEx.Message.ToString() + "\r\n\r\n";
                    parsedEx += "Possible Reason: The server is not reachable at the specified address or port is not open. \r\n";
                    parsedEx += "Suggestion: Check that necessary services are responding and firewall rules aren't blocking connections. \r\n";
                    parsedEx += "Status: FAIL! \r\n";
                    break;

                case ("SendFailure"):
                    parsedEx += WebEx.Message.ToString() + "\r\n\r\n";
                    parsedEx += "Possible Reason: There does not seem to be a server responding at this address. \r\n";
                    parsedEx += "Suggestion: Verify that the URL should respond and run test again. \r\n";
                    parsedEx += "Status: Further action required! \r\n";
                    break;

                case ("ProtocolError"):
                    parsedEx += WebEx.Message.ToString() + "\r\n\r\n";
                    HttpWebResponse responseException = (HttpWebResponse)WebEx.Response;
                    int responseCode = (int)responseException.StatusCode;

                    #region HTTP Error Code: 302
                    if (responseCode == 302)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: Server issued a redirect to a new URL. A new Autodiscover request (with changed FQDN) is required. \r\n";
                        parsedEx += "Status: Further action required! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 400
                    if (responseCode == 400)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: Possibly a protocol mismatch. \r\n";
                        parsedEx += "Suggestion: Choose a different protocol version to emulate and try to run test again. \r\n";
                        parsedEx += "Status: FAIL! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 401
                    if (responseCode == 401)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation 1: Possibly trying to authenticate using a wrong username/password combination. \r\n";
                        parsedEx += "Explanation 2: Could also be caused by authenticating with user@domain.com if Active Directory doesn't accept this. \r\n";
                        parsedEx += "Explanation 3: May also occur if using a reverse proxy which performs authentication. \r\n";
                        parsedEx += "Status: FAIL! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 403
                    if (responseCode == 403)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: The server requires SSL and will not let you connect over HTTP. For instance trying to connect over HTTP while WebServer requires HTTPS. \r\n";
                        parsedEx += "Status: Further action required! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 449
                    if (responseCode == 449)
                    {
                        responseStatusCode = responseCode;
                        
                        if ((Command == "FolderSync") && (isInitialSync == true))
                        {
                            parsedEx += "Explanation: Initial FolderSync requires to be followed up with a Provision command. \r\n";
                            parsedEx += "Status: Further action required! \r\n";
                        }

                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 501 & 505
                    if (responseCode == 501 || responseCode == 505)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: This is correct behaviour and means your activesync server is responding. \r\n";
                        parsedEx += "Status: PASS! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 502
                    if (responseCode == 502)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: There is a server available at this FQDN and port, but it's not responding to OPTIONS request. For instance, this could happen if http://example.com does not redirect to an activesync server. \r\n";
                        parsedEx += "Status: FAIL! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 503
                    if (responseCode == 503)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: Server is either experiencing too much load or in a maintenance mode. \r\n";
                        parsedEx += "Suggestion: Check again in a short while and if problem persists check that all services are running on your activesync server. \r\n";
                        parsedEx += "Status: FAIL! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: 504
                    if (responseCode == 504)
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: Seems your activesync server might have problems on the backend servers. \r\n";
                        parsedEx += "Suggestion: Check network connectivity on your activesync server (problem most likely not between client and server). \r\n";
                        parsedEx += "Status: FAIL! \r\n";
                        break;
                    }
                    #endregion

                    #region HTTP Error Code: All Others
                    else
                    {
                        responseStatusCode = responseCode;
                        parsedEx += "Explanation: Invalid ASCommandResponse - HTTP Error " + responseCode + " unhandled... \r\n";
                        parsedEx += "Status: FAIL! \r\n";
                        break;
                    }
                    #endregion

                case ("TrustFailure"):
                    parsedEx += WebEx.Message.ToString() + "\r\n\r\n";
                    parsedEx += "Explanation: The SSL certificate presented is not trusted. \r\n";
                    parsedEx += "Suggestion: Set \"Trust all certificates\" and run test again. \r\n";
                    parsedEx += "Status: Further action required! \r\n";
                    break;

                default:
                    break;
            }
            return parsedEx;
        }

        private string parseResponseStatus(string responseBody, string strEASVersion, string strEASCommand)
        {
            string parsedStatus = null;

            switch (strEASCommand)
            {
                case "SYNC":
                    goto default;
                case "SENDMAIL":
                    goto default;
                case "SMARTFORWARD":
                    goto default;
                case "SMARTREPLY":
                    goto default;
                case "GETATTACHMENT":
                    goto default;
                case "FOLDERSYNC":
                    goto default;
                case "FOLDERCREATE":
                    goto default;
                case "FOLDERDELETE":
                    goto default;
                case "FOLDERUPDATE":
                    goto default;
                case "MOVEITEMS":
                    goto default;
                case "GETITEMESTIMATE":
                    goto default;
                case "MEETINGRESPONSE":
                    goto default;
                case "SEARCH":
                    goto default;
                case "SETTINGS":
                    goto default;
                case "PING":
                    goto default;
                case "ITEMOPERATIONS":
                    goto default;
                case "PROVISION":
                    {
                        //TBD:
                    }
                    goto default;
                case "RESOLVERECIPIENTS":
                    goto default;
                case "VALIDATECERT":
                    goto default;
                default:
                    {
                        if (responseBody.Contains("101") == true)
                        {
                            parsedStatus += "HTTP request body is invalid! \r\n";
                            parsedStatus += "Ensure the HTTP request is using the specified Content-Type & Length, and that the request is not missing. \r\n";
                            parsedStatus += "";
                        }

                        if (responseBody.Contains("108") == true)
                        {
                            parsedStatus += "The device ID is invalid.";
                            parsedStatus += "\r\nAre you using any special characters? Only plain characters and numerals recommended.)";
                            parsedStatus += "\r\n";
                        }

                        if (responseBody.Contains("126") == true)
                        {
                            parsedStatus += "The user account does not have permission to synchronize.";
                            parsedStatus += "\r\nThis could also be due to using an admin account. (Domain admin is not allowed to sync.)";
                            parsedStatus += "\r\n";
                        }

                        //if EAS >= 12.1 (Exchange 2007 SP1) we need to parse the returned wbxml for '142' to find out if we need to provision
                        //EAS 12.0 indicates the same status through HTTP 449
                        if (strEASVersion == "12.1" || strEASVersion == "14.0" || strEASVersion == "14.1")
                        {
                            if (responseBody.Contains("142") == true)
                            {
                                parsedStatus += "The response is ok, but you need to provision";
                                parsedStatus += "\r\n";
                            }
                        }

                        if (responseBody.Contains("141") == true)
                        {
                            parsedStatus += "Only provisionable devices are allowed to sync, and you seem to be non-provisionable.\r\n";
                            parsedStatus += "Check the \"Provisionable device\" and run the test again.\r\n";
                        }
                        if (responseBody.Contains("140") == true)
                        {
                            parsedStatus += "A remote wipe has been issued for your device.\r\n";
                            parsedStatus += "Choose \"Remote Wipe (Emulated)\" to simulate a wipe.\r\n";
                        }
                        if (responseBody.Contains("144") == true)
                        {
                            parsedStatus += "The device's policy key is invalid. The policy has probably changed on the server. The device needs to re-provision.\r\n";
                            parsedStatus += "This may happen if you have synced a \"device\" with security policies and then removed the support for all policies.\r\n";
                        }

                        else if (responseBody.Length <= 15)
                        {
                            parsedStatus += "More status codes can be looked up here:\r\n";
                            parsedStatus += "http://msdn.microsoft.com/en-us/library/ee218647(v=EXCHG.80).aspx\r\n";
                        }
                    }
                    break;
            }
            return parsedStatus;
        }
    }
}