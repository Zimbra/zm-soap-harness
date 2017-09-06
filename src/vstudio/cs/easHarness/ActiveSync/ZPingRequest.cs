using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZPingRequest : ZRequest
    {

        // TODO: This needs to run ASync

        public ZPingRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZPingRequest));

            Command = "Ping";

            // Default payload:
//            DestinationPayloadXML =
//                @"<?xml version='1.0' encoding='utf-8'?>
//                  <Ping xmlns='Ping'>
//                    <HeartbeatInterval>300</HeartbeatInterval>
//                    <Folders>
//                      <Folder>
//                        <Id>10</Id>
//                        <Class>Calendar</Class>
//                      </Folder>
//                      <Folder>
//                        <Id>5</Id>
//                        <Class>Email</Class>
//                      </Folder>
//                      <Folder>
//                        <Id>15</Id>
//                        <Class>Tasks</Class>
//                      </Folder>
//                      <Folder>
//                        <Id>7</Id>
//                        <Class>Contacts</Class>
//                      </Folder>
//                      <Folder>
//                        <Id>2</Id>
//                        <Class>Email</Class>
//                      </Folder>
//                    </Folders>
//                  </Ping>";

            DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
                  <Ping xmlns='Ping'>
                    <HeartbeatInterval>300</HeartbeatInterval>
                    <Folders>
                      <Folder>
                        <Id>2</Id>
                        <Class>Email</Class>
                      </Folder>
                    </Folders>
                  </Ping>";

        }

        public ZPingRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZPingRequest) + " with payload");

            Command = "Ping";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZPingResponse(response);
        }


    }
}
