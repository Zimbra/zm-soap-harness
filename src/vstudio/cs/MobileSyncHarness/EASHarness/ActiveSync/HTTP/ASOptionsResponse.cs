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

namespace EASHarness.ActiveSync.HTTP
{
    internal class ASOptionsResponse
    {
        private string versions = null;
        private string commands = null;

        #region Property Accessors

        internal string SupportedCommands
        {
            get { return commands; }
        }

        internal string SupportedVersions
        {
            get { return versions; }
        }

        internal string HighestSupportedVersion
        {
            get
            {
                char[] chDelimiters = { ',' };
                string[] strVersions = SupportedVersions.Split(chDelimiters);

                string strHighestVersion = "0";

                foreach (string strVersion in strVersions)
                {
                    if (Convert.ToSingle(strVersion) > Convert.ToSingle(strHighestVersion))
                    {
                        strHighestVersion = strVersion;
                    }
                }

                return strHighestVersion;
            }
        }

        #endregion

        internal ASOptionsResponse(HttpWebResponse httpResponse)
        {
            versions = httpResponse.GetResponseHeader("MS-ASProtocolVersions");
            commands = httpResponse.GetResponseHeader("MS-ASProtocolCommands");   
        }
    }
}
