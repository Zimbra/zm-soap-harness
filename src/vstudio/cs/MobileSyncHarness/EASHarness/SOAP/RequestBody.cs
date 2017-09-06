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
using EASHarness.Harness;

namespace EASHarness.SOAP
{
    public class RequestBody : XmlDocument
    {
        public RequestBody() : base() {}

        public RequestBody(string requestString) : base()
        {
            try
            {
                this.LoadXml(requestString);
            }
            catch (Exception e)
            {
                throw new HarnessException("Loading XML from string threw exception", e);
            }
        }
    }
}
