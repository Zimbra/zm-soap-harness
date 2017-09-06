using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Collections;
using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Messaging;
using Microsoft.Web.Services3.Addressing;
using Soap;

namespace SoapAdmin
{
    public class AddAccountAliasRequest : RequestBody
    {
        public AddAccountAliasRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("AddAccountAliasRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
        }

        public AddAccountAliasRequest(string requestString)
            : base(requestString)
        {
        }

        public AddAccountAliasRequest AddAlias(string accountId, string alias)
        {
            XmlElement idElement = this.CreateElement("id");
            idElement.InnerText = accountId;

            XmlElement aliasElement = this.CreateElement("alias");
            aliasElement.InnerText = alias;

            this.FirstChild.AppendChild(idElement);
            this.FirstChild.AppendChild(aliasElement);

            return (this);
        }
    }
}
