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
    <FolderCreate xmlns="FolderHierarchy">
    <SyncKey>1</SyncKey>
    <ParentId>5</ParentId>
    <DisplayName>NewFolder</DisplayName>
    <Type>12</Type>
    </FolderCreate>
     * 
     **/

    public class ZFolderCreateRequest : ZRequest
    {

        public ZFolderCreateRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZFolderCreateRequest));

            Command = "FolderCreate";

            // Default payload:
            DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
                <FolderCreate xmlns='FolderHierarchy'>
                <SyncKey>1</SyncKey>
                <ParentId>2</ParentId>
                <DisplayName>NewFolder</DisplayName>
                <Type>12</Type>
                </FolderCreate>";


        }

        public ZFolderCreateRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZFolderCreateRequest) + " with payload");

            Command = "FolderCreate";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZFolderCreateResponse(response);
        }

    }
}