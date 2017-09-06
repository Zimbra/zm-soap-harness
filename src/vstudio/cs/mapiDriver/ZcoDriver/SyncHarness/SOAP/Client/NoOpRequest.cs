using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class NoOpRequest : RequestBody
    {
        public NoOpRequest()
            : base()
        {

            XmlElement xmlElement = this.CreateElement("NoOpRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public NoOpRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
