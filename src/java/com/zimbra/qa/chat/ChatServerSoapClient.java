package com.zimbra.qa.chat;

import com.zimbra.common.soap.Element;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.methods.InputStreamRequestEntity;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.commons.httpclient.HttpStatus;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

public class ChatServerSoapClient {

    private static String globalproperties = "conf/global.properties";
    private final String endpoint;
    private final String jwtSecret;
    private final String domainId;
    private final boolean jwtRequired;

    public ChatServerSoapClient(String endpoint, String jwtSecret, String domainId, boolean jwtRequired) {
        this.endpoint = endpoint;
        this.jwtSecret = jwtSecret;
        this.domainId = domainId;
        this.jwtRequired = jwtRequired;
    }

    public Element invoke() throws Exception {
        String xmlRequest = buildSoapRequestXml();
        Properties gProperties= new Properties();
        gProperties.load(new FileInputStream(new File(globalproperties)));
        String soapUri=gProperties.getProperty("chat.url");
        HttpClient client = new HttpClient();
        PostMethod post = new PostMethod(soapUri);
        post.setRequestHeader("Content-Type", "text/xml");

        InputStream requestStream = new ByteArrayInputStream(xmlRequest.getBytes(StandardCharsets.UTF_8));
        post.setRequestEntity(new InputStreamRequestEntity(requestStream));

        int statusCode = client.executeMethod(post);
        if (statusCode != HttpStatus.SC_OK) {
            throw new RuntimeException("HTTP Error: " + statusCode);
        }

        String responseBody = post.getResponseBodyAsString();
        String modifiedResponse = responseBody.replaceFirst(
                "<ChatResponse>",
                "<ChatResponse xmlns=\"urn:zimbraAdmin\">"
        );
        return Element.parseXML(modifiedResponse);
    }

    private String buildSoapRequestXml() {
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\"?>")
                .append("<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\">")
                .append("<soapenv:Body>")
                .append("<ChatRequest>")
                .append("<endpoint>").append(endpoint).append("</endpoint>")
                .append("<method>POST</method>");

        if (jwtRequired) {
            xml.append("<params>")
                    .append("<jwt_secret>").append(jwtSecret).append("</jwt_secret>")
                    .append("<domain_id>").append(domainId).append("</domain_id>")
                    .append("</params>");
        }

        xml.append("</ChatRequest>")
                .append("</soapenv:Body>")
                .append("</soapenv:Envelope>");

        return xml.toString();
    }
}
