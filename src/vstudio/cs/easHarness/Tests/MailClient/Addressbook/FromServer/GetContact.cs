using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using Utilities;
using Zimbra.EasHarness.ActiveSync;
using System.Xml;

namespace Tests.MailClient.Addressbook.FromServer
{
    [TestFixture]
    public class GetContact : Tests.BaseTestFixture
    {


        /*
        
2013-12-16 10:26:23,309 DEBUG [qtp1377413258-51892:https://172.16.21.9:443/Microsoft-Server-ActiveSync?User=mobile&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=Sync] [name=mobile@zimbraqa-002.corp.zimbra.com;mid=99;ip=172.16.31.16;Cmd=Sync;DeviceID=ApplDNPHG6NVDT9V;Version=12.1;] sync -
<?xml version="1.0" encoding="utf-8"?>
<Sync>
    <Collections>
        <Collection>
            <SyncKey>{8223ab0c-4737-3279-95bb-c8f7994a4d23}3</SyncKey>
            <CollectionId>7</CollectionId>
            <Status>1</Status>
            <Commands>
                <Add>
                    <ServerId>273</ServerId>
                    <ApplicationData>
                        <POOMCONTACTS:FileAs>Last, First</POOMCONTACTS:FileAs>
                        <POOMCONTACTS:LastName>Last</POOMCONTACTS:LastName>
                        <POOMCONTACTS:Email1Address>joe@example.com</POOMCONTACTS:Email1Address>
                        <POOMCONTACTS:FirstName>First</POOMCONTACTS:FirstName>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>


 
         
         * */

        [Test, Description("Sync contact with basic information to the device"),
        Property("TestSteps", "1. Add a contact to the mailbox, 2. Sync to device, 3. Verify Contact details")]
        [Category("Smoke")]
        [Category("Contacts")]
        [Category("L1")]
        public void GetContact01()
        {

            /*
             * Get a new contact from the server
             */


            #region TEST SETUP

            // Add a contact to the mailbox
            //
            String firstname = "first" + HarnessProperties.getUniqueString();
            String lastname = "last" + HarnessProperties.getUniqueString();
            String email = "email" + HarnessProperties.getUniqueString() + "@example.com";
            TestAccount.soapSend(
                @"<CreateContactRequest xmlns='urn:zimbraMail'>
                    <cn>
                        <a n='firstName'>"+ firstname +@"</a>
                        <a n='lastName'>" + lastname + @"</a>
                        <a n='email'>" + email +@"</a>
                    </cn>     
                </CreateContactRequest>");



            #endregion



            #region TEST ACTION


            // Send the SyncRequest
            ZSyncRequest syncRequest = new ZSyncRequest(TestAccount);
            syncRequest.CollectionId = HarnessProperties.getString("folder.contacts.id");
            syncRequest.SyncKey = TestAccount.Device.SyncKeys[syncRequest.CollectionId] as String;
            ZSyncResponse syncResponse = TestClient.sendRequest(syncRequest) as ZSyncResponse;
            ZAssert.IsNotNull(syncResponse, "Verify the Sync response was received");


            #endregion




            #region TEST VERIFICATION


            // Get the matching <Add/> elements
            XmlElement Add = ZSyncResponse.getMatchingElement(syncResponse.XmlElement, "//AirSync:Add", "//contacts:Email1Address[text() = '" + email + "']");
            ZAssert.IsNotNull(Add, "Verify the Add was returned in the Sync Response");

            // Verify the <Add/> element contents match the message
            ZAssert.XmlXpathMatch(Add, "//contacts:Email1Address ", null, email, "Verify the Email1Address field is correct");
            ZAssert.XmlXpathMatch(Add, "//contacts:LastName", null, lastname, "Verify the LastName field is correct");
            ZAssert.XmlXpathMatch(Add, "//contacts:FirstName", null, firstname, "Verify the FirstName field is correct");
            ZAssert.XmlXpathMatch(Add, "//contacts:FileAs", null, lastname + ", " + firstname, "Verify the FileAs field is correct");


            #endregion


        }


    }
}
