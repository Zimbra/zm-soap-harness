/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * Developer: Arindam Bhattacharya
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Net;
using System.Text;
using System.Collections.Generic;
using log4net;
using EASHarness.ActiveSync.HTTP;

namespace EASHarness.Harness
{
    public class EASDevice
    {
        public enum Device
        {
            Generic = 0,
            iOS = 1,
            WindowsMobile = 2,
            Android = 3,
            Symbian = 4
        };

        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        // EAS Protocol Specs 
        protected string _ProtocolVersion = "2.5";
        protected bool _UseEncodedRequestLine = false;
        protected uint _PolicyKey = 0;
        protected string _SyncKey = "0";
        
        // EAS Auth Credentials
        protected bool _UPNAuth = true;
        protected string _EmailAddress = null;
        protected string _Password = null;
        protected string _Username = null;
        protected string _EmailDomain = null;

        // EAS Server Details
        protected string _EmailServerFQDN = null;
        protected bool _UseSSLTransport = true;

        // Device Details
        protected string _DeviceID = null;
        protected string _DeviceType = null;
        protected string _Model = "Fake Model";
        protected string _FriendlyName = "ActiveSync Simulator";
        protected string _OperatingSystem = "Fake OS 1.0";
        protected string _OperatingSystemLanguage = "English";
        protected string _MobileOperator = "Fake Mobile Operator";
        protected string _UserAgent = "MobileSyncHarness";
        protected string _PhoneNumber = "+91-992-379-4093";
        protected string _IMEI = null;

        // WebResponse Details
        protected int _ResponseStatusCode = 0;
        protected string _ResponseStatusMessage = null;

        #region Public: Property Accessors
        public string ProtocolVersion
        {
            get { return _ProtocolVersion; }

            set { _ProtocolVersion = value; }
        }

        public bool UseEncodedRequestLine
        {
            get { return _UseEncodedRequestLine; }

            set { _UseEncodedRequestLine = value; }
        }

        public uint PolicyKey
        {
            get { return _PolicyKey; }

            set { _PolicyKey = value; }
        }

        public string SyncKey
        {
            get { return _SyncKey; }

            set { _SyncKey = value; }
        }

        public bool UPNAuth
        {
            get { return _UPNAuth; }

            set { _UPNAuth = value; }
        }

        public string EmailAddress
        {
            get { return _EmailAddress; }
        }

        public string Password
        {
            get { return _Password; }
        }

        public string Username
        {
            get { return _Username; }
        }

        public string EmailDomain
        {
            get { return _EmailDomain; }
        }

        public string EmailServerFQDN
        {
            get { return _EmailServerFQDN; }
        }

        public bool UseSSLTransport
        {
            get { return _UseSSLTransport; }

            set { _UseSSLTransport = value; }
        }

        public string DeviceID
        {
            get { return _DeviceID; }

            set { _DeviceID = value; }
        }

        public string DeviceType
        {
            get { return _DeviceType; }
            
            set { _DeviceType = value; }
        }

        public string Model
        {
            get { return _Model; }
        }

        public string IMEI
        {
            get { return _IMEI; }

            set { _IMEI = value; }
        }

        public string FriendlyName
        {
            get { return _FriendlyName; }
        }

        public string OperatingSystem
        {
            get { return _OperatingSystem; }
        }

        public string OperatingSystemLanguage
        {
            get { return _OperatingSystemLanguage; }
        }

        public string PhoneNumber
        {
            get { return _PhoneNumber; }
        }

        public string MobileOperator
        {
            get { return _MobileOperator; }
        }

        public string UserAgent
        {
            get { return _UserAgent; }
        }

        public int ResponseStatusCode
        {
            get { return _ResponseStatusCode; }
        }

        public string ResponseStatusMessage
        {
            get { return _ResponseStatusMessage; }
        }
        #endregion

        #region Public: Authentication & Configuration Methods

