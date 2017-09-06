using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;

namespace SyncHarness
{
    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public class NotesAttribute : PropertyAttribute
    {

        public NotesAttribute(string analysis)
            : base("Notes", analysis)
        {
        }

        public string Notes
        {
            get
            {
                return ((string)base.Value);
            }
        }

    }
}