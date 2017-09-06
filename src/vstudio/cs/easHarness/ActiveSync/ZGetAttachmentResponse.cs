using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using log4net;
using System.Net;
using System.IO;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZGetAttachmentResponse : ZResponse
    {
        HttpStatusCode StatusCode;
        String ErrorContent;
        public byte[] ResponseBytes = null;

        public ZGetAttachmentResponse(System.Net.HttpWebResponse httpResponse)
        {
            logger.Info("new " + typeof(ZGetAttachmentResponse));

            try
            {
                StatusCode = httpResponse.StatusCode;

                Stream responseStream = httpResponse.GetResponseStream();
                List<byte> bytes = new List<byte>();
                byte[] byteBuffer = new byte[256];
                int count = 0;

                // Read the data from the response stream
                // 256 bytes at a time.
                count = responseStream.Read(byteBuffer, 0, 256);
                while (count > 0)
                {
                    // Add the 256 bytes to the List
                    bytes.AddRange(byteBuffer);

                    if (count < 256)
                    {
                        // If the last read did not actually read 256 bytes
                        // remove the extra.
                        int excess = 256 - count;
                        bytes.RemoveRange(bytes.Count - excess, excess);
                    }

                    // Read the next 256 bytes from the response stream
                    count = responseStream.Read(byteBuffer, 0, 256);
                }

                // The raw content
                ResponseBytes = bytes.ToArray();

                if (StatusCode != HttpStatusCode.OK)
                {
                    throw new HarnessException("Got Non-OK response for GetAttachment request!");
                }

            }
            finally
            {
                if (httpResponse != null)
                {
                    httpResponse.Close();
                    httpResponse = null;
                }

            }
        }
    }
}