        // Device Configuration Details for Primary Account 
        public void PrimaryAuthCredentials(zAccount testAccount)
        {
            _EmailAddress = testAccount.emailAddress;
            _Password = testAccount.password;
            _Username = testAccount.cn;
            _EmailDomain = testAccount.emailAddress.Split('@')[1];
            _EmailServerFQDN = testAccount.zimbraMailHost;
        }

        // Device Configuration Details for Alias Account 
        public void AliasAuthCredentials(zAccount testAccount)
        {
            _EmailAddress = testAccount.alias;
            _Password = testAccount.password;
            _Username = this._EmailAddress.Split('@')[0];
            _EmailDomain = this._EmailAddress.Split('@')[1];
            _EmailServerFQDN = testAccount.zimbraMailHost;
        }

        // Device Configuration Details for Debug Account 
        public void DebugAuthCredentials(string strEmailAddress, string strPassword, string strMailHost)
        {
            _EmailAddress = strEmailAddress;
            _Password = strPassword;
            _Username = strEmailAddress.Split('@')[0];
            _EmailDomain = strEmailAddress.Split('@')[1];
            _EmailServerFQDN = strMailHost;
        }

        // Device Information Parameters
        public void DeviceInfo(Device deviceType)
        {
            switch (deviceType)
            {
                case Device.Generic:
                    _DeviceID = string.Format("FakeGenericDeviceID{0}{1}", Properties.time(), Properties.counter());
                    _DeviceType = "Fake-Generic-Device";
                    _Model = "Fake Generic Model";
                    _FriendlyName = "ActiveSync Generic Simulator";
                    _OperatingSystem = "Fake Generic OS 1.0";
                    _UserAgent = "Zimbra-FakeOS/MobileSyncHarness";
                    _IMEI = string.Format("{0}-{1}", Properties.time(), Properties.counter());
                    break;

                case Device.iOS:
                    _DeviceID = string.Format("FakeIOSDeviceID{0}{1}", Properties.time(), Properties.counter());
                    _DeviceType = "Fake-IOS-Device";
                    _Model = "Fake IOS Model";
                    _FriendlyName = "ActiveSync IOS Simulator";
                    _OperatingSystem = "Fake IOS 1.0";
                    _UserAgent = "Apple-FakeIOS/MobileSyncHarness";
                    _IMEI = string.Format("{0}-{1}", Properties.time(), Properties.counter());
                    break;

                case Device.WindowsMobile:
                    _DeviceID = string.Format("FakeWPDeviceID{0}{1}", Properties.time(), Properties.counter());
                    _DeviceType = "Fake-WP-Device";
                    _Model = "Fake WP Model";
                    _FriendlyName = "ActiveSync WP Simulator";
                    _OperatingSystem = "Fake Windows Mobile 1.0";
                    _UserAgent = "MSFT-FakeWP/MobileSyncHarness";
                    _IMEI = string.Format("{0}-{1}", Properties.time(), Properties.counter());
                    break;

                case Device.Android:
                    _DeviceID = string.Format("FakeAndroidDeviceID{0}{1}", Properties.time(), Properties.counter());
                    _DeviceType = "Fake-Android-Device";
                    _Model = "Fake Android Model";
                    _FriendlyName = "ActiveSync Android Simulator";
                    _OperatingSystem = "Fake Android OS 1.0";
                    _UserAgent = "Android-FakeOS/MobileSyncHarness";
                    _IMEI = string.Format("{0}-{1}", Properties.time(), Properties.counter());
                    break;

                case Device.Symbian:
                    _DeviceID = string.Format("FakeSymbianDeviceID{0}{1}", Properties.time(), Properties.counter());
                    _DeviceType = "Fake-Symbian-Device";
                    _Model = "Fake Symbian Model";
                    _FriendlyName = "ActiveSync Symbian Simulator";
                    _OperatingSystem = "Fake Symbian OS 1.0";
                    _UserAgent = "Symbian-FakeOS/MobileSyncHarness";
                    _IMEI = string.Format("{0}-{1}", Properties.time(), Properties.counter());
                    break;

                default:
                    break;
            }
        }

        #endregion

