using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;
using System.Xml;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZSyncResponse : ZResponse
    {
        private String MySyncKey = null;
        private String MyCollectionId = "2";

        #region Property Accessors

        public String SyncKey
        {
            get { return (MySyncKey); }
        }

        public String CollectionId
        {
            get { return (MyCollectionId); }
        }
        
        #endregion


        public ZSyncResponse(System.Net.HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Debug("new " + typeof(ZSyncResponse));


            if ( this.StatusCode == System.Net.HttpStatusCode.InternalServerError ) {
                    throw new HarnessException("Server threw 500 when waiting for SyncResponse");
            }
            

            if (XmlDoc != null)
            {

                // Get the Status
                XmlNodeList nodes = XmlDoc.SelectNodes("//AirSync:Status", ZAssert.NamespaceManager);
                if (nodes.Count == 1)
                {
                    XmlNode node = nodes.Item(0);
                    String status = node.InnerText;
                    if (status.Equals("3"))
                    {
                        throw new HarnessException("Invalid or mismatched synchronization key OR Synchronization state corrupted on server");
                    }
                }

                // Get the CollectionId
                nodes = XmlDoc.SelectNodes("//AirSync:CollectionId", ZAssert.NamespaceManager);
                if (nodes.Count == 1)
                {
                    XmlNode node = nodes.Item(0);
                    MyCollectionId = node.InnerText;
                }

                // Get the SyncKey
                nodes = XmlDoc.SelectNodes("//AirSync:SyncKey", ZAssert.NamespaceManager);
                if (nodes.Count == 1)
                {
                    XmlNode node = nodes.Item(0);
                    MySyncKey = node.InnerText;
                }
            }



        }

    }

}
