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
using System.Xml;
using System.Net;
using System.Text;
using System.Collections.Generic;
using log4net;
using EASHarness.Harness;
using EASHarness.ActiveSync.WBXML;

namespace EASHarness.ActiveSync.HTTP
{
    // This class is used to generate the DeviceInformation XML element
    internal class DeviceInformation
    {
        private string deviceID = null;
        private string deviceType = null;
        private string model = null;
        private string imeiNumber = null;
        private string friendlyName = null;
        private string operatingSystem = null;
        private string operatingSystemLanguage = null;
        private string phoneNumber = null;
        private string mobileOperator = null;
        private string userAgent = null;

        #region Property Accessors
        internal string DeviceID
        {
            get { return deviceID; }

            set { deviceID = value; }
        }

        internal string DeviceType
        {
            get { return deviceType; }

            set { deviceType = value; }
        }

        internal string Model
        {
            get { return model; }

            set { model = value; }
        }

        internal string IMEINumber
        {
            get { return imeiNumber; }

            set { imeiNumber = value; }
        }

        internal string FriendlyName
        {
            get { return friendlyName; }

            set { friendlyName = value; }
        }

        internal string OperatingSystem
        {
            get { return operatingSystem; }

            set { operatingSystem = value; }
        }

        internal string OperatingSystemLanguage
        {
            get { return operatingSystemLanguage; }

            set { operatingSystemLanguage = value; }
        }

        internal string PhoneNumber
        {
            get { return phoneNumber; }

            set { phoneNumber = value; }
        }

        internal string MobileOperator
        {
            get { return mobileOperator; }

            set { mobileOperator = value; }
        }

        internal string UserAgent
        {
            get { return userAgent; }

            set { userAgent = value; }
        }
        #endregion

        internal XmlNode GetDeviceInformationNode()
        {
            XmlDocument xmlDoc = new XmlDocument();

            XmlElement deviceInfoElement = xmlDoc.CreateElement(XmlNS.Settings, "DeviceInformation", Namespace.Settings);
            xmlDoc.AppendChild(deviceInfoElement);

            XmlElement setElement = xmlDoc.CreateElement(XmlNS.Settings, "Set", Namespace.Settings);
            deviceInfoElement.AppendChild(setElement);

            if (Model != null)
            {
                XmlElement modelElement = xmlDoc.CreateElement(XmlNS.Settings, "Model", Namespace.Settings);
                modelElement.InnerText = Model;
                setElement.AppendChild(modelElement);
            }

            if (IMEINumber != null)
            {
                XmlElement imeiElement = xmlDoc.CreateElement(XmlNS.Settings, "IMEI", Namespace.Settings);
                imeiElement.InnerText = IMEINumber;
                setElement.AppendChild(imeiElement);
            }

            if (FriendlyName != null)
            {
                XmlElement friendlyNameElement = xmlDoc.CreateElement(XmlNS.Settings, "FriendlyName", Namespace.Settings);
                friendlyNameElement.InnerText = FriendlyName;
                setElement.AppendChild(friendlyNameElement);
            }

            if (OperatingSystem != null)
            {
                XmlElement operatingSystemElement = xmlDoc.CreateElement(XmlNS.Settings, "OS", Namespace.Settings);
                operatingSystemElement.InnerText = OperatingSystem;
                setElement.AppendChild(operatingSystemElement);
            }

            if (OperatingSystemLanguage != null)
            {
                XmlElement operatingSystemLanguageElement = xmlDoc.CreateElement(XmlNS.Settings, "OSLanguage", Namespace.Settings);
                operatingSystemLanguageElement.InnerText = OperatingSystemLanguage;
                setElement.AppendChild(operatingSystemLanguageElement);
            }

            if (PhoneNumber != null)
            {
                XmlElement phoneNumberElement = xmlDoc.CreateElement(XmlNS.Settings, "PhoneNumber", Namespace.Settings);
                phoneNumberElement.InnerText = PhoneNumber;
                setElement.AppendChild(phoneNumberElement);
            }

            if (MobileOperator != null)
            {
                XmlElement mobileOperatorElement = xmlDoc.CreateElement(XmlNS.Settings, "MobileOperator", Namespace.Settings);
                mobileOperatorElement.InnerText = MobileOperator;
                setElement.AppendChild(mobileOperatorElement);
            }

            if (UserAgent != null)
            {
                XmlElement userAgentElement = xmlDoc.CreateElement(XmlNS.Settings, "UserAgent", Namespace.Settings);
                userAgentElement.InnerText = UserAgent;
                setElement.AppendChild(userAgentElement);
            }

            return xmlDoc.DocumentElement;
        }
    }
}
