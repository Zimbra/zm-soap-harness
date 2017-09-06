using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Text.RegularExpressions;
using Redemption;

namespace clientTests.Client.Profile
{
    [TestFixture]
    public class CreateProfile : BaseTestFixture
    {
        [Test, Description("Verify that after setting download headers option to true does not cause any local failures")]
        [Bug("43652")]
        public void CreateProfile_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Outlook Block
            OutlookCommands.Instance.DownloadHeadersOnly(true);
            OutlookCommands.Instance.Sync();
            RDOMail rMail = OutlookMailbox.Instance.findMessage("Local failure");
            zAssert.IsNull(rMail, "Local failure should not be present");
            // setting the value back to default.
            OutlookCommands.Instance.DownloadHeadersOnly(false);
            #endregion
        }

    }
}