        #region Public: Functional Test Methods

        public void ConfigureDevice()
        {
            tcLog.Info("EAS Test Account (\"" + _EmailAddress + "\") being configured on \"" + _DeviceType + "\"... ");

            #region ActiveSync Device Information
            DeviceInformation deviceInfo = new DeviceInformation();

            deviceInfo.DeviceID = this.DeviceID;
            deviceInfo.DeviceType = this.DeviceType;
            deviceInfo.Model = this.Model;
            deviceInfo.IMEINumber = this.IMEI;
            deviceInfo.FriendlyName = this.FriendlyName;
            deviceInfo.OperatingSystem = this.OperatingSystem;
            deviceInfo.OperatingSystemLanguage = this.OperatingSystemLanguage;
            deviceInfo.PhoneNumber = this.PhoneNumber;
            deviceInfo.MobileOperator = this.MobileOperator;
            deviceInfo.UserAgent = this.UserAgent;
            #endregion

            #region Options Request/Response
            // Initialize the Options Request
            ASOptionsRequest optionsRequest = new ASOptionsRequest();

            // EAS Auth Credentials
            optionsRequest.UPNAuth = this.UPNAuth;
            optionsRequest.EmailAddress = this.EmailAddress;
            optionsRequest.Password = this.Password;
            optionsRequest.Username = this.Username;
            optionsRequest.Domain = this.EmailDomain;

            // Zimbra Server Details
            optionsRequest.Server = this.EmailServerFQDN;
            optionsRequest.UseSSL = this.UseSSLTransport;

            // Test Device Details
            optionsRequest.DeviceID = this.DeviceID;
            optionsRequest.DeviceType = this.DeviceType;
            optionsRequest.UserAgent = this.UserAgent;

            // Send Option Request & Receive Response
            ASOptionsResponse optionsResponse = (ASOptionsResponse)optionsRequest.GetOptions();
            #endregion

            _ResponseStatusCode = optionsRequest.ResponseStatusCode;
            _ResponseStatusMessage = optionsRequest.ResponseStatusMessage;

            if (optionsRequest.ResponseStatusCode == 0)
                tcLog.Debug("WebResponse Status Code: NULL");
            else
                tcLog.Debug("WebResponse Status Code: " + _ResponseStatusCode);

            tcLog.Debug("WebResponse Status Message: " + _ResponseStatusMessage);

            // On Successful OPTION Request/Response proceed with initial FolderSync Request
            if (optionsRequest.ResponseStatusCode == 200)
            {
                // Get the higest supported MS-ASProtocolVersion
                _ProtocolVersion = optionsResponse.HighestSupportedVersion;

                // If (MS-ASProtocolVersion = 14.0 or 14.1) OR (MS-ASProtocolVersion >= 12.1 & DeviceType is WindowsMobile) then we use base64 encoded header in all ASCommand requests
                if (_ProtocolVersion == "14.0" || _ProtocolVersion == "14.1" || (Convert.ToDouble(_ProtocolVersion) >= 12.1 && _DeviceType == "Fake WP Device"))
                    _UseEncodedRequestLine = true;

                tcLog.Debug("Supported MS-EAS Versions: " + optionsResponse.SupportedVersions);
                tcLog.Debug("Highest Supported MS-EAS Version: " + _ProtocolVersion);

                #region Initial FolderSync Request/Response
                // Initialize the FolderSync Request
                ASFolderSyncRequest initialFolderSyncRequest = new ASFolderSyncRequest();

                // EAS Auth Credentials
                initialFolderSyncRequest.UPNAuth = this.UPNAuth;
                initialFolderSyncRequest.EmailAddress = this.EmailAddress;
                initialFolderSyncRequest.Password = this.Password;
                initialFolderSyncRequest.Username = this.Username;
                initialFolderSyncRequest.Domain = this.EmailDomain;

                // Zimbra Server Details
                initialFolderSyncRequest.Server = this.EmailServerFQDN;
                initialFolderSyncRequest.UseSSL = this.UseSSLTransport;

                // Test Device Details
                initialFolderSyncRequest.DeviceID = this.DeviceID;
                initialFolderSyncRequest.DeviceType = this.DeviceType;
                initialFolderSyncRequest.UserAgent = this.UserAgent;

                // EAS Protocol Specs
                initialFolderSyncRequest.ProtocolVersion = this.ProtocolVersion;
                initialFolderSyncRequest.UseEncodedRequestLine = this.UseEncodedRequestLine;
                initialFolderSyncRequest.PolicyKey = this.PolicyKey;
                initialFolderSyncRequest.SyncKey = this.SyncKey;

                // Send FolderSync Request & Receive Response
                ASFolderSyncResponse initialFolderSyncResponse = (ASFolderSyncResponse)initialFolderSyncRequest.GetResponse();
                #endregion

                _ResponseStatusCode = initialFolderSyncRequest.ResponseStatusCode;
                _ResponseStatusMessage = initialFolderSyncRequest.ResponseStatusMessage;

                if (initialFolderSyncRequest.ResponseStatusCode == 0)
                    tcLog.Debug("WebResponse Status Code: NULL");
                else
                    tcLog.Debug("WebResponse Status Code: " + _ResponseStatusCode);

                tcLog.Debug("WebResponse Status Message: " + _ResponseStatusMessage);

                // On HTTP 449 "Protocol Error" proceed with initial Provision Request
                if (initialFolderSyncRequest.ResponseStatusCode == 449)
                {
                    Provision(deviceInfo);
                }
            }
        }

