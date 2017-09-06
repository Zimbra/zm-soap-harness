using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;

namespace SoapWebClient
{
    public class GetContactRequest : RequestBody
    {

        public GetContactRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("GetContactsRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public GetContactRequest(string envelope)
            : base(envelope)
        {
        }

        public GetContactRequest GetContactbyId(string contactId)
        {
            XmlElement xmlElement = this.CreateElement("cn");
            xmlElement.SetAttribute("id", contactId);

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

    }
}
