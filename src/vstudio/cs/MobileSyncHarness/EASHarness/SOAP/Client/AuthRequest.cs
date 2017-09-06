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
using Microsoft.Web.Services3.Messaging;
using Microsoft.Web.Services3.Addressing;
using log4net;

namespace EASHarness.SOAP.Client
{
    public class AuthRequest : RequestBody
    {
        public AuthRequest() : base()
        {
            XmlElement xmlElement = this.CreateElement("AuthRequest", "urn:zimbraAccount");
            this.AppendChild(xmlElement);
        }

        public AuthRequest(string requestString) : base(requestString) {}

        public AuthRequest UserName(string n)
        {
            XmlElement xmlElement = this.CreateElement("account");
            xmlElement.SetAttribute("by", "name");
            xmlElement.InnerText = n;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public AuthRequest UserId(string i)
        {
            XmlElement xmlElement = this.CreateElement("account");
            xmlElement.SetAttribute("by", "id");
            xmlElement.InnerText = i;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }

        public AuthRequest UserPassword(string p)
        {
            XmlElement xmlElement = this.CreateElement("password");
            xmlElement.InnerText = p;

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));

            return (this);
        }
    }
}
