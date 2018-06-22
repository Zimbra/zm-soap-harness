/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * 
 * ***** END LICENSE BLOCK *****
 */

/*
 * SoapHttpTransport.java
 */

package com.zimbra.qa.soap;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.Future;

import org.apache.commons.httpclient.Cookie;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpConnectionManager;
import org.apache.commons.httpclient.HttpException;
import org.apache.commons.httpclient.HttpMethod;
import org.apache.commons.httpclient.HttpMethodRetryHandler;
import org.apache.commons.httpclient.HttpRecoverableException;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.MultiThreadedHttpConnectionManager;
import org.apache.commons.httpclient.UsernamePasswordCredentials;
import org.apache.commons.httpclient.auth.AuthPolicy;
import org.apache.commons.httpclient.auth.AuthScope;
import org.apache.commons.httpclient.methods.EntityEnclosingMethod;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.commons.httpclient.params.HttpClientParams;
import org.apache.commons.httpclient.params.HttpMethodParams;
import org.apache.http.HttpResponse;
import org.apache.http.concurrent.FutureCallback;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.SoapFaultException;
import com.zimbra.common.soap.SoapParseException;
import com.zimbra.common.soap.SoapProtocol;
import com.zimbra.common.soap.XmlParseException;
import com.zimbra.common.util.ByteUtil;

/**
 */

public class ProxySoapHttpTransport extends com.zimbra.common.soap.SoapTransport {

    private static final String X_ORIGINATING_IP = "X-Originating-IP";
    
    private boolean mKeepAlive;
    private int mRetryCount;
    private int mTimeout;
    private String mUri;
    private HttpClient mClient;
    private String mAuthToken = null;
    private String jwtSalt = null;
    
    public String getAuthTokenS() {
        return (mAuthToken);
    }
    
    public String setAuthTokenS(String token) {
        return (mAuthToken = token);
    }
    
    public String getJwtSalt() {
        return jwtSalt;
    }

    
    public void setJwtSalt(String jwtSalt) {
        this.jwtSalt = jwtSalt;
    }

    public String toString() { 
        return "ProxySoapHttpTransport(uri="+mUri+")";
    }

    private static final HttpClientParams sDefaultParams = new HttpClientParams();
        static {
            // we're doing the retry logic at the SoapHttpTransport level, so don't do it at the HttpClient level as well
            sDefaultParams.setParameter(HttpMethodParams.RETRY_HANDLER, new HttpMethodRetryHandler() {
                public boolean retryMethod(HttpMethod method, IOException exception, int executionCount)  { return false; }
            });
        }

    /**
     * Create a new SoapHttpTransport object for the specified URI.
     * Supported schemes are http and https. The connection
     * is not made until invoke or connect is called.
     *
     * Multiple threads using this transport must do their own
     * synchronization.
     */
    public ProxySoapHttpTransport(String uri) {
        this(uri, null, 0);
    }
    
    /**
     * Create a new SoapHttpTransport object for the specified URI, with specific proxy information.
     * 
     * @param uri the origin server URL
     * @param proxyHost hostname of proxy
     * @param proxyPort port of proxy
     */
    public ProxySoapHttpTransport(String uri, String proxyHost, int proxyPort) {
        this(uri, proxyHost, proxyPort, null, null);
    }
    
    /**
     * Create a new SoapHttpTransport object for the specified URI, with specific proxy information including
     * proxy auth credentials.
     * 
     * @param uri the origin server URL
     * @param proxyHost hostname of proxy
     * @param proxyPort port of proxy
     * @param proxyUser username for proxy auth
     * @param proxyPass password for proxy auth
     */
    public ProxySoapHttpTransport(String uri, String proxyHost, int proxyPort, String proxyUser, String proxyPass) {
        super();
        mClient = new HttpClient(sDefaultParams);
        commonInit(uri);

        if (proxyHost != null && proxyHost.length() > 0 && proxyPort > 0) {
            mClient.getHostConfiguration().setProxy(proxyHost, proxyPort);
            if (proxyUser != null && proxyUser.length() > 0 && proxyPass != null && proxyPass.length() > 0) {
                mClient.getState().setProxyCredentials(new AuthScope(proxyHost, proxyPort), new UsernamePasswordCredentials(proxyUser, proxyPass));
            }
        }
    }

