/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.Xml;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Messaging;
using Microsoft.Web.Services3.Addressing;
using EASHarness.SOAP.Client;

namespace EASHarness.SOAP.Admin
{
    public class GetMailQueueInfoRequest : RequestBody
    {
        //Get a count of all the mail queues by counting the number of files in the queue directories. 
        //Note that the admin server waits for queue counting to complete before responding - 
        //client should invoke requests for different servers in parallel.

        //<GetMailQueueInfoRequest>
        //  <server name="{mta-server}"/>
        //</GetMailQueueInfoRequest>

        //<GetMailQueueInfoResponse/>
        //  <server name="{mta-server}">
        //    <queue name="deferred" n="{N}"/>
        //    <queue name="incoming" n="{N}"/>
        //    <queue name="active" n="{N}"/>
        //    <queue name="hold" n="{N}"/>
        //    <queue name="corrupt" n="{N}"/>
        //  </server>
        //</GetMailQueueInfoResponse>

        public GetMailQueueInfoRequest() : base()
        {
            XmlElement xmlElement = this.CreateElement("GetMailQueueInfoRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public GetMailQueueInfoRequest(string requestString) : base(requestString) {}

        public GetMailQueueInfoRequest AddServerName(string servername)
        {
            XmlElement xmlElement = this.CreateElement("server");
            xmlElement.SetAttribute("name", servername);

            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }
    }
}
