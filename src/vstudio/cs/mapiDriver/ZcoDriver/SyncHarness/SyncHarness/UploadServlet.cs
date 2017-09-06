using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using System.Net;
using System.IO;

namespace SyncHarness
{


    public class UploadServlet
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        private static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        zAccount account = null;

        public UploadServlet(zAccount a)
        {
            account = a;
        }

        public bool DoUploadFile(string server, string filename, out string uploadId)
        {
            log.DebugFormat("DoUploadFile ... {0} {1}", server, filename);

            #region Check File Existence

            FileInfo fileInfo = new FileInfo(filename);
            if (!fileInfo.Exists)
            {
                throw new HarnessException("DoUploadFile: Unable to find file " + filename);
            }
            log.Debug("Uploading " + fileInfo.FullName);

            #endregion


            try
            {
                HttpPostClient httpClient = new HttpPostClient(server);
                if (account.authToken != null)
                    httpClient.AuthToken = account.authToken;
                if (account.sessionId != null)
                    httpClient.SessionId = account.sessionId;

                if (!httpClient.doPost(fileInfo.FullName))
                {
                    uploadId = null;
                    return (false);
                }

                uploadId = httpClient.ResponseUploadId;
            }
            catch (Exception e)
            {
                log.Error("HttpPostClient threw exception", e);
                throw;
            }

            log.DebugFormat("DoUploadFile ... {0} ... done", uploadId);

            return (true);
        }



        private class HttpPostClient
        {
            private const string zNUnitUserAgent = "Zimbra NUnit Client";
            private const string _Method = "POST";

            private string _Boundary = null;
            private Uri _Uri = null;
            private CookieCollection _CookieCollection = null;
            private int _ResponseCode = -1;
            private string _ResponseUploadId = null;

            public HttpPostClient(string server)
            {
                _Uri = GetRestURL(server);
                _Boundary = "nunitharness" + GlobalProperties.time() + GlobalProperties.counter();

            }

