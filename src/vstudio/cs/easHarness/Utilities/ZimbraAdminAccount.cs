using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using System.Xml;

namespace Utilities
{
    public class ZimbraAdminAccount : ZimbraAccount
    {
        private ILog logger = LogManager.GetLogger(typeof(ZimbraAdminAccount));


        public ZimbraAdminAccount()
            : this(null, null)
        {
            logger.Info("new ZimbraAdminAccount");

            if (AccountAttributes.ContainsKey("zimbraIsAdminAccount"))
            {
                AccountAttributes.Remove("zimbraIsAdminAccount");
            }
            AccountAttributes.Add("zimbraIsAdminAccount", new List<string>("TRUE".Split(',')));

        }

        public ZimbraAdminAccount(String email, String password)
            : base(email, password)
        {
            if (AccountAttributes.ContainsKey("zimbraIsAdminAccount"))
            {
                AccountAttributes.Remove("zimbraIsAdminAccount");
            }
            AccountAttributes.Add("zimbraIsAdminAccount", new List<string>("TRUE".Split(',')));
        }

        /// <summary>
        /// Provision as an Admin user
        /// </summary>
        /// <returns></returns>
        public override ZimbraAccount provision()
        {
            logger.Debug("provision()");
            return (base.provision());
        }

        /// <summary>
        /// Authenticate to teh Admin interface
        /// </summary>
        /// <returns></returns>
        public override ZimbraAccount authenticate()
        {
            logger.Debug("authenticate()");


            XmlDocument AuthResponse = MySoapClient.sendSoap(
                "<AuthRequest xmlns='urn:zimbraAdmin'>" +
                    "<name>" + EmailAddress + "</name>" +
                    "<password>" + Password + "</password>" +
                "</AuthRequest>");

            XmlNode node = MySoapClient.selectSoap(AuthResponse, "//admin:AuthResponse");

            if (node == null)
            {
                throw new HarnessException("Unable to authenticate as " + EmailAddress);
            }


            AuthToken = MySoapClient.selectSoap(AuthResponse, "//admin:authToken", null);
            // throw new HarnessException("TODO: Add admin provisioning steps");

            return (this);
        }

        private static ZimbraAdminAccount MyGlobalAdmin = null;
        public static ZimbraAdminAccount GlobalAdmin
        {
            get
            {
                if (MyGlobalAdmin == null)
                {
                    String email = HarnessProperties.getString("admin.user");
                    String password = HarnessProperties.getString("admin.password");
                    MyGlobalAdmin = new ZimbraAdminAccount(email, password);
                    MyGlobalAdmin.authenticate();
                }
                return (MyGlobalAdmin);
            }
        }


    }
}
