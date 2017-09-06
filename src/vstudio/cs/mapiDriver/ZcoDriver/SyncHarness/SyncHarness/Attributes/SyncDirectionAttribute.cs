using System;
using System.Collections.Generic;
using System.Text;


namespace SyncHarness
{
    public enum SyncDirection
    {
        TOZCO,
        TOZCS,
        NOSYNC,
        BOTH,
    };

    [System.AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class SyncDirectionAttribute : NUnit.Framework.PropertyAttribute
    {
        //private string mySyncDirection;

        public SyncDirectionAttribute(SyncDirection syncDirection)
            :base("SyncDirection", syncDirection.ToString())
        {            
        }

        public string SyncDirection
        {
            get
            {
                return ((string)base.Value);
            }
        }
    }
}
