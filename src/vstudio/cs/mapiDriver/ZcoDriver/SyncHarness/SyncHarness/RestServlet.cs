using System;
using System.Collections.Generic;
using System.Text;
using System.Collections;
using log4net;
using System.Net;
using System.IO;
using System.Text.RegularExpressions;

namespace SyncHarness
{
    public class RestClient
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected static uint counter = 0;

        public const string MethodPost = "POST";
        public const string MethodGet = "GET";


        protected const string RestUserAgent = "Zimbra NUnit Client";
        protected string RestMethod = MethodGet;
        protected string RestContentType = "text/plain";
        protected UriBuilder RestUriBuilder = null;

        protected string RestAuthToken = null;
        protected string RestSession = null;
        protected string RestUsername = null;
        protected string RestPassword = null;


        protected string UrlUsername = "~";
        protected string UrlFoldername = null;
        protected Hashtable UrlQueryTable = new Hashtable();
        protected string UrlFragment = null;

        protected FileInfo httpRequestSource = null;
        protected FileInfo httpResponseData = null;
        protected HttpWebRequest httpWebRequest = null;
        protected HttpWebResponse httpWebResponse = null;
        protected string stringRequest = null;
        protected string stringResponse = null;


        /// <summary>
        /// Create a REST Http Client to post or get files from Zimbra's REST interface
        /// </summary>
        /// <param name="method">Either RestClient.MethodPost or RestClient.MethodGet</param>
        public RestClient(string method)
        {
            // Make sure method is valid
            if (!(method.Equals(MethodPost) || method.Equals(MethodGet)))
            {
                throw new HarnessException("RestClient method must be " + MethodGet + " or " + MethodPost);
            }

            RestMethod = method;
            RestUriBuilder = new UriBuilder();

        }

        /// <summary>
        /// Post or Get a file to the specified server
        /// </summary>
        /// <param name="filename">The full path to the file to be posted or the full path to the file to save the get file</param>
        /// <returns>false on success (TODO)</returns>
        public bool DoMethod()
        {
            Uri uri = null;
            httpWebRequest = null;
            httpWebResponse = null;
            stringRequest = null;
            stringResponse = null;
            bool retval = false;

            try
            {

                // Set the URL
                uri = getUri();
                log.Debug("RestClient: uri = " + uri.ToString());


                #region execute Post or Get

                if (RestMethod.Equals(RestClient.MethodGet))
                {
                    retval = DoGet(uri);
                }
                else if (RestMethod.Equals(RestClient.MethodPost))
                {
                    retval = DoPost(uri, httpRequestSource.FullName);
                }
                else
                {
                    throw new HarnessException("Invalid RestMethod: " + RestMethod);
                }

                #endregion

            }
            catch (Exception e)
            {
                throw new HarnessException("RestClient threw exception", e);
            }
            finally
            {
                // Print the trace to tcLog
                printLogging(uri);
            }

            return (retval);
        }

        /// <summary>
        /// For GET methods, match a regex to the http response.
        /// </summary>
        /// <param name="regex">The regex to apply to each line</param>
        /// <returns>true if match.  false otherwise.</returns>
        public bool responseMatchLine(Regex regex)
        {
            if (stringResponse == null)
                return (false);
            Match match = regex.Match(stringResponse);
            LogManager.GetLogger(TestCaseLog.tcLogName).InfoFormat("RestClient MatchLine: regex({0}) value({1})", regex.ToString(), match.Success ? match.Value : "no match");
            return (match.Success);
        }

        /// <summary>
        /// For GET methods, match a regex to the http response.
        /// </summary>
        /// <param name="regex">The regex to apply to each line</param>
        /// <returns>true if match.  false otherwise.</returns>
        public bool responseMatch(String regex)
        {
            return (responseMatchLine(new Regex(regex)));
        }



        /// <summary>
        /// Set the zimbra account to use for authentication
        /// </summary>
        public zAccount account
        {
            set
            {
                RestAuthToken = value.authToken;
                RestSession = value.sessionId;
                RestUsername = value.emailAddress;
                RestPassword = value.password;
                RestUriBuilder.Host = value.zimbraMailHost;
                RestUriBuilder.Scheme = GlobalProperties.getProperty("soapservice.mode");
                RestUriBuilder.Port = Int32.Parse(GlobalProperties.getProperty("soapservice.port"));
            }
        }

        /// <summary>
        /// Set the ContentType for the file (for POST)
        /// </summary>
        public string ContentType
        {
            set
            {
                RestContentType = value;
            }
        }

        /// <summary>
        /// Specify a file to post
        /// </summary>
        /// <param name="filename">the file to post</param>
        /// <returns>the full name of the file</returns>
        public string setPostData(string filename)
        {
            httpRequestSource = new FileInfo(filename);
            if (!httpRequestSource.Exists)
                throw new HarnessException(filename + " does not exist");
            return (httpRequestSource.FullName);
        }

