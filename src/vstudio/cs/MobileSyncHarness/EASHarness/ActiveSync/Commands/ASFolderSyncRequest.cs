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
    // This class represents the FolderSync command request specified in MS-ASCMD documentation.
    internal class ASFolderSyncRequest : ASCommandRequest
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private string syncKey = "0";

        #region Property Accessors
        internal string SyncKey
        {
            get { return syncKey; }

            set { syncKey = value; }
        }
        #endregion

        internal ASFolderSyncRequest()
        {
            Command = "FolderSync";
        }

        // This function generates an ASFolderSyncResponse from an HTTP response.
        protected override ASCommandResponse WrapHttpWebResponse(HttpWebResponse webResponse)
        {
            return new ASFolderSyncResponse(webResponse);
        }

        // This function generates the XML request body for the FolderSync request.
        protected override void GenerateXMLPayload()
        {
            // If WBXML was explicitly set, use that
            if (WBXMLBytes != null)
                return;

            // Otherwise, use the properties to build the XML and then WBXML encode it
            XmlDocument folderSyncXML = new XmlDocument();

            XmlDeclaration xmlDeclaration = folderSyncXML.CreateXmlDeclaration("1.0", "utf-8", null);
            folderSyncXML.InsertBefore(xmlDeclaration, null);

            XmlNode folderSyncNode = folderSyncXML.CreateElement(XmlNS.FolderHierarchy, "FolderSync", Namespace.FolderHierarchy);
            folderSyncNode.Prefix = XmlNS.FolderHierarchy;
            folderSyncXML.AppendChild(folderSyncNode);

            if (syncKey == "")
                syncKey = "0";

            XmlNode syncKeyNode = folderSyncXML.CreateElement(XmlNS.FolderHierarchy, "SyncKey", Namespace.FolderHierarchy);
            syncKeyNode.Prefix = XmlNS.FolderHierarchy;
            syncKeyNode.InnerText = syncKey;
            folderSyncNode.AppendChild(syncKeyNode);

            StringWriter stringWriter = new StringWriter();
            XmlTextWriter xmlTextWriter = new XmlTextWriter(stringWriter);
            xmlTextWriter.Formatting = Formatting.Indented;
            folderSyncXML.WriteTo(xmlTextWriter);
            xmlTextWriter.Flush();

            tcLog.Info("Generated " + Command.ToUpper() + " Request Payload (Plain XML)... \r\n\r\n" + stringWriter.ToString() + "\r\n");

            XMLString = stringWriter.ToString();
        }
    }
}
