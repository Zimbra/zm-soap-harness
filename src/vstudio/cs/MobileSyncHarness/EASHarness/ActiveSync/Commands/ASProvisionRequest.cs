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
    // This class represents a Provision command request as specified in MS-ASPROV documentation
    internal class ASProvisionRequest : ASCommandRequest
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        // This enumeration covers the acceptable values of the Status element 
        // in a Provision request when acknowledging an EAS policy.
        internal enum PolicyAcknowledgement
        {
            Success = 1,
            PartialSuccess = 2,     // Partial success (at least the PIN was enabled).
            PolicyIgnored = 3,      // The client did not apply the policy at all.
            ExternalManagement = 4  // The client claims to have been provisioned by a third party.
        }

        private static string policyType = "MS-EAS-Provisioning-WBXML";

        private bool isAcknowledgement = false;
        private bool isRemoteWipe = false;
        private Int32 status = 0;
        private DeviceInformation provisionDevice = null;

        #region Property Accessors
        internal bool IsAcknowledgement
        {
            get { return isAcknowledgement; }

            set { isAcknowledgement = value; }
        }

        internal bool IsRemoteWipe
        {
            get { return isRemoteWipe; }

            set { isRemoteWipe = value; }
        }

        internal DeviceInformation ProvisionDevice
        {
            get { return provisionDevice; }

            set { provisionDevice = value; }
        }

        internal Int32 Status
        {
            get { return status; }

            set { status = value; }
        }
        #endregion

        internal ASProvisionRequest()
        {
            Command = "Provision";

        }

        // This function generates an ASProvisionResponse from an HTTP response.
        protected override ASCommandResponse WrapHttpWebResponse(HttpWebResponse webResponse)
        {
            return new ASProvisionResponse(webResponse);
        }

        // This function generates the XML request body for the Provision request.
        protected override void GenerateXMLPayload()
        {
            // If WBXML was explicitly set, use that
            if (WBXMLBytes != null)
                return;

            // Otherwise, use the properties to build the XML and then WBXML encode it
            XmlDocument provisionXML = new XmlDocument();

            XmlDeclaration xmlDeclaration = provisionXML.CreateXmlDeclaration("1.0", "utf-8", null);
            provisionXML.InsertBefore(xmlDeclaration, null);

            XmlNode provisionNode = provisionXML.CreateElement(XmlNS.Provision, "Provision", Namespace.Provision);
            provisionNode.Prefix = XmlNS.Provision;
            provisionXML.AppendChild(provisionNode);

            // If this is a remote wipe acknowledgment, use the remote wipe acknowledgment format
            if (isRemoteWipe)
            {
                // Build response to RemoteWipe request
                XmlNode remoteWipeNode = provisionXML.CreateElement(XmlNS.Provision, "RemoteWipe", Namespace.Provision);
                remoteWipeNode.Prefix = XmlNS.Provision;
                provisionNode.AppendChild(remoteWipeNode);

                // Always return success for remote wipe
                XmlNode statusNode = provisionXML.CreateElement(XmlNS.Provision, "Status", Namespace.Provision);
                statusNode.Prefix = XmlNS.Provision;
                statusNode.InnerText = "1";
                remoteWipeNode.AppendChild(statusNode);
            }

            // The other two possibilities here are - 
            // [1]. An initial request
            // [2]. An acknowledgment of a policy received in a previous Provision response.
            else
            {
                if (!isAcknowledgement && ProtocolVersion == "14.1")
                {
                    // A DeviceInformation node is only included in the initial request if MS-ASProtocolVersion = 14.1
                    XmlNode deviceNode = provisionXML.ImportNode(provisionDevice.GetDeviceInformationNode(), true);
                    provisionNode.AppendChild(deviceNode);
                }

                // These nodes are included in both scenarios.
                XmlNode policiesNode = provisionXML.CreateElement(XmlNS.Provision, "Policies", Namespace.Provision);
                policiesNode.Prefix = XmlNS.Provision;
                provisionNode.AppendChild(policiesNode);

                XmlNode policyNode = provisionXML.CreateElement(XmlNS.Provision, "Policy", Namespace.Provision);
                policyNode.Prefix = XmlNS.Provision;
                policiesNode.AppendChild(policyNode);

                XmlNode policyTypeNode = provisionXML.CreateElement(XmlNS.Provision, "PolicyType", Namespace.Provision);
                policyTypeNode.Prefix = XmlNS.Provision;
                policyTypeNode.InnerText = policyType;
                policyNode.AppendChild(policyTypeNode);

                if (isAcknowledgement)
                {
                    // Need to include policy key and status when acknowledging
                    XmlNode policyKeyNode = provisionXML.CreateElement(XmlNS.Provision, "PolicyKey", Namespace.Provision);
                    policyKeyNode.Prefix = XmlNS.Provision;
                    policyKeyNode.InnerText = PolicyKey.ToString();
                    policyNode.AppendChild(policyKeyNode);

                    XmlNode statusNode = provisionXML.CreateElement(XmlNS.Provision, "Status", Namespace.Provision);
                    statusNode.Prefix = XmlNS.Provision;
                    statusNode.InnerText = status.ToString();
                    policyNode.AppendChild(statusNode);
                }
            }

            StringWriter stringWriter = new StringWriter();
            XmlTextWriter xmlTextWriter = new XmlTextWriter(stringWriter);
            xmlTextWriter.Formatting = Formatting.Indented;
            provisionXML.WriteTo(xmlTextWriter);
            xmlTextWriter.Flush();

            tcLog.Info("Generated " + Command.ToUpper() + " Request Payload (Plain XML)... \r\n\r\n" + stringWriter.ToString() + "\r\n");

            XMLString = stringWriter.ToString();
        }
    }
}