        public void ConfigureDevice(bool useUPNAuth)
        {
            _UPNAuth = useUPNAuth;

            tcLog.Info("EAS Test Account (\"" + _EmailAddress + "\") being configured on \"" + _DeviceType + "\"... ");

            #region ActiveSync Device Information
            DeviceInformation deviceInfo = new DeviceInformation();

            deviceInfo.DeviceID = this.DeviceID;
            deviceInfo.DeviceType = this.DeviceType;
            deviceInfo.Model = this.Model;
            deviceInfo.IMEINumber = this.IMEI;
            deviceInfo.FriendlyName = this.FriendlyName;
            deviceInfo.OperatingSystem = this.OperatingSystem;
            deviceInfo.OperatingSystemLanguage = this.OperatingSystemLanguage;
            deviceInfo.PhoneNumber = this.PhoneNumber;
            deviceInfo.MobileOperator = this.MobileOperator;
            deviceInfo.UserAgent = this.UserAgent;
            #endregion

            #region Options Request/Response
            // Initialize the Options Request
            ASOptionsRequest optionsRequest = new ASOptionsRequest();

            // EAS Auth Credentials
            optionsRequest.UPNAuth = this.UPNAuth;
            optionsRequest.EmailAddress = this.EmailAddress;
            optionsRequest.Password = this.Password;
            optionsRequest.Username = this.Username;
            optionsRequest.Domain = this.EmailDomain;

            // Zimbra Server Details
            optionsRequest.Server = this.EmailServerFQDN;
            optionsRequest.UseSSL = this.UseSSLTransport;

            // Test Device Details
            optionsRequest.DeviceID = this.DeviceID;
            optionsRequest.DeviceType = this.DeviceType;
            optionsRequest.UserAgent = this.UserAgent;

            // Send Option Request & Receive Response
            ASOptionsResponse optionsResponse = (ASOptionsResponse)optionsRequest.GetOptions();
            #endregion

            _ResponseStatusCode = optionsRequest.ResponseStatusCode;
            _ResponseStatusMessage = optionsRequest.ResponseStatusMessage;

            if (optionsRequest.ResponseStatusCode == 0)
                tcLog.Debug("WebResponse Status Code: NULL");
            else
                tcLog.Debug("WebResponse Status Code: " + _ResponseStatusCode);

            tcLog.Debug("WebResponse Status Message: " + _ResponseStatusMessage);

            // On Successful OPTION Request/Response proceed with initial FolderSync Request
            if (optionsRequest.ResponseStatusCode == 200)
            {
                // Get the higest supported MS-ASProtocolVersion
                _ProtocolVersion = optionsResponse.HighestSupportedVersion;

                // If (MS-ASProtocolVersion = 14.0 or 14.1) OR (MS-ASProtocolVersion >= 12.1 & DeviceType is WindowsMobile) then we use base64 encoded header in all ASCommand requests
                if (_ProtocolVersion == "14.0" || _ProtocolVersion == "14.1" || (Convert.ToDouble(_ProtocolVersion) >= 12.1 && _DeviceType == "Fake WP Device"))
                    _UseEncodedRequestLine = true;

                tcLog.Debug("Supported MS-EAS Versions: " + optionsResponse.SupportedVersions);
                tcLog.Debug("Highest Supported MS-EAS Version: " + _ProtocolVersion);

                #region Initial FolderSync Request/Response
                // Initialize the FolderSync Request
                ASFolderSyncRequest initialFolderSyncRequest = new ASFolderSyncRequest();

                // EAS Auth Credentials
                initialFolderSyncRequest.UPNAuth = this.UPNAuth;
                initialFolderSyncRequest.EmailAddress = this.EmailAddress;
                initialFolderSyncRequest.Password = this.Password;
                initialFolderSyncRequest.Username = this.Username;
                initialFolderSyncRequest.Domain = this.EmailDomain;

                // Zimbra Server Details
                initialFolderSyncRequest.Server = this.EmailServerFQDN;
                initialFolderSyncRequest.UseSSL = this.UseSSLTransport;

                // Test Device Details
                initialFolderSyncRequest.DeviceID = this.DeviceID;
                initialFolderSyncRequest.DeviceType = this.DeviceType;
                initialFolderSyncRequest.UserAgent = this.UserAgent;

                // EAS Protocol Specs
                initialFolderSyncRequest.ProtocolVersion = this.ProtocolVersion;
                initialFolderSyncRequest.UseEncodedRequestLine = this.UseEncodedRequestLine;
                initialFolderSyncRequest.PolicyKey = this.PolicyKey;
                initialFolderSyncRequest.SyncKey = this.SyncKey;

                // Send FolderSync Request & Receive Response
                ASFolderSyncResponse initialFolderSyncResponse = (ASFolderSyncResponse)initialFolderSyncRequest.GetResponse();
                #endregion

                _ResponseStatusCode = initialFolderSyncRequest.ResponseStatusCode;
                _ResponseStatusMessage = initialFolderSyncRequest.ResponseStatusMessage;

                if (initialFolderSyncRequest.ResponseStatusCode == 0)
                    tcLog.Debug("WebResponse Status Code: NULL");
                else
                    tcLog.Debug("WebResponse Status Code: " + _ResponseStatusCode);

                tcLog.Debug("WebResponse Status Message: " + _ResponseStatusMessage);

                // On HTTP 449 "Protocol Error" proceed with initial Provision Request
                if (initialFolderSyncRequest.ResponseStatusCode == 449)
                {
                    Provision(deviceInfo);
                }
            }
        }

