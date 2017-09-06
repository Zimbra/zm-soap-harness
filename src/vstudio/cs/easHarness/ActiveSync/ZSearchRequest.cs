using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{

    /**
     * 
     * 2013-11-15 03:12:16,202 DEBUG [qtp662845511-10441:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt@qa.zimbra.in&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=Search] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Search;DeviceID=ApplDNPHG6NVDT9V;Version=12.1;] sync - 
     * <?xml version="1.0" encoding="utf-8"?>
     * <Search xmlns="Search">
     *     <Store>
     *         <Name>GAL</Name>
     *         <Query>ad</Query>
     *         <Options>
     *             <Range>0-50</Range>
     *         </Options>
     *     </Store>
     * </Search>
     * 
     * 
     * 
     * 2013-11-15 03:12:16,211 DEBUG [qtp662845511-10441:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt@qa.zimbra.in&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=Search] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Search;DeviceID=ApplDNPHG6NVDT9V;Version=12.1;] sync - 
     * <?xml version="1.0" encoding="utf-8"?>
     * <Search xmlns="Search">
     *        <Status>1</Status>
     *        <Response>
     *            <Store>
     *                <Status>1</Status>
     *                <Result>
     *                    <Properties>
     *                        <GAL:DisplayName>BlackBerry Administrator</GAL:DisplayName>
     *                        <GAL:FirstName>BlackBerry</GAL:FirstName>
     *                        <GAL:LastName>Administrator</GAL:LastName>
     *                        <GAL:EmailAddress>besadmin@qa.zimbra.in</GAL:EmailAddress>
     *                    </Properties>
     *                </Result>
     *                <Result>
     *                    <Properties>
     *                        <GAL:DisplayName>admin</GAL:DisplayName>
     *                        <GAL:LastName>admin</GAL:LastName>
     *                        <GAL:EmailAddress>admin@qa.zimbra.in</GAL:EmailAddress>
     *                    </Properties>
     *                </Result>
     *                <Range>0-1</Range>
     *                <Total>2</Total>
     *            </Store>
     *        </Response>
     *    </Search>
     * 
     * 
     **/


    public class ZSearchRequest : ZRequest
    {

        public ZSearchRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZSearchRequest) + " with payload");

            Command = "Search";
        }

        public override ZResponse WrapResponse(HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZSearchResponse(response);
        }

    }
}