    public ProxySoapHttpTransport(String uri, String proxyUser, String proxyPass) {
        super();
        mClient = new HttpClient(sDefaultParams);
        commonInit(uri);
        mClient.getState().setCredentials(
            new AuthScope(AuthScope.ANY_HOST, AuthScope.ANY_PORT,
                AuthScope.ANY_REALM, AuthPolicy.BASIC),
        new UsernamePasswordCredentials(proxyUser, proxyPass));
    }


    /**
     * Creates a new SoapHttpTransport that supports multiple connections
     * to the specified URI.  Multiple threads can call the invoke()
     * method safely without synchronization.
     *
     * @param uri
     * @param maxConnections Note RFC2616 recommends the default of 2.
     */
    public ProxySoapHttpTransport(String uri, int maxConnections, boolean connectionStaleCheckEnabled) {
        super();
        MultiThreadedHttpConnectionManager connMgr = new MultiThreadedHttpConnectionManager();
        connMgr.setMaxConnectionsPerHost(maxConnections);
        connMgr.setConnectionStaleCheckingEnabled(connectionStaleCheckEnabled);
        mClient = new HttpClient(sDefaultParams, connMgr);
        commonInit(uri);
    }

    /**
     * Frees any resources such as connection pool held by this transport.
     */
    public void shutdown() {
        HttpConnectionManager connMgr = mClient.getHttpConnectionManager();
        if (connMgr instanceof MultiThreadedHttpConnectionManager) {
            MultiThreadedHttpConnectionManager multiConnMgr = (MultiThreadedHttpConnectionManager) connMgr;
            multiConnMgr.shutdown();
        }
        mClient = null;
    }

    private void commonInit(String uri) {
        mUri = uri;
        mKeepAlive = false;
        mRetryCount = 3;
        setTimeout(0);
    }

    /**
     *  Gets the URI
     */
    public String getURI() {
        return mUri;
    }
    
    /**
     * The number of times the invoke method retries when it catches a 
     * RetryableIOException.
     *
     * <p> Default value is <code>3</code>.
     */
    public void setRetryCount(int retryCount) {
        this.mRetryCount = retryCount;
    }


    /**
     * Get the mRetryCount value.
     */
    public int getRetryCount() {
        return mRetryCount;
    }

    /**
     * Whether or not to keep the connection alive in between
     * invoke calls.
     *
     * <p> Default value is <code>false</code>.
     */
    private void setKeepAlive(boolean keepAlive) {
        this.mKeepAlive = keepAlive;
    }

    /**
     * Get the mKeepAlive value.
     */
    private boolean getKeepAlive() {
        return mKeepAlive;
    }

    /**
     * The number of miliseconds to wait when connecting or reading
     * during a invoke call. 
     * <p>
     * Default value is <code>0</code>, which means no mTimeout.
     */
    public void setTimeout(int timeout) {
        mTimeout = timeout;
        mClient.setConnectionTimeout(mTimeout);
        mClient.setTimeout(mTimeout);
    }

    /**
     * Get the mTimeout value.
     */
    public int getTimeout() {
        return mTimeout;
    }

