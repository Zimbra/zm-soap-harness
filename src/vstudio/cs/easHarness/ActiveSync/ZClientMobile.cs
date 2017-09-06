using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using log4net;
using Utilities;
using System.Net;
using System.Xml;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZClientMobile : ZClientHttp
    {
        private ILog logger = LogManager.GetLogger(typeof(ZClientMobile));


        private ZimbraAccount MyAccount = null;
        private ZRequest MyRequest = null;
        private ZResponse MyResponse = null;
        private bool isProvisioned = false;
        
        private Boolean MyUseEncodedRequestLine = false;

        #region Property Accessors

        public ZimbraAccount Account
        {
            get { return (MyAccount); }
            set { MyAccount = value; }
        }

        public Boolean UseEncodedRequestLine
        {
            get { return (MyUseEncodedRequestLine); }
            set { MyUseEncodedRequestLine = value; }
        }

        public ZRequest Request
        {
            get { return (MyRequest); }
            set { MyRequest = value; }
        }

        public ZResponse Response
        {
            get { return (MyResponse); }
            set { MyResponse = value; }
        }

        #endregion

        public ZClientMobile(ZimbraAccount account)
        {
            Account = account;
        }

        public bool Provisioned
        {
            get { return (isProvisioned); }
            set { isProvisioned = value; }
        }

        /// <summary>
        /// Send a Zimbra Mobile Sync request
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        public ZResponse sendRequest(ZimbraAccount account, String request)
        {
            // Convert the string to a ZRequest and send it
            return (sendRequest(ZRequest.loadXml(account, request)));
        }

        /// <summary>
        /// Send a Zimbra Mobile Sync request
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        public ZResponse sendRequest(ZRequest request)
        {
            bool setTimeout = false;
            try
            {
                Response = null;
                Request = request;
                if (request.HttpMethod.Equals("POST"))
                {

                    // Create the URI
//                    string uri = string.Format("https://{0}/Microsoft-Server-ActiveSync?{1}", MyAccount.ZimbraMailHost, BuildRequestLine());
                    base.DestinationURI = BuildRequestURI();

                    // Set the content
                    base.DestinationContentType = request.DestinationContentType;
                    base.DestinationPayload = request.DestinationPayload;
                    
                    // Set the request user credentials
                    CredentialCache creds = new CredentialCache();
                    // Using Basic authentication
                    creds.Add(DestinationURI, "Basic", Account.NetworkCredentials);
                    base.DestinationCredentials = creds;

                    // Add the "Authorization" Header
                    base.AddDestinationHeader("Authorization", Account.Authorization);


                    if (!UseEncodedRequestLine)
                    {
                        // Encoded request lines include the protocol version
                        // and policy key in the request line. 
                        // Non-encoded request lines require that those
                        // values be passed as headers.
                        base.AddDestinationHeader("MS-ASProtocolVersion", "12.1"); // TODO: extract from the device?
                        base.AddDestinationHeader("X-MS-PolicyKey", Account.Device.PolicyKey.ToString());
                    }

                    // Execute the POST
                    Response = request.WrapResponse(doPost(setTimeout));

                }
                else if (request.HttpMethod.Equals("OPTIONS"))
                {
                    // Create the URI
                    string uri = String.Format("https://{0}/Microsoft-Server-ActiveSync", MyAccount.ZimbraMailHost);
                    if (MyAccount.ZimbraMailHost.Equals("host.local"))
                    {
                        uri = String.Format("http://{0}/Microsoft-Server-ActiveSync", HarnessProperties.getString("server.host"));
                    }
                    base.DestinationURI = new Uri(uri);

                    // Credentials used for posting
                    CredentialCache cache = new CredentialCache();
                    cache.Add(DestinationURI, "Basic", MyAccount.NetworkCredentials);
                    DestinationCredentials = cache;

                    // Execute the GET
                    Response = request.WrapResponse(doOptions());
                }
                else
                {
                    throw new HarnessException("Unknown method type: " + request.HttpMethod);
                }

                #region Parse any response information

                ZSendMailRequest sendMailRequest = Request as ZSendMailRequest;
                if (sendMailRequest != null)
                {
                    // If sending a mail, check the queue to make sure it is delivered
                    MailInject.waitForPostfixQueue();
                }

                #endregion

                return (Response);
            }
            finally
            {
                LogManager.GetLogger("TestCaseLogger").Info(toTrace());
            }
        }

        /// <summary>
        /// Send a Zimbra Mobile Sync request asynchronously
        /// Useful for Ping command
        /// TBD
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        public ZResponse sendRequestASync(ZRequest request)
        {
            bool setTimeout = true;
            Response = null;
            Request = request;
            // Create the URI
            //                    string uri = string.Format("https://{0}/Microsoft-Server-ActiveSync?{1}", MyAccount.ZimbraMailHost, BuildRequestLine());
            base.DestinationURI = BuildRequestURI();

            // Set the content
            base.DestinationContentType = request.DestinationContentType;
            base.DestinationPayload = request.DestinationPayload;

            // Set the request user credentials
            CredentialCache creds = new CredentialCache();
            // Using Basic authentication
            creds.Add(DestinationURI, "Basic", Account.NetworkCredentials);
            base.DestinationCredentials = creds;

            // Add the "Authorization" Header
            base.AddDestinationHeader("Authorization", Account.Authorization);


            if (!UseEncodedRequestLine)
            {
                // Encoded request lines include the protocol version
                // and policy key in the request line. 
                // Non-encoded request lines require that those
                // values be passed as headers.
                base.AddDestinationHeader("MS-ASProtocolVersion", "12.1"); // TODO: extract from the device?
                base.AddDestinationHeader("X-MS-PolicyKey", Account.Device.PolicyKey.ToString());
            }

            // Execute the POST
            Response = request.WrapResponse(doPost(setTimeout));

            return (Response);
        }

        #region Transactions

        /// <summary>
        /// Send the Provision transaction, which consists of two provisioning requests
        /// </summary>
        public void sendProvisionTransaction()
        {
            ZProvisionRequest provisionRequest;
            ZProvisionResponse provisionResponse;



            // Send Provision

            provisionRequest = new ZProvisionRequest(
                this.Account,
                @"<?xml version='1.0' encoding='utf-8'?>
                        <Provision xmlns='Provision'>
                            <Policies>
                                <Policy>
                                    <PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
                                </Policy>
                            </Policies>
                        </Provision>");
            provisionResponse = sendRequest(provisionRequest) as ZProvisionResponse;
            ZAssert.IsNotNull(provisionResponse, "Verify Provision Response is returned");

            // Remember the policy key
            Account.Device.PolicyKey = provisionResponse.Policy.PolicyKey;


            // Send Provision (ack)

            provisionRequest = new ZProvisionRequest(
                this.Account,
                  @"<?xml version='1.0' encoding='utf-8'?>
                        <Provision xmlns='Provision'>
                            <Policies>
                                <Policy>
                                    <PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
                                    <PolicyKey>" + Account.Device.PolicyKey + @"</PolicyKey>
                                    <Status>1</Status>
                                </Policy>
                            </Policies>
                        </Provision>");
            provisionResponse = sendRequest(provisionRequest) as ZProvisionResponse;
            ZAssert.IsNotNull(provisionResponse, "Verify Provision Response is returned");

            // Remember the policy key
            Account.Device.PolicyKey = provisionResponse.Policy.PolicyKey;

        }

        /// <summary>
        /// Send the Sync transaction for the standard folders (inbox, contacts, calendar)
        /// </summary>
        public void sendSyncTransaction()
        {
            ZResponse response;
            ZSyncRequest syncRequest;
            ZSyncResponse syncResponse;


            #region Send Inbox Sync

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.inbox.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");



            // Send Sync (ack)

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.inbox.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");

            #endregion

            #region Send Contacts Sync

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");



            // Send Sync (ack)

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");

            #endregion

            #region Send Calendar Sync

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");



            // Send Sync (ack)

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.calendar.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");

            #endregion

            #region Send Task Sync

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.tasks.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");

            // Send Sync (ack)

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.tasks.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");

            #endregion

            #region Send "Sent" folder Sync

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.sent.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");

            // Send Sync (ack)

            syncRequest = new ZSyncRequest(this.Account);
            syncRequest.Account = Account;
            syncRequest.CollectionId = HarnessProperties.getString("folder.sent.id");
            response = sendRequest(syncRequest);
            syncResponse = response as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify Sync Response is returned");

            #endregion
        }

        #endregion


        /// <summary>
        /// Create the URI the request should be sent to.
        /// e.g. String.Format("https://{0}/Microsoft-Server-ActiveSync?{1}", MyAccount.ZimbraMailHost, BuildRequestLine());
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        protected Uri BuildRequestURI()
        {

            String scheme = HarnessProperties.getString("server.scheme", "https");
            String host = Account.ZimbraMailHost;
            String p = HarnessProperties.getString("server.port", "443");
            int port = Convert.ToInt32(p);
            String path = "/Microsoft-Server-ActiveSync";
            String query = BuildRequestLine();
            String fragment = null;

            if (host.Equals("host.local"))
            {
                scheme = "http";
                host = HarnessProperties.getString("server.host");
                port = 80;
            }

            UriBuilder builder = new UriBuilder();
            builder.Scheme = scheme;
            builder.Host = host;
            builder.Port = port;
            builder.Path = path;
            builder.Query = query;
            builder.Fragment = fragment;

            Uri uri = builder.Uri;

            logger.Info("ZimbraMobile using URI: " + builder.Uri.AbsoluteUri);

            return (builder.Uri);

        }


        /// <summary>
        /// This function builds a request line from the class properties.
        /// e.g. string uriString = string.Format("{0}//{1}/Microsoft-Server-ActiveSync?{2}", useSSL ? "https:" : "http:", server, RequestLine);
        /// </summary>
        protected String BuildRequestLine()
        {


            if (UseEncodedRequestLine == true)
            {
                // Use the EncodedRequest class to generate
                // an encoded request line
                EncodedRequest encodedRequest = new EncodedRequest();

                encodedRequest.ProtocolVersion = Convert.ToByte(Convert.ToSingle("12.1") * 10); // TODO: grab from request/device object
                encodedRequest.SetCommandCode(Request.Command);
                encodedRequest.SetLocale("en-us");  // TODO: grab from account object
                encodedRequest.DeviceId = Account.Device.DeviceID;
                encodedRequest.DeviceType = Account.Device.DeviceType;
                encodedRequest.PolicyKey = Account.Device.PolicyKey;

                // Add the User parameter to the request line
                encodedRequest.AddCommandParameter("User", Account.EmailAddress);

                // Add any command-specific parameters
                if (Request.CommandParameters != null)
                {
                    for (int i = 0; i < Request.CommandParameters.Length; i++)
                    {
                        encodedRequest.AddCommandParameter(Request.CommandParameters[i].Parameter, Request.CommandParameters[i].Value);
                    }
                }

                // Generate the request line
                return (encodedRequest.GetBase64EncodedString());
            }
            else
            {
                // Generate a plain-text request line.
                StringBuilder requestLine = new StringBuilder(
                    String.Format("Cmd={0}&User={1}&DeviceId={2}&DeviceType={3}",
                    Request.Command, Account.UserName, Account.Device.DeviceID, Account.Device.DeviceType));

                if (Request.CommandParameters != null)
                {
                    for (int i = 0; i < Request.CommandParameters.Length; i++)
                    {
                        requestLine.Append('&').Append(Request.CommandParameters[i].Parameter).Append('=').Append(Request.CommandParameters[i].Value);
                    }
                }

                return (requestLine.ToString());

            }
        }

        /// <summary>
        /// Create a string that represents this test step (for logging)
        /// </summary>
        /// <returns></returns>
        public String toTrace()
        {
            StringBuilder sb = new StringBuilder(Environment.NewLine);

            if (base.DestinationURI != null)
            {
                sb.Append("URI: ").Append(base.DestinationURI).Append(Environment.NewLine);
            }

            if (base.HttpRequest != null)
            {
                
                sb.Append("Method: ").Append(base.HttpRequest.Method).Append(Environment.NewLine);

                for (int i = 0; i < base.HttpRequest.Headers.Count; i++)
                {
                    String key = base.HttpRequest.Headers.GetKey(i);
                    foreach (String value in base.HttpRequest.Headers.GetValues(i))
                    {
                        sb.Append(key).Append(": ").Append(value).Append(Environment.NewLine);
                    }
                }
            }

            if (Request != null)
            {
                sb.Append("--- Request").Append(Environment.NewLine);
                sb.Append(Request.toTrace()).Append(Environment.NewLine);
                sb.Append("---").Append(Environment.NewLine);
            }

            if (Response != null)
            {
                sb.Append("--- Response").Append(Environment.NewLine);
                sb.Append(Response.toTrace()).Append("\n");
                sb.Append("---").Append(Environment.NewLine);
            }

            return (sb.ToString());
        }

    }
}
