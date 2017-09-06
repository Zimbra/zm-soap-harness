using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class CreateAppointmentExceptionRequest : RequestBody
    {

        public CreateAppointmentExceptionRequest(string appointmentId, string comp)
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateAppointmentExceptionRequest", "urn:zimbraMail");
            xmlElement.SetAttribute("id", appointmentId);
            xmlElement.SetAttribute("comp", comp);
            this.AppendChild(xmlElement);
        }

        public CreateAppointmentExceptionRequest ExceptionId(string startTime, string timeZone)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            XmlElement exceptId = this.CreateElement("exceptId");
            exceptId.SetAttribute("d", startTime);
            exceptId.SetAttribute("tz", timeZone);
            xmlElement.AppendChild(exceptId);
            return (this);
        }

        public CreateAppointmentExceptionRequest(string envelope)
            : base(envelope)
        {
        }

        public CreateAppointmentExceptionRequest AddMessage(MessageObject message)
        {
            this.FirstChild.AppendChild(this.ImportNode(message.DocumentElement, true));
            return (this);
        }

    }
}

