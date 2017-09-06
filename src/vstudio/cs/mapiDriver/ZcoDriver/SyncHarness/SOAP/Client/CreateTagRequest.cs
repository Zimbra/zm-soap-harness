using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class CreateTagRequest : RequestBody
    {
        public CreateTagRequest()
            : base()
        {

            XmlElement xmlElement = this.CreateElement("CreateTagRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);

            XmlElement tagElement = this.CreateElement("tag");
            tagElement.SetAttribute("name", "");
            this.FirstChild.AppendChild(tagElement);

        }

        public CreateTagRequest(string envelope)
            : base(envelope)
        {
        }

        public CreateTagRequest AddName(string name)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("tag")[0];
            xmlElement.SetAttribute("name", name);

            return (this);
        }

        public CreateTagRequest AddColor(string color)
        {

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("tag")[0];

            if (this.Attributes != null)
            {

                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("color"))
                    {
                        a.Value = color;
                        return (this);
                    }
                }

            }

            // Attribute does not exist, add it
            xmlElement.SetAttribute("color", color);

            return (this);
        }

    }
}
