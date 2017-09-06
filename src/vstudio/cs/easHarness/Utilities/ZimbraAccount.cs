using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using System.Xml;
using System.Net;

namespace Utilities
{
    public class ZimbraAccount
    {
        private ILog logger = LogManager.GetLogger(typeof(ZimbraAccount));

        // Account's Utilities
        protected ClientSoap MySoapClient = null;

        // Zimbra Account Server Settings
        private String MyZimbraId = null;
        private String MyAuthToken = null;
        private String MyEmailAddress = null;
        private String MyFirstName = null;
        private String MyLastName = null;
        private String MyPassword = null;
        private String MyZimbraMailHost = HarnessProperties.getString("server.host", "foo.com");
        private Dictionary<String, List<String>> MyAttributes = ZimbraAccount.getDefaultAttributes();
        
        // ActiveSync Settings
        private NetworkCredential MyNetworkCredentials = null;

        // Account's Device
        private ZimbraDevice MyDevice = null;


        public ZimbraAccount()
            : this(null, null)
        {
        }

        public ZimbraAccount(String email, String password)
        {

            MyEmailAddress = email;
            if (MyEmailAddress == null)
            {
                String displayName = "eas" + HarnessProperties.getUniqueString();
                String domain = HarnessProperties.getString("testdomain", "testdomain.com");
                MyEmailAddress = displayName + "@" + domain;
                MyFirstName = "fname" + HarnessProperties.getUniqueString();
                MyLastName = "lname" + HarnessProperties.getUniqueString();
            }

            MyPassword = password;
            if (MyPassword == null)
            {
                MyPassword = HarnessProperties.getString("default.password", "test123");
            }

            MyDevice = new ZimbraDevice();

            MySoapClient = new ClientSoap(this);

        }

        public virtual ZimbraAccount provision()
        {

            // Make sure domain exists
            ZimbraDomain domain = new ZimbraDomain(this.DomainName);     
            domain.provision();

            // Build the CreateAccountRequest
            StringBuilder attributes = new StringBuilder();
            foreach (KeyValuePair<String, List<String>> entry in MyAttributes)
            {
                String key = entry.Key;
                foreach (String value in entry.Value)
                {
                    attributes.Append(String.Format("<a n='{0}'>{1}</a>", key, value));
                }
            }

            XmlDocument CreateAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                "<CreateAccountRequest xmlns='urn:zimbraAdmin'>"
                + "<name>" + EmailAddress + "</name>"
                + "<password>" + Password + "</password>"
                + attributes.ToString()
                + "</CreateAccountRequest>");

            XmlNode response = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateAccountResponse, "//admin:CreateAccountResponse");


