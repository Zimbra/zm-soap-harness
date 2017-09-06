using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZSmartReplyResponse : ZResponse
    {

        public ZSmartReplyResponse(System.Net.HttpWebResponse httpResponse)
        {
            logger.Info("new " + typeof(ZSmartReplyResponse));

            // Remember the http response code
            base.StatusCode = httpResponse.StatusCode;

        }

    }
}