using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;

namespace SoapWebClient
{
    public class GetMsgRequest : RequestBody
    {

        public GetMsgRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("GetMsgRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public GetMsgRequest(string envelope)
            : base(envelope)
        {
        }

        public GetMsgRequest Message(string id)
        {
            XmlElement xmlElement = this.CreateElement("m");
            xmlElement.SetAttribute("id", id);

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public GetMsgRequest Message(string id, bool read, bool raw, int max, bool html, bool neuter, int part)
        {
            XmlElement xmlElement = this.CreateElement("m");
            xmlElement.SetAttribute("id", id);
            xmlElement.SetAttribute("read", read ? "1" : "0");
            xmlElement.SetAttribute("raw", raw ? "1" : "0");
            xmlElement.SetAttribute("max", Convert.ToString(max));
            xmlElement.SetAttribute("html", html ? "1" : "0");
            xmlElement.SetAttribute("neuter", neuter ? "1" : "0");
            xmlElement.SetAttribute("part", Convert.ToString(part));

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }



        public GetMsgRequest RecurrenceId(string ridZ)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];

            foreach (XmlAttribute a in xmlElement.Attributes)
            {
                if (a.Name.Equals("ridZ"))
                {
                    a.Value = ridZ;
                    return (this);
                }
            }

            // Attribute does not yet exist.  Initialize it
            xmlElement.SetAttribute("ridZ", ridZ);

            return (this);

        }
    }
}

