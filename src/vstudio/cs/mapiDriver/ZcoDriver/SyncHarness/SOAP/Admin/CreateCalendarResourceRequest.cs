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
    public class CreateCalendarResourceRequest : RequestBody
    {

        public CreateCalendarResourceRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateCalendarResourceRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);

            XmlElement resourceType = this.CreateElement("a");
            resourceType.SetAttribute("n", "zimbraCalResType");
            this.FirstChild.AppendChild(resourceType);

        }

        public CreateCalendarResourceRequest(string requestString)
            : base(requestString)
        {
        }

        public CreateCalendarResourceRequest UserName(string n)
        {
            XmlElement xmlElement = this.CreateElement("name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public CreateCalendarResourceRequest UserPassword(string p)
        {
            XmlElement xmlElement = this.CreateElement("password");
            xmlElement.InnerText = p;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public CreateCalendarResourceRequest ResourceType(string resType)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("a")[0];
            xmlElement.InnerText = resType;
            return (this);
        }

        public CreateCalendarResourceRequest DisplayName(string displayName)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", "displayName");
            xmlElement.InnerText = displayName;
            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }

        public CreateCalendarResourceRequest ZimbraCALAutoAcceptDecline(string AcceptDeclineTrueFalse)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", "zimbraCalResAutoAcceptDecline");
            xmlElement.InnerText = AcceptDeclineTrueFalse;
            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }

    }
}
