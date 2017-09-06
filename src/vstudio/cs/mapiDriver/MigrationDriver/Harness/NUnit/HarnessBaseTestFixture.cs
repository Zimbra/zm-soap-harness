using System;
using System.Collections.Generic;
using System.Text;
using log4net;

namespace Harness
{
    public class HarnessBaseTestFixture
    {
        protected static ILog logger = LogManager.GetLogger(typeof(HarnessBaseTestFixture));

        protected string TestCaseName = "Need to call initialize() method at start of test case";
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        protected HarnessBaseTestFixture()
        {
            logger.Info("new " + typeof(HarnessBaseTestFixture));
        }

        protected void initialize(System.Reflection.MethodBase methodBase)
        {

            #region Set the logger settings (Create the log file, write the header)

            // Remember the test case name
            TestCaseName = String.Format("{0}.{1}", methodBase.DeclaringType.FullName, methodBase.Name);

            TestCaseLog.Instance.RemoveCurrentAppender();
            TestCaseLog.Instance.AddFileAppender(this.GetType().FullName);

            tcLog.Info("BaseTestFixture.initialize()");

            tcLog.Info(TestCaseLog.Instance.LogHeader(methodBase));
            //Add these info in console log too as it helps in debugging.
            logger.Info("BaseTestFixture.initialize()");
            logger.Info(TestCaseName);


            #endregion

        }

        protected void HarnessSetUp()
        {
            logger.Info("HarnessBaseTestFixture.HarnessSetUp()");
        }

        protected void HarnessTearDown()
        {
            logger.Info("HarnessBaseTestFixture.HarnessTearDown()");
        }



    }


}
