using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class ModifyAppointmentRequest : RequestBody
    {

        public ModifyAppointmentRequest(string appointmentId, string comp)
            : base()
        {
            XmlElement xmlElement = this.CreateElement("ModifyAppointmentRequest", "urn:zimbraMail");
            xmlElement.SetAttribute("id", appointmentId);
            xmlElement.SetAttribute("comp", comp);
            this.AppendChild(xmlElement);
        }

        public ModifyAppointmentRequest(string envelope)
            : base(envelope)
        {
        }

        public ModifyAppointmentRequest AddMessage(MessageObject message)
        {
            this.FirstChild.AppendChild(this.ImportNode(message.DocumentElement, true));
            return (this);
        }

    }
}

