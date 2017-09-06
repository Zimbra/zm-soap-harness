using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class CreateTaskRequest : RequestBody
    {
        public CreateTaskRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateTaskRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);

            XmlElement mElement = this.CreateElement("m");            
            
            XmlElement invElement = this.CreateElement("inv");

            XmlElement compElement = this.CreateElement("comp");
            compElement.SetAttribute("name", "");
            //compElement.SetAttribute("allDay", "1");

            invElement.AppendChild(compElement);
            mElement.AppendChild(invElement);
            this.FirstChild.AppendChild(mElement);
        }

        public CreateTaskRequest(string envelope)
            : base(envelope)
        {
        }

        public CreateTaskRequest Subject(String subject)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            xmlElement.SetAttribute("name", subject);            

            return (this);
        }

        public CreateTaskRequest StartDate(DateTime startDate)
        {
            XmlElement xmlElement = this.CreateElement("s");
            xmlElement.SetAttribute("d", startDate.ToString("yyyyMMdd'T'HHmmss"));

            XmlElement compElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            compElement.AppendChild(xmlElement);

            return (this);
        }

        public CreateTaskRequest DueDate(DateTime dueDate)
        {
            XmlElement xmlElement = this.CreateElement("e");
            xmlElement.SetAttribute("d", dueDate.ToString("yyyyMMdd'T'HHmmss"));

            XmlElement compElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            compElement.AppendChild(xmlElement);

            return (this);
        }

        public CreateTaskRequest Content(string content)
        {
            XmlElement mpElement = this.CreateElement("mp");
            mpElement.SetAttribute("ct", "text/plain");

            XmlElement xmlElement = this.CreateElement("content");
            xmlElement.InnerText = content;

            //XmlElement compElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            //compElement.AppendChild(xmlElement);

            mpElement.AppendChild(xmlElement);
            this.FirstChild.FirstChild.AppendChild(mpElement);
            
            return (this);
        }

        public CreateTaskRequest Status(String status)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            xmlElement.SetAttribute("status", status);

            return (this);
        }

        public CreateTaskRequest PercentComplete(String percentComplete)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            xmlElement.SetAttribute("percentComplete", percentComplete);

            return (this);
        }

        public CreateTaskRequest Priority(String priority)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            xmlElement.SetAttribute("priority", priority);

            return (this);
        }

        public CreateTaskRequest Location(String location)
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            xmlElement.SetAttribute("loc", location);

            return (this);
        }

        public CreateTaskRequest SetParent(string folderId)
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

    }
}
