using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class IMSubscribeRequest : RequestBody
    {
        public IMSubscribeRequest(string address, string name, string operation)
            : base()
        {

            XmlElement xmlElement = this.CreateElement("IMSubscribeRequest", "urn:zimbraIM");
            xmlElement.SetAttribute("addr", address);
            xmlElement.SetAttribute("name", name);
            xmlElement.SetAttribute("op", operation);
            this.AppendChild(xmlElement);
        }

       public IMSubscribeRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
