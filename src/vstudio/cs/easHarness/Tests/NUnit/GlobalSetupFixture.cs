using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using log4net;
using System.IO;
using Utilities;
using System.Security.Cryptography.X509Certificates;

namespace Tests
{
    [SetUpFixture]
    public class GlobalSetupFixture
    {
        public static ILog logger = LogManager.GetLogger("TestCaseLogger");

        public GlobalSetupFixture()
        {
            logger.Debug("new " + typeof(GlobalSetupFixture));


            log4net.Config.BasicConfigurator.Configure();

        }


        [SetUp]
        public void Setup()
        {
            logger.Debug("GlobalSetupFixture.Setup()");

            TestLog.ConfigureLog4Net();

            // Accept all certs
            SkipInvalidCertificates();

        }

        [TearDown]
        public void TearDown()
        {
            logger.Debug("GlobalSetupFixture.TearDown()");

        }

        private void SkipInvalidCertificates()
        {
            System.Net.ServicePointManager.ServerCertificateValidationCallback +=
                new System.Net.Security.RemoteCertificateValidationCallback(ValidateRemoteCertificate);
        }

        private static bool ValidateRemoteCertificate(
            object sender,
            X509Certificate certificate,
            X509Chain chain,
            System.Net.Security.SslPolicyErrors policyErrors)
        {
            return (true);
        }

    }
}
