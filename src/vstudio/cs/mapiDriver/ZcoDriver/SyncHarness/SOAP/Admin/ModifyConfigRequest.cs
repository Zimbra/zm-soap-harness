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
    public class ModifyConfigRequest : RequestBody
    {      
        public ModifyConfigRequest()
              : base()
        {
            XmlElement xmlElement = this.CreateElement("ModifyConfigRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);            
        }
        public ModifyConfigRequest(string requestString)
            : base(requestString)
        {
        }

        public ModifyConfigRequest ModifyAttribute(ConfigAttributes attributeName, string attributeValue)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", attributeName.ToString());
            xmlElement.InnerText = attributeValue;

            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }
    }

    public enum ConfigAttributes
    {
        zimbraMtaMaxMessageSize,
        zimbraFileUploadMaxSize,
    }
}
