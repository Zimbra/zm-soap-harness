/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2019 Synacor, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software Foundation,
 * version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 *
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.qa.soap;

import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;
import java.net.UnknownHostException;

import javax.net.SocketFactory;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.apache.commons.httpclient.ConnectTimeoutException;
import org.apache.commons.httpclient.params.HttpConnectionParams;
import org.apache.commons.httpclient.protocol.ProtocolSocketFactory;

/**
 * @author zimbra
 *
 */
public class MySSLSocketFactory implements ProtocolSocketFactory {

    private TrustManager[] getTrustManager() {
        TrustManager[] trustAllCerts = new TrustManager[] {
            new X509TrustManager() {
                @Override
                public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                    return null;
                }

                @Override
                public void checkClientTrusted(
                    java.security.cert.X509Certificate[] certs, String authType) {
                }

                @Override
                public void checkServerTrusted(
                    java.security.cert.X509Certificate[] certs, String authType) {
                }
            }
        };
        return trustAllCerts;
    }

    @Override
    public Socket createSocket(String host, int port) throws IOException,
        UnknownHostException {
        TrustManager[] trustAllCerts = getTrustManager();
        try {
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection
                .setDefaultSSLSocketFactory(sc.getSocketFactory());
            SocketFactory socketFactory = HttpsURLConnection
                .getDefaultSSLSocketFactory();
            return socketFactory.createSocket(host, port);
        } catch (Exception ex) {
            throw new UnknownHostException("Problems to connect " + host + ex.toString());
        }
    }

    public Socket createSocket(Socket socket, String host, int port,
        boolean flag) throws IOException, UnknownHostException {
        TrustManager[] trustAllCerts = getTrustManager();
        try {
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection
                .setDefaultSSLSocketFactory(sc.getSocketFactory());
            SocketFactory socketFactory = HttpsURLConnection
                .getDefaultSSLSocketFactory();
            return socketFactory.createSocket(host, port);
        }
        catch (Exception ex) {
            throw new UnknownHostException("Problems to connect " + host
                + ex.toString());
        }
    }

    @Override
    public Socket createSocket(String host, int port, InetAddress clientHost,
        int clientPort) throws IOException, UnknownHostException {
        TrustManager[] trustAllCerts = getTrustManager();
        try {
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection
                .setDefaultSSLSocketFactory(sc.getSocketFactory());
            SocketFactory socketFactory = HttpsURLConnection
                .getDefaultSSLSocketFactory();
            return socketFactory.createSocket(host, port, clientHost,
                clientPort);
        }
        catch (Exception ex) {
            throw new UnknownHostException("Problems to connect " + host
                + ex.toString());
        }
    }

    @Override

    public Socket createSocket(String host, int port, InetAddress localAddress,
        int localPort, HttpConnectionParams arg4) throws IOException,
        UnknownHostException, ConnectTimeoutException {
        TrustManager[] trustAllCerts = getTrustManager();
        try {
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection
                .setDefaultSSLSocketFactory(sc.getSocketFactory());
            SocketFactory socketFactory = HttpsURLConnection
                .getDefaultSSLSocketFactory();
            return socketFactory.createSocket(host, port);
        } catch (Exception ex) {
            throw new UnknownHostException("Problems to connect " + host
                + ex.toString());
        }
    }
}
