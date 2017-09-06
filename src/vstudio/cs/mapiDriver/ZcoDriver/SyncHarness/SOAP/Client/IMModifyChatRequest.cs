using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class IMModifyChatRequest : RequestBody
    {
        public IMModifyChatRequest(string threadId, string operation)
            : base()
        {

            XmlElement xmlElement = this.CreateElement("IMModifyChatRequest", "urn:zimbraIM");
            xmlElement.SetAttribute("thread", threadId);
            xmlElement.SetAttribute("op", operation);
            this.AppendChild(xmlElement);
        }

        public IMModifyChatRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
