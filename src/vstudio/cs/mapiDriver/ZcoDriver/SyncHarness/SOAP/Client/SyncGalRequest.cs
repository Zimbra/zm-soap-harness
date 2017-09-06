using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class SyncGalRequest : RequestBody
    {
        public SyncGalRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("SyncGalRequest", "urn:zimbraAccount");
            this.AppendChild(xmlElement);
        }

        public SyncGalRequest(string requestString)
            : base(requestString)
        {
        }

        public SyncGalRequest Token(string token)
        {
            foreach (XmlElement e in this.GetElementsByTagName("SyncGalRequest"))
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

    }
}
