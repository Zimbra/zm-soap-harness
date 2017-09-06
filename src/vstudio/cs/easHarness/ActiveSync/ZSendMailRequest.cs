using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{


    /**
     * 
     * 2013-11-15 03:12:29,238 DEBUG [qtp662845511-10445:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt@qa.zimbra.in&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=SendMail&SaveInSent=T] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=SendMail;DeviceID=ApplDNPHG6NVDT9V;Version=12.1;] sync - 
     * Subject: Test
     * From: Matt Rhoades <matt@qa.zimbra.in@qa.zimbra.in>
     * Content-Type: text/plain;
     * 	charset=us-ascii
     * Message-Id: <B44F75D7-CA91-464B-9EA6-98D5DDAF3D73@qa.zimbra.in>
     * Date: Thu, 14 Nov 2013 13:52:46 -0800
     * To: admin <admin@qa.zimbra.in>
     * Content-Transfer-Encoding: 7bit
     * MIME-Version: 1.0
     * 
     * 
     * Test
     * 
     * 
     * 2013-11-15 03:12:29,406 INFO  [qtp662845511-10445:http://10.112.205.194:80/Microsoft-Server-ActiveSync?User=matt@qa.zimbra.in&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=SendMail&SaveInSent=T] [name=matt@qa.zimbra.in;mid=17;ip=10.112.205.193;Cmd=SendMail;DeviceID=ApplDNPHG6NVDT9V;Version=12.1;] sync - HTTP/1.1 200 OK
     * 
     * 
     **/



    public class ZSendMailRequest : ZRequest
    {

        public ZSendMailRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZSendMailRequest));

            Command = "SendMail";
            CommandParameter[] cp = new CommandParameter[1];
            CommandParameters = cp;
            CommandParameters[0].Parameter = "SaveInSent";
            CommandParameters[0].Value = "T";

            // Default payload:
            DestinationPayloadText =
                @"Subject: Test
From: Foo Bar <foo@example.com>
Content-Type: text/plain;
	charset=us-ascii
Date: Thu, 14 Nov 2016 13:52:46 -0800
To: Foo Bar <foo@example.com>
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0


Test


";


        }

        public ZSendMailRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZSendMailRequest) + " with payload");

            Command = "SendMail";
            CommandParameter[] cp = new CommandParameter[1];
            CommandParameters = cp;
            CommandParameters[0].Parameter = "SaveInSent";
            CommandParameters[0].Value = "T";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZSendMailResponse(response);
        }

    }
}
