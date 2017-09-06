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
    public class GetConfigRequest: RequestBody
    {
        public GetConfigRequest()
            : base ()
        {
            XmlElement xmlElement = this.CreateElement("GetConfigRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public GetConfigRequest(string requestString)
            : base(requestString)
        {
        }

        public GetConfigRequest GetAttributeValue(ConfigAttributes attributeName)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", attributeName.ToString());

            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }
    }
}
