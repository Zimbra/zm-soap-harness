using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Utilities
{
    public class MimeBuilder
    {
        const string boundary1 = "Apple-Mail-5B61CF08-4889-49B9-9357-3C6CEDAF1062";
        const string boundary2 = "Apple-Mail-63575738-BEF3-4914-A657-5DBF7416FEFA";
        
        #region Trace Html mime
        /*
         * Example of mime for html email
Content-Type: multipart/alternative;
	boundary=Apple-Mail-5B61CF08-4889-49B9-9357-3C6CEDAF1062
Content-Transfer-Encoding: 7bit
Subject: HTML text email
From: m1 <m1@10.112.16.112>
Message-Id: <26332407-3ED0-4641-BB15-D11EC46D770C@10.112.16.112>
Date: Tue, 17 Dec 2013 14:25:39 +0530
To: m2 <m2@zcs112.zimbraqa.lab>
MIME-Version: 1.0


--Apple-Mail-5B61CF08-4889-49B9-9357-3C6CEDAF1062
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit

This message has HTML text content
Bold
Italics
Underline
--Apple-Mail-5B61CF08-4889-49B9-9357-3C6CEDAF1062
Content-Type: text/html;
	charset=utf-8
Content-Transfer-Encoding: base64

PGh0bWw+PGhlYWQ+PG1ldGEgaHR0cC1lcXVpdj0iY29udGVudC10eXBlIiBjb250ZW50PSJ0ZXh0
L2h0bWw7IGNoYXJzZXQ9dXRmLTgiPjwvaGVhZD48Ym9keSBkaXI9ImF1dG8iPjxkaXY+PHNwYW4g
c3R5bGU9Ii13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjogcmdiYSgyNiwgMjYsIDI2LCAwLjI5
Njg3NSk7IC13ZWJraXQtY29tcG9zaXRpb24tZmlsbC1jb2xvcjogcmdiYSgxNzUsIDE5MiwgMjI3
LCAwLjIzMDQ2OSk7IC13ZWJraXQtY29tcG9zaXRpb24tZnJhbWUtY29sb3I6IHJnYmEoNzcsIDEy
OCwgMTgwLCAwLjIzMDQ2OSk7ICI+VGhpcyBtZXNzYWdlIGhhcyBIVE1MIHRleHQgY29udGVudDwv
c3Bhbj48L2Rpdj48ZGl2PjxzcGFuIHN0eWxlPSItd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6
IHJnYmEoMjYsIDI2LCAyNiwgMC4yOTI5NjkpOyAtd2Via2l0LWNvbXBvc2l0aW9uLWZpbGwtY29s
b3I6IHJnYmEoMTc1LCAxOTIsIDIyNywgMC4yMzA0NjkpOyAtd2Via2l0LWNvbXBvc2l0aW9uLWZy
YW1lLWNvbG9yOiByZ2JhKDc3LCAxMjgsIDE4MCwgMC4yMzA0NjkpOyI+PGI+Qm9sZDwvYj48L3Nw
YW4+PC9kaXY+PGRpdj48c3BhbiBzdHlsZT0iLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOiBy
Z2JhKDI2LCAyNiwgMjYsIDAuMjkyOTY5KTsgLXdlYmtpdC1jb21wb3NpdGlvbi1maWxsLWNvbG9y
OiByZ2JhKDE3NSwgMTkyLCAyMjcsIDAuMjMwNDY5KTsgLXdlYmtpdC1jb21wb3NpdGlvbi1mcmFt
ZS1jb2xvcjogcmdiYSg3NywgMTI4LCAxODAsIDAuMjMwNDY5KTsiPjxpPkl0YWxpY3M8L2k+PC9z
cGFuPjwvZGl2PjxkaXY+PHNwYW4gc3R5bGU9Ii13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjog
cmdiYSgyNiwgMjYsIDI2LCAwLjI5Mjk2OSk7IC13ZWJraXQtY29tcG9zaXRpb24tZmlsbC1jb2xv
cjogcmdiYSgxNzUsIDE5MiwgMjI3LCAwLjIzMDQ2OSk7IC13ZWJraXQtY29tcG9zaXRpb24tZnJh
bWUtY29sb3I6IHJnYmEoNzcsIDEyOCwgMTgwLCAwLjIzMDQ2OSk7Ij48dT5VbmRlcmxpbmU8L3U+
PGJyPjwvc3Bhbj48YnI+U2VudCBmcm9tIG15IGlQaG9uZTwvZGl2PjwvYm9keT48L2h0bWw+
--Apple-Mail-5B61CF08-4889-49B9-9357-3C6CEDAF1062--
*/
        #endregion

        public static String getHtmlMsgMime(String mimePart, String plainContent, String htmlContent)
        {
            StringBuilder mime = new StringBuilder();
            String base64EncodedString = MimeEncoder.EncodeBase64Text(htmlContent);
            mime.AppendLine("Content-Type: multipart/alternative;");
            mime.Append("	boundary=");
            mime.AppendLine(boundary1);

            mime.AppendLine(mimePart);

            mime.AppendLine();
            mime.AppendLine();

            mime.AppendLine("--" + boundary1);

            mime.AppendLine("Content-Type: text/plain;");
            mime.AppendLine("	" + "charset=us-ascii");
            mime.AppendLine("Content-Transfer-Encoding: 7bit");

            mime.AppendLine();

            mime.AppendLine(plainContent);

            mime.AppendLine("--" + boundary1);

            mime.AppendLine("Content-Type: text/html;");
            mime.AppendLine("	" + "charset=utf-8");
            mime.AppendLine("Content-Transfer-Encoding: base64");

            mime.AppendLine();

            mime.AppendLine(base64EncodedString);

            mime.AppendLine("--" + boundary1 + "--");

            return mime.ToString();

        }

        #region Trace mime containing attachment
        /*
         * Example of mime for plain/html email having attachment
        Content-Type: multipart/alternative;
	boundary=Apple-Mail-63575738-BEF3-4914-A657-5DBF7416FEFA
Content-Transfer-Encoding: 7bit
Subject: Plain text with doc attachment
From: m1 <m1@10.112.16.112>
Message-Id: <18C5B124-4DEC-429F-A788-F1B37BC703A2@10.112.16.112>
Date: Tue, 17 Dec 2013 13:09:57 +0530
To: m2 <m2@zcs112.zimbraqa.lab>
MIME-Version: 1.0


--Apple-Mail-63575738-BEF3-4914-A657-5DBF7416FEFA
Content-Type: text/plain;
	charset=us-ascii
Content-Transfer-Encoding: 7bit

Plain text with doc attachment 11
--Apple-Mail-63575738-BEF3-4914-A657-5DBF7416FEFA
Content-Type: multipart/mixed;
	boundary=Apple-Mail-4BF68743-D403-4421-8ACC-FE1F25E5404B
Content-Transfer-Encoding: 7bit


--Apple-Mail-4BF68743-D403-4421-8ACC-FE1F25E5404B
Content-Type: text/html;
	charset=us-ascii
Content-Transfer-Encoding: 7bit

<html><head><meta http-equiv="content-type" content="text/html; charset=us-ascii"></head><body dir="auto"><div><span style="font-family: '.HelveticaNeueUI'; font-size: 15px; line-height: 19px; white-space: nowrap; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.296875); -webkit-composition-fill-color: rgba(175, 192, 227, 0.230469); -webkit-composition-frame-color: rgba(77, 128, 180, 0.230469); -webkit-text-size-adjust: none; ">Plain text with doc attachment 11</span><br><br></div></body></html>
--Apple-Mail-4BF68743-D403-4421-8ACC-FE1F25E5404B
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document;
	name="MigrationTool  CommandLine Interface.docx"
Content-Disposition: attachment;
	filename="MigrationTool  CommandLine Interface.docx"
Content-Transfer-Encoding: base64

UEsDBBQABgAIAAAAIQDwIex9jgEAABMGAAATAAgCW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAAC
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
ZXJpbmcueG1sUEsFBgAAAAANAA0ASQMAAMM7AAAAAA==

--Apple-Mail-4BF68743-D403-4421-8ACC-FE1F25E5404B--

--Apple-Mail-63575738-BEF3-4914-A657-5DBF7416FEFA--
 
         */
        #endregion

        public static String getAttachmentMime(String mimePart, String plainContent, String htmlContent, String fileName, String format)
        {
            StringBuilder mime = new StringBuilder();
            String quotedPrintableEncodedText = null;
            String quotedPrintableEncodedAttachment = null;
            String base64EncodedAttachment = null;

            String contentType = getFileContentType(fileName);

            if(format != "plain")
                quotedPrintableEncodedText = MimeEncoder.EncodeQuotedPrintableText(htmlContent);

            if(contentType == "Content-Type: text/plain;" || contentType == "Content-Type: text/csv;")
                quotedPrintableEncodedAttachment= MimeEncoder.EncodeQuotedPrintableFile(fileName);
            else
                base64EncodedAttachment = MimeEncoder.EncodeBase64File(fileName);


            mime.AppendLine("Content-Type: multipart/alternative;");
            mime.Append("	boundary=");
            mime.AppendLine(boundary1);

            mime.AppendLine(mimePart);

            mime.AppendLine();
            mime.AppendLine();

            mime.AppendLine("--" + boundary1);

            mime.AppendLine("Content-Type: text/plain;");
            mime.AppendLine("	" + "charset=us-ascii");
            mime.AppendLine("Content-Transfer-Encoding: 7bit");

            mime.AppendLine();

            mime.AppendLine(plainContent);

            mime.AppendLine("--" + boundary1);

            mime.AppendLine("Content-Type: multipart/mixed;");
            mime.Append("	boundary=");
            mime.AppendLine(boundary2);
            mime.AppendLine("Content-Transfer-Encoding: 7bit");

            mime.AppendLine();
            mime.AppendLine();

            mime.AppendLine("--" + boundary2);
            mime.AppendLine("Content-Type: text/html;");
            mime.AppendLine("	" + "charset=us-ascii");
            
            if(format == "plain")
                mime.AppendLine("Content-Transfer-Encoding: 7bit");
            else
                mime.AppendLine("Content-Transfer-Encoding: quoted-printable");

            mime.AppendLine();


            if (format == "plain")
                mime.AppendLine(htmlContent);
            else
                mime.AppendLine(quotedPrintableEncodedText);

            mime.AppendLine("--" + boundary2);

            mime.AppendLine(contentType);
            mime.AppendLine("	" + "name=" + fileName);
            mime.AppendLine("Content-Disposition: attachment;");
            mime.AppendLine("	" + "filename=" + fileName);
            
            if (contentType == "Content-Type: text/plain;" || contentType == "Content-Type: text/csv;")
            {
                mime.AppendLine("Content-Transfer-Encoding: quoted-printable");
                mime.AppendLine();
                mime.AppendLine(quotedPrintableEncodedAttachment);
            }
            else
            {
                mime.AppendLine("Content-Transfer-Encoding: base64");
                mime.AppendLine();
                mime.AppendLine(base64EncodedAttachment);
            }

            mime.AppendLine();
            mime.AppendLine("--" + boundary2 + "--");

            mime.AppendLine();
            mime.AppendLine("--" + boundary1 + "--");

            return mime.ToString();

        }

        public static String getICSMime(String mimePart, String content, String fileName, String method)
        {
            StringBuilder mime = new StringBuilder();
            String quotedPrintableEncodedAttachment = null;

            quotedPrintableEncodedAttachment = MimeEncoder.EncodeQuotedPrintableFile(fileName);

            mime.AppendLine("Content-Type: multipart/alternative;");
            mime.Append("	boundary=");
            mime.AppendLine(boundary1);

            mime.AppendLine(mimePart);

            mime.AppendLine();
            mime.AppendLine();

            mime.AppendLine("--" + boundary1);

            mime.AppendLine("Content-Type: text/plain;");
            mime.AppendLine("	" + "charset=us-ascii");
            mime.AppendLine("Content-Transfer-Encoding: 7bit");

            mime.AppendLine();
            mime.AppendLine(content);
            mime.AppendLine();

            mime.AppendLine("--" + boundary1);

            mime.AppendLine("Content-Type: text/calendar;");
            mime.AppendLine("charset=utf-8;");
            mime.AppendLine("name=meeting.ics;");
            mime.AppendLine("x-apple-part-url=5193C77B-40EE-465A-A698-EA0045290295;");

            if(method == "REPLY")
                mime.AppendLine("method=REPLY");
            else if(method == "REQUEST")
                mime.AppendLine("method=REQUEST");
            else if(method == "CANCEL")
                mime.AppendLine("method=CANCEL");

            mime.AppendLine("Content-Transfer-Encoding: quoted-printable");
            mime.AppendLine();

            mime.AppendLine(quotedPrintableEncodedAttachment);
            mime.AppendLine();
            mime.AppendLine("--" + boundary1 + "--");

            return mime.ToString();

        }

        public static String getFileContentType(String filename)
        {
            int fileLength = filename.Length;
            String contentType = "Content-Type: text/plain;"; 

            String[] dotSeperatedfilename =  filename.Split('.');
            string fileExtension = dotSeperatedfilename[1];

            if (fileExtension == "txt")
                contentType = "Content-Type: text/plain;";
            if (fileExtension == "docx" || fileExtension == "doc")
                contentType = "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document;";
            if (fileExtension == "xlsx" || fileExtension == "xls")
                contentType = "Content-Type: application/vnd.openxmlformats - officedocument.spreadsheetml.sheet;";
            if (fileExtension == "csv")
                contentType = "Content-Type: text/csv;";
            if (fileExtension == "pst")
                contentType = "Content-Type: application/octet-stream;";
            if (fileExtension == "pptx" || fileExtension == "ppt")
                contentType = "Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation;";
            if (fileExtension == "pdf")
                contentType = "Content-Type: application/pdf;";
            if (fileExtension == "jpg" || fileExtension == "jpeg")
                contentType = "Content-Type: image/jpeg;";
            if (fileExtension == "png")
                contentType = "Content-Type: image/png;";
            if (fileExtension == "gif")
                contentType = "Content-Type: image/gif;";

            return contentType;

        }

        public static String getValueFromMime(String Mime, String Identifier)
        {
            Identifier = Identifier + ": ";
            int index = Mime.IndexOf(Identifier) + Identifier.Length;

            if (index != -1)
            {
                int index2 = Mime.IndexOf("\r\n", index);
                if (index2 == -1)
                {
                    index2 = Mime.Length;
                }
                return Mime.Substring(index, index2 - index);
            }

            return null;
        }

    }

}
