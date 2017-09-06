using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class ModifyContactRequest : RequestBody
    {
        public ModifyContactRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("ModifyContactRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public ModifyContactRequest(string replace,string force)
            : base()
        {
            XmlElement xmlElement = this.CreateElement("ModifyContactRequest", "urn:zimbraMail");
            xmlElement.SetAttribute("replace", replace);
            xmlElement.SetAttribute("force", force);
            this.AppendChild(xmlElement);
        }

        public ModifyContactRequest(string envelope)
            : base(envelope)
        {
        }
        public ModifyContactRequest ModifyContact(ContactObject contact)
        {
            this.FirstChild.AppendChild(this.ImportNode(contact.DocumentElement, true));
            return (this);
        }
    }
}
