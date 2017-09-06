using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Xml;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZFolderSyncResponse : ZResponse
    {
        private String MyFolderSyncKey = null;

        #region Property Accessors

        public String FolderSyncKey
        {
            get { return (MyFolderSyncKey); }
            set { MyFolderSyncKey = value; }
        }

        #endregion

        public ZFolderSyncResponse(HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Debug("new " + typeof(ZFolderSyncResponse));

            // Set the FolderSyncKey
            XmlNodeList nodes = this.XmlElement.SelectNodes("//FolderHierarchy:SyncKey", ZAssert.NamespaceManager);
            if (nodes != null && nodes.Count == 1)
            {
                FolderSyncKey = nodes.Item(0).InnerText;
            }

        }
    }
}
