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

namespace EASHarness.NUnit
{
    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public class NotesAttribute : PropertyAttribute
    {
        public NotesAttribute(string analysis) : base("Notes", analysis) {}

        public string Notes
        {
            get
            {
                return ((string)base.Value);
            }
        }
    }
}