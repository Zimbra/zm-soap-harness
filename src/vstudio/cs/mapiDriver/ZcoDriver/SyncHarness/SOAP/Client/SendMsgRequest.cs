using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class MessageObject : XmlDocument
    {

        public enum Priority { High, Low, Normal };
        public enum AddressType { From, To, Bcc, Cc, ReplyTo };


        public MessageObject()
        {
            XmlElement xmlElement = this.CreateElement("m");
            this.AppendChild(xmlElement);
        }

        public MessageObject SetZimbraID(string zimbraId)
        {

            if (this.Attributes != null)
            {

                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("id"))
                    {
                        a.Value = zimbraId;
                        return (this);
                    }
                }

            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];
            xmlElement.SetAttribute("id", zimbraId);

            return (this);

        }

        public MessageObject SetPriority(Priority p)
        {

            if (PriorityToString(p) == null)
            {
                // If Priority.Normal priority, no need to set it
                return (this);
            }

            if (this.Attributes != null)
            {

                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("f"))
                    {
                        a.Value = PriorityToString(p);
                        return (this);
                    }
                }

            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];
            xmlElement.SetAttribute("f", PriorityToString(p));

            return (this);
        }

        public MessageObject SetOrigId(string messageID)

        {
            if (this.Attributes != null)
            {

                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("origid"))
                    {
                        a.Value = messageID;
                        return (this);
                    }
                }

            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];
            xmlElement.SetAttribute("origid", messageID);

            return (this);
        }

        public MessageObject ReplyType(string type)
        {
            if (this.Attributes != null)
            {

                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("rt"))
                    {
                        a.Value = type;
                        return (this);
                    }
                }

            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];
            xmlElement.SetAttribute("rt", type);

            return (this);
        }


        public MessageObject SetIdentity()
        {
            throw new Exception("The method or operation is not implemented.");
        }

        public MessageObject SetParent(string folderId)
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
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];
            xmlElement.SetAttribute("l", folderId);

            return (this);
        }

        public MessageObject SetFlags(string flags)
        {
            if (this.Attributes != null)
            {

                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("f"))
                    {
                        a.Value = flags;
                        return (this);
                    }
                }

            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];
            xmlElement.SetAttribute("f", flags);

            return (this);
        }

        public MessageObject Subject(string s)
        {
            XmlElement xmlElement = this.CreateElement("su");
            xmlElement.InnerText = s;
            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }

        public MessageObject AutoAdd()
        {
            XmlElement xmlElement = (XmlElement) this.GetElementsByTagName("e")[0];
            xmlElement.SetAttribute("add","1");
            
            return (this);
        }


        public MessageObject AutoAdd(string contactField)
        {
            XmlElement xmlElement = (XmlElement) this.GetElementsByTagName("e")[0];
            xmlElement.SetAttribute("p", contactField);
            xmlElement.SetAttribute("add", "1");
            
            return (this);
        }

        public MessageObject AddAddress(AddressType t, string emailAddress)
        {
            XmlElement xmlElement = this.CreateElement("e");
            xmlElement.SetAttribute("t", AddressTypeToString(t));
            xmlElement.SetAttribute("a", emailAddress);
            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }

        public MessageObject AddAddress(AddressType addressType, string p, string p_3, bool p_4)
        {
            throw new Exception("The method or operation is not implemented.");
        }

        public MessageObject BodyTextPlain(string content)
        {
            // TODO: If there is already a body, then we need to add the text plain to it

            XmlElement xmlElement = this.CreateElement("mp");
            xmlElement.SetAttribute("ct", "text/plain");
            XmlElement xmlTextContent = this.CreateElement("content");
            xmlTextContent.InnerText = content;

            xmlElement.AppendChild(xmlTextContent);
            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }

        public MessageObject BodyTextHTML(string content)
        {
            // TODO: If there is already a body, then we need to add the text html to it

            XmlElement xmlElement = this.CreateElement("mp");
            xmlElement.SetAttribute("ct", "text/html");
            XmlElement xmlHtmlContent = this.CreateElement("content");
            xmlHtmlContent.InnerText = content;

            xmlElement.AppendChild(xmlHtmlContent);
            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }

        // For use with AddMsgRequest
        public MessageObject AddContent(string content)
        {
            XmlElement xmlElement = this.CreateElement("content");
            xmlElement.InnerText = content;

            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }
        
        // Add an <inv/> object to this <m/> object
        public MessageObject AddInv(InvObject inv)
        {
            this.FirstChild.AppendChild(this.ImportNode(inv.DocumentElement, true));
            return (this);
        }

        protected string PriorityToString(Priority p)
        {

            switch (p)
            {
                case Priority.High:
                    return ("!");
                case Priority.Low:
                    return ("?");
            }

            // Normal priority doesn't have a value
            return (null);
        }

        protected string AddressTypeToString(AddressType t)
        {

            switch (t)
            {
                case AddressType.From:
                    return ("f");
                case AddressType.To:
                    return ("t");
                case AddressType.Bcc:
                    return ("b");
                case AddressType.Cc:
                    return ("c");
                case AddressType.ReplyTo:
                    return ("r");
            }

            throw new HarnessException("Unknown AddressType :" + t);
        }



        public MessageObject AddAttachment(string uploadId)
        {
            // Create the <attach aid="<aid>"/> element
            XmlElement xmlElement = this.CreateElement("attach");
            xmlElement.SetAttribute("aid", uploadId);
            
            // Append it to the <m/> element
            this.FirstChild.AppendChild(xmlElement);

            return (this);
        }
    }

    public class SendMsgRequest : RequestBody
    {

        public SendMsgRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("SendMsgRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public SendMsgRequest(string envelope)
            : base(envelope)
        {
        }

        public SendMsgRequest AddMessage(MessageObject message)
        {
            this.FirstChild.AppendChild(this.ImportNode(message.DocumentElement, true));
            return (this);
        }

    }
}

