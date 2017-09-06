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
    public class CreateDistributionListRequest : RequestBody 
    {
        public CreateDistributionListRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateDistributionListRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public CreateDistributionListRequest(string requestString)
            : base(requestString)
        {
        }

        public CreateDistributionListRequest ListName(string n)
        {
            XmlElement xmlElement = this.CreateElement("name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", "zimbraMailStatus");
            xmlElement.InnerText = "enabled";
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }
    }
}
