using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZSearchResponse : ZResponse
    {
        public ZSearchResponse(System.Net.HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Debug("new " + typeof(ZSearchResponse));

            if (XmlDoc != null)
            {

                // Get the Status
                XmlNodeList nodes = XmlDoc.SelectNodes("//Search:Status", ZAssert.NamespaceManager);
                if (nodes.Count == 1)
                {
                    XmlNode node = nodes.Item(0);
                    String status = node.InnerText;
                    if (!status.Equals("1"))
                    {
                        throw new HarnessException("Search Status is not 1, so indicates failure");
                    }
                }


            }
        }

    }
}
