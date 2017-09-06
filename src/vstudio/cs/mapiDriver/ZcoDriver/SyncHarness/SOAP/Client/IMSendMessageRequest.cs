using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class IMSendMessageRequest : RequestBody
    {
        public IMSendMessageRequest(string address, string body)
            : base()
        {

            XmlElement xmlElement = this.CreateElement("IMSendMessageRequest", "urn:zimbraIM");
            this.AppendChild(xmlElement);

            XmlElement xmlM = this.CreateElement("message");
            xmlM.SetAttribute("addr", address);
            XmlElement xmlBody = this.CreateElement("body");
            xmlBody.InnerText = body;

            xmlM.AppendChild(xmlBody);
            xmlElement.AppendChild(xmlM);

        }

        public IMSendMessageRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
