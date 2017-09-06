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
    public class CreateAccountRequest : RequestBody
    {
        public static readonly string AccountAttr_displayname = "displayname";
        public static readonly string AccountAttr_zimbraCOSId = "zimbraCOSId";
        public static readonly string AccountAttr_zimbraAllowAnyFromAddress = "zimbraAllowAnyFromAddress";

        public CreateAccountRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateAccountRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public CreateAccountRequest(string requestString)
            : base(requestString)
        {
        }

        public CreateAccountRequest UserName(string n)
        {
            XmlElement xmlElement = this.CreateElement("name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public CreateAccountRequest UserPassword(string p)
        {
            XmlElement xmlElement = this.CreateElement("password");
            xmlElement.InnerText = p;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public CreateAccountRequest AddAttribute(string attribute, string value)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", attribute);
            xmlElement.InnerText = value;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public CreateAccountRequest DisplayName(string d)
        {
            return (AddAttribute(AccountAttr_displayname, d));
        }

        public CreateAccountRequest SetCos(string id)
        {
            return (AddAttribute(AccountAttr_zimbraCOSId, id));
        }

    }
}
