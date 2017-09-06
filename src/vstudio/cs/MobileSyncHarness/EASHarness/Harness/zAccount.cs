/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Xml;
using System.Text;
using System.Collections.Generic;
using log4net;
using EASHarness.SOAP;
using EASHarness.SOAP.Admin;
using EASHarness.SOAP.Client;

namespace EASHarness.Harness
{
    public class zAccount
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        protected string _displayName = null;
        protected string _zimbraSoapClientHost = null;
        protected string _zimbraSoapAdminHost = null;
        protected string _zimbraMailHost = null;
        protected string _zimbraId = null;
        protected string _cn = null;
        protected string _emailAddress = null;
        protected string _sessionId = null;
        protected string _sequenceId = null;
        protected string _authToken = null;
        protected string _alias = null;
        protected string _domainName = null;

        protected string _password = Properties.getProperty("defaultpassword.value");
        protected SoapTest soapTest = new SoapTest();

        public zAccount() : this(null, null) {}

        public zAccount(string domainName) : this(null, domainName) {}

        public zAccount(string userName, string domainName)
        {
            _cn = (userName == null ? (string.Format("account{0}{1}", Properties.time(), Properties.counter())) : userName);

            _displayName = _cn;

            _domainName = domainName == null ? Properties.getProperty("defaultdomain.name") : domainName;

            _emailAddress = string.Format("{0}@{1}", _displayName, _domainName);
        }

        public zAccount createAccount()
        {
            //AdminAuth
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new CreateAccountRequest().
                UserName(_emailAddress).
                UserPassword(Properties.getProperty("defaultpassword.value")));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:account", "id", null, out _zimbraId, 1);
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:a[@n='zimbraMailHost']", null, null, out _zimbraMailHost, 1);

