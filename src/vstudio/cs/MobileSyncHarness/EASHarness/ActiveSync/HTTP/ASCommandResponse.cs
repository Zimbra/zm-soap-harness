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
using EASHarness.Harness;
using EASHarness.ActiveSync.WBXML;

namespace EASHarness.ActiveSync.HTTP
{
    internal class ASCommandResponse
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        private byte[] wbxmlBytes = null;
        private string xmlString = null;
        private HttpStatusCode httpStatus = HttpStatusCode.OK;

        #region Property Accessors
        internal byte[] WBXMLBytes
        {
            get
            {
                return wbxmlBytes;
            }
        }

        internal string XMLString
        {
            get
            {
                return xmlString;
            }
        }

        internal HttpStatusCode HttpStatus
        {
            get { return httpStatus; }
        }
        #endregion

        internal ASCommandResponse(HttpWebResponse httpResponse)
        {
            Stream responseStream = httpResponse.GetResponseStream();
            List<byte> bytes = new List<byte>();
            byte[] byteBuffer = new byte[256];
            int count = 0;

            // Read the WBXML data from the response stream 256 bytes at a time.
            count = responseStream.Read(byteBuffer, 0, 256);
            while (count > 0)
            {
                // Add the 256 bytes to the List
                bytes.AddRange(byteBuffer);

                if (count < 256)
                {
                    // If the last read did not actually read 256 bytes remove the extra.
                    int excess = 256 - count;
                    bytes.RemoveRange(bytes.Count - excess, excess);
                }

                // Read the next 256 bytes from the response stream
                count = responseStream.Read(byteBuffer, 0, 256);
            }

            wbxmlBytes = bytes.ToArray();

            string strWBXMLPayload = BitConverter.ToString(wbxmlBytes).Replace("-", " ");

            tcLog.Info("Received Response Payload (WBXML Encoded)... \r\n\r\n" + strWBXMLPayload + "\r\n");

            // Decode the WBXML
            xmlString = DecodeWBXML(wbxmlBytes);
        }

        // This function uses the ASWBXML class to decode a WBXML stream into XML.
        private string DecodeWBXML(byte[] wbxml)
        {
            try
            {
                ASWBXML decoder = new ASWBXML();
                decoder.LoadBytes(wbxml);
                string decodedXMLPayload = decoder.GetXML();

                tcLog.Info("Received Response Payload (Decoded XML)... \r\n\r\n" + decodedXMLPayload.ToString() + "\r\n");

                return decodedXMLPayload;
            }
            catch (Exception ex)
            {
                throw new InvalidDataException(string.Format("Decoded WBXML results in invalid XML: {0}.", ex));
            }
        }
    }
}