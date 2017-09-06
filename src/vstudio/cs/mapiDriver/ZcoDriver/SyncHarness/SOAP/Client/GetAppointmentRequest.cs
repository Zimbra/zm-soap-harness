using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class GetAppointmentRequest : RequestBody
    {

        public GetAppointmentRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("GetAppointmentRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public GetAppointmentRequest(string envelope)
            : base(envelope)
        {
        }

        public GetAppointmentRequest Message(string id)
        {
            foreach (XmlElement e in this.GetElementsByTagName("GetAppointmentRequest"))
            {
                foreach (XmlAttribute a in e.Attributes)
                {
                    if (a.Name.Equals("id"))
                    {
                        a.Value = id;
                        return (this);
                    }
                }

                // token does not exist, add it
                e.SetAttribute("id", id);

            }

            return (this);
        }

        public GetAppointmentRequest IncludeContent()
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("GetAppointmentRequest")[0];
            xmlElement.SetAttribute("includeContent", "1");
            return (this);
        }

    }
}
