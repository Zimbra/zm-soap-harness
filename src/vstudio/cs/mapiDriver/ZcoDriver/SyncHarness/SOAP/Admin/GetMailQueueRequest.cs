using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Collections;
using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Messaging;
using Microsoft.Web.Services3.Addressing;
using Soap;

namespace SoapAdmin
{
    public class GetMailQueueRequest : RequestBody
    {

        //Summarize and/or search a particular mail queue on a particular
        //server.  The admin SOAP server initiates a MTA queue scan (via ssh)
        //and then caches the result of the queue scan.  To force a queue scan,
        //specify scan=1 in the request.

        //<GetMailQueueRequest>
        //  <server name="{mta-server}">
        //    <queue name="{queue-name}" [scan="{0,1}"] [wait={seconds}]>
        //      <query [offset={offset}] [limit={limit}]>
        //          <field name="{field1}">
        //              <match value="{value1}"/>     # OR's all values
        //              <match value="{value2}"/>
        //              <match value="{value3}"/>
        //          </field>
        //          <field name="{field2}">           # AND's all fields
        //              <match value="{value3}"/>
        //              <match value="{value5}"/>
        //          </field>
        //      </query>
        //    </queue>
        //  </server>
        //<GetMailQueueRequest>

        //<GetMailQueueResponse>
        //  <server name="{mta-server}">
        //    <queue name="{queue-name}" stale="{stale-flag}" time="{scan-time}" more="{more-flag}" scan="{scan-flag} total="{total}">
        //      <qs type="reason|to|from|todomain|fromdomain|addr|host">
        //        <qsi n="{count}" t="{text-for-item}">+
        //      </qs>+
        //      <qi id="{id}" from="{sender}" to="{recipients-comma-seperated}"
        //          time="{arrival-time}" filter="{content-filter}"
        //          addr="{origin-ip-address} host="{origin-host-name}"/>+
        //    </queue>
        //  </server>
        //</GetMailQueueResponse>


        public GetMailQueueRequest()
            : base ()
        {
            XmlElement xmlElement = this.CreateElement("GetMailQueueRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public GetMailQueueRequest(string requestString)
            : base(requestString)
        {
        }

        public GetMailQueueRequest AddServer(string servername, string queue)
        {
            XmlElement serverElement = this.CreateElement("server");
            serverElement.SetAttribute("name", servername);

            XmlElement queueElement = this.CreateElement("queue");
            queueElement.SetAttribute("name", queue);

            XmlElement queryElement = this.CreateElement("query");
            queryElement.SetAttribute("offset", "0");
            queryElement.SetAttribute("limit", "25");

            queueElement.AppendChild(queryElement);
            serverElement.AppendChild(queueElement);
            this.FirstChild.AppendChild(serverElement);

            return (this);
        }
    }
}