            return (this);
        }

        public string zimbraId
        {
            get { return _zimbraId; }
        }

        public string zimbraMailHost
        {
            get { return _zimbraMailHost; }
        }

        public bool zimbraMailModeSSL
        {
            get
            {
                String mode = Properties.getProperty("soapservice.mode");
                return (mode.Equals("https"));
            }
        }

        public string emailAddress
        {
            get { return _emailAddress; }

            set
            {
                tcLog.Warn("Changing zAccount email from " + _emailAddress + " to " + value + ".  This is ok when used with RenameAccountRequest.");
                _emailAddress = value;
            }

        }

        public string cn
        {
            get { return _cn; }
        }

        public string displayName
        {
            get { return _displayName; }
        }

        public string password
        {
            get { return _password; }
        }

        public string alias
        {
            get { return _alias; }

            set { addAlias(value); }
        }

        public string authToken
        {
            get { return _authToken; }
        }

        public string sessionId
        {
            get { return _sessionId; }
        }

        public string sequenceId
        {
            get { return _sequenceId; }
        }

        public bool Equals(zAccount other)
        {
            return (_emailAddress.Equals(other._emailAddress));
        }

        public XmlNode login()
        {
            XmlNode authResponse = sendSOAP(new EASHarness.SOAP.Client.AuthRequest().UserName(this._emailAddress).UserPassword(this._password));

            selectSOAP("//acct:authToken", null, null, out _authToken, 1);
            XmlNodeList list = soapTest.select(authResponse, "//acct:sessionId");

            if (list.Count > 0)
            {
                _sessionId = list[0].Value;
            }

            return authResponse;
        }

        public void addAlias(string alias)
        {
            string aliasAddress = string.Format("{0}@{1}", alias, _domainName);

            zAccountAdmin.GlobalAdminAccount.sendSOAP(new AddAccountAliasRequest().AddAlias(this._zimbraId, aliasAddress));
            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:AddAccountAliasResponse", null, null, null, 1);

            this._alias = aliasAddress;
        }

        public void modifyAccountAttribute(string key, string value)
        {
            zAccountAdmin.GlobalAdminAccount.sendSOAP(@"
                    <ModifyAccountRequest XmlNS='urn:zimbraAdmin'>
                        <id>" + _zimbraId + @"</id>
                        <a n='" + key + @"'>" + value + @"</a>
                    </ModifyAccountRequest>");

            zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:ModifyAccountResponse", null, null, null, 1);
        }

        #region SOAP Functions

        protected ZimbraContext context = null;
        protected Microsoft.Web.Services3.SoapEnvelope lastResponse = null;

        public System.Xml.XmlNode sendSOAP(string p)
        {
            return (sendSOAP(new RequestBody(p)));
        }

        public System.Xml.XmlNode sendSOAP(RequestBody b)
        {
            ZimbraContext c = null;
            if (authToken != null)
            {
                c = new ZimbraContext();

                c.authToken(_authToken);

                if (sessionId != null)
                {
                    c.session(sessionId);

                    if (sequenceId != null)
                        c.sequenceId(sequenceId);
                }
            }

            return (sendSOAP(c, b));
        }

        public System.Xml.XmlNode sendSOAP(ZimbraContext c, RequestBody b)
        {
            context = c;    // Remember the last context
            soapTest.SetDestination(_zimbraMailHost, b);    // based on the request type, set the URL destination
            lastResponse = soapTest.RequestResponseMethod(c, b);

            #region Check for notify ID

            XmlNodeList list = soapTest.select(lastResponse, "//zimbra:notify");
            if (list.Count > 0)
            {
                XmlNode notify = list.Item(0);
                foreach (XmlAttribute a in notify.Attributes)
                {
                    if (a.Name.Equals("seq"))
                    {
                        _sequenceId = a.Value;
                        break;
                    }
                }
            }

            #endregion

            return (lastResponse);
        }

        public System.Xml.XmlNode selectSOAP(string path, string attr, string match, out string set, int occurences)
        {
            return (selectSOAP(lastResponse, path, attr, match, out set, occurences));
        }

        public System.Xml.XmlNode selectSOAP(string path, string attr, string match, string set, int occurences)
        {
            return (selectSOAP(lastResponse, path, attr, match, set, occurences));
        }

        public System.Xml.XmlNode selectSOAP(XmlNode context, string path, string attr, string match, out string set, int occurences)
        {
            return (soapTest.select(context, path, attr, match, out set, occurences));
        }

        public System.Xml.XmlNode selectSOAP(XmlNode context, string path, string attr, string match, string set, int occurences)
        {
            if (set != null)
                throw new HarnessException("selectSOAP must have set == null.  use 'out set' version of selectSOAP?");

            string temp;

            return (soapTest.select(context, path, attr, match, out temp, occurences));
        }

        public string enableSOAPSession()
        {
            string id = null;

            #region Build the context. Use <session/> without an ID

            ZimbraContext c = new ZimbraContext();

            if (authToken != null)
                c.authToken(authToken);

            c.session(null); // Use <session/> without an ID

            #endregion

            #region Send the SOAP request and extract the session ID

            sendSOAP(c, new RequestBody("<NoOpRequest XmlNS='urn:zimbraMail'/>"));

            XmlNode xmlContext = selectSOAP("//zimbra:context", null, null, null, 1);

            selectSOAP(xmlContext, "//zimbra:session", "id", null, out id, 1);

            #endregion

            return (_sessionId = id);
        }

        public void disableSOAPSession()
        {
            _sessionId = null;
            _sequenceId = null;
        }

        #endregion

        #region Default Accounts

        protected static zAccount _AccountEAS = null;      // The account being used for MobileSync
        protected static zAccount _AccountA = null;        // A general use zimbra account
        protected static zAccount _AccountB = null;        // A general use zimbra account
        protected static zAccount _AccountC = null;        // A general use zimbra account
        protected static zAccount _AccountD = null;        // A general use zimbra account

        public static zAccount AccountEAS
        {
            get
            {
                if (_AccountEAS == null)
                {
                    _AccountEAS = new zAccount(string.Format("EAS{0}{1}", Properties.time(), Properties.counter()), Properties.getProperty("defaultdomain.name"));
                    _AccountEAS.createAccount();
                    _AccountEAS.login();
                    tcLog.Info("Created new EAS test account: " + _AccountEAS.emailAddress);
                }

                return (_AccountEAS);
            }

            set
            {
                if (value != null)
                    throw new HarnessException("EAS test account can only be set to null!");

                if (_AccountEAS != null)
                    tcLog.Info("Deleted old EAS test account: " + _AccountEAS.emailAddress);

                _AccountEAS = null;
            }
        }

        public static zAccount AccountA
        {
            get
            {
                if (_AccountA == null)
                {
                    _AccountA = new zAccount();
                    _AccountA.createAccount();
                    _AccountA.login();
                }

                return (_AccountA);
            }

            set
            {
                if (value != null)
                    throw new HarnessException("AccountA can only be set to null");

                if (_AccountA != null)
                    tcLog.Info("AccountA: deleted old account: " + _AccountA.emailAddress);

                _AccountA = null;
            }
        }

        public static zAccount AccountB
        {
            get
            {
                if (_AccountB == null)
                {
                    _AccountB = new zAccount();
                    _AccountB.createAccount();
                    _AccountB.login();
                }

                return (_AccountB);
            }

            set
            {
                if (value != null)
                    throw new HarnessException("AccountB can only be set to null");

                if (_AccountB != null)
                    tcLog.Info("AccountB: deleted old account: " + _AccountB.emailAddress);

                _AccountB = null;
            }
        }

        public static zAccount AccountC
        {
            get
            {
                if (_AccountC == null)
                {
                    _AccountC = new zAccount();
                    _AccountC.createAccount();
                    _AccountC.login();
                }

                return (_AccountC);
            }

            set
            {
                if (value != null)
                    throw new HarnessException("AccountC can only be set to null");

                if (_AccountC != null)
                    tcLog.Info("AccountC: deleted old account: " + _AccountC.emailAddress);

                _AccountC = null;
            }
        }

        public static zAccount AccountD
        {
            get
            {
                if (_AccountD == null)
                {
                    _AccountD = new zAccount();
                    _AccountD.createAccount();
                    _AccountD.login();
                }

                return (_AccountD);
            }

            set
            {
                if (value != null)
                    throw new HarnessException("AccountD can only be set to null");

                if (_AccountD != null)
                    tcLog.Info("AccountD: deleted old account: " + _AccountD.emailAddress);

                _AccountD = null;
            }
        }

        #endregion
    }

    public class zAccountAdmin : zAccount
    {
        protected static zAccountAdmin _GlobalAdminAccount = null;

        public zAccountAdmin(string emailaddress, string password)
        {
            _emailAddress = emailaddress;
            _displayName = emailaddress;
            _cn = emailAddress.Split('@')[0];

            _zimbraMailHost = Properties.getProperty("zimbraServer.name");

            sendSOAP(new EASHarness.SOAP.Admin.AuthRequest().AdminName(_emailAddress).AdminPassword(_password));

            selectSOAP("//admin:AuthResponse/admin:authToken", null, null, out _authToken, 1);
        }

        public static zAccountAdmin GlobalAdminAccount
        {
            get
            {
                if (_GlobalAdminAccount == null)
                {
                    _GlobalAdminAccount = new zAccountAdmin(Properties.getProperty("admin.user"), Properties.getProperty("admin.password"));
                }
                return (_GlobalAdminAccount);
            }
        }
    }
}