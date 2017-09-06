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
using System.Net;
using System.Text;
using System.Collections.Generic;
using log4net;
using EASHarness.Harness;

namespace EASHarness.ActiveSync.HTTP
{
    internal class ASOptionsRequest
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private string emailaddress = null;
        private string password = null;
        private string server = null; 
        private string username = null;
        private string domain = null;  
        private string deviceID = null;
        private string deviceType = null;
        private string useragent = null;
        private string credential = null;
        private string parsedResponseHeader = "";
        private string parsedResponse = "";
        private string responseStatusMsg = "";
        private bool useSSL = true;
        private bool useUPNAuth = true;
        private int responseStatusCode = 0;

        #region Property Accessors
        internal string EmailAddress
        {
            set { emailaddress = value; }
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

        internal int ResponseStatusCode
        {
            get { return responseStatusCode; }
        }

        internal string ResponseStatusMessage
        {
            get { return responseStatusMsg; }
        }
        #endregion

        internal ASOptionsResponse GetOptions()
        {
            string strURI = string.Format("{0}//{1}/Microsoft-Server-ActiveSync?User={2}&DeviceId={3}&DeviceType={4}", 
                UseSSL ? "https:" : "http:", Server, Username, DeviceID, DeviceType);
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

                webRequest.Method = "OPTIONS";
                webRequest.ProtocolVersion = HttpVersion.Version11;
                webRequest.UserAgent = this.UserAgent;
                webRequest.Headers.Add("Authorization", "Basic " + credential);

                try
                {
                    StringBuilder requestStreamString = new StringBuilder();
                    requestStreamString.Append(webRequest.Method.ToString() + " ").AppendLine(webRequest.RequestUri.ToString());
                    requestStreamString.Append("HTTP/").AppendLine(webRequest.ProtocolVersion.ToString());
                    requestStreamString.Append("ContentLength: ").AppendLine(webRequest.ContentLength.ToString());
                    requestStreamString.Append("KeepAlive: ").AppendLine(webRequest.KeepAlive.ToString());
                    requestStreamString.AppendLine(webRequest.Headers.ToString());
                    tcLog.Info("Sending OPTIONS Request... \r\n\r\n" + requestStreamString.ToString());

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
                    tcLog.Info("Received OPTIONS Response... \r\n\r\n" + responseStreamString.ToString());

                    ASOptionsResponse response = new ASOptionsResponse(webResponse);
                    webResponse.Close();

                    return response;
                }
                catch (WebException ex)
                {
                    responseStatusMsg = ex.Status.ToString();

                    parsedResponse += parseHTTPException(ex);

                    tcLog.Info("Received OPTIONS Response... \r\n\r\n" + parsedResponse.ToString());

                    return null;
                }
            }
            else
            {
                throw new HarnessException("ASOptionsRequest not initialized... ");
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
                        parsedEx += "Explanation: Invalid ASOptionsResponse - HTTP Error " + responseCode + " unhandled... \r\n";
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
    }
}