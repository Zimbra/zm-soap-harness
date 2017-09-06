using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZSendMailResponse : ZResponse
    {

        public ZSendMailResponse(System.Net.HttpWebResponse httpResponse)
        {
            logger.Info("new " + typeof(ZSendMailResponse));

            // Remember the http response code
            base.StatusCode = httpResponse.StatusCode;

        }

    }
}
