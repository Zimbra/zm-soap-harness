using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Soap;


//<DeleteAccountRequest>
//  <id>{value-of-zimbraId}</id>
//</DeleteAccountRequest>

namespace SoapAdmin
{
    public class GetAccountRequest : RequestBody
    {

        public GetAccountRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("GetAccountRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public GetAccountRequest(string requestString)
            : base(requestString)
        {
        }

        public GetAccountRequest UserName(string n)
        {

            XmlElement xmlElement = this.CreateElement("account");
            xmlElement.SetAttribute("by", "name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public GetAccountRequest UserId(string i)
        {

            XmlElement xmlElement = this.CreateElement("account");
            xmlElement.SetAttribute("by", "id");
            xmlElement.InnerText = i;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

    }

}
