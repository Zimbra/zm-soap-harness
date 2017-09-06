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
    // This class represents an Exchange ActiveSync policy.
    internal class ASPolicy
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        #region Enumerations
        public enum EncryptionAlgorithm
        {
            TripleDES = 0,
            DES = 1,
            RC2_128bit = 2,
            RC2_64bit = 3,
            RC2_40bit = 4
        }

        public enum SigningAlgorithm
        {
            SHA1 = 0,
            MD5 = 1
        }

        public enum CalendarAgeFilter
        {
            ALL = 0,
            TWO_WEEKS = 4,
            ONE_MONTH = 5,
            THREE_MONTHS = 6,
            SIX_MONTHS = 7
        }

        public enum MailAgeFilter
        {
            ALL = 0,
            ONE_DAY = 1,
            THREE_DAYS = 2,
            ONE_WEEK = 3,
            TWO_WEEKS = 4,
            ONE_MONTH = 5
        }

        public enum PolicyStatus
        {
            Success = 1,
            NoPolicyDefined = 2,
            PolicyTypeUnknown = 3,
            PolicyDataCorrupt = 4,
            PolicyKeyMismatch = 5
        }
        #endregion

        private Int32 status = 0;
        private UInt32 policyKey = 0;
        private byte allowBlueTooth = 0;
        private bool allowBrowser = false;
        private bool allowCamera = false;
        private bool allowConsumerEmail = false;
        private bool allowDesktopSync = false;
        private bool allowHTMLEmail = false;
        private bool allowInternetSharing = false;
        private bool allowIrDA = false;
        private bool allowPOPIMAPEmail = false;
        private bool allowRemoteDesktop = false;
        private bool allowSimpleDevicePassword = false;
        private Int32 allowSMIMEEncryptionAlgorithmNegotiation = 0;
        private bool allowSMIMESoftCerts = false;
        private bool allowStorageCard = false;
        private bool allowTextMessaging = false;
        private bool allowUnsignedApplications = false;
        private bool allowUnsignedInstallationPackages = false;
        private bool allowWifi = false;
        private bool alphanumericDevicePasswordRequired = false;
        private bool attachmentsEnabled = false;
        private bool devicePasswordEnabled = false;
        private UInt32 devicePasswordExpiration = 0;
        private UInt32 devicePasswordHistory = 0;
        private UInt32 maxAttachmentSize = 0;
        private UInt32 maxCalendarAgeFilter = 0;
        private UInt32 maxDevicePasswordFailedAttempts = 0;
        private UInt32 maxEmailAgeFilter = 0;
        private Int32 maxEmailBodyTruncationSize = -1;
        private Int32 maxEmailHTMLBodyTruncationSize = -1;
        private UInt32 maxInactivityTimeDeviceLock = 0;
        private byte minDevicePasswordComplexCharacters = 1;
        private byte minDevicePasswordLength = 1;
        private bool passwordRecoveryEnabled = false;
        private bool requireDeviceEncryption = false;
        private bool requireEncryptedSMIMEMessages = false;
        private Int32 requireEncryptionSMIMEAlgorithm = 0;
        private bool requireManualSyncWhenRoaming = false;
        private Int32 requireSignedSMIMEAlgorithm = 0;
        private bool requireSignedSMIMEMessages = false;
        private bool requireStorageCardEncryption = false;
        private string[] approvedApplicationList = null;
        private string[] unapprovedInROMApplicationList = null;
        private bool remoteWipeRequested = false;
        private bool hasPolicyInfo = false;

        #region Property Accessors
        internal Int32 Status
        {
            get { return status; }
        }

        internal UInt32 PolicyKey
        {
            get { return policyKey; }
        }

        internal byte AllowBlueTooth
        {
            get { return allowBlueTooth; }
        }

        internal bool AllowBrowser
        {
            get { return allowBrowser; }
        }

        internal bool AllowCamera
        {
            get { return allowCamera; }
        }

        internal bool AllowConsumerEmail
        {
            get { return allowConsumerEmail; }
        }

        internal bool AllowDesktopSync
        {
            get { return allowDesktopSync; }
        }

        internal bool AllowHTMLEmail
        {
            get { return allowHTMLEmail; }
        }

        internal bool AllowInternetSharing
        {
            get { return allowInternetSharing; }
        }

        internal bool AllowIrDA
        {
            get { return allowIrDA; }
        }

        internal bool AllowPOPIMAPEmail
        {
            get { return allowPOPIMAPEmail; }
        }

        internal bool AllowRemoteDesktop
        {
            get { return allowRemoteDesktop; }
        }

        internal bool AllowSimpleDevicePassword
        {
            get { return allowSimpleDevicePassword; }
        }

        internal Int32 AllowSMIMEEncryptionAlgorithmNegotiation
        {
            get { return allowSMIMEEncryptionAlgorithmNegotiation; }
        }

        internal bool AllowSMIMESoftCerts
        {
            get { return allowSMIMESoftCerts; }
        }

        internal bool AllowStorageCard
        {
            get { return allowStorageCard; }
        }

        internal bool AllowTextMessaging
        {
            get { return allowTextMessaging; }
        }

        internal bool AllowUnsignedApplications
        {
            get { return allowUnsignedApplications; }
        }

        internal bool AllowUnsignedInstallationPackages
        {
            get { return allowUnsignedInstallationPackages; }
        }

        internal bool AllowWifi
        {
            get { return allowWifi; }
        }

        internal bool AlphanumericDevicePasswordRequired
        {
            get { return alphanumericDevicePasswordRequired; }
        }

        internal bool AttachmentsEnabled
        {
            get { return attachmentsEnabled; }
        }

        internal bool DevicePasswordEnabled
        {
            get { return devicePasswordEnabled; }
        }

        internal UInt32 DevicePasswordExpiration
        {
            get { return devicePasswordExpiration; }
        }

        internal UInt32 DevicePasswordHistory
        {
            get { return devicePasswordHistory; }
        }

        internal UInt32 MaxAttachmentSize
        {
            get { return maxAttachmentSize; }
        }

        internal UInt32 MaxCalendarAgeFilter
        {
            get { return maxCalendarAgeFilter; }
        }

        internal UInt32 MaxDevicePasswordFailedAttempts
        {
            get { return maxDevicePasswordFailedAttempts; }
        }

        internal UInt32 MaxEmailAgeFilter
        {
            get { return maxEmailAgeFilter; }
        }

        internal Int32 MaxEmailBodyTruncationSize
        {
            get { return maxEmailBodyTruncationSize; }
        }

        internal Int32 MaxEmailHTMLBodyTruncationSize
        {
            get { return maxEmailHTMLBodyTruncationSize; }
        }

        internal UInt32 MaxInactivityTimeDeviceLock
        {
            get { return maxInactivityTimeDeviceLock; }
        }

        internal byte MinDevicePasswordComplexCharacters
        {
            get { return minDevicePasswordComplexCharacters; }
        }

        internal byte MinDevicePasswordLength
        {
            get { return minDevicePasswordLength; }
        }

        internal bool PasswordRecoveryEnabled
        {
            get { return passwordRecoveryEnabled; }
        }

        internal bool RequireDeviceEncryption
        {
            get { return requireDeviceEncryption; }
        }

        internal bool RequireEncryptedSMIMEMessages
        {
            get { return requireEncryptedSMIMEMessages; }
        }

        internal Int32 RequireEncryptionSMIMEAlgorithm
        {
            get { return requireEncryptionSMIMEAlgorithm; }
        }

        internal bool RequireManualSyncWhenRoaming
        {
            get { return requireManualSyncWhenRoaming; }
        }

        internal Int32 RequireSignedSMIMEAlgorithm
        {
            get { return requireSignedSMIMEAlgorithm; }
        }

        internal bool RequireSignedSMIMEMessages
        {
            get { return requireSignedSMIMEMessages; }
        }

        internal bool RequireStorageCardEncryption
        {
            get { return requireStorageCardEncryption; }
        }

        internal string[] ApprovedApplicationList
        {
            get { return approvedApplicationList; }
        }

        internal string[] UnapprovedInROMApplicationList
        {
            get { return unapprovedInROMApplicationList; }
        }

        internal bool RemoteWipeRequested
        {
            get { return remoteWipeRequested; }
        }

        internal bool HasPolicyInfo
        {
            get { return hasPolicyInfo; }
        }
        #endregion

        // This function parses a Provision command response and extracts the policy information.
        internal bool LoadXML(string policyXML)
        {
            XmlDocument xmlDoc = new XmlDocument();

            try
            {
                xmlDoc.LoadXml(policyXML);

                XmlNamespaceManager xmlNamespaceMgr = new XmlNamespaceManager(xmlDoc.NameTable);
                xmlNamespaceMgr.AddNamespace("provision", "Provision");

                // Find the policy.
                XmlNode policyNode = xmlDoc.SelectSingleNode(".//provision:Policy", xmlNamespaceMgr);

                if (policyNode != null)
                {
                    XmlNode policyTypeNode = policyNode.SelectSingleNode("provision:PolicyType", xmlNamespaceMgr);
                    if (policyTypeNode != null && policyTypeNode.InnerText == "MS-EAS-Provisioning-WBXML")
                    {
                        // Get the policy's status
                        XmlNode policyStatusNode = policyNode.SelectSingleNode("provision:Status", xmlNamespaceMgr);
                        if (policyStatusNode != null)
                            status = XmlConvert.ToInt32(policyStatusNode.InnerText);

                        // Get the policy key
                        XmlNode policyKeyNode = policyNode.SelectSingleNode("provision:PolicyKey", xmlNamespaceMgr);
                        if (policyKeyNode != null)
                            policyKey = XmlConvert.ToUInt32(policyKeyNode.InnerText);

                        // Get the contents of the policy
                        XmlNode provisioningDocNode = policyNode.SelectSingleNode(".//provision:EASProvisionDoc", xmlNamespaceMgr);
                        if (provisioningDocNode != null)
                        {
                            hasPolicyInfo = true;

                            foreach (XmlNode policySettingNode in provisioningDocNode.ChildNodes)
                            {
                                // Loop through the child nodes and set the corresponding property.
                                switch (policySettingNode.LocalName)
                                {
                                    case ("AllowBluetooth"):
                                        if (policySettingNode.InnerText != "")
                                            allowBlueTooth = XmlConvert.ToByte(policySettingNode.InnerText);
                                        break;
                                    case ("AllowBrowser"):
                                        if (policySettingNode.InnerText != "")
                                            allowBrowser = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowCamera"):
                                        if (policySettingNode.InnerText != "")
                                            allowCamera = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowConsumerEmail"):
                                        if (policySettingNode.InnerText != "")
                                            allowConsumerEmail = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowDesktopSync"):
                                        if (policySettingNode.InnerText != "")
                                            allowDesktopSync = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowHTMLEmail"):
                                        if (policySettingNode.InnerText != "")
                                            allowHTMLEmail = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowInternetSharing"):
                                        if (policySettingNode.InnerText != "")
                                            allowInternetSharing = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowIrDA"):
                                        if (policySettingNode.InnerText != "")
                                            allowIrDA = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowPOPIMAPEmail"):
                                        if (policySettingNode.InnerText != "")
                                            allowPOPIMAPEmail = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowRemoteDesktop"):
                                        if (policySettingNode.InnerText != "")
                                            allowRemoteDesktop = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowSimpleDevicePassword"):
                                        if (policySettingNode.InnerText != "")
                                            allowSimpleDevicePassword = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowSMIMEEncryptionAlgorithmNegotiation"):
                                        if (policySettingNode.InnerText != "")
                                            allowSMIMEEncryptionAlgorithmNegotiation = XmlConvert.ToInt32(policySettingNode.InnerText);
                                        break;
                                    case ("AllowSMIMESoftCerts"):
                                        if (policySettingNode.InnerText != "")
                                            allowSMIMESoftCerts = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowStorageCard"):
                                        if (policySettingNode.InnerText != "")
                                            allowStorageCard = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowTextMessaging"):
                                        if (policySettingNode.InnerText != "")
                                            allowTextMessaging = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowUnsignedApplications"):
                                        if (policySettingNode.InnerText != "")
                                            allowUnsignedApplications = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowUnsignedInstallationPackages"):
                                        if (policySettingNode.InnerText != "")
                                            allowUnsignedInstallationPackages = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AllowWiFi"):
                                        if (policySettingNode.InnerText != "")
                                            allowWifi = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("AlphanumericDevicePasswordRequired"):
                                        if (policySettingNode.InnerText != "")
                                            alphanumericDevicePasswordRequired = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("ApprovedApplicationList"):
                                        if (policySettingNode.InnerText != "")
                                            approvedApplicationList = ParseApplicationList(policySettingNode);
                                        break;
                                    case ("AttachmentsEnabled"):
                                        if (policySettingNode.InnerText != "")
                                            attachmentsEnabled = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("DevicePasswordEnabled"):
                                        if (policySettingNode.InnerText != "")
                                            devicePasswordEnabled = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("DevicePasswordExpiration"):
                                        if (policySettingNode.InnerText != "")
                                            devicePasswordExpiration = XmlConvert.ToUInt32(policySettingNode.InnerText);
                                        break;
                                    case ("DevicePasswordHistory"):
                                        if (policySettingNode.InnerText != "")
                                            devicePasswordHistory = XmlConvert.ToUInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MaxAttachmentSize"):
                                        if (policySettingNode.InnerText != "")
                                            maxAttachmentSize = XmlConvert.ToUInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MaxCalendarAgeFilter"):
                                        if (policySettingNode.InnerText != "")
                                            maxCalendarAgeFilter = XmlConvert.ToUInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MaxDevicePasswordFailedAttempts"):
                                        if (policySettingNode.InnerText != "")
                                            maxDevicePasswordFailedAttempts = XmlConvert.ToUInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MaxEmailAgeFilter"):
                                        if (policySettingNode.InnerText != "")
                                            maxEmailAgeFilter = XmlConvert.ToUInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MaxEmailBodyTruncationSize"):
                                        if (policySettingNode.InnerText != "")
                                            maxEmailBodyTruncationSize = XmlConvert.ToInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MaxEmailHTMLBodyTruncationSize"):
                                        if (policySettingNode.InnerText != "")
                                            maxEmailHTMLBodyTruncationSize = XmlConvert.ToInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MaxInactivityTimeDeviceLock"):
                                        if (policySettingNode.InnerText != "")
                                            maxInactivityTimeDeviceLock = XmlConvert.ToUInt32(policySettingNode.InnerText);
                                        break;
                                    case ("MinDevicePasswordComplexCharacters"):
                                        if (policySettingNode.InnerText != "")
                                            minDevicePasswordComplexCharacters = XmlConvert.ToByte(policySettingNode.InnerText);
                                        break;
                                    case ("MinDevicePasswordLength"):
                                        if (policySettingNode.InnerText != "")
                                            minDevicePasswordLength = XmlConvert.ToByte(policySettingNode.InnerText);
                                        break;
                                    case ("PasswordRecoveryEnabled"):
                                        if (policySettingNode.InnerText != "")
                                            passwordRecoveryEnabled = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("RequireDeviceEncryption"):
                                        if (policySettingNode.InnerText != "")
                                            requireDeviceEncryption = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("RequireEncryptedSMIMEMessages"):
                                        if (policySettingNode.InnerText != "")
                                            requireEncryptedSMIMEMessages = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("RequireEncryptionSMIMEAlgorithm"):
                                        if (policySettingNode.InnerText != "")
                                            requireEncryptionSMIMEAlgorithm = XmlConvert.ToInt32(policySettingNode.InnerText);
                                        break;
                                    case ("RequireManualSyncWhenRoaming"):
                                        if (policySettingNode.InnerText != "")
                                            requireManualSyncWhenRoaming = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("RequireSignedSMIMEAlgorithm"):
                                        if (policySettingNode.InnerText != "")
                                            requireSignedSMIMEAlgorithm = XmlConvert.ToInt32(policySettingNode.InnerText);
                                        break;
                                    case ("RequireSignedSMIMEMessages"):
                                        if (policySettingNode.InnerText != "")
                                            requireSignedSMIMEMessages = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("RequireStorageCardEncryption"):
                                        if (policySettingNode.InnerText != "")
                                            requireStorageCardEncryption = XmlConvert.ToBoolean(policySettingNode.InnerText);
                                        break;
                                    case ("UnapprovedInROMApplicationList"):
                                        if (policySettingNode.InnerText != "")
                                            unapprovedInROMApplicationList = ParseApplicationList(policySettingNode);
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }
                    }
                }

                // If this is a remote wipe, there's no further parsing to do.
                XmlNode remoteWipeNode = xmlDoc.SelectSingleNode(".//provision:RemoteWipe", xmlNamespaceMgr);
                if (remoteWipeNode != null)
                {
                    remoteWipeRequested = true;
                    return true;
                }
            }
            catch (Exception ex)
            {
                tcLog.Error("Attempting to extracts the policy information threw an exception: " + ex.ToString());
                return false;
            }

            return true;
        }

        // This function parses the contents of the ApprovedApplicationList 
        // and the UnapprovedInROMApplicationList nodes.
        private string[] ParseApplicationList(XmlNode applicationListNode)
        {
            List<string> applicationList = new List<string>();

            foreach (XmlNode applicationNode in applicationListNode.ChildNodes)
            {
                applicationList.Add(applicationNode.InnerText);
            }

            return applicationList.ToArray();
        }
    }
}