        /// <summary>
        /// Set the hard coded URI to use
        /// </summary>
        /// <param name="uri">The hardcoded URI to use</param>
        public void setUri(Uri uri)
        {
            RestUriBuilder = new UriBuilder(uri);
        }

        /// <summary>
        /// Set the username part of the URI
        /// </summary>
        /// <param name="username">http://server.com:port/service/home/username/foldername?query:fragment</param>
        public void setUrlUsername(string username)
        {
            UrlUsername = username;
        }

        /// <summary>
        /// Set the foldername part of the URI
        /// </summary>
        /// <param name="foldername">http://server.com:port/service/home/username/foldername?query#fragment</param>
        public void setUrlFoldername(string foldername)
        {
            UrlFoldername = foldername;
        }

        /// <summary>
        /// Set a key/value pair in the query
        /// http://server.com:port/service/home/username/foldername?key1=value1&key2=value2&keyn=valuen#fragment
        /// </summary>
        /// <param name="key">the key</param>
        /// <param name="value">the value</param>
        public void setUrlQuery(string key, string value)
        {
            UrlQueryTable.Add(key, value);
        }

        /// <summary>
        /// Set the fragmt
        /// </summary>
        /// <param name="fragment">http://server.com:port/service/home/username/foldername?query#fragment</param>
        public void setUrlFragment(string fragment)
        {
            UrlFragment = fragment;
        }



        #region Utilities

        protected bool DoGet(Uri uri)
        {
            // Create a file to save the GET data
            string filename = TestCaseLog.Instance.GetLogDirectory().FullName + @"/rest" + GlobalProperties.time() + GlobalProperties.counter() + ".txt";
            httpResponseData = new FileInfo(filename);

            #region Set the authTokens and SessionIds

            CookieCollection cookieCollection = new CookieCollection();
            if (RestAuthToken != null)
                cookieCollection.Add(new Cookie("ZM_AUTH_TOKEN", RestAuthToken, "/", uri.Host));
            if (RestSession != null)
                cookieCollection.Add(new Cookie("JSESSIONID", RestSession, "/zimbra", uri.Host));

            #endregion



            #region Do HTTP request

            // Create the HTTP request
            httpWebRequest = WebRequest.Create(uri) as HttpWebRequest;
            if (httpWebRequest == null)
                throw new HarnessException("Unable to create HttpWebRequest");

            // Initialize the HTTP request settings
            //httpWebRequest.Method = RestMethod;
            //httpWebRequest.KeepAlive = true;
            //httpWebRequest.UserAgent = RestUserAgent;
            //httpWebRequest.ContentType = RestContentType;
            if (RestUsername != null)
            {
                // There seems to be a bug with C# URI
                // When you use http://username:password@server.com:port/path
                // A 'unable to parse port' exception is thrown
                // As per http://connect.microsoft.com/VisualStudio/feedback/details/322754/uri-constructor-from-string-which-contain-in-password-part
                // Use NetworkCredentials instead
                //
                httpWebRequest.Credentials = new NetworkCredential(RestUsername, RestPassword);
            }

            // Set cookies, if any
            if (cookieCollection.Count > 0)
            {
                httpWebRequest.CookieContainer = new CookieContainer();
                httpWebRequest.CookieContainer.Add(cookieCollection);
            }

            httpWebResponse = httpWebRequest.GetResponse() as HttpWebResponse;


            Stream streamResponse = httpWebResponse.GetResponseStream();
            StreamReader streamReader = new StreamReader(streamResponse);
            stringResponse = streamReader.ReadToEnd();
            streamReader.Close();
            streamReader = null;

            TextWriter textWriter = new StreamWriter(httpResponseData.FullName);
            textWriter.Write(stringResponse);
            textWriter.Close();

            #endregion



            // Done!
            return (true);

        }

