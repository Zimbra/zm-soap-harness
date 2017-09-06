using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    public class ZMeetingResponse_Resp : ZResponse
    {

        private String MyCalendarId = null;

        #region Property Accessors

        public String CalendarId
        {
            get { return (MyCalendarId); }
        }

        #endregion

        public ZMeetingResponse_Resp(System.Net.HttpWebResponse httpResponse)
            : base(httpResponse)
        {
            logger.Info("new " + typeof(ZMeetingResponse_Resp));

            if (XmlDoc != null)
            {

                // Get the Status
                XmlNodeList nodes = XmlDoc.SelectNodes("//MeetingResponse:Status", ZAssert.NamespaceManager);
                if (nodes.Count == 1)
                {
                    XmlNode node = nodes.Item(0);
                    String status = node.InnerText;
                    if (!status.Equals("1"))
                    {
                        throw new HarnessException("Meeting response is not 1, so indicates failure");
                    }
                }

                // Get the CalendarId
                nodes = XmlDoc.SelectNodes("//MeetingResponse:CalendarId", ZAssert.NamespaceManager);
                if (nodes.Count == 1)
                {
                    XmlNode node = nodes.Item(0);
                    MyCalendarId = node.InnerText;
                }

            }
        }

    }
}
