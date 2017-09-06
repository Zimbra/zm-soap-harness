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
    public class PingRequest : RequestBody
    {

        public PingRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("PingRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }


    }
}
