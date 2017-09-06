using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;
using log4net;
using System.Net;
using System.IO;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZGetAttachmentRequest : ZRequest
    {

        #region Request trace

        // https://zqa-061.eng.zimbra.com/Microsoft-Server-ActiveSync?Cmd=GetAttachment&AttachmentName=zS12IbC257%2F442320attachmentTestPpt.pptx4&User=p1%40zqa-061.eng.zimbra.com&DeviceId=androidc1442305031&DeviceType=Android] 
        
        #endregion

        public ZGetAttachmentRequest(ZimbraAccount account, String filereference)
            : base(account)
        {
            logger.Info("new " + typeof(ZGetAttachmentRequest));

            Command = "GetAttachment";

            CommandParameter[] cp = new CommandParameter[1];
            CommandParameters = cp;
            CommandParameters[0].Parameter = "AttachmentName";
            CommandParameters[0].Value = filereference;
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZGetAttachmentResponse(response);

        }

    }
}
