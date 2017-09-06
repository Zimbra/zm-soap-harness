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
    public class MailQueueFlushRequest : RequestBody
    {


        //Command to invoke postqueue -f.  All queues cached in the server are
        //are stale after invoking this because this is a global operation to
        //all the queues in a given server.

        //<MailQueueFlushRequest>
        //  <server name="{mta-server}">
        //</MailQueueFlushRequest>

        //<MailQueueFlushResponse/>


        public MailQueueFlushRequest()
            : base ()
        {
            XmlElement xmlElement = this.CreateElement("MailQueueFlushRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public MailQueueFlushRequest(string requestString)
            : base(requestString)
        {
        }

        public MailQueueFlushRequest AddServer(string servername)
        {
            XmlElement serverElement = this.CreateElement("server");
            serverElement.SetAttribute("name", servername);

            this.FirstChild.AppendChild(serverElement);

            return (this);
        }
    }
}
