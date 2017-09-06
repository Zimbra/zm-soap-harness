using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{

    /**
     * 2014-05-05 14:29:11,165 DEBUG [qtp509886383-505:https://172.16.21.24:443/Microsoft-Server-ActiveSync?Cmd=GetItemEstimate&User=s4&DeviceId=SEC15DBC0BEAFB46&DeviceType=SAMSUNGSGHI337] [name=s4@mu12.corp.zimbra.com;mid=7;ip=172.16.31.51;DeviceID=SEC15DBC0BEAFB46;Cmd=GetItemEstimate;Version=2.5;] sync -
     * <?xml version="1.0" encoding="utf-8"?>
     * <GetItemEstimate xmlns="GetItemEstimate">
     *     <Collections>
     *         <Collection>
     *             <Class>Email</Class>
     *             <AirSync:SyncKey>{c8f32563-79fb-3af2-bc23-7ff5a55a23a3}1</AirSync:SyncKey>
     *             <CollectionId>262</CollectionId>
     *             <AirSync:FilterType>0</AirSync:FilterType>
     *         </Collection>
     *     </Collections>
     * </GetItemEstimate>
     * 
     * 2014-05-05 14:29:11,167 DEBUG [qtp509886383-505:https://172.16.21.24:443/Microsoft-Server-ActiveSync?Cmd=GetItemEstimate&User=s4&DeviceId=SEC15DBC0BEAFB46&DeviceType=SAMSUNGSGHI337] [name=s4@mu12.corp.zimbra.com;mid=7;ip=172.16.31.51;DeviceID=SEC15DBC0BEAFB46;Cmd=GetItemEstimate;Version=2.5;] sync -
     * <?xml version="1.0" encoding="utf-8"?>
     * <GetItemEstimate xmlns="GetItemEstimate">
     *     <Response>
     *         <Status>1</Status>
     *         <Collection>
     *             <Class>Email</Class>
     *             <CollectionId>262</CollectionId>
     *             <Estimate>4</Estimate>
     *         </Collection>
     *     </Response>
     * </GetItemEstimate>
     * 
     **/

    public class ZGetItemEstimateRequest : ZRequest
    {

        private String MySyncKey = "0";
        private String MyCollectionId = "2"; // Inbox by default

        #region Property Accessors

        public virtual String CollectionId
        {
            get { return (MyCollectionId); }
            set
            {
                if (!MyCollectionId.Equals(value))
                {
                    // If there is a change in CollectionId, we need to clear the SyncKey
                    SyncKey = "0";
                }
                MyCollectionId = value;
                if (Account != null)
                {
                    if (Account.Device.SyncKeys[MyCollectionId] != null)
                    {
                        SyncKey = Account.Device.SyncKeys[MyCollectionId] as String;
                    }
                }
                DestinationPayloadXML = GeneratePayload();
            }
        }

        public virtual String SyncKey
        {
            get { return (MySyncKey); }
            set
            {
                MySyncKey = value;
                DestinationPayloadXML = GeneratePayload();
            }
        }


        #endregion


        public ZGetItemEstimateRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZGetItemEstimateRequest));

            Command = "GetItemEstimate";

            Account = account;

            // Default payload:
            DestinationPayloadXML = GeneratePayload();

        }


        /// <summary>
        /// Generic method to create a Sync request using the  Account and CollectionId information
        /// </summary>
        /// <returns></returns>
        public virtual String GeneratePayload()
        {


            String value = @"<?xml version='1.0' encoding='utf-8'?>
<GetItemEstimate xmlns='GetItemEstimate' xmlns:AirSync='AirSync'>
    <Collections>
        <Collection>
            <Class>Email</Class>
            <AirSync:SyncKey>" + SyncKey + @"</AirSync:SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
            <AirSync:FilterType>0</AirSync:FilterType>
        </Collection>
    </Collections>
</GetItemEstimate>";

            return (value);

        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            ZGetItemEstimateResponse getItemEstimateResponse = new ZGetItemEstimateResponse(response);
            
            return (getItemEstimateResponse);

        }

    

    }
}
