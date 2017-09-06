using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class IMGetRosterRequest : RequestBody
    {
        public IMGetRosterRequest()
            : base()
        {

            XmlElement xmlElement = this.CreateElement("IMGetRosterRequest", "urn:zimbraIM");
            this.AppendChild(xmlElement);
        }

        public IMGetRosterRequest(string envelope)
            : base(envelope)
        {
        }
    }
}
