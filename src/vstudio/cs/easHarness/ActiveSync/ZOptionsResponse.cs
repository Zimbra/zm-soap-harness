using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZOptionsResponse : ZResponse
    {
        private String MyCommands = null;
        private String MyVersions = null;

        #region Property Accessors

        public String Commands
        {
            get { return (MyCommands); }
            set { MyCommands = value; }
        }

        public String Versions
        {
            get { return (MyVersions); }
            set { MyVersions = value; }
        }

        #endregion

        public ZOptionsResponse(System.Net.HttpWebResponse httpResponse)
        {
            logger.Info("new " + typeof(ZOptionsResponse));

            // Remember the http response code
            base.StatusCode = httpResponse.StatusCode;

            // Get the MS-ASProtocolCommands header to determine the
            // supported commands
            Commands = httpResponse.Headers.Get("MS-ASProtocolCommands");

            // Get the MS-ASProtocolVersions header to determine the
            // supported versions
            Versions = httpResponse.Headers.Get("MS-ASProtocolVersions");

        }

    }
}
