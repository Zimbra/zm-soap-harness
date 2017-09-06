using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZSettingsResponse : ZResponse
    {
        public ZSettingsResponse(System.Net.HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Debug("new " + typeof(ZSettingsResponse));

        }

    }
}
