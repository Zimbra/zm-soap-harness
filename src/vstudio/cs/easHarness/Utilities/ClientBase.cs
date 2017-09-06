using System;
using System.Collections.Generic;
using System.Text;
using log4net;

namespace Utilities
{
    public class ClientBase
    {
        protected ILog logger = LogManager.GetLogger(typeof(ClientBase));

        private static UInt64 MyClientCounter = 0;

        protected ClientBase()
        {
            logger.Debug("new " + this.GetType().ToString());
        }

        public virtual String toTrace()
        {
            throw new NotImplementedException();
        }

        public String ClientCounter
        {
            get { return ((++MyClientCounter).ToString("D5")); }
        }

        public String Timestamp(DateTime date)
        {
            return (date.ToString("yyyy/MM/dd HH:mm:ss ffff"));
        }

        public String CurrentTimestamp()
        {
            return (Timestamp(DateTime.Now));
        }
            

    }
}