    public Element invoke(Element document, boolean raw, boolean noSession, String requestedAccountId, String changeToken, String tokenType) 
    throws SoapFaultException, IOException, HttpException {
        int statusCode = -1;

        PostMethod method = null;
        try {
            // the content-type charset will determine encoding used
            // when we set the request body
            method = new PostMethod(mUri);
            method.setRequestHeader("Content-Type", getRequestProtocol().getContentType());
            if (getClientIp() != null)
            method.setRequestHeader(X_ORIGINATING_IP, getClientIp());

            Element soapReq = generateSoapMessage(document, raw, noSession, requestedAccountId, changeToken, tokenType);
            String soapMessage = SoapProtocol.toString(soapReq, getPrettyPrint());
            method.setRequestBody(soapMessage);
            method.setRequestContentLength(EntityEnclosingMethod.CONTENT_LENGTH_AUTO);
        
            if (getRequestProtocol().hasSOAPActionHeader())
                method.setRequestHeader("SOAPAction", mUri);

            if ( mAuthToken != null && jwtSalt == null)
            {
                HttpState initialState = new HttpState();
                String mUriHost = "";
                try {
                    mUriHost = (new URI(mUri)).getHost();
                    Cookie authCookie = new Cookie(mUriHost, "ZM_AUTH_TOKEN", mAuthToken, "/", null, false);
                    initialState.addCookie(authCookie);
                    mClient.setState(initialState);
                } catch (URISyntaxException e) {
                    // TODO: how to handle this?
                }

            } else if (jwtSalt != null) {
                HttpState initialState = new HttpState();
                String mUriHost = "";
                try {
                    mUriHost = (new URI(mUri)).getHost();
                    Cookie authCookie = new Cookie(mUriHost, "ZM_JWT", jwtSalt, "/", null, false);
                    initialState.addCookie(authCookie);
                    mClient.setState(initialState);
                } catch (URISyntaxException e) {
                    // TODO: how to handle this?
                }
            }
            
            for (int attempt = 0; statusCode == -1 && attempt < mRetryCount; attempt++) {
                try {
                    // execute the method.
                    statusCode = mClient.executeMethod(method);
                } catch (HttpRecoverableException e) {
                    if (attempt == mRetryCount - 1)
                        throw e;
                    System.err.println("A recoverable exception occurred, retrying." + e.getMessage());
                }
            }

            // Read the response body.  Use the stream API instead of the byte[] one
            // to avoid HTTPClient whining about a large response.
            byte[] responseBody = ByteUtil.getContent(method.getResponseBodyAsStream(), (int) method.getResponseContentLength());

            // Deal with the response.
            // Use caution: ensure correct character encoding and is not binary data
            String responseStr = SoapProtocol.toString(responseBody);

            if ( method.getResponseHeader("Set-Cookie") != null) {
                String value = method.getResponseHeader("Set-Cookie").getValue();
                String [] temp = value.split(";");
                if (temp != null && temp.length > 0) {
                    String [] jwtSaltCookie = temp[0].split("=");
                    if (jwtSaltCookie[0].equals("ZM_JWT"))  {
                        jwtSalt = temp[0].split("=")[1];
                        TestProperties.testProperties.setProperty("jwtSalt", jwtSalt);
                    }
                }
            }

            try {
                return parseSoapResponse(responseStr, raw);
            } catch (SoapFaultException x) {
                //attach request/response to the exception and rethrow for downstream consumption
                x.setFaultRequest(soapMessage);
                x.setFaultResponse(responseStr);
                throw x;
            }
        } finally {
            // Release the connection.
            if (method != null)
                method.releaseConnection();        
        }
    }

    @Override
    protected Element parseSoapResponse(String envelopeStr, boolean raw) throws SoapParseException, SoapFaultException {
        Element env;
        try {
            if (envelopeStr.trim().startsWith("<"))
                env = Element.parseXML(envelopeStr);
            else
                env = Element.parseJSON(envelopeStr);
        } catch (XmlParseException e) {
            throw new SoapParseException("unable to parse response", envelopeStr);
        }
        
        //if (mDebugListener != null) mDebugListener.receiveSoapMessage(env);

        return raw ? env : extractBodyElement(env);
    }

    @Override
    public Future<HttpResponse> invokeAsync(Element arg0, boolean arg1,
			boolean arg2, String arg3, String arg4, String arg5,
			NotificationFormat arg6, String arg7,
			FutureCallback<HttpResponse> arg8) throws IOException {
		// TODO Auto-generated method stub
		return null;
    }

    @Override
    public Element invoke(Element arg0, boolean arg1, boolean arg2,
			String arg3, String arg4, String arg5, NotificationFormat arg6,
			String arg7) throws IOException, HttpException, ServiceException {
		// TODO Auto-generated method stub
		return null;
    }


}


/*
 * TODOs:
 * retry?
 * validation
 */
