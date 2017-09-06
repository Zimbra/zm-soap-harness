using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{


    /**
     * 
    <?xml version="1.0" encoding="utf-8"?>
    <FolderDelete xmlns="FolderHierarchy">
    <SyncKey>2</SyncKey>
    <ServerId>13</ServerId>
    </FolderDelete>
     * 
     **/



    public class ZFolderDeleteRequest : ZRequest
    {

        public ZFolderDeleteRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZFolderDeleteRequest));

            Command = "FolderDelete";

            // Default payload:
            DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
                <FolderDelete xmlns='FolderHierarchy'>
                <SyncKey>2</SyncKey>
                <ServerId>13</ServerId>
                </FolderDelete>";

        }

        public ZFolderDeleteRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZFolderDeleteRequest) + " with payload");

            Command = "FolderDelete";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZFolderDeleteResponse(response);
        }

    }
}