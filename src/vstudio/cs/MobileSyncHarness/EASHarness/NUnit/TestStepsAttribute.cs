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
    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class TestStepsAttribute : PropertyAttribute
    {
        public TestStepsAttribute(params string[] orderedSteps) : base("TestSteps", "")
        {
            List<string> steps = new List<string>();

            for (int i = 0; i < orderedSteps.Length; i++)
            {
                steps.Add(orderedSteps[i]);
            }

            propertyValue = steps.ToArray();
        }

        public new object Value
        {
            get
            {
                StringBuilder sb = new StringBuilder();
                int i = 1;
                foreach (string step in (string[])this.propertyValue)
                {
                    sb.Append("" + i++ + ": " + step + '\n');
                }
                return (sb.ToString());
            }
        }
    }
}
