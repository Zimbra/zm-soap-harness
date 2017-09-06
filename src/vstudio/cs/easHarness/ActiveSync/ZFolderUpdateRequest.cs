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
    <FolderUpdate xmlns="FolderHierarchy">
    <SyncKey>3</SyncKey>
    <ServerId>14</ServerId>
    <ParentId>5</ParentId>
    <DisplayName>NewName</DisplayName>
    </FolderUpdate>
     * 
     **/



    public class ZFolderUpdateRequest : ZRequest
    {

        public ZFolderUpdateRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZFolderUpdateRequest));

            Command = "FolderUpdate";

            // Default payload:
            DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
                <FolderUpdate xmlns='FolderHierarchy'>
                <SyncKey>1</SyncKey>
                <ServerId>2</ServerId>
                <ParentId>1</ParentId>
                <DisplayName>Inbox</DisplayName>
                </FolderUpdate>";


        }

        public ZFolderUpdateRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZFolderUpdateRequest) + " with payload");

            Command = "FolderUpdate";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZFolderUpdateResponse(response);
        }

    }
}