/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite, Network Edition.
 * Copyright (C) 2007 Zimbra, Inc.  All Rights Reserved.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.qa.trust;

import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;
import java.security.cert.X509Certificate;

import javax.net.SocketFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * Allows Java code to make SSL connections without certificates.  This
 * class is insecure and should only be used for testing.  See SSLNOTES.txt
 * in the JavaMail distribution for more details.
 *  
 * @author bburtin
 */
public class DummySSLSocketFactory extends SSLSocketFactory {
    private SSLSocketFactory factory;
    
    public DummySSLSocketFactory() {
        try {
            SSLContext sslcontext = SSLContext.getInstance("TLS");
            sslcontext.init(null,
                            new TrustManager[] { new DummyTrustManager()},
                            null);
            factory = sslcontext.getSocketFactory();
        } catch(Exception ex) {
    		System.out.println("Unable to initialize SSL:\n" + ex.getMessage());
        }
    }
    
    public static SocketFactory getDefault() {
        return new DummySSLSocketFactory();
    }
    
    public Socket createSocket(Socket socket, String s, int i, boolean flag) throws IOException {
        return factory.createSocket(socket, s, i, flag);
    }
    
    public Socket createSocket(InetAddress inaddr, int i,
                               InetAddress inaddr1, int j) throws IOException {
        return factory.createSocket(inaddr, i, inaddr1, j);
    }
    
    public Socket createSocket(InetAddress inaddr, int i) throws IOException {
        return factory.createSocket(inaddr, i);
    }
    
    public Socket createSocket() throws IOException {
        return factory.createSocket();
    }

    public Socket createSocket(String s, int i, InetAddress inaddr, int j) throws IOException {
        return factory.createSocket(s, i, inaddr, j);
    }

    public Socket createSocket(String s, int i) throws IOException {
        return factory.createSocket(s, i);
    }

    public String[] getDefaultCipherSuites() {
        return factory.getDefaultCipherSuites();
    }

    public String[] getSupportedCipherSuites() {
        return factory.getSupportedCipherSuites();
    }
    
    
    public class DummyTrustManager implements X509TrustManager {
        
        public void checkClientTrusted(X509Certificate[] cert, String authType) {
            // everything is trusted
        }
        
        public void checkServerTrusted(X509Certificate[] cert, String authType) {
            // everything is trusted
        }
        
        public X509Certificate[] getAcceptedIssuers() {
            return new X509Certificate[0];
        }
    }
}