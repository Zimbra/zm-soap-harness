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
using System.Text;
using System.Collections.Generic;

namespace EASHarness.ActiveSync.WBXML
{
    internal class ASWBXMLCodePage
    {
        /**
         * This class is used to perform WBXML codepage lookups. 
         * This class does lookups both ways (token-to-tag and tag-to-token).
         * 
         * This class has two string properties, "Namespace" and "XmlNS". 
         * Their purpose is to identify the XML namespace that corresponds to the codepage.
         **/

        private string strNamespace = "";
        private string strXmlNS = "";
        private Dictionary<byte, string> tokenLookup = new Dictionary<byte, string>();
        private Dictionary<string, byte> tagLookup = new Dictionary<string, byte>();

        internal string Namespace
        {
            get { return strNamespace; }

            set { strNamespace = value; }
        }

        internal string XmlNS
        {
            get { return strXmlNS; }

            set { strXmlNS = value; }
        }

        internal void SetToken(byte token, string tag)
        {
            tokenLookup.Add(token, tag);
            tagLookup.Add(tag, token);
        }

        internal byte GetToken(string tag)
        {
            if (tagLookup.ContainsKey(tag))
                return tagLookup[tag];

            return 0xFF;
        }

        internal string GetTag(byte token)
        {
            if (tokenLookup.ContainsKey(token))
                return tokenLookup[token];

            return null;
        }
    }
}