        protected bool DoPost(Uri uri, string filename)
        {

            #region Check File Existence

            FileInfo fileInfo = new FileInfo(filename);
            if (!fileInfo.Exists)
            {
                throw new HarnessException("DoUploadFile: Unable to find file " + filename);
            }
            log.Debug("Uploading " + fileInfo.FullName);

            #endregion




            #region Set the authTokens and SessionIds

            CookieCollection cookieCollection = new CookieCollection();
            if (RestAuthToken != null)
                cookieCollection.Add(new Cookie("ZM_AUTH_TOKEN", RestAuthToken, "/", uri.Host));
            if (RestSession != null)
                cookieCollection.Add(new Cookie("JSESSIONID", RestSession, "/zimbra", uri.Host));

            #endregion



            #region Do HTTP request

            // Create the HTTP request
            httpWebRequest = WebRequest.Create(uri) as HttpWebRequest;
            if (httpWebRequest == null)
                throw new HarnessException("Unable to create HttpWebRequest");

            // Initialize the HTTP request settings
            httpWebRequest.Method = RestMethod;
            httpWebRequest.KeepAlive = true;
            httpWebRequest.UserAgent = RestUserAgent;
            httpWebRequest.ContentType = RestContentType;
            if (RestUsername != null)
            {
                // There seems to be a bug with C# URI
                // When you use http://username:password@server.com:port/path
                // A 'unable to parse port' exception is thrown
                // As per http://connect.microsoft.com/VisualStudio/feedback/details/322754/uri-constructor-from-string-which-contain-in-password-part
                // Use NetworkCredentials instead
                //
                httpWebRequest.Credentials = new NetworkCredential(RestUsername, RestPassword);
            }

            // Set cookies, if any
            if (cookieCollection.Count > 0)
            {
                httpWebRequest.CookieContainer = new CookieContainer();
                httpWebRequest.CookieContainer.Add(cookieCollection);
            }

            // Get the file bytes
            StreamReader fileStreamReader = new StreamReader(fileInfo.FullName);
            byte[] bytes = Encoding.ASCII.GetBytes(fileStreamReader.ReadToEnd());
            fileStreamReader.Close();
            fileStreamReader = null;
            httpWebRequest.ContentLength = bytes.Length;

            Stream streamRequest = null;
            try
            {
                streamRequest = httpWebRequest.GetRequestStream();
                streamRequest.Write(bytes, 0, bytes.Length);
            }
            finally
            {
                if (streamRequest != null)
                {
                    streamRequest.Close();
                    streamRequest = null;
                }
            }

            stringRequest = System.Text.Encoding.ASCII.GetString(bytes);



            httpWebResponse = httpWebRequest.GetResponse() as HttpWebResponse;


            Stream streamResponse = httpWebResponse.GetResponseStream();
            StreamReader streamReader = new StreamReader(streamResponse);
            stringResponse = streamReader.ReadToEnd();
            streamReader.Close();
            streamReader = null;

            #endregion



            // Done!
            return (true);
        }

        protected Uri getUri()
        {
            #region Create the URI

            RestUriBuilder.Path = String.Format(@"/service/home/{0}/{1}", UrlUsername, UrlFoldername);

            StringBuilder query = null;
            foreach (string key in UrlQueryTable.Keys)
            {
                if (query == null)
                {
                    query = new StringBuilder();
                    query.Append(key).Append('=').Append(UrlQueryTable[key]);
                }
                else
                {
                    query.Append('&').Append(key).Append('=').Append(UrlQueryTable[key]);
                }
            }
            if (query != null)
            {
                RestUriBuilder.Query = query.ToString();
            }

            if (UrlFragment != null)
            {
                RestUriBuilder.Fragment = UrlFragment;
            }

            #endregion

            return (RestUriBuilder.Uri);
        }

        protected void printLogging(Uri uri)
        {
            if (uri == null)
                return;

            ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

            #region Logging

            #region Log the Request

            // Logging
            tcLog.Info("");
            tcLog.Info("");
            tcLog.InfoFormat("{0:0000} - {1} - {2}", ++counter, DateTime.Now.ToString("r"), uri.ToString());
            tcLog.Info("==== HTTP: Request " + RestMethod);
            tcLog.Info("....");
            if (httpWebRequest != null)
            {
                foreach (string key in httpWebRequest.Headers)
                {
                    string[] values = httpWebRequest.Headers.GetValues(key);
                    StringBuilder stringBuilder = null;
                    if (values.Length > 0)
                    {
                        foreach (string value in values)
                        {
                            if (stringBuilder == null)
                                stringBuilder = new StringBuilder(value);
                            else
                                stringBuilder.Append(", " + value);
                        }
                    }
                    tcLog.Info(key + ": " + (stringBuilder == null ? "no values" : stringBuilder.ToString()));
                }
            }
            tcLog.Info("....");
            if (stringRequest != null)
            {
                tcLog.Info(stringRequest);
            }
            tcLog.Info("....");

            #endregion

            // 798314-798313
            #region Log the Response

            if (httpWebResponse != null)
            {
                tcLog.InfoFormat("==== HTTP: Response {0} {1}", httpWebResponse.StatusCode, httpWebResponse.StatusDescription);

                tcLog.Info("....");
                foreach (string key in httpWebResponse.Headers.AllKeys)
                {
                    string[] values = httpWebResponse.Headers.GetValues(key);
                    StringBuilder stringBuilder = null;
                    if (values.Length > 0)
                    {
                        foreach (string value in values)
                        {
                            if (stringBuilder == null)
                                stringBuilder = new StringBuilder(value);
                            else
                                stringBuilder.Append(", " + value);
                        }
                    }
                    tcLog.Info(key + ": " + (stringBuilder == null ? "no values" : stringBuilder.ToString()));
                }
            }

            tcLog.Info("....");
            if (stringResponse != null)
            {
                tcLog.Info(stringResponse);
            }
            tcLog.Info("....");

            tcLog.Info("====");
            tcLog.Info("");
            tcLog.Info("");

            #endregion

            #endregion
        }

        #endregion



    }
}
