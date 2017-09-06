using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using log4net;
using System.Net;
using System.IO;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZClientHttp
    {
        private static ILog logger = LogManager.GetLogger(typeof(ZClientHttp));


        // POST & GET settings
        private Uri MyDestinationURI = null;
        private ICredentials MyDestinationCredentials = CredentialCache.DefaultCredentials;

        // POST settings
        private String MyDestinationUserAgent = "Zimbra EAS Test Harness";
        private String MyDestinationContentType = "application/x-www-form-urlencoded";
        private byte[] MyDestinationPayload = null;  // For POST requests, this will be the payload
        private Dictionary<String, String> MyDestinationHeaders = new Dictionary<String, String>();

        // Response settings
        private HttpWebRequest MyRequest = null;
        private HttpWebResponse MyResponse = null;
        private WebHeaderCollection MyResponseHeaders = null;

        #region Property Accessors

        public virtual Uri DestinationURI
        {
            get { return (MyDestinationURI); }
            set { MyDestinationURI = value; }
        }

        public virtual ICredentials DestinationCredentials
        {
            get { return (MyDestinationCredentials); }
            set { MyDestinationCredentials = value; }
        }

        public virtual String DestinationUserAgent
        {
            get { return (MyDestinationUserAgent); }
            set { MyDestinationUserAgent = value; }
        }

        public virtual String DestinationContentType
        {
            get { return (MyDestinationContentType); }
            set { MyDestinationContentType = value; }
        }

        public virtual byte[] DestinationPayload
        {
            get { return (MyDestinationPayload); }
            set { MyDestinationPayload = value; }
        }

        public virtual Dictionary<String, String> DestinationHeaders
        {
            get { return (MyDestinationHeaders); }
            set { MyDestinationHeaders = value; }
        }


        public virtual HttpWebRequest HttpRequest
        {
            get { return (MyRequest); }
            set { MyRequest = value; }
        }

        public virtual HttpWebResponse HttpResponse
        {
            get { return (MyResponse); }
            set { MyResponse = value; }
        }

        public virtual WebHeaderCollection HttpResponseHeaders
        {
            get { return (MyResponseHeaders); }
            set { MyResponseHeaders = value; }
        }

        #endregion

        public ZClientHttp()
        {
            logger.Debug("new " + typeof(ZClientHttp));
        }

        public virtual HttpWebResponse doOptions()
        {

            // Create the web request
            HttpRequest = (HttpWebRequest)HttpWebRequest.Create(DestinationURI);
            HttpRequest.Method = "OPTIONS";

            if (DestinationCredentials != null)
            {
                HttpRequest.Credentials = DestinationCredentials;
            }

            try
            {

                HttpResponse = (HttpWebResponse)HttpRequest.GetResponse();
                return (HttpResponse);

            }
            catch (WebException ex) {

                // Errors such as 403 may be expected.
                // So, log the error and continue

                logger.Warn(ex);
                HttpResponse = (HttpWebResponse)ex.Response;
                return (HttpResponse);

            }


        }

        public virtual HttpWebResponse doPost(bool setTimeout)
        {

            HttpRequest = (HttpWebRequest)HttpWebRequest.Create(DestinationURI);
            HttpRequest.Method = "POST";

            if (setTimeout == true)
            {
                //Set timeout to 500 seconds, this is required for Async Ping requests with HBI=300
                HttpRequest.Timeout = 500000;
                HttpRequest.ReadWriteTimeout = 500000;
            }

            if (DestinationCredentials != null)
            {
                HttpRequest.Credentials = DestinationCredentials;
            }

            if (DestinationUserAgent != null)
            {
                HttpRequest.UserAgent = MyDestinationUserAgent;
            }

            if (DestinationHeaders != null)
            {
                foreach (KeyValuePair<String, String> entry in MyDestinationHeaders)
                {
                    HttpRequest.Headers.Add(entry.Key, entry.Value);
                }
            }


            Stream inputStream = null;
            try
            {
                inputStream = HttpRequest.GetRequestStream();

                if(DestinationPayload != null)
                    inputStream.Write(DestinationPayload, 0, DestinationPayload.Length);
            }
            finally
            {
                if (inputStream != null)
                {
                    inputStream.Close();
                }
            }


            try
            {
            
                // Do the post
                HttpResponse = (HttpWebResponse)HttpRequest.GetResponse();

            }
            catch (WebException ex)
            {

                // There might be a non-OK response, which might be expected (such as UNAUTHORIZED)
                // So, log the error and remember the response
                logger.Warn("WebException thrown", ex);
                HttpResponse = (HttpWebResponse)ex.Response;

                if (HttpResponse.StatusCode != HttpStatusCode.OK && HttpResponse.StatusCode != HttpStatusCode.Unauthorized)
                {
                    throw new Exception("Http response failed i.e. Server returned non-OK status code", ex);

                }

            }


            // Let the defining classes generate the correct object
            // type for this request
            //
            return (HttpResponse);

        }

        /// <summary>
        /// A helper method to add a key/value to the request headers (even if set previously)
        /// </summary>
        /// <param name="key"></param>
        /// <param name="value"></param>
        public void AddDestinationHeader(String key, String value)
        {
            if (DestinationHeaders.ContainsKey(key))
            {
                DestinationHeaders.Remove(key);
            }
            DestinationHeaders.Add(key, value);
        }

    }
}
