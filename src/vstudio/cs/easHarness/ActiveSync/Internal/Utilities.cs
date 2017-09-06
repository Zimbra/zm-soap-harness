using System;
using System.Collections.Generic;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{
    class Utilities
    {
        // This function generates a string representation
        // of hexadecimal bytes.
        public static string PrintHex(byte[] bytes)
        {
            StringBuilder returnString = new StringBuilder();
            foreach (byte byteItem in bytes)
            {
                // Append the 2-digit hex value of the byte
                returnString.Append(byteItem.ToString("X2"));
            }
            return returnString.ToString();
        }

        // This function converts a string representation 
        // of hexadecimal bytes into a byte array
        public static byte[] ConvertHexToBytes(string hexString)
        {
            int numChars = hexString.Length;
            byte[] byteArray = null;

            if (numChars > 0)
            {
                try
                {
                    byteArray = new byte[numChars / 2];

                    for (int i = 0; i < numChars; i += 2)
                    {
                        byteArray[i / 2] = Convert.ToByte(hexString.Substring(i, 2), 16);
                    }
                }
                catch (Exception ex)
                {
                    throw new HarnessException("Unable to convert hex to bytes", ex);
                }
            }

            return byteArray;
        }

    }
}
