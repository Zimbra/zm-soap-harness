using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{


    /**
     * 
     * 2013-11-15 03:43:15,608 DEBUG [qtp662845511-10634:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt@qa.zimbra.in&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=FolderSync] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=FolderSync;DeviceID=ApplDNPHG6NVDT9V;Version=12.1;] sync -
     * <?xml version="1.0" encoding="utf-8"?>
     * <FolderSync xmlns="FolderHierarchy">
     *     <SyncKey>{ef0e9523-9dc5-35be-a712-bd6822da6029}2</SyncKey>
     * </FolderSync>
     * 
     * 
     * 
     * 2013-11-15 03:43:15,632 DEBUG [qtp662845511-10634:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt@qa.zimbra.in&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=FolderSync] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=FolderSync;DeviceID=ApplDNPHG6NVDT9V;Version=12.1;] sync -
     * <?xml version="1.0" encoding="utf-8"?>
     * <FolderSync xmlns="FolderHierarchy">
     *     <Status>1</Status>
     *     <SyncKey>{ef0e9523-9dc5-35be-a712-bd6822da6029}3</SyncKey>
     *     <Changes>
     *         <Count>0</Count>
     *     </Changes>
     * </FolderSync>
     * 
     * 
     **/

    public class ZFolderSyncRequest : ZRequest
    {
        private String MyFolderSyncKey = "0";


        #region Property Accessors

        public override ZimbraAccount Account
        {
            get { return (base.Account); }
            set {
                base.Account = value;
                if (base.Account != null)
                {
                    if (base.Account.Device.FolderSyncKey != null)
                    {
                        FolderSyncKey = base.Account.Device.FolderSyncKey;
                    }
                }
            }
        }

        public virtual String FolderSyncKey
        {
            get { return (MyFolderSyncKey); }
            set { 
                MyFolderSyncKey = value;
                DestinationPayloadXML = GeneratePayload();
            }
        }

        #endregion


        //public ZFolderSyncRequest()
        //{
        //    logger.Info("new " + typeof(ZFolderSyncRequest));

        //    Command = "FolderSync";

        //    // Default payload:
        //    DestinationPayloadXML = GeneratePayload();

        //}

        public ZFolderSyncRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZFolderSyncRequest));

            Command = "FolderSync";

            Account = account;

            // Default payload:
            DestinationPayloadXML = GeneratePayload();

        }

        public ZFolderSyncRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZFolderSyncRequest) + " with payload");

            Command = "FolderSync";
        }

        /// <summary>
        /// Generic method to create a Sync request using the  Account and CollectionId information
        /// </summary>
        /// <returns></returns>
        public virtual String GeneratePayload()
        {


            String value = @"<?xml version='1.0' encoding='utf-8'?>
                <FolderSync xmlns='FolderHierarchy'>
                    <SyncKey>"+ FolderSyncKey +@"</SyncKey>
                </FolderSync>";

            return (value);

        }

        public override ZResponse WrapResponse(HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            ZFolderSyncResponse folderSyncResponse = new ZFolderSyncResponse(response);
            if (folderSyncResponse.FolderSyncKey != null)
            {
                this.Account.Device.FolderSyncKey = folderSyncResponse.FolderSyncKey;
            }

            return (folderSyncResponse);
        }


    }
}
