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
    <MoveItems xmlns="Move">
      <Move>
        <SrcMsgId>5:1</SrcMsgId>
        <SrcFldId>5</SrcFldId>
        <DstFldId>14</DstFldId>
      </Move>
    </MoveItems>
     * 
     */ 

    public class ZMoveItemsRequest : ZRequest
    {

        public ZMoveItemsRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZMoveItemsRequest) + " with payload");

            Command = "MoveItems";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZMoveItemsResponse(response);
        }

    }
}
