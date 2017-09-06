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
    // This class represents the Provision command response specified in MS-ASPROV documentation.
    internal class ASProvisionResponse : ASCommandResponse
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        // This enumeration covers the Provision specific status values that the server may return.
        internal enum ProvisionStatus
        {
            Success = 1,                                // Success
            ProtocolError = 2,                          // Protocol error
            ServerError = 3,                            // An error occurred on the server.
            DeviceNotFullyProvisionable = 139,          // The client cannot fully comply with all requirements of the policy.
            LegacyDeviceOnStrictPolicy = 141,           // The device is not provisionable.
            ExternallyManagedDevicesNotAllowed = 145    // The client is externally managed.
        }

        private bool isPolicyLoaded = false;
        private ASPolicy policy = null;
        private Int32 status = 0;

        #region Property Accessors
        internal bool IsPolicyLoaded
        {
            get { return isPolicyLoaded; }
        }

        public ASPolicy Policy
        {
            get { return policy; }
        }

        public Int32 Status
        {
            get { return status; }
        }
        #endregion

        internal ASProvisionResponse(HttpWebResponse httpResponse) : base(httpResponse)
        {
            SetStatus();

            policy = new ASPolicy();
            isPolicyLoaded = policy.LoadXML(XMLString);
        }

        // This function parses the response XML for the Status element under the 
        // Provision element and sets the status property according to the value.
        private void SetStatus()
        {
            XmlDocument responseXML = new XmlDocument();
            responseXML.LoadXml(XMLString);

            XmlNamespaceManager xmlNamespaceMgr = new XmlNamespaceManager(responseXML.NameTable);
            xmlNamespaceMgr.AddNamespace("provision", "Provision");

            XmlNode provisionNode = responseXML.SelectSingleNode(".//provision:Provision", xmlNamespaceMgr);
            XmlNode statusNode = null;
            if (provisionNode != null)
                statusNode = provisionNode.SelectSingleNode(".//provision:Status", xmlNamespaceMgr);

            if (statusNode != null)
                status = XmlConvert.ToInt32(statusNode.InnerText);
        }
    }
}
