using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.Serialization;
using log4net;

namespace Harness
{
    [Serializable]
    public class HarnessException : ApplicationException
    {
        private static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        public HarnessException()
        {
            ZAssert.AddException("HarnessException", this);
            setFirstTestCaseException(this);
        }

        public HarnessException(string error)
            : base(error)
        {
            ZAssert.AddException(error, this);
            setFirstTestCaseException(this);
        }

        public HarnessException(string error, Exception inner)
            : base(error, inner)
        {
            ZAssert.AddException(error, this);
            setFirstTestCaseException(this);
        }

        protected HarnessException(SerializationInfo info, StreamingContext context)
            : base(info, context)
        {
        }

        public override void GetObjectData(System.Runtime.Serialization.SerializationInfo info, System.Runtime.Serialization.StreamingContext context)
        {
            base.GetObjectData(info, context);
        }


        // Keep a static pointer to an exception
        // If an exception occurs during a test case, set this pointer to the exception
        // The test case tear down will clean up OLK if this pointer is set
        // Each test case clears the pointer when it starts up
        //
        private static HarnessException FirstTestCaseException = null;
        public static void clearFirstTestCaseException()
        {
            FirstTestCaseException = null;
        }
        public static HarnessException setFirstTestCaseException(HarnessException he)
        {
            if (FirstTestCaseException == null)
            {
                FirstTestCaseException = he;
                Screenshot.TakeScreenshot();
            }
            return (FirstTestCaseException);
        }
        public static HarnessException getFirstTestCaseException()
        {
            return (FirstTestCaseException);
        }

    }
}
