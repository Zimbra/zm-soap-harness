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
    public class MailQueueActionRequest : RequestBody
    {
        //Command to act on invidual queue files. This proxies through to postsuper.  list-of-ids can be ALL.

        //<MailQueueActionRequest>
        //  <server name="{mta-server}">
        //     <queue name="{queue-name}">
        //       <action op="delete|hold|release|requeue"/ by="id|query">
        //               {list-of-ids|}
        //          ||
        //               {<query> # just like GetMailQueue
        //                  <field name="name">
        //                    <match value="val"/>
        //                  </field>
        //                </query>}
        //       </action>
        //     </queue>
        //  </server>
        //</MailQueueActionRequest>

        //<MailQueueActionResponse>
        //  - response is same as GetMailQueueResponse above.
        //</MailQueueActionResponse>

        public enum Operations
        {
            delete,
            hold,
            release,
            requeue
        };

        public MailQueueActionRequest() : base()
        {
            XmlElement xmlElement = this.CreateElement("MailQueueActionRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public MailQueueActionRequest(string requestString) : base(requestString) {}

        public MailQueueActionRequest AddServer(string servername, string queue, Operations operation, string ids)
        {
            XmlElement serverElement = this.CreateElement("server");
            serverElement.SetAttribute("name", servername);

            XmlElement queueElement = this.CreateElement("queue");
            queueElement.SetAttribute("name", queue);

            XmlElement actionElement = this.CreateElement("action");
            actionElement.SetAttribute("op", operation.ToString());
            actionElement.SetAttribute("by", "id");
            actionElement.InnerText = ids;

            queueElement.AppendChild(actionElement);
            serverElement.AppendChild(queueElement);
            this.FirstChild.AppendChild(serverElement);

            return (this);
        }
    }
}