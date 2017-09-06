using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using SyncHarness;
using System.Collections;
using Soap;
using System.IO;
using SoapAdmin;
using SoapWebClient;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using System.Xml;

namespace longDurationTests.Client.Calendar.Bugs
{
    [TestFixture]
    public class CalendarBugs : clientTests.BaseTestFixture
    {
        [Test, Description("Bug30991: ZCO takes a long time to load an ics with lots of attendees")]
        [Category("Calendar")]
        [Bug("30991")]
        [SyncDirection(SyncDirection.TOZCO)]
        [TestSteps("Create 1000 users with name perftest1000 to perftest2000", "Modify the ics file to change the Organizer,Attendee to test users",
                    "Import the attached .ics file in ZCS",
                    "sync",
                    "Note the Timestamp before the sync and after the sync", "Time should not more than 2 min")]
        public void Bug30991()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables

            string readIcsFile = GlobalProperties.TestMailRaw + "/Bugs/30991/30991.ics";
            string icsFile = "/Bugs/30991/30991" + GlobalProperties.time() + GlobalProperties.counter() + ".ics";
            string writeIcsFile = GlobalProperties.TestMailRaw + icsFile;
            const int loopCount = 2000;
            string apptSummary = "ITS Family Picnic";
            DateTime startTimeUTC = new DateTime(2010, 12, 25, 20, 30, 00);
            DateTime endTimeUTC = new DateTime(2010, 12, 30, 22, 30, 00);
            string apptInvId;
            #endregion

            #region Account Setup

            for (int userCount = 1000; userCount <= loopCount; userCount++)
            {
                zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                    UserName("testaccountuser" + userCount + "@" + GlobalProperties.getProperty("defaultdomain.name")).
                    UserPassword((GlobalProperties.getProperty("defaultpassword.value"))).AddAttribute("displayName", ("firstname" + userCount + " " + "lastname" + userCount)));

                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:account", "id", null, null, 1);
                zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:a[@n='zimbraMailHost']", null, null, null, 1);
            }

            #endregion

            #region Modify ICS file

            //Modify the ics to be injected as original consists name of zimbra employees
            TextReader rIcs = new StreamReader(readIcsFile);
            TextWriter wIcs = new StreamWriter(writeIcsFile);

            string rLine;
            while ((rLine = rIcs.ReadLine()) != null)
            {
                if (rLine.Contains("ORGANIZERNAME") || rLine.Contains("ACCOUNTNAME") || rLine.Contains("DOMAINNAME") || rLine.Contains("FIRSTNAME") || rLine.Contains("LASTNAME"))
                {
                    rLine = rLine.Replace("ORGANIZERNAME", zAccount.AccountZCO.emailAddress);
                    rLine = rLine.Replace("ACCOUNTNAME", "testaccountuser");
                    rLine = rLine.Replace("DOMAINNAME", zAccount.AccountZCO.zimbraMailHost);
                    rLine = rLine.Replace("FIRSTNAME", "firstname");
                    rLine = rLine.Replace("LASTNAME", "lastname");
                }
                wIcs.WriteLine(rLine);
            }
            rIcs.Close();
            wIcs.Close();

            FileInfo injectIcs = new FileInfo(writeIcsFile);
            zAssert.IsTrue(injectIcs.Exists, "Verify modified .ics file exists");
            #endregion

            #region SOAP Inject the ICS

            // Import an ICS to the account1 mailbox 
            RestClient restClient = new RestClient("POST");
            restClient.account = zAccount.AccountZCO;
            restClient.setUrlFoldername("Calendar");
            restClient.setUrlQuery("fmt", "ics");
            restClient.setPostData(GlobalProperties.TestMailRaw + @icsFile);
            restClient.DoMethod();

            zAccount.AccountZCO.sendSOAP(
                                    new SearchRequest().
                                        Types("appointment").
                                        CalExpandInst(startTimeUTC.AddDays(-1), startTimeUTC.AddDays(1)).
                                        Query(apptSummary));

            zAccount.AccountZCO.selectSOAP("//mail:SearchResponse/mail:appt", "invId", null, out apptInvId, 1);

            zAccount.AccountZCO.sendSOAP(new GetMsgRequest().Message(apptInvId));
            zAccount.AccountZCO.selectSOAP("//mail:GetMsgResponse", null, null, null, 1);

            #endregion

            //Delete the Temp file
            injectIcs.Delete();

            #region Outlook

            DateTime startTimeTest = DateTime.Now;

            OutlookCommands.Instance.Sync();

            DateTime endTimeTest = DateTime.Now;

            TimeSpan difftime = endTimeTest.Subtract(startTimeTest);

            zAssert.Greater(120, difftime.Seconds, "Sync Competed in Less than 2 Minutes.");

            #endregion

        }
    }
}