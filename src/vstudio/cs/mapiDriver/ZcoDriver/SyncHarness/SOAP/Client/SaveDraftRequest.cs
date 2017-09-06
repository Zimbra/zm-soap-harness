using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Soap;

namespace SoapWebClient
{
    public class SaveDraftRequest : RequestBody
    {
        public SaveDraftRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("SaveDraftRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public SaveDraftRequest(string envelope)
            : base(envelope)
        {
        }

        public SaveDraftRequest AddMessage(MessageObject message)
        {
            this.FirstChild.AppendChild(this.ImportNode(message.DocumentElement, true));
            return (this);
        }

    }
}
