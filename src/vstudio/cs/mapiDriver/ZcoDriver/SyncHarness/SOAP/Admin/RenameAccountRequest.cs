using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Messaging;
using Microsoft.Web.Services3.Addressing;
using Soap;


//<RenameAccountRequest>
//  <id>{value-of-zimbraId}</id>
//  <newName>{new-account-name}</newName>
//</RenameAccountRequest>


namespace SoapAdmin
{
    public class RenameAccountRequest : RequestBody
    {


        public RenameAccountRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("RenameAccountRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public RenameAccountRequest(string requestString)
            : base(requestString)
        {
        }

        public RenameAccountRequest UserName(string n)
        {
            XmlElement xmlElement = this.CreateElement("name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public RenameAccountRequest zId(string zimbraId)
        {
            XmlElement xmlElement = this.CreateElement("id");
            xmlElement.InnerText = zimbraId;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public RenameAccountRequest zNewName(string emailAddress)
        {
            XmlElement xmlElement = this.CreateElement("newName");
            xmlElement.InnerText = emailAddress;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

    }
}
