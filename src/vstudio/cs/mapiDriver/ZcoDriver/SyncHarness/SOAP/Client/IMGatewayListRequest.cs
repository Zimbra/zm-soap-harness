using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class IMGatewayListRequest : RequestBody
    {
        public IMGatewayListRequest()
            : base()
        {

            XmlElement xmlElement = this.CreateElement("IMGatewayListRequest", "urn:zimbraIM");
            this.AppendChild(xmlElement);
        }

        public IMGatewayListRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
