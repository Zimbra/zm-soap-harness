/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.Text;
using System.Collections.Generic;
using NUnit.Framework;
using log4net;

namespace EASHarness.NUnit
{
    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public class BugAttribute : PropertyAttribute
    {
        public BugAttribute(string bugId) : base("Bug(s)", bugId) {}

        public string BugId
        {
            get
            {
                return ((string)base.Value);
            }
        }
    }
}
