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
    internal class ASWBXMLByteQueue : Queue<byte>
    {
        /**
         * Parsing binary WBXML data requires that the data be read byte-by-byte, 
         * with no need to jump forward or backward in the data (essentially a first-in, first-out scenario).
         * 
         * However, WBXML uses a slightly more complicated encoding for integers; so the approach is to create 
         * the ASWBXMLByteQueue class, which inherits from the Queue class and adds two functions: 
         * DequeueMultibyteInt and DequeueString
         **/

        internal ASWBXMLByteQueue(byte[] bytes) : base(bytes) {}

        internal int DequeueMultibyteInt()
        {
            int iReturn = 0;
            byte singleByte = 0xFF;

            do
            {
                iReturn <<= 7;

                singleByte = this.Dequeue();
                iReturn += (int)(singleByte & 0x7F);
            }
            while (CheckContinuationBit(singleByte));

            return iReturn;
        }

        private bool CheckContinuationBit(byte byteval)
        {
            byte continuationBitmask = 0x80;
            return (continuationBitmask & byteval) != 0;
        }

        internal string DequeueString()
        {
            StringBuilder strReturn = new StringBuilder();
            byte currentByte = 0x00;
            do
            {
                // TBD: Improve this handling. We are technically UTF-8, meaning that 
                // characters could be more than one byte long. This will fail if we have
                // characters outside of the US-ASCII range
                currentByte = this.Dequeue();
                if (currentByte != 0x00)
                {
                    strReturn.Append((char)currentByte);
                }
            }
            while (currentByte != 0x00);

            return strReturn.ToString();
        }

        internal string DequeueString(int length)
        {
            StringBuilder strReturn = new StringBuilder();

            byte currentByte = 0x00;
            for (int i = 0; i < length; i++)
            {
                // TBD: Improve this handling. We are technically UTF-8, meaning that 
                // characters could be more than one byte long. This will fail if we have
                // characters outside of the US-ASCII range
                currentByte = this.Dequeue();
                strReturn.Append((char)currentByte);
            }

            return strReturn.ToString();
        }
    }
}