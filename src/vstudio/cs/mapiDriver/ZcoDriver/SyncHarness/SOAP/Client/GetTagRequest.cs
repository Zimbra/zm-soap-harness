using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class GetTagRequest : RequestBody
    {
        public GetTagRequest()
            : base()
        {

            XmlElement xmlElement = this.CreateElement("GetTagRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public GetTagRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
