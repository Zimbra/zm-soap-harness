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
    public class ModifyAccountRequest : RequestBody
    {      
        public ModifyAccountRequest()
              : base()
        {
            XmlElement xmlElement = this.CreateElement("ModifyAccountRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);            
        }
        public ModifyAccountRequest(string requestString)
            : base(requestString)
        {
        }

        public ModifyAccountRequest SetAccountId(string id)
        {
            XmlElement xmlElement = this.CreateElement("id");
            xmlElement.InnerText = id;

            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }

        public ModifyAccountRequest ModifyAttribute(string attributeName, string attributeValue)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", attributeName);
            xmlElement.InnerText = attributeValue;

            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }
    }

}
