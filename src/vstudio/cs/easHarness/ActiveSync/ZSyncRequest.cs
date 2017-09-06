using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    #region Example Trace

    /*
    
[ip=10.112.205.193;] sync - User=matt; DeviceID=ApplJ3049BA2Z38; DeviceType=iPad; UA=Apple-iPad1C1/902.206; Protocol=12.1; PolicyKey=313665661
2013-11-15 01:05:16,310 DEBUG [qtp662845511-9678:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt&DeviceId=ApplJ3049BA2Z38&DeviceType=iPad&Cmd=Sync] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Sync;DeviceID=ApplJ3049BA2Z38;Version=12.1;] sync - 
<?xml version="1.0" encoding="utf-8"?>
<Sync xmlns="AirSync">
    <Collections>
        <Collection>
            <SyncKey>0</SyncKey>
            <CollectionId>2</CollectionId>
            <Options>
                <FilterType>2</FilterType>
                <MIMETruncation>1</MIMETruncation>
                <MIMESupport>0</MIMESupport>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>

2013-11-15 01:05:16,334 DEBUG [qtp662845511-9678:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt&DeviceId=ApplJ3049BA2Z38&DeviceType=iPad&Cmd=Sync] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Sync;DeviceID=ApplJ3049BA2Z38;Version=12.1;] sync - 
<?xml version="1.0" encoding="utf-8"?>
<Sync>
    <Collections>
        <Collection>
            <SyncKey>{a0e8d2d4-e9e3-3fd7-944d-2ca6a8359440}1</SyncKey>
            <CollectionId>2</CollectionId>
            <Status>1</Status>
        </Collection>
    </Collections>
</Sync>

2013-11-15 01:05:16,786 DEBUG [qtp662845511-9671:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt&DeviceId=ApplJ3049BA2Z38&DeviceType=iPad&Cmd=Sync] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Sync;DeviceID=ApplJ3049BA2Z38;Version=12.1;] sync - 
<?xml version="1.0" encoding="utf-8"?>
<Sync xmlns="AirSync">
    <Collections>
        <Collection>
            <SyncKey>{a0e8d2d4-e9e3-3fd7-944d-2ca6a8359440}1</SyncKey>
            <CollectionId>2</CollectionId>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Options>
                <FilterType>2</FilterType>
                <MIMETruncation>1</MIMETruncation>
                <MIMESupport>0</MIMESupport>
                <AirSyncBase:BodyPreference>
                    <AirSyncBase:Type>1</AirSyncBase:Type>
                    <AirSyncBase:TruncationSize>500</AirSyncBase:TruncationSize>
                </AirSyncBase:BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>

2013-11-15 01:05:16,831 DEBUG [qtp662845511-9671:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt&DeviceId=ApplJ3049BA2Z38&DeviceType=iPad&Cmd=Sync] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Sync;DeviceID=ApplJ3049BA2Z38;Version=12.1;] sync - 
<?xml version="1.0" encoding="utf-8"?>
<Sync>
    <Collections>
        <Collection>
            <SyncKey>{a0e8d2d4-e9e3-3fd7-944d-2ca6a8359440}2</SyncKey>
            <CollectionId>2</CollectionId>
            <Status>1</Status>
            <Commands>
                <Add>
                    <ServerId>257</ServerId>
                    <ApplicationData>
                        <POOMMAIL:To>Matt Rhoades &lt;matt@qa.zimbra.in&gt;</POOMMAIL:To>
                        <POOMMAIL:From>vmwen2@qa.zimbra.in</POOMMAIL:From>
                        <POOMMAIL:Reply-To>vmwen2@qa.zimbra.in</POOMMAIL:Reply-To>
                        <POOMMAIL:Subject>test</POOMMAIL:Subject>
                        <POOMMAIL:DateReceived>2013-11-14T19:25:40.000Z</POOMMAIL:DateReceived>
                        <POOMMAIL:Importance>1</POOMMAIL:Importance>
                        <POOMMAIL:Read>1</POOMMAIL:Read>
                        <AirSyncBase:Body>
                            <AirSyncBase:Type>1</AirSyncBase:Type>
                            <AirSyncBase:EstimatedDataSize>7</AirSyncBase:EstimatedDataSize>
                            <AirSyncBase:Data>test &#xd;
</AirSyncBase:Data>
                        </AirSyncBase:Body>
                        <POOMMAIL:Flag/>
                        <POOMMAIL:ContentClass>urn:content-classes:message</POOMMAIL:ContentClass>
                        <AirSyncBase:NativeBodyType>1</AirSyncBase:NativeBodyType>
                        <POOMMAIL:MessageClass>IPM.Note</POOMMAIL:MessageClass>
                        <POOMMAIL:InternetCPID>65001</POOMMAIL:InternetCPID>
                    </ApplicationData>
                </Add>
            </Commands>
        </Collection>
    </Collections>
</Sync>
 
     */

    #endregion




    public class ZSyncRequest : ZRequest
    {

        private String MySyncKey = "0";

        // The folder to sync (?)
        private String MyCollectionId = "2"; // Inbox by default

        #region Property Accessors

        public override ZimbraAccount Account
        {
            get { return (base.Account); }
            set {
                base.Account = value;
                if (base.Account != null)
                {
                    if (base.Account.Device.SyncKeys[CollectionId] != null)
                    {
                        SyncKey = base.Account.Device.SyncKeys[CollectionId] as String;
                    }
                }
            }
        }

        public virtual String CollectionId
        {
            get { return (MyCollectionId); }
            set {
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
            set { 
                MySyncKey = value;
                DestinationPayloadXML = GeneratePayload();
            }
        }

        #endregion


        public ZSyncRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZSyncRequest));

            Command = "Sync";

            // Default payload:
            DestinationPayloadXML = GeneratePayload();
        }


        public ZSyncRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZSyncRequest) + " with payload");

            Command = "Sync";
        }

        /// <summary>
        /// Generic method to create a Sync request using the  Account and CollectionId information
        /// </summary>
        /// <returns></returns>
        public virtual String GeneratePayload()
        {

            // Default - Mail folder sync
            String value = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey + @"</SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
            <GetChanges/>
            <Options>
                <FilterType>2</FilterType>
                <MIMETruncation>1</MIMETruncation>
                <MIMESupport>0</MIMESupport>
                <BodyPreference xmlns='AirSyncBase'>
                    <Type>1</Type>
                    <TruncationSize>500</TruncationSize>
                </BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>";

            if (CollectionId.Equals("7"))
            {

                // Contacts folder sync
                value = @"<?xml version='1.0' encoding='utf-8'?>
<Sync xmlns='AirSync'>
    <Collections>
        <Collection>
            <SyncKey>" + SyncKey + @"</SyncKey>
            <CollectionId>" + CollectionId + @"</CollectionId>
            <GetChanges/>
            <WindowSize>25</WindowSize>
            <Options>
                <BodyPreference xmlns='AirSyncBase'>
                    <Type>1</Type>
                    <TruncationSize>32768</TruncationSize>
                </BodyPreference>
            </Options>
        </Collection>
    </Collections>
</Sync>";

            }

            return (value);

        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            ZSyncResponse syncResponse = new ZSyncResponse(response);
            if (syncResponse.SyncKey != null && syncResponse.CollectionId != null)
            {
                this.Account.Device.SyncKeys[syncResponse.CollectionId] = syncResponse.SyncKey;
            }
            return (syncResponse);
        }

    }
}
