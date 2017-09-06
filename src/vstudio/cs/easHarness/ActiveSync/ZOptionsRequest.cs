using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZOptionsRequest : ZRequest
    {

        public ZOptionsRequest(ZimbraAccount account)
            : base(account)
        {
            base.HttpMethod = "OPTIONS";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZOptionsResponse(response);
        }

    }
}
