using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class ContactActionRequest : RequestBody
    {
        public ContactActionRequest()
                :base()
        {
            XmlElement xmlElement = this.CreateElement("ContactActionRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }
         public ContactActionRequest(string envelope)
            : base(envelope)
        {
        }
        public ContactActionRequest DeleteContactbyID(string Id)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", "delete");

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }
        
        public ContactActionRequest ModifyContactbyID(string Id)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", "delete");

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }
        public ContactActionRequest MoveContactbyID(string Id, string folderId)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id",Id);
            xmlElement.SetAttribute("op", "move");
            xmlElement.SetAttribute("l", folderId);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return(this);
        }
        public ContactActionRequest FlagContactbyID(string Id, string flag)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", flag);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }
        public ContactActionRequest TagContactbyID(string Id, string tag,string tagId)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", tag);
            xmlElement.SetAttribute("tag", tagId);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }
    }
}
