using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{

    /*Notes
     * The ItemOperations command acts as a container for the Fetch element (section 2.2.3.64.1), the EmptyFolderContents element (section 2.2.3.56), and the Move element (section 2.2.3.110.1)
     * to provide batched online handling of these operations against the server.
     * Also, used for fetching searched item using LongId
     * Also, used for fetching attachment
     */

    public class ZItemOperationsRequest : ZRequest
    {

        public ZItemOperationsRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZItemOperationsRequest) + " with payload");

            Command = "ItemOperations";
        }

        public override ZResponse WrapResponse(HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZItemOperationsResponse(response);
        }

    }
}

