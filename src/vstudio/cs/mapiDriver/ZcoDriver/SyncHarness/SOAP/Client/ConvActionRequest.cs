using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class ConvActionRequest : RequestBody
    {
        public ConvActionRequest()
                :base()
        {
            XmlElement xmlElement = this.CreateElement("ConvActionRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }
         public ConvActionRequest(string envelope)
            : base(envelope)
        {
        }
        public ConvActionRequest DeleteConvbyID(string Id)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", "delete");

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }            
        public ConvActionRequest MoveConvbyID(string Id, string folderId)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id",Id);
            xmlElement.SetAttribute("op", "move");
            xmlElement.SetAttribute("l", folderId);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return(this);
        }
        public ConvActionRequest FlagConvbyID(string Id, string flag)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", flag);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }
        public ConvActionRequest TagConvbyID(string Id, string tag,string tagId)
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
