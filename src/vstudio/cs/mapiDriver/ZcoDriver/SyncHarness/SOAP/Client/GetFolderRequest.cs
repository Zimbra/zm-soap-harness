using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;

namespace SoapWebClient
{
    public class GetFolderRequest : RequestBody
    {
        public GetFolderRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("GetFolderRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public GetFolderRequest(string envelope)
            : base(envelope)
        {
        }

        public GetFolderRequest BaseFolderId(string id)
        {
            XmlElement xmlElement = this.CreateElement("folder");
            xmlElement.SetAttribute("l", id);

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }
        public GetFolderRequest FindFolder(FolderObject folder)
        {
            this.FirstChild.AppendChild(this.ImportNode(folder.DocumentElement, true));
            return (this);
        }

    }
}

