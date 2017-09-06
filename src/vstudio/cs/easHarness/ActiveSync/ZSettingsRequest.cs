using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    /**
     * 
     * [ip=10.112.205.193;] sync - User=matt; DeviceID=ApplJ3049BA2Z38; DeviceType=iPad; UA=Apple-iPad1C1/902.206; Protocol=12.1; PolicyKey=313665661
     * 2013-11-15 01:05:14,459 DEBUG [qtp662845511-9677:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt&DeviceId=ApplJ3049BA2Z38&DeviceType=iPad&Cmd=Settings] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Settings;DeviceID=ApplJ3049BA2Z38;Version=12.1;] sync - 
     * <?xml version="1.0" encoding="utf-8"?>
     * <Settings xmlns="Settings">
     *     <UserInformation>
     *         <Get/>
     *     </UserInformation>
     * </Settings>
     * 
     * 2013-11-15 01:05:14,459 DEBUG [qtp662845511-9677:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt&DeviceId=ApplJ3049BA2Z38&DeviceType=iPad&Cmd=Settings] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=Settings;DeviceID=ApplJ3049BA2Z38;Version=12.1;] sync - 
     * <?xml version="1.0" encoding="utf-8"?>
     * <Settings xmlns="Settings">
     *     <Status>1</Status>
     *     <UserInformation>
     *         <Status>1</Status>
     *         <Get>
     *             <EmailAddresses>
     *                 <SmtpAddress>mrhoades@qa.zimbra.in</SmtpAddress>
     *                 <PrimarySmtpAddress>matt@qa.zimbra.in</PrimarySmtpAddress>
     *             </EmailAddresses>
     *         </Get>
     *     </UserInformation>
     * </Settings>
     * 
     * 
     **/



    public class ZSettingsRequest : ZRequest
    {

        public ZSettingsRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZSettingsRequest));

            Command = "Settings";

            // Default payload:
            DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
                    <Settings xmlns='Settings'>
                        <UserInformation>
                            <Get/>
                        </UserInformation>
                    </Settings>";


        }

        public ZSettingsRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZSettingsRequest) + " with payload");

            Command = "Settings";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZSettingsResponse(response);
        }


    }
}
