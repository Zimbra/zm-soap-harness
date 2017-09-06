using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;

namespace SoapWebClient
{
    public class FolderObject : XmlDocument
    {

        public FolderObject()
        {
            XmlElement xmlElement = this.CreateElement("folder");
            this.AppendChild(xmlElement);
        }

        public FolderObject SetName(string name)
        {
            if (this.Attributes != null)
            {
                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("name"))
                    {
                        a.Value = name;
                        return (this);
                    }
                }

            }
            
            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("folder")[0];
            xmlElement.SetAttribute("name", name);

            return (this);

        }

        public FolderObject SetParent(string parentId)
        {
            if (this.Attributes != null)
            {
                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("l"))
                    {
                        a.Value = parentId;
                        return (this);
                    }
                }
            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("folder")[0];
            xmlElement.SetAttribute("l", parentId);

            return (this);

        }

        public FolderObject SetView(string view)
        {
            if (this.Attributes != null)
            {
                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("view"))
                    {
                        a.Value = view;
                        return (this);
                    }
                }
            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("folder")[0];
            xmlElement.SetAttribute("view", view);

            return (this);

        }


        public FolderObject folderID(string Id)
        {
            if (this.Attributes != null)
            {
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("id"))
                    {
                        a.Value = Id;
                        return (this);
                    }
                }

            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("folder")[0];
            xmlElement.SetAttribute("id", Id);

            return (this);

        }

        public FolderObject parentID(string parentId)
        {
            if (this.Attributes != null)
            {
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("l"))
                    {
                        a.Value = parentId;
                        return (this);
                    }
                }
            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("folder")[0];
            xmlElement.SetAttribute("l", parentId);

            return (this);

        }

        public FolderObject visibleFlag(string flag)
        {
            if (this.Attributes != null)
            {
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("visible"))
                    {
                        a.Value = flag;
                        return (this);
                    }
                }
            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("folder")[0];
            xmlElement.SetAttribute("visible", flag);

            return (this);

        }
    }

    public class CreateFolderRequest : RequestBody
    {


        public CreateFolderRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateFolderRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public CreateFolderRequest(string envelope)
            : base(envelope)
        {
        }

        public CreateFolderRequest AddFolder(FolderObject folder)
        {
            this.FirstChild.AppendChild(this.ImportNode(folder.DocumentElement, true));
            return (this);
        }

    }
}

