using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;

namespace Harness
{
    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public class BugAttribute : PropertyAttribute
    {

        public BugAttribute(string bugId)
            : base("bug", bugId)
        {
        }

        public string BugId
        {
            get
            {
                return ((string)base.Value);
            }
        }

    }
}
