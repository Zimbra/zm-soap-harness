using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZGetItemEstimateResponse : ZResponse
    {


        public ZGetItemEstimateResponse(System.Net.HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Debug("new " + typeof(ZGetItemEstimateResponse));



        }

      
    }
}
