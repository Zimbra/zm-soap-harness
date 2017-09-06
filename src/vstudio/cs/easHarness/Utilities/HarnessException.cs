using System;
using System.Collections.Generic;
using System.Text;
using log4net;

namespace Utilities
{
    public class HarnessException : Exception
    {



        public HarnessException(String error)
            : base(error)
        {
            LogManager.GetLogger("TestCaseLogger").Error(error);
            LogManager.GetLogger("TestCaseLogger").Error(this.ToString());
        }

        public HarnessException(String error, Exception ex) :
            base(error, ex)
        {
            LogManager.GetLogger("TestCaseLogger").Error(error);
            LogManager.GetLogger("TestCaseLogger").Error(this.ToString());
        }

        public HarnessException(Exception ex) :
            base(ex.Message, ex)
        {
            LogManager.GetLogger("TestCaseLogger").Error(ex.Message, ex);
            LogManager.GetLogger("TestCaseLogger").Error(this.ToString());
        }


    }
}
