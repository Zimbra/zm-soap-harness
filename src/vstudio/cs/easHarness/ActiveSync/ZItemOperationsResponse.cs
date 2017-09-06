using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZItemOperationsResponse : ZResponse
    {

        public ZItemOperationsResponse(System.Net.HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Info("new " + typeof(ZItemOperationsResponse));
        }
    }
}
