using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class ContactObject : XmlDocument
    {
        //public enum Emailtype { PrimaryEmail, Home, Business };
        public ContactObject()
        {
            XmlElement xmlElement = this.CreateElement("cn");
            this.AppendChild(xmlElement);
        }
        
        public ContactObject(string Id)
        {
            XmlElement xmlElement = this.CreateElement("cn");
            xmlElement.SetAttribute("id", Id);
            this.AppendChild(xmlElement);
        }

        public ContactObject ModifyContactAttribute(string contactattribute, string attributevalue)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", contactattribute);
            xmlElement.InnerText = attributevalue;
            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }

        public ContactObject ModifyContactAttribute_AddDLMember(string contactattribute, string attributevalue)
        {
            XmlElement xmlElement = this.CreateElement("m");
            xmlElement.SetAttribute("op", "+");
            xmlElement.SetAttribute(contactattribute, attributevalue);
            xmlElement.SetAttribute("type", "I");
            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }

        public ContactObject AddContactAttribute(string contactattribute, string attributevalue)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n",contactattribute);
            xmlElement.InnerText = attributevalue;
            this.FirstChild.AppendChild(xmlElement);
            return (this);
        }

        public ContactObject AddImage(string contactattribute, string uploadId)
        {
            XmlElement xmlElement = this.CreateElement("a");
            xmlElement.SetAttribute("n", contactattribute);
            xmlElement.SetAttribute("aid", uploadId);

            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }

        public ContactObject SetParent(string folderId)
        {
            if (this.Attributes != null)
            {
                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("l"))
                    {
                        a.Value = folderId;
                        return (this);
                    }
                }
            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("cn")[0];
            xmlElement.SetAttribute("l", folderId);

            return (this);
        }                   
    }

    public class CreateContactRequest : RequestBody
    {
        public CreateContactRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateContactRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public CreateContactRequest(string envelope)
            : base(envelope)
        {
        }
        public CreateContactRequest AddContact(ContactObject contact)
        {
            this.FirstChild.AppendChild(this.ImportNode(contact.DocumentElement, true));
            return (this);
        }       
    }
}
