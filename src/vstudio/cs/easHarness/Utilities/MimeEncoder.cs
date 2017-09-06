using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;

namespace Utilities
{
    public class MimeEncoder
    {
        public static String EncodeBase64Text(String mimeText)
        {
            byte[] bytesToEncode = Encoding.UTF8.GetBytes(mimeText);

            String encodedText = Convert.ToBase64String(bytesToEncode);
            return encodedText;
        }

        public static String EncodeBase64File(String fileName)
        {
            String filePath = HarnessProperties.RootFolder + @"/data/" + fileName;
            byte[] bytesToEncode = File.ReadAllBytes(filePath);

            String encodedText = Convert.ToBase64String(bytesToEncode);
            return encodedText;
        }

        public static String EncodeQuotedPrintableText(String mimeText)
        {
            StringBuilder builder = new StringBuilder();

            byte[] bytesToEncode = Encoding.UTF8.GetBytes(mimeText);

            foreach (byte v in bytesToEncode)
            {
                // The following are not required to be encoded:
                // - Tab (ASCII 9)
                // - Space (ASCII 32)
                // - Characters 33 to 126, except for the equal sign (61).

                if ((v == 9) || ((v >= 32) && (v <= 60)) || ((v >= 62) && (v <= 126)))
                {
                    builder.Append(Convert.ToChar(v));
                }
                else
                {
                    builder.Append('=');
                    builder.Append(v.ToString("X2"));
                }
            }

            char lastChar = builder[builder.Length - 1];
            if (char.IsWhiteSpace(lastChar))
            {
                builder.Remove(builder.Length - 1, 1);
                builder.Append('=');
                builder.Append(((int)lastChar).ToString("X2"));
            }

            return builder.ToString();
        }

        public static String EncodeQuotedPrintableFile(String fileName)
        {
            String filePath = HarnessProperties.RootFolder + @"/data/" + fileName;
            byte[] bytesToEncode = File.ReadAllBytes(filePath);

            StringBuilder builder = new StringBuilder();

            foreach (byte v in bytesToEncode)
            {
                // The following are not required to be encoded:
                // - Tab (ASCII 9)
                // - Space (ASCII 32)
                // - Characters 33 to 126, except for the equal sign (61).

                if ((v == 9) || ((v >= 32) && (v <= 60)) || ((v >= 62) && (v <= 126)))
                {
                    builder.Append(Convert.ToChar(v));
                }
                else
                {
                    builder.Append('=');
                    builder.Append(v.ToString("X2"));
                }
            }

            char lastChar = builder[builder.Length - 1];
            if (char.IsWhiteSpace(lastChar))
            {
                builder.Remove(builder.Length - 1, 1);
                builder.Append('=');
                builder.Append(((int)lastChar).ToString("X2"));
            }

            return builder.ToString();
        }

    }
}
