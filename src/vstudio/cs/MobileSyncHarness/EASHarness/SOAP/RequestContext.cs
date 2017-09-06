/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.Xml;
using System.Text;
using System.Collections.Generic;
using Microsoft.Web.Services3;

namespace EASHarness.SOAP
{
    public class ZimbraContext : XmlDocument
    {
        public ZimbraContext() : base()
        {
            XmlElement xmlElement = this.CreateElement("context", "urn:zimbra");
            this.AppendChild(xmlElement);
        }

        public ZimbraContext(string contextSTring) : base()
        {
            this.LoadXml(contextSTring);
        }

        public ZimbraContext authToken(string a)
        {
            XmlElement xmlElement = this.CreateElement("authToken");
            xmlElement.InnerText = a;

            this.DocumentElement.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public ZimbraContext session(string id)
        {
            XmlElement xmlElement = this.CreateElement("session");
            if (id != null)
            {
                xmlElement.SetAttribute("id", id);
                xmlElement.InnerText = id;
            }

            this.DocumentElement.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public ZimbraContext sequenceId(string id)
        {
            if (id != null)
            {
                XmlElement xmlElement = this.CreateElement("notify");
                xmlElement.SetAttribute("seq", id);
                this.DocumentElement.AppendChild(this.ImportNode(xmlElement, true));
            }

            return (this);
        }
    }
}
