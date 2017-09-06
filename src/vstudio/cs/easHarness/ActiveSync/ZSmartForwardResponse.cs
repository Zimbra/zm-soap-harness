using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZSmartForwardResponse : ZResponse
    {

        public ZSmartForwardResponse(System.Net.HttpWebResponse httpResponse)
        {
            logger.Info("new " + typeof(ZSmartForwardResponse));

            // Remember the http response code
            base.StatusCode = httpResponse.StatusCode;

        }

    }
}