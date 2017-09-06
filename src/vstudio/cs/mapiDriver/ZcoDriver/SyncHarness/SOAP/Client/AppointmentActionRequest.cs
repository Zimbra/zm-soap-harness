using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class AppointmentActionRequest : RequestBody
    {
        public AppointmentActionRequest(string status, string invId, string compNum, string organizer, string subject)
                :base()
        {
            XmlElement xmlElement = this.CreateElement("SendInviteReplyRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);

            xmlElement.SetAttribute("verb", status);
            xmlElement.SetAttribute("id", invId);
            xmlElement.SetAttribute("compNum", compNum);
            xmlElement.SetAttribute("updateOrganizer", "TRUE");

            XmlElement xmlM = this.CreateElement("m");
            xmlM.SetAttribute("rt", "r");
            XmlElement xmlE = this.CreateElement("e");
            xmlE.SetAttribute("t", "t");
            xmlE.SetAttribute("a", organizer);

            XmlElement xmlSub = this.CreateElement("su");
            xmlSub.InnerText = status + ": " + subject;

            XmlElement xmlMp = this.CreateElement("mp");
            xmlMp.SetAttribute("ct", "text/plain");
            XmlElement xmlContent = this.CreateElement("content");
            xmlContent.InnerText = status + ": " + subject;
            
            xmlMp.AppendChild(xmlContent);
            xmlM.AppendChild(xmlSub);
            xmlM.AppendChild(xmlE);
            xmlM.AppendChild(xmlMp);
            this.FirstChild.AppendChild(xmlM);
            
        }

        public AppointmentActionRequest ExceptionId(string startTime, string timeZone)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("SendInviteReplyRequest")[0];
            XmlElement exceptId = this.CreateElement("exceptId");
            exceptId.SetAttribute("d", startTime);
            exceptId.SetAttribute("tz", timeZone);
            xmlElement.AppendChild(exceptId);
            return (this);
        }

        public AppointmentActionRequest(string envelope)
            : base(envelope)
        {
        }

        public AppointmentActionRequest AddMessage(MessageObject message)
        {
            this.FirstChild.AppendChild(this.ImportNode(message.DocumentElement, true));
            return (this);
        }


    }
}