            public bool doPost(string file)
            {

                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(_Uri);
                request.Method = _Method;
                request.KeepAlive = true;
                request.UserAgent = zNUnitUserAgent;
                request.ContentType = "multipart/form-data; boundary=" + _Boundary;

                if ((_CookieCollection != null) && (_CookieCollection.Count > 0))
                {
                    try
                    {
                        request.CookieContainer = new CookieContainer();
                        request.CookieContainer.Add(_CookieCollection);
                    }
                    catch (Exception e)
                    {
                        log.Error("cookie threw exception", e);
                        throw;
                    }
                }


                #region http://developer.nirvanix.com/forums/p/56/131.aspx


                // Build the content
                //
                // -- _Boundary
                // Content-Disposition: form-data; name="file";filename="example.JPG"
                // Content-Type: application/octet-stream
                //
                // <<DATA>>
                // -- _Boundary--
                //
                byte[] boundarybytes = System.Text.Encoding.ASCII.GetBytes("\r\n--" + _Boundary + "\r\n");
                byte[] headerbytes = System.Text.Encoding.UTF8.GetBytes("Content-Disposition: form-data; name=\"file\";filename=\"" + file + "\"\r\nContent-Type: application/octet-stream\r\n\r\n");
                byte[] endboundarybytes = System.Text.Encoding.ASCII.GetBytes("\r\n--" + _Boundary + "--\r\n");
                request.ContentLength = boundarybytes.Length + headerbytes.Length + (new FileInfo(file).Length) + endboundarybytes.Length;


                Stream requestStream = request.GetRequestStream();
                requestStream.Write(boundarybytes, 0, boundarybytes.Length);
                requestStream.Write(headerbytes, 0, headerbytes.Length);

                FileStream fileStream = new FileStream(file, FileMode.Open, FileAccess.Read);
                byte[] buffer = new byte[4096];
                int bytesRead = 0;
                // Loop through whole file uploading parts in a stream.
                while ((bytesRead = fileStream.Read(buffer, 0, buffer.Length)) != 0)
                {
                    requestStream.Write(buffer, 0, bytesRead);
                    requestStream.Flush();
                    log.Debug("Content: " + System.Text.Encoding.ASCII.GetString(buffer, 0, bytesRead));
                }

                // Write out the trailing boundry
                requestStream.Write(endboundarybytes, 0, endboundarybytes.Length);

                requestStream.Close();
                fileStream.Close();


                #endregion


                HttpWebResponse response = null;
                try
                {
                    response = (HttpWebResponse)request.GetResponse();
                }
                catch (WebException e)
                {
                    log.Error("HttpPost threw WebException", e);
                    HttpWebResponse exceptionResponse = e.Response as HttpWebResponse;
                    if (exceptionResponse != null)
                    {
                        log.Error("Error: " + exceptionResponse.StatusDescription);
                        StreamReader sr = new StreamReader(exceptionResponse.GetResponseStream());
                        log.Error("Exception: " + sr.ReadToEnd());
                    }
                    throw;
                }

                Stream streamResponse = response.GetResponseStream();
                StreamReader streamReader = new StreamReader(streamResponse);
                string stringResponse = streamReader.ReadToEnd();
                string[] responseElements = stringResponse.Split(',');
                if (responseElements[0] != "200")
                {
                    _ResponseCode = Int32.Parse(responseElements[0]);

                }
                else
                {
                    _ResponseCode = Int32.Parse(responseElements[0]);
                    // Strip '6bd49374-aa07-47ef-a631-1617eebe9ff3:c46c722f-4797-4739-a4cd-717b51175e04'\n
                    _ResponseUploadId = responseElements[2].Trim().Replace("\'", "");
                }

                #region Log the Request

                // Logging
                tcLog.Info("");
                tcLog.Info("");
                tcLog.Info(_Uri.ToString());
                tcLog.Info("==== HTTP: Request " + _Method);
                foreach (string key in request.Headers)
                {
                    string[] values = request.Headers.GetValues(key);
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
                tcLog.Info(System.Text.Encoding.ASCII.GetString(boundarybytes) +
                            System.Text.Encoding.ASCII.GetString(headerbytes) +
                            "<<content of " + file + ">>" +
                            System.Text.Encoding.ASCII.GetString(endboundarybytes));

                #endregion


                #region Log the Response

                tcLog.InfoFormat("==== HTTP: Response {0} {1}", response.StatusCode, response.StatusDescription);

                foreach (string key in response.Headers.AllKeys)
                {
                    string[] values = response.Headers.GetValues(key);
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

                tcLog.Info(stringResponse);
                tcLog.Info("====");
                tcLog.Info("");
                tcLog.Info("");

                #endregion

                streamReader.Close();
                streamResponse.Close();
                response.Close();


                return (_ResponseCode == 200);

            }

            public string AuthToken
            {
                set
                {
                    if (_CookieCollection == null)
                    {
                        _CookieCollection = new CookieCollection();
                    }
                    _CookieCollection.Add(new Cookie("ZM_AUTH_TOKEN", value, "/", _Uri.Host));

                }
            }

            public string SessionId
            {
                set
                {
                    if (_CookieCollection == null)
                    {
                        _CookieCollection = new CookieCollection();
                    }
                    _CookieCollection.Add(new Cookie("JSESSIONID", value, "/zimbra", _Uri.Host));

                }
            }

            public int ResponseCode
            {
                get
                {
                    if (_ResponseCode == -1)
                        throw new HarnessException("_ResponseCode not yet set");
                    return (_ResponseCode);
                }
            }

            public string ResponseUploadId
            {
                get
                {
                    if (_ResponseUploadId == null)
                        throw new HarnessException("_ResponseUploadId not yet set");
                    return (_ResponseUploadId);
                }
            }

            private Uri GetRestURL(string server)
            {
                string mode = GlobalProperties.getProperty("soapservice.mode");
                string port = GlobalProperties.getProperty("soapservice.port");
                string path = "service/upload?fmt=raw";

                return (new Uri(mode + "://" + server + ":" + port + "/" + path));
            }

        }

    }




}