            if (response == null)
            {
                XmlNode fault = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateAccountResponse, "//soap:Fault");
                if (fault != null)
                {
                    String error = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateAccountResponse, "//zmibra:Code", null);
                    throw new HarnessException("Unable to create account: " + error);
                }
                throw new HarnessException("Unknown error when provisioning account");
            }


            // Set the account settings based on the response
            MyZimbraId = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateAccountResponse, "//admin:account", "id");
            MyZimbraMailHost = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateAccountResponse, "//admin:account/admin:a[@n='zimbraMailHost']", null);
            ZimbraAccount.addZimbraMailboxHosts(MyZimbraMailHost);


            // If SOAP trace logging is specified, turn it on
            if (HarnessProperties.getString("soap.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.soap' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }

            // If SYNC trace logging is specified, turn it on
            if (HarnessProperties.getString("sync.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.sync' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }

            ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.wbxml' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            // Sync the GAL to put the account into the list
            domain.syncGalAccount();


            return (this);
        }

        public virtual ZimbraAccount provisionFullName()
        {

            // Make sure domain exists
            ZimbraDomain domain = new ZimbraDomain(this.DomainName);
            domain.provision();

            // Build the CreateAccountRequest
            StringBuilder attributes = new StringBuilder();
            foreach (KeyValuePair<String, List<String>> entry in MyAttributes)
            {
                String key = entry.Key;
                foreach (String value in entry.Value)
                {
                    attributes.Append(String.Format("<a n='{0}'>{1}</a>", key, value));
                }
            }

            XmlDocument CreateAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                "<CreateAccountRequest xmlns='urn:zimbraAdmin'>"
                + "<name>" + EmailAddress + "</name>"
                + "<password>" + Password + "</password>"
                + "<a n='displayName'>" +  FirstName + " " + LastName + "</a>"
                + "<a n='givenName'>" + FirstName + "</a>"
                + "<a n='sn'>" + LastName + "</a>"
                + attributes.ToString()
                + "</CreateAccountRequest>");

            XmlNode response = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateAccountResponse, "//admin:CreateAccountResponse");


            if (response == null)
            {
                XmlNode fault = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateAccountResponse, "//soap:Fault");
                if (fault != null)
                {
                    String error = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateAccountResponse, "//zmibra:Code", null);
                    throw new HarnessException("Unable to create account: " + error);
                }
                throw new HarnessException("Unknown error when provisioning account");
            }


            // Set the account settings based on the response
            MyZimbraId = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateAccountResponse, "//admin:account", "id");
            MyZimbraMailHost = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateAccountResponse, "//admin:account/admin:a[@n='zimbraMailHost']", null);
            ZimbraAccount.addZimbraMailboxHosts(MyZimbraMailHost);


            // If SOAP trace logging is specified, turn it on
            if (HarnessProperties.getString("soap.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.soap' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }

            // If SYNC trace logging is specified, turn it on
            if (HarnessProperties.getString("sync.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.sync' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }


            // Sync the GAL to put the account into the list
            domain.syncGalAccount();


            return (this);
        }

        public virtual ZimbraAccount provisionLocation()
        {

            // Make sure domain exists
            ZimbraDomain domain = new ZimbraDomain(this.DomainName);
            domain.provision();

            // Build the CreateCalendarResourceRequest

            XmlDocument CreateCalendarResourceResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                "<CreateCalendarResourceRequest xmlns='urn:zimbraAdmin'>"
                + "<name>" + EmailAddress + "</name>"
                + "<password>" + Password + "</password>"
                + "<a n='zimbraCalResType'>Location</a>"
                + "<a n='zimbraAccountStatus'>active</a>"
                + "<a n='displayName'>" + EmailAddress + "</a>"
                + "<a n='zimbraCalResAutoAcceptDecline'>TRUE</a>"
                + "<a n='zimbraCalResAutoDeclineIfBusy'>TRUE</a>"
                + "</CreateCalendarResourceRequest>");

            XmlNode response = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateCalendarResourceResponse, "//admin:CreateCalendarResourceResponse");


            if (response == null)
            {
                XmlNode fault = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateCalendarResourceResponse, "//soap:Fault");
                if (fault != null)
                {
                    String error = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateCalendarResourceResponse, "//zmibra:Code", null);
                    throw new HarnessException("Unable to create calendar location resource: " + error);
                }
                throw new HarnessException("Unknown error when provisioning location resource account");
            }


            // If SOAP trace logging is specified, turn it on
            if (HarnessProperties.getString("soap.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.soap' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }

            // If SYNC trace logging is specified, turn it on
            if (HarnessProperties.getString("sync.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.sync' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }


            // Sync the GAL to put the account into the list
            domain.syncGalAccount();


            return (this);
        }

        public virtual ZimbraAccount provisionEquipment()
        {

            // Make sure domain exists
            ZimbraDomain domain = new ZimbraDomain(this.DomainName);
            domain.provision();

            // Build the CreateCalendarResourceRequest

            XmlDocument CreateCalendarResourceResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                "<CreateCalendarResourceRequest xmlns='urn:zimbraAdmin'>"
                + "<name>" + EmailAddress + "</name>"
                + "<password>" + Password + "</password>"
                + "<a n='zimbraCalResType'>Equipment</a>"
                + "<a n='zimbraAccountStatus'>active</a>"
                + "<a n='displayName'>" + EmailAddress + "</a>"
                + "<a n='zimbraCalResAutoAcceptDecline'>TRUE</a>"
                + "<a n='zimbraCalResAutoDeclineIfBusy'>TRUE</a>"
                + "</CreateCalendarResourceRequest>");

            XmlNode response = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateCalendarResourceResponse, "//admin:CreateCalendarResourceResponse");


            if (response == null)
            {
                XmlNode fault = ZimbraAdminAccount.GlobalAdmin.soapSelect(CreateCalendarResourceResponse, "//soap:Fault");
                if (fault != null)
                {
                    String error = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateCalendarResourceResponse, "//zmibra:Code", null);
                    throw new HarnessException("Unable to create calendar equipment resource: " + error);
                }
                throw new HarnessException("Unknown error when provisioning equipment resource account");
            }


            // If SOAP trace logging is specified, turn it on
            if (HarnessProperties.getString("soap.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.soap' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }

            // If SYNC trace logging is specified, turn it on
            if (HarnessProperties.getString("sync.trace.enabled", "false").ToLower().Equals("true"))
            {

                ZimbraAdminAccount.GlobalAdmin.soapSend(
                            "<AddAccountLoggerRequest xmlns='urn:zimbraAdmin'>"
                        + "<account by='name'>" + EmailAddress + "</account>"
                        + "<logger category='zimbra.sync' level='trace'/>"
                        + "</AddAccountLoggerRequest>");

            }


            // Sync the GAL to put the account into the list
            domain.syncGalAccount();


            return (this);
        }

        public virtual ZimbraAccount authenticate()
        {

            XmlDocument AuthResponse = MySoapClient.sendSoap(
                "<AuthRequest xmlns='urn:zimbraAccount'>" +
                            "<account by='name'>" + EmailAddress + "</account>" +
                            "<password>" + Password + "</password>" +
                    "</AuthRequest>");
            XmlNode node = MySoapClient.selectSoap(AuthResponse, "//acct:AuthResponse");

            if (node == null)
            {
                throw new HarnessException("Unable to authenticate as " + MyEmailAddress);
            }

            AuthToken = MySoapClient.selectSoap(AuthResponse, "//acct:authToken", null);

            return (this);
        }

        public String EmailAddress
        {
            get { return (MyEmailAddress); }
        }

        /// <summary>
        /// The "UserName" for this account
        /// e.g. "user" for "user@mydomain.com"
        /// </summary>
        public String UserName
        {
            get { return ((MyEmailAddress.Split('@'))[0]); }
        }

        /// <summary>
        /// The "FirstName" for this account
        /// Used only for few tests requiring firstname, lastname and displayname validation
        /// </summary>
        public String FirstName
        {
            get { return (MyFirstName); }
        }

        /// <summary>
        /// The "FirstName" for this account
        /// Used only for few tests requiring firstname, lastname and displayname validation
        /// </summary>
        public String LastName
        {
            get { return (MyLastName); }
        }

        /// <summary>
        /// The "DomainName" for this account
        /// e.g. "mydomain.com" for "user@mydomain.com"
        /// </summary>
        public String DomainName
        {
            get { return ((MyEmailAddress.Split('@'))[1]); }
        }

        public String Password
        {
            get { return (MyPassword); }
        }

        public String ZimbraId
        {
            get { return (MyZimbraId); }
            set { MyZimbraId = value; }
        }

        public String AuthToken
        {
            get { return (MyAuthToken); }
            set { MyAuthToken = value; }
        }

        public String ZimbraMailHost
        {
            get { return (MyZimbraMailHost); }
        }

        public NetworkCredential NetworkCredentials
        {
            get
            {

                if (MyNetworkCredentials == null)
                {

                    //MyNetworkCredentials = new NetworkCredential(EmailAddress, Password, DomainName);
                    MyNetworkCredentials = new NetworkCredential(
                        string.Format(@"{0}\{1}", DomainName, UserName),
                        Password);
                    //MyNetworkCredentials = new NetworkCredential(EmailAddress, Password);

                }

                return (MyNetworkCredentials);
            }
        }

        /// <summary>
        /// For use in the "Authorization" header for Zimbra Mobile Sync
        /// </summary>
        public String Authorization
        {
            get
            {
                String val = DomainName + @"\" + UserName + ":" + Password;
                byte[] user = Encoding.UTF8.GetBytes(val);
                return ("Basic " + Convert.ToBase64String(user));
            }
        }

        public ZimbraDevice Device
        {
            get { return (MyDevice); }
            set { MyDevice = value; }
        }

        public Dictionary<string, List<string>> AccountAttributes
        {
            get { return (MyAttributes); }
            set { MyAttributes = value; }
        }

        public XmlDocument soapSend(String request)
        {

            return (this.MySoapClient.sendSoap(request));
        }

        public XmlNode soapSelect(XmlDocument response, String xpath)
        {
            return (this.MySoapClient.selectSoap(response, xpath));
        }

        public String soapSelectValue(XmlDocument response, String xpath, String attr)
        {
            return (this.MySoapClient.selectSoap(response, xpath, attr));
        }

        public int countNodes(XmlDocument response, String xpath)
        {
            return (this.MySoapClient.countNodes(response, xpath));
        }

        private static Dictionary<string, List<string>> getDefaultAttributes()
        {
            Dictionary<string, List<string>> attributes = new Dictionary<string, List<string>>();
            
            // Enable mobile by default
            attributes.Add("zimbraFeatureMobileSyncEnabled", new List<String>("TRUE".Split()));
            attributes.Add("zimbraMobilePolicyAllowNonProvisionableDevices", new List<String>("TRUE".Split()));
            attributes.Add("zimbraMobilePolicyAllowPartialProvisioning", new List<String>("TRUE".Split()));
            attributes.Add("zimbraMobilePolicyDevicePasswordEnabled", new List<String>("FALSE".Split()));

            attributes.Add("zimbraPrefTimeZoneId", new List<String>("America/Chicago".Split()));

            return (attributes);
        }

        // A list of host names to check for postqueue
        private static List<String> MyZimbraMailboxHosts = new List<String>();
        private static void addZimbraMailboxHosts(String host)
        {
            if (!MyZimbraMailboxHosts.Contains(host))
            {
                MyZimbraMailboxHosts.Add(host);
            }
        }

        public static List<String> getZimbraMailboxHosts()
        {
            return (MyZimbraMailboxHosts);
        }

    }
}
