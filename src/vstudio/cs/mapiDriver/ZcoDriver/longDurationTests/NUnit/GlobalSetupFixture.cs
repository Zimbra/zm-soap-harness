using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;

namespace longDurationTests
{
    [SetUpFixture]
    public class LongDurationSetupFixture : clientTests.GlobalSetupFixture
    {
        public LongDurationSetupFixture() : base()
        {
        }

        [SetUp]
        public void LongDurationSetup()
        {
            Setup();
        }

        [TearDown]
        public void LongDurationTearDown()
        {
            TearDown();
        }


    }
}
