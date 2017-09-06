using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Microsoft.Office.Interop.Outlook;
using SyncHarness;
using System.Text.RegularExpressions;
using Redemption;

namespace clientTests.Client.Mail.Filters.Outgoing
{
    [TestFixture]
    public class GetOutgoingFilters : BaseTestFixture
    {
        [Test, Description("Verify received messages are synced to ZCO")]
        [Bug("56897")]
        public void GetMessage_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region variable
            string subject = "subject" + GlobalProperties.time() + GlobalProperties.counter();
            string content = "content" + GlobalProperties.time() + GlobalProperties.counter();
            string filterName = "filter" + GlobalProperties.time() + GlobalProperties.counter();
            #endregion

            #region create outgoing filter in SOAP
            zAccount.AccountZCO.sendSOAP(@"
             <ModifyOutgoingFilterRulesRequest xmlns='urn:zimbraMail'>
                <filterRules>
                    <filterRule name='" + filterName +@"' active='1'>
                        <filterTests condition='anyof'>
                            <headerTest header='subject' stringComparison='contains' value='" + subject +@"' /> 
                        </filterTests>
                        <filterActions>
                            <actionDiscard /> 
                        </filterActions>
                        <actionStop /> 
                    </filterRule>
                </filterRules>
            </ModifyOutgoingFilterRulesRequest>");
            zAccount.AccountZCO.selectSOAP("//mail:ModifyOutgoingFilterRulesResponse", null, null, null, 1);
            #endregion

            #region Outlook block
            OutlookCommands.Instance.Sync();
            RDOMail rdoMail = OutlookMailbox.Instance.CreateMail();

            // Set the values
            rdoMail.Subject = subject;
            rdoMail.Body = content;
            rdoMail.To = zAccount.AccountA.emailAddress;
            rdoMail.Recipients.ResolveAll(null, null);


            // Send the email
            rdoMail.Send();

            try
            {
                OutlookCommands.Instance.Sync();
            }
            catch(UnauthorizedAccessException e)
            {
            }
            zAssert.IsTrue(OutlookProcess.Instance.IsApplicationRunning(), "outlook is still running");
            #endregion
        }
    }
}
