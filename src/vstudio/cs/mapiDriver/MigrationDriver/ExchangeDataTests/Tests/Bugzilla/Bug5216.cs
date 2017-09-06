using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;

namespace ExchangeDataTests.Bugzilla
{
    public class Bug5216 : BaseTestFixture
    {

        public Bug5216()
        {
        }

        [Test, Description("Verify Import wizard succeeds if a subfolder for junk folder imported")]
        [Ignore("Since bug 77510 has been closed as invalid ignoring this test-case.")]
        public void Bug5216_01()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            #region Test Case variables


            string foldername = "bug5216";
            string folderid = null;

            ZAccount account = ZAccount.GetAccount("zma6", GlobalProperties.getProperty("defaultdomain.name"));


            #endregion

            #region SOAP Block

            
            // Get All the Folders
            account.sendSOAP("<GetFolderRequest xmlns='urn:zimbraMail'/>");

            XmlNode n = account.selectSOAP("//mail:GetFolderResponse/mail:folder[@name='"+ foldername +"']", "id", null, out folderid, 1);
            ZAssert.IsNotNull(n, "Verify that the subfolder in junk is migrated correctly");
            ZAssert.IsNotNull(folderid, "Verify the subfolder id exists");


            #endregion

        }

    }
}
