using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class IMGetChatRequest : RequestBody
    {
        public IMGetChatRequest(string chatId)
            : base()
        {

            XmlElement xmlElement = this.CreateElement("IMGetChatRequest", "urn:zimbraIM");
            xmlElement.SetAttribute("thread", chatId);
            this.AppendChild(xmlElement);
        }

        public IMGetChatRequest()
            : base()
        {
        }
    }
}
