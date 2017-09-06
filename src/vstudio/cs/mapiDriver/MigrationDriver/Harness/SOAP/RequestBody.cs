using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Web.Services3;
using System.Xml;
using Harness;

namespace Soap
{
    public class RequestBody : XmlDocument
    {

        public RequestBody()
            : base()
        {

        }

        public RequestBody(string requestString)
            : base()
        {
            try
            {
                this.LoadXml(requestString);
            }
            catch (Exception e)
            {
                throw new HarnessException("Loading XML from string threw exception: "+ requestString, e);
            }
        }


    }
}
