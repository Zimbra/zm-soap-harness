using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Collections;

namespace Utilities
{
    public class ZimbraDevice
    {
        private ZimbraAccount MyAccount = null;


        const string strSettingsXmlns = "settings";
        const string strSettingsNamespace = "Settings";

        private string MyDeviceId = "EX2010activesyncfoldercs";
        private string MyDeviceType = "ZimbraHarness";
        private string MyModel = "Sample Model";
        private string MyIMEINumber = null;
        private string MyFriendlyName = "FolderSync/Sync Example";
        private string MyOperatingSystem = "Sample OS 1.0";
        private string MyOperatingSystemLanguage = "English";
        private string MyPhoneNumber = "650-555-1000";
        private string MyMobileOperator = "Phone Company";
        private string MyUserAgent = "EX2010_activesyncfolder_cs_1.0";

        private uint MyPolicyKey = 0;
        private Hashtable MySyncKeys = new Hashtable(); // A table of SyncKeys per CollectionId (folders) for Sync requests
        private String MyFolderSyncKey = null; // For FolderSync requests (?)



        #region Property Accessors
        public string DeviceID
        {
            get
            {
                return MyDeviceId;
            }
            set
            {
                MyDeviceId = value;
            }
        }

        public string DeviceType
        {
            get
            {
                return MyDeviceType;
            }
            set
            {
                MyDeviceType = value;
            }
        }

        public string Model
        {
            get
            {
                return MyModel;
            }
            set
            {
                MyModel = value;
            }
        }

        public string IMEI
        {
            get
            {
                return MyIMEINumber;
            }
            set
            {
                MyIMEINumber = value;
            }
        }

        public string FriendlyName
        {
            get
            {
                return MyFriendlyName;
            }
            set
            {
                MyFriendlyName = value;
            }
        }

        public string OperatingSystem
        {
            get
            {
                return MyOperatingSystem;
            }
            set
            {
                MyOperatingSystem = value;
            }
        }

        public string OperatingSystemLanguage
        {
            get
            {
                return MyOperatingSystemLanguage;
            }
            set
            {
                MyOperatingSystemLanguage = value;
            }
        }

        public string PhoneNumber
        {
            get
            {
                return MyPhoneNumber;
            }
            set
            {
                MyPhoneNumber = value;
            }
        }

        public string MobileOperator
        {
            get
            {
                return MyMobileOperator;
            }
            set
            {
                MyMobileOperator = value;
            }
        }

        public string UserAgent
        {
            get
            {
                return MyUserAgent;
            }
            set
            {
                MyUserAgent = value;
            }
        }

        public uint PolicyKey
        {
            get { return (MyPolicyKey); }
            set { MyPolicyKey = value; }
        }

        public Hashtable SyncKeys
        {
            get { return (MySyncKeys); }
        }

        public String FolderSyncKey
        {
            get { return (MyFolderSyncKey); }
            set { MyFolderSyncKey = value; }
        }

        #endregion

        public ZimbraDevice()
        {
        }

        public ZimbraDevice(ZimbraAccount account)
        {
            MyAccount = account;
        }





        // This function generates and returns an XmlNode for the
        // DeviceInformation element.
        public XmlNode GetDeviceInformationNode()
        {
            XmlDocument xmlDoc = new XmlDocument();

            XmlElement deviceInfoElement = xmlDoc.CreateElement(strSettingsXmlns, "DeviceInformation", strSettingsNamespace);
            xmlDoc.AppendChild(deviceInfoElement);

            XmlElement setElement = xmlDoc.CreateElement(strSettingsXmlns, "Set", strSettingsNamespace);
            deviceInfoElement.AppendChild(setElement);

            if (Model != null)
            {
                XmlElement modelElement = xmlDoc.CreateElement(strSettingsXmlns, "Model", strSettingsNamespace);
                modelElement.InnerText = Model;
                setElement.AppendChild(modelElement);
            }

            if (IMEI != null)
            {
                XmlElement IMEIElement = xmlDoc.CreateElement(strSettingsXmlns, "IMEI", strSettingsNamespace);
                IMEIElement.InnerText = IMEI;
                setElement.AppendChild(IMEIElement);
            }

            if (FriendlyName != null)
            {
                XmlElement friendlyNameElement = xmlDoc.CreateElement(strSettingsXmlns, "FriendlyName", strSettingsNamespace);
                friendlyNameElement.InnerText = FriendlyName;
                setElement.AppendChild(friendlyNameElement);
            }

            if (OperatingSystem != null)
            {
                XmlElement operatingSystemElement = xmlDoc.CreateElement(strSettingsXmlns, "OS", strSettingsNamespace);
                operatingSystemElement.InnerText = OperatingSystem;
                setElement.AppendChild(operatingSystemElement);
            }

            if (OperatingSystemLanguage != null)
            {
                XmlElement operatingSystemLanguageElement = xmlDoc.CreateElement(strSettingsXmlns, "OSLanguage", strSettingsNamespace);
                operatingSystemLanguageElement.InnerText = OperatingSystemLanguage;
                setElement.AppendChild(operatingSystemLanguageElement);
            }

            if (PhoneNumber != null)
            {
                XmlElement phoneNumberElement = xmlDoc.CreateElement(strSettingsXmlns, "PhoneNumber", strSettingsNamespace);
                phoneNumberElement.InnerText = PhoneNumber;
                setElement.AppendChild(phoneNumberElement);
            }

            if (MobileOperator != null)
            {
                XmlElement mobileOperatorElement = xmlDoc.CreateElement(strSettingsXmlns, "MobileOperator", strSettingsNamespace);
                mobileOperatorElement.InnerText = MobileOperator;
                setElement.AppendChild(mobileOperatorElement);
            }

            if (UserAgent != null)
            {
                XmlElement userAgentElement = xmlDoc.CreateElement(strSettingsXmlns, "UserAgent", strSettingsNamespace);
                userAgentElement.InnerText = UserAgent;
                setElement.AppendChild(userAgentElement);
            }

            return xmlDoc.DocumentElement;
        }
    }
}
