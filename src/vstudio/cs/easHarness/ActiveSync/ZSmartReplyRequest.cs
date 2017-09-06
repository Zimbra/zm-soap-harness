using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{

    public class ZSmartReplyRequest : ZRequest
    {

        private String MyItemId = null;
        private String MyCollectionId = null;
        public bool isItemSearched = false;          


        /// <summary>
        /// ItemId value of source email used in SmartReply
        /// </summary>
        public String ItemId
        {
            get { return (MyItemId); }

            set 
            { 
                MyItemId = value;

                if (!isItemSearched)
                {
                    CommandParameters[1].Parameter = "ItemId";
                    CommandParameters[1].Value = MyItemId;
                }
                else
                {
                    CommandParameters[1].Parameter = "LongId";
                    CommandParameters[1].Value = MyItemId;
                }
            }
        }

        /// <summary>
        /// CollectionId value of source email used in SmartReply
        /// </summary>
        public String CollectionId
        {
            get { return (MyCollectionId); }

            set
            {
                MyCollectionId = value;

                CommandParameters[2].Parameter = "CollectionId";
                CommandParameters[2].Value = MyCollectionId;
            }
        }

        public ZSmartReplyRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZSmartReplyRequest));

            Command = "SmartReply";
            CommandParameter[] cp = new CommandParameter[3];
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
References: <messageid@example.com>
In-Reply-To: <messageid@example.com>
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0

Test

";


        }

        public ZSmartReplyRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZSmartReplyRequest) + " with payload");

            Command = "SmartReply";
            CommandParameter[] cp = new CommandParameter[2];
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

            return new ZSmartReplyResponse(response);
        }

    }
}
