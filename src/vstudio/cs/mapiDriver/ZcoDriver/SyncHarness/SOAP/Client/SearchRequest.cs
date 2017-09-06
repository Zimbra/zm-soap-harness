using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using System.Collections;

namespace SoapWebClient
{
    public class SearchRequest : RequestBody 
    {

        public SearchRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("SearchRequest", "urn:zimbraMail");
            xmlElement.SetAttribute("types", "conversation,message,contact,appointment,task,note,wiki,document");            
            this.AppendChild(xmlElement);
        }

        public SearchRequest(string requestString)
            : base(requestString)
        {
        }

        public SearchRequest Query(string q)
        {
            XmlElement xmlElement = this.CreateElement("query");
            xmlElement.InnerText = q;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public SearchRequest Types(string t)
        {

            foreach (XmlNode n in this.GetElementsByTagName("SearchRequest") )
            {
                foreach(XmlAttribute a in n.Attributes)
                {
                    if ( a.Name.Equals("types") )
                    {
                        a.Value = t;
                    }
                }
            }

            return (this);
        }
        public SearchRequest CalExpandInst(DateTime start, DateTime end)
        {

            XmlElement xmlElement = (XmlElement) this.GetElementsByTagName("SearchRequest")[0];
            xmlElement.SetAttribute("calExpandInstStart", (start - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString().Substring(0, 13));
            xmlElement.SetAttribute("calExpandInstEnd", (end - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString().Substring(0, 13));

            return (this);
        }

    }
}