        public void SoftReset()
        {
            _ProtocolVersion = "2.5";
            _UseEncodedRequestLine = false;
            _PolicyKey = 0;
            _SyncKey = "0";

            tcLog.Info("Soft Resetted... \"" + _DeviceType + "\"... ");
        }

        public void HardReset()
        {
            // TBD: Call all destructors, clean sqlite database & do explicit garbage collection

            tcLog.Info("Hard Resetted... \"" + _DeviceType + "\"... ");
        }

        #endregion

        #region Private: ActiveSync Command APIs

        private void Provision(DeviceInformation deviceInfo)
        {
            #region Initial Provision Request/Response
            // Initialize the Provision Request
            ASProvisionRequest initialProvisionRequest = new ASProvisionRequest();

            // EAS Auth Credentials
            initialProvisionRequest.UPNAuth = this.UPNAuth;
            initialProvisionRequest.EmailAddress = this.EmailAddress;
            initialProvisionRequest.Password = this.Password;
            initialProvisionRequest.Username = this.Username;
            initialProvisionRequest.Domain = this.EmailDomain;

            // Zimbra Server Details
            initialProvisionRequest.Server = this.EmailServerFQDN;
            initialProvisionRequest.UseSSL = this.UseSSLTransport;

            // Test Device Details
            initialProvisionRequest.DeviceID = this.DeviceID;
            initialProvisionRequest.DeviceType = this.DeviceType;
            initialProvisionRequest.UserAgent = this.UserAgent;

            // EAS Protocol Specs
            initialProvisionRequest.ProtocolVersion = this.ProtocolVersion;
            initialProvisionRequest.UseEncodedRequestLine = this.UseEncodedRequestLine;
            initialProvisionRequest.PolicyKey = this.PolicyKey;
            initialProvisionRequest.ProvisionDevice = deviceInfo;

            // Send Provision Request & Receive Response
            ASProvisionResponse initialProvisionResponse = (ASProvisionResponse)initialProvisionRequest.GetResponse();
            #endregion

            // Check the result of the initial request. The server may have requested a remote wipe or may have returned an error.
            if (initialProvisionResponse.Status == (Int32)ASProvisionResponse.ProvisionStatus.Success)
            {
                tcLog.Info("ASProvision Status: " + ASProvisionResponse.ProvisionStatus.Success.ToString());

                // Check if ASPolicy has been loaded from the initial provision response
                if (initialProvisionResponse.IsPolicyLoaded)
                {
                    // Check the policy status
                    if (initialProvisionResponse.Policy.Status == (Int32)ASProvisionResponse.ProvisionStatus.Success)
                    {
                        // If the server requested a remote wipe. The client must acknowledge it.
                        if (initialProvisionResponse.Policy.RemoteWipeRequested)
                        {
                            tcLog.Info("The server has requested a remote wipe!");

                            #region RemoteWipe Acknowledgement Request/Response
                            // Initialize the RemoteWipe Acknowledgement Request
                            ASProvisionRequest remotewipeAcknowledgementRequest = new ASProvisionRequest();

                            // EAS Auth Credentials
                            remotewipeAcknowledgementRequest.UPNAuth = this.UPNAuth;
                            remotewipeAcknowledgementRequest.EmailAddress = this.EmailAddress;
                            remotewipeAcknowledgementRequest.Password = this.Password;
                            remotewipeAcknowledgementRequest.Username = this.Username;
                            remotewipeAcknowledgementRequest.Domain = this.EmailDomain;

                            // Zimbra Server Details
                            remotewipeAcknowledgementRequest.Server = this.EmailServerFQDN;
                            remotewipeAcknowledgementRequest.UseSSL = this.UseSSLTransport;

                            // Test Device Details
                            remotewipeAcknowledgementRequest.DeviceID = this.DeviceID;
                            remotewipeAcknowledgementRequest.DeviceType = this.DeviceType;
                            remotewipeAcknowledgementRequest.UserAgent = this.UserAgent;

                            // EAS Protocol Specs
                            remotewipeAcknowledgementRequest.ProtocolVersion = this.ProtocolVersion;
                            remotewipeAcknowledgementRequest.UseEncodedRequestLine = this.UseEncodedRequestLine;
                            remotewipeAcknowledgementRequest.PolicyKey = this.PolicyKey;
                            remotewipeAcknowledgementRequest.IsRemoteWipe = true;
                            // Indicate RemoteWipe Status (For now just indicate a successful wipe)
                            // TBD: Check & Modify for failed remote-wipe operation.
                            remotewipeAcknowledgementRequest.Status = 1;

                            // Send RemoteWipe Acknowledgment
                            tcLog.Info("Sending RemoteWipe Acknowledgment... ");
                            ASProvisionResponse remotewipeAcknowledgementResponse = (ASProvisionResponse)remotewipeAcknowledgementRequest.GetResponse();
                            #endregion

                            tcLog.Info("Remote wipe acknowledgment response status: " + remotewipeAcknowledgementResponse.Status.ToString());
                            tcLog.Info("Removing all stored credentials & destroying all activesync data present on the device. This action is irreversible... ");

                            // TBD: Implement removal of mailbox items & stored credentials from sqlite database.

                            HardReset();
                        }
                        // If the server has provided a policy and a temporary policy key. 
                        // The client must acknowledge this policy in order to get a permanent policy key.
                        else
                        {
                            tcLog.Info("Policy retrived from the server! ");

                            // TBD: Implement saving of policy data to sqlite database based on Mobile Device Type 
                            //      (e.g. iOS, WM, Android, Symbian).

                            tcLog.Info("Temporary Policy Key: " + initialProvisionResponse.Policy.PolicyKey.ToString());

                            #region Policy Acknowledgement Request/Response
                            // Initialize the Policy Acknowledgement Request
                            ASProvisionRequest policyAcknowledgementRequest = new ASProvisionRequest();

                            // EAS Auth Credentials
                            policyAcknowledgementRequest.UPNAuth = this.UPNAuth;
                            policyAcknowledgementRequest.EmailAddress = this.EmailAddress;
                            policyAcknowledgementRequest.Password = this.Password;
                            policyAcknowledgementRequest.Username = this.Username;
                            policyAcknowledgementRequest.Domain = this.EmailDomain;

                            // Zimbra Server Details
                            policyAcknowledgementRequest.Server = this.EmailServerFQDN;
                            policyAcknowledgementRequest.UseSSL = this.UseSSLTransport;

                            // Test Device Details
                            policyAcknowledgementRequest.DeviceID = this.DeviceID;
                            policyAcknowledgementRequest.DeviceType = this.DeviceType;
                            policyAcknowledgementRequest.UserAgent = this.UserAgent;

                            // EAS Protocol Specs
                            policyAcknowledgementRequest.ProtocolVersion = this.ProtocolVersion;
                            policyAcknowledgementRequest.UseEncodedRequestLine = this.UseEncodedRequestLine;
                            // Set the policy key to the temporary key retrived from the previous response.
                            policyAcknowledgementRequest.PolicyKey = initialProvisionResponse.Policy.PolicyKey;
                            policyAcknowledgementRequest.IsAcknowledgement = true;
                            // Indicate successful application of the policy.
                            // (For now just indicate a successful application of policies)
                            // TBD: Handle cases for various policy acknowledgement types.
                            policyAcknowledgementRequest.Status = (int)ASProvisionRequest.PolicyAcknowledgement.Success;

                            // Send Policy Acknowledgement Request & Receive Response
                            tcLog.Info("Sending Policy Acknowledgment... ");
                            ASProvisionResponse policyAcknowledgementResponse = (ASProvisionResponse)policyAcknowledgementRequest.GetResponse();
                            #endregion

                            tcLog.Info("Policy Acknowledgment Response Status: " + policyAcknowledgementResponse.Status.ToString());

                            tcLog.Info("Permanent Policy Key: " + policyAcknowledgementResponse.Policy.PolicyKey.ToString());
                        }
                    }
                    else
                    {
                        tcLog.Info("Policy Error returned for initial provision request: Status Code " + initialProvisionResponse.Policy.Status.ToString());
                    }
                }
            }
            else if (initialProvisionResponse.Status == (Int32)ASProvisionResponse.ProvisionStatus.ProtocolError)
            {
                tcLog.Info("Protocol Error: Syntax error in the Provision command request. Fix syntax in the request and resubmit!");
            }
            else if (initialProvisionResponse.Status == (Int32)ASProvisionResponse.ProvisionStatus.ServerError)
            {
                tcLog.Info("Server Error: Server misconfiguration, temporary system issue, or bad item. This is frequently a transient condition. Please Retry!");
            }
            else
            {
                tcLog.Info("Error returned for initial provision request: Status Code " + initialProvisionResponse.Status.ToString());
            }
        }

        #endregion

    }
}
