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
    public class DeleteAccountRequest : RequestBody
    {

        public DeleteAccountRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("DeleteAccountRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public DeleteAccountRequest(string requestString)
            : base(requestString)
        {
        }

        public DeleteAccountRequest zId(string zimbraId)
        {
            XmlElement idElement = this.CreateElement("id");
            idElement.InnerText = zimbraId;

            this.FirstChild.AppendChild(idElement);

            return (this);
        }
    }

}
