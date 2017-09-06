using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{

    /**
     * 
    <?xml version='1.0' encoding='utf-8'?>
    <MeetingResponse xmlns='MeetingResponse'>
      <Request>
        <UserResponse>1</UserResponse>
        <CollectionId>2</CollectionId>
        <RequestId>" + ServerId + "</RequestId>
      </Request>" +
    </MeetingResponse>");
     * 
     **/

    public class ZMeetingResponse : ZRequest
    {


        public ZMeetingResponse(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZMeetingResponse) + " with payload");

            Command = "MeetingResponse";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZMeetingResponse_Resp(response);
        }

    }
}
