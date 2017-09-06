using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class IMAuthorizeSubscribeRequest : RequestBody
    {
        public IMAuthorizeSubscribeRequest(string address, string authorize)
            : base()
        {

            XmlElement xmlElement = this.CreateElement("IMAuthorizeSubscribeRequest", "urn:zimbraIM");
            xmlElement.SetAttribute("addr", address);
            xmlElement.SetAttribute("authorized", authorize);
            this.AppendChild(xmlElement);
        }

        public IMAuthorizeSubscribeRequest DisplayName(string name)
        {

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("IMAuthorizeSubscribeRequest")[0];
            xmlElement.SetAttribute("add", "true");
            xmlElement.SetAttribute("name", name);
            return (this);
        }

        public IMAuthorizeSubscribeRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
