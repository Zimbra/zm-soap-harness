using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZMoveItemsResponse : ZResponse
    {

        public ZMoveItemsResponse(System.Net.HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Info("new " + typeof(ZMoveItemsResponse));
        }
    }
}