using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Messaging;
using Microsoft.Web.Services3.Addressing;
using Soap;
using SyncHarness;
using log4net;

namespace SoapAdmin
{
    public class AuthRequest : RequestBody
    {

        public AuthRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("AuthRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public AuthRequest(string requestString)
            : base(requestString)
        {
        }

        public AuthRequest(string adminName, string adminPassword)
            : this()
        {
            AdminName(adminName);
            AdminPassword(adminPassword);
        }

        public AuthRequest AdminName(string n)
        {

            XmlElement xmlElement = this.CreateElement("name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public AuthRequest AdminPassword(string p)
        {

            XmlElement xmlElement = this.CreateElement("password");
            xmlElement.InnerText = p;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }


    }
}
