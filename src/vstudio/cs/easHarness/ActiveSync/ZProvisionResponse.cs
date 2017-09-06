using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;
using System.Xml;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZProvisionResponse : ZResponse
    {


        #region Property Accessors

        public EASPolicy Policy
        {
            get
            {
                
                if (base.XmlDoc == null)
                {
                    throw new HarnessException("XmlDoc is null.  Has the response been received?");
                }

                EASPolicy policy = new EASPolicy();
                policy.LoadXML(base.XmlString);
                return (policy);

            }
        }

        public Int32 Status
        {
            get
            {
                if (base.XmlDoc == null)
                {
                    throw new HarnessException("XmlDoc is null.  Has the response been received?");
                }

                XmlNode node = XmlDoc.SelectSingleNode("//Provision:Provision/Provision:Status", ZAssert.NamespaceManager);
                if (node == null)
                {
                    throw new HarnessException("No <provision><status></status></provision> node! " + XmlString);
                }
                return (XmlConvert.ToInt32(node.InnerText));
            }
        }

        #endregion

        public ZProvisionResponse(System.Net.HttpWebResponse httpResponse) :
            base(httpResponse)
        {
            logger.Info("new " + typeof(ZProvisionResponse));

        }

    }
}
