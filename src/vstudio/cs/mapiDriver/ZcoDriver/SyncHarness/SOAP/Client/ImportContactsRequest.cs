using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class ImportContactsRequest : RequestBody
    {
        public ImportContactsRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("ImportContactsRequest", "urn:zimbraMail");
            xmlElement.SetAttribute("ct","csv");
            this.AppendChild(xmlElement);
        }

        public ImportContactsRequest(string envelope) : base(envelope)
        {
        }

        public ImportContactsRequest UploadCSVbyID(string UploadId)
        {
            XmlElement xmlElement = this.CreateElement("content");
            xmlElement.SetAttribute("aid", UploadId);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }

    }
}
