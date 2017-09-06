using System;
using System.Collections.Generic;
using System.Text;
using System.Net;
using System.IO;

namespace Utilities
{
    public class ClientHttp : ClientBase
    {
        // POST & GET settings
        protected Uri MyDestinationURI = null;
        protected ICredentials MyDestinationCredentials = CredentialCache.DefaultCredentials;

        // POST settings
        protected String MyDestinationUserAgent = "Zimbra EAS Test Harness";
        protected string MyDestinationContentType = "application/x-www-form-urlencoded";
        protected String MyDestinationPayload = null;
        protected String MyDestinationResponseData = null;
        protected WebHeaderCollection MyDestinationResponseHeaders = null;


        public ClientHttp()
        {
        }

        public HttpStatusCode doGet()
        {
            HttpStatusCode code;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(MyDestinationURI);
            HttpWebResponse response = null;
            try
            {
                response = (HttpWebResponse)request.GetResponse();
                code = response.StatusCode;
            }
            finally
            {
                if (response != null)
                {
                    response.Close();
                    response = null;
                }
            }
            return (code);
        }

        public HttpStatusCode doPost()
        {

            // Convert the data string to a byte array
            byte[] byteArray = Encoding.ASCII.GetBytes(MyDestinationPayload);

            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(MyDestinationURI);
            request.Credentials = MyDestinationCredentials;
            request.UserAgent = MyDestinationUserAgent;
            request.Method = "POST";
            request.ContentType = MyDestinationContentType;
            request.ContentLength = byteArray.Length;

            HttpStatusCode code;


            Stream inputStream = null;
            try
            {
                // Write to the input stream to POST
                inputStream = request.GetRequestStream();
                inputStream.Write(byteArray, 0, byteArray.Length);
            }
            catch (System.Net.WebException ex)
            {
                throw new HarnessException("Unable to connect to host: " + MyDestinationURI, ex);
            }
            finally
            {
                if (inputStream != null)
                {
                    inputStream.Close();
                    inputStream = null;
                }
            }

            HttpWebResponse response = null;
            try
            {
                try
                {
                    // Execute the POST
                    response = (HttpWebResponse)request.GetResponse();
                }
                catch (WebException ex)
                {
                    // If there is an error, use the response in the exception
                    logger.Debug("WebException thrown", ex);
                    response = (HttpWebResponse)ex.Response;
                }

                code = response.StatusCode;

                // For tracing, remember the headers and data body
                MyDestinationResponseHeaders = null;
                MyDestinationResponseData = null;

                // If the status was OK or InternalServerError, there will be
                // content in the headers/body.  Save that content.
                if (code == HttpStatusCode.OK || code == HttpStatusCode.InternalServerError)
                {
                    MyDestinationResponseHeaders = response.Headers;
                    StreamReader outputStream = null;
                    try
                    {
                        outputStream = new StreamReader(response.GetResponseStream(), System.Text.Encoding.ASCII);
                        MyDestinationResponseData = outputStream.ReadToEnd();
                    }
                    finally
                    {
                        if (outputStream != null)
                        {
                            outputStream.Close();
                            outputStream = null;
                        }
                    }
                }

            }
            finally
            {
                if (response != null)
                {
                    response.Close();
                    response = null;
                }
            }



            return (code);
        }

        public Uri DestinationURI
        {
            get { return (MyDestinationURI); }
            set { MyDestinationURI = value; }
        }

        public ICredentials DestinationCredentials
        {
            get { return (MyDestinationCredentials); }
            set { MyDestinationCredentials = value; }
        }

        public String DestinationUserAgent
        {
            get { return (MyDestinationUserAgent); }
            set { MyDestinationUserAgent = value; }
        }

        public String DestinationContentType
        {
            get { return (MyDestinationContentType); }
            set { MyDestinationContentType = value; }
        }

        public String DestinationPayload
        {
            get { return (MyDestinationPayload); }
            set { MyDestinationPayload = value; }
        }

    }
}
