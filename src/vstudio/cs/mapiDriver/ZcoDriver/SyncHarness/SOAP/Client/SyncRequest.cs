using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using System.Collections;

namespace SoapWebClient
{
    public class SyncRequest : RequestBody 
    {

        public SyncRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("SyncRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public SyncRequest(string requestString)
            : base(requestString)
        {
        }

        public SyncRequest Token(string token)
        {
            foreach (XmlElement e in this.GetElementsByTagName("SyncRequest"))
            {
                foreach (XmlAttribute a in e.Attributes)
                {
                    if (a.Name.Equals("token"))
                    {
                        a.Value = token;
                        return (this);
                    }
                }

                // token does not exist, add it
                e.SetAttribute("token", token);

            }

            return (this);
        }

        public static void GetMessageIds(XmlNode node, ref ArrayList messageIds, ref ArrayList newIds, ref ArrayList deletedIds)
        {

            if (node.HasChildNodes)
            {
                foreach (XmlNode child in node.ChildNodes)
                {
                    GetMessageIds(child, ref messageIds, ref newIds, ref deletedIds);
                }
            }

            if (node.Name.Equals("deleted"))
            {
                if (node.Attributes["ids"] != null)
                {
                    foreach (string i in node.Attributes["ids"].Value.Split(",".ToCharArray()))
                    {
                        deletedIds.Add(i);
                    }
                }
            }

            if (node.Name.Equals("m"))
            {
                if (node.Attributes["ids"] != null)
                {
                    foreach (string i in node.Attributes["ids"].Value.Split(",".ToCharArray()))
                    {
                        messageIds.Add(i);
                    }
                }

                if (node.Attributes["id"] != null)
                {
                    messageIds.Add(node.Attributes["id"].Value);
                }
            }

            if (node.Name.Equals("appt"))
            {
                if (node.Attributes["ids"] != null)
                {
                    foreach (string i in node.Attributes["ids"].Value.Split(",".ToCharArray()))
                    {
                        messageIds.Add(i);
                    }
                }

                if (node.Attributes["id"] != null)
                {
                    messageIds.Add(node.Attributes["id"].Value);
                }
            }

            if (node.Name.Equals("cn"))
            {
                if (node.Attributes["ids"] != null)
                {
                    foreach (string i in node.Attributes["ids"].Value.Split(",".ToCharArray()))
                    {
                        messageIds.Add(i);
                    }
                }

                if (node.Attributes["id"] != null)
                {
                    messageIds.Add(node.Attributes["id"].Value);
                }
            }

        }


    }
}
