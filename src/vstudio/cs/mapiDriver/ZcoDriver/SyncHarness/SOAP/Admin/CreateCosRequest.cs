using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Messaging;
using Microsoft.Web.Services3.Addressing;
using Soap;

namespace SoapAdmin
{
    public class CreateCosRequest : RequestBody
    {
        public CreateCosRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateCosRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public CreateCosRequest(string requestString)
            : base(requestString)
        {
        }

        public CreateCosRequest CosName(string n)
        {
            XmlElement xmlElement = this.CreateElement("name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }
    }
}
