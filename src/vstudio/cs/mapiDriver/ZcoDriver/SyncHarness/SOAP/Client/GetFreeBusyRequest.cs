using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

namespace SoapWebClient
{
    public class GetFreeBusyRequest : RequestBody
    {
        public GetFreeBusyRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("GetFreeBusyRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public GetFreeBusyRequest(string requestString)
            : base(requestString)
        {
        }

        public GetFreeBusyRequest Start(DateTime start)
        {
            string startString = (start - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            foreach (XmlNode n in this.GetElementsByTagName("GetFreeBusyRequest"))
            {
                foreach (XmlAttribute a in n.Attributes)
                {
                    if (a.Name.Equals("s"))
                    {
                        a.Value = startString;
                        return (this); // Found it and assigned it.  We are done.
                    }
                }
            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("GetFreeBusyRequest")[0];
            xmlElement.SetAttribute("s", startString.Substring(0, 13));
            
            return (this);

        }

        public GetFreeBusyRequest End(DateTime finish)
        {
            string finishString = (finish - new DateTime(1970, 1, 1)).TotalMilliseconds.ToString();

            foreach (XmlNode n in this.GetElementsByTagName("GetFreeBusyRequest"))
            {
                foreach (XmlAttribute a in n.Attributes)
                {
                    if (a.Name.Equals("e"))
                    {
                        a.Value = finishString;
                        return (this); // Found it and assigned it.  We are done.
                    }
                }
            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("GetFreeBusyRequest")[0];
            xmlElement.SetAttribute("e", finishString.Substring(0, 13));

            return (this);

        }

        [Obsolete(
                @"From soap-calendar.txt:
                  // DEPRECATED
                  // comma-separated list of zimraId or email
                  // each value can be zimbraId or email")
        ]
        public GetFreeBusyRequest Uid(string uid)
        {
            foreach (XmlNode n in this.GetElementsByTagName("GetFreeBusyRequest"))
            {
                foreach (XmlAttribute a in n.Attributes)
                {
                    if (a.Name.Equals("uid"))
                    {
                        a.Value = uid;
                        return (this); // Found it and assigned it.  We are done.
                    }
                }
            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("GetFreeBusyRequest")[0];
            xmlElement.SetAttribute("uid", uid);

            return (this);
        }

        public GetFreeBusyRequest Id(string id)
        {
            foreach (XmlNode n in this.GetElementsByTagName("GetFreeBusyRequest"))
            {
                foreach (XmlAttribute a in n.Attributes)
                {
                    if (a.Name.Equals("id"))
                    {
                        a.Value = id;
                        return (this); // Found it and assigned it.  We are done.
                    }
                }
            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("GetFreeBusyRequest")[0];
            xmlElement.SetAttribute("id", id);

            return (this);
        }

        public GetFreeBusyRequest Email(string email)
        {
            foreach (XmlNode n in this.GetElementsByTagName("GetFreeBusyRequest"))
            {
                foreach (XmlAttribute a in n.Attributes)
                {
                    if (a.Name.Equals("name"))
                    {
                        a.Value = email;
                        return (this); // Found it and assigned it.  We are done.
                    }
                }
            }

            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("GetFreeBusyRequest")[0];
            xmlElement.SetAttribute("name", email);

            return (this);
        }


    }
}
