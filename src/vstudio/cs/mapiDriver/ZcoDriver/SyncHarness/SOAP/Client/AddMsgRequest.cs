using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{

    public class AddMsgRequest : RequestBody
    {

        public AddMsgRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("AddMsgRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public AddMsgRequest(string envelope)
            : base(envelope)
        {
        }

        public AddMsgRequest AddMessage(MessageObject message)
        {
            this.FirstChild.AppendChild(this.ImportNode(message.DocumentElement, true));
            return (this);
        }

    }
}

