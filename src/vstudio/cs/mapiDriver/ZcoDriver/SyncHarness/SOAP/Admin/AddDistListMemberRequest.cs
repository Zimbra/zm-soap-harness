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
    public class AddDistListMemberRequest : RequestBody
    {
        public AddDistListMemberRequest()
              : base()
        {
            XmlElement xmlElement = this.CreateElement("AddDistributionListMemberRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);
            
        }

        public AddDistListMemberRequest(string requestString)
            : base(requestString)
        {
        }

        public AddDistListMemberRequest AddMembers(string id, ArrayList memberlist)
        {
            XmlElement xmlElement = this.CreateElement("id");
            xmlElement.InnerText = id;
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            XmlElement xmlMembers = null;
            foreach (string member in memberlist)
            {
                xmlMembers = this.CreateElement("dlm");
                xmlMembers.InnerText = member;
                this.FirstChild.AppendChild(this.ImportNode(xmlMembers, true));
            }
            
            return (this);
        }
    }
}
