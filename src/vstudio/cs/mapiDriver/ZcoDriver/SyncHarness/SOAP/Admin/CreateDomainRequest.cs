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
    public class CreateDomainRequest : RequestBody
    {
        public CreateDomainRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateDomainRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public CreateDomainRequest(string requestString)
            : base(requestString)
        {
        }

        public CreateDomainRequest DomainName(string n)
        {
            XmlElement xmlElement = this.CreateElement("name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public CreateDomainRequest AddDomainAlias(string domainName, string domainAlias)
        {
            XmlElement nameElement = this.CreateElement("name");
            nameElement.InnerText = domainAlias;
            this.FirstChild.AppendChild(nameElement);

            AddDomainAtribute("zimbraDomainType", "alias");
            AddDomainAtribute("zimbraMailCatchAllAddress", "@" + domainName);
            AddDomainAtribute("zimbraMailCatchAllForwardingAddress", "@" + domainName);                        

            return (this);
        }

        public CreateDomainRequest AddDomainAtribute(string attribute, string value)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", attribute);
            xmlElement.InnerText = value;
            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }
    }
}
