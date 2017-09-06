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
    // This class represents a FolderSync command response as specified in MS-ASCMD documentation.
    internal class ASFolderSyncResponse : ASCommandResponse
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        // This enumeration covers the possible Status values for FolderSync responses.
        internal enum FolderSyncStatus
        {
            Success = 1,        // Success
            ServerError = 6,    // An error occurred on the server.
            InvalidSyncKey = 9, // Synchronization key mismatch or invalid synchronization key.
            InvalidFormat = 10, // Incorrectly formatted request.
            UnknownError = 11,  // An unknown error occurred.
            UnknownCode = 12    // Code unknown.
        }

        private XmlDocument responseXML = null;
        private XmlNamespaceManager xmlNamespaceMgr = null;
        private Int32 status = 0;

        #region Property Accessors
        internal Int32 Status
        {
            get { return status; }
        }
        #endregion

        internal ASFolderSyncResponse(HttpWebResponse httpResponse) : base(httpResponse)
        {
            responseXML = new XmlDocument();
            responseXML.LoadXml(XMLString);

            xmlNamespaceMgr = new XmlNamespaceManager(responseXML.NameTable);
            xmlNamespaceMgr.AddNamespace(XmlNS.FolderHierarchy, Namespace.FolderHierarchy);

            SetStatus();
        }

        // This function extracts the response status from the XML and sets the status property.
        private void SetStatus()
        {
            XmlNode folderSyncNode = responseXML.SelectSingleNode(".//folderhierarchy:FolderSync", xmlNamespaceMgr);
            XmlNode statusNode = null;
            if (folderSyncNode != null)
                statusNode = folderSyncNode.SelectSingleNode(".//folderhierarchy:Status", xmlNamespaceMgr);

            if (statusNode != null)
                status = XmlConvert.ToInt32(statusNode.InnerText);
        }
    }
}
