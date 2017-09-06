using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using NUnit.Framework;

namespace Harness
{
    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public class TestStepsAttribute : PropertyAttribute
    { 
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public TestStepsAttribute(params string[] orderedSteps)
            : base("TestSteps", "")
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
