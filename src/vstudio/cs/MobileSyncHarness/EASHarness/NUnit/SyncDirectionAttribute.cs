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
    public enum SyncDirection
    {
        ToDevice,
        ToZCS,
        NoSync,
        Both,
    };

    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class SyncDirectionAttribute : PropertyAttribute
    {
        public SyncDirectionAttribute(SyncDirection syncDirection) : base("SyncDirection", syncDirection.ToString()) {}

        public string SyncDirection
        {
            get
            {
                return ((string)base.Value);
            }
        }
    }
}
