#!/usr/bin/env bash
# Rename all mail folders and files to strict kebab-case
set -euo pipefail

BASE="mocha/tests/mail"

echo "=== Phase 1: Folder Renames ==="
# Rename folders (leaf-first to avoid path issues)
mv "$BASE/lmtp/applemail" "$BASE/lmtp/apple-mail" 2>/dev/null && echo "  applemail → apple-mail" || echo "  SKIP applemail"
mv "$BASE/lmtp/invalidmime" "$BASE/lmtp/invalid-mime" 2>/dev/null && echo "  invalidmime → invalid-mime" || echo "  SKIP invalidmime"
mv "$BASE/lmtp/largemime" "$BASE/lmtp/large-mime" 2>/dev/null && echo "  largemime → large-mime" || echo "  SKIP largemime"
mv "$BASE/lmtp/mimebasic" "$BASE/lmtp/mime-basic" 2>/dev/null && echo "  mimebasic → mime-basic" || echo "  SKIP mimebasic"
mv "$BASE/lmtp/missingattribute" "$BASE/lmtp/missing-attribute" 2>/dev/null && echo "  missingattribute → missing-attribute" || echo "  SKIP missingattribute"
mv "$BASE/lmtp/outlook2003" "$BASE/lmtp/outlook-2003" 2>/dev/null && echo "  outlook2003 → outlook-2003" || echo "  SKIP outlook2003"
mv "$BASE/lmtp/outlookexpress6" "$BASE/lmtp/outlook-express-6" 2>/dev/null && echo "  outlookexpress6 → outlook-express-6" || echo "  SKIP outlookexpress6"
mv "$BASE/lmtp/yahoomail" "$BASE/lmtp/yahoo-mail" 2>/dev/null && echo "  yahoomail → yahoo-mail" || echo "  SKIP yahoomail"
mv "$BASE/lmtp/fedora-core5" "$BASE/lmtp/fedora-core-5" 2>/dev/null && echo "  fedora-core5 → fedora-core-5" || echo "  SKIP fedora-core5"
mv "$BASE/smtp/utf8" "$BASE/smtp/utf-8" 2>/dev/null && echo "  smtp/utf8 → smtp/utf-8" || echo "  SKIP smtp/utf8"

echo ""
echo "=== Phase 2: Root Mail File Renames ==="
mv "$BASE/itemaction-message.js" "$BASE/item-action-message.js" 2>/dev/null && echo "  itemaction-message → item-action-message" || echo "  SKIP itemaction-message"
mv "$BASE/message-harddelete.js" "$BASE/message-hard-delete.js" 2>/dev/null && echo "  message-harddelete → message-hard-delete" || echo "  SKIP message-harddelete"
mv "$BASE/msglmtpinject-multinode.js" "$BASE/msg-lmtp-inject-multinode.js" 2>/dev/null && echo "  msglmtpinject-multinode → msg-lmtp-inject-multinode" || echo "  SKIP msglmtpinject-multinode"

echo ""
echo "=== Phase 3: Attachments File Renames ==="
mv "$BASE/attachments/removeattachmentrequest-basic.js" "$BASE/attachments/remove-attachment-request-basic.js" 2>/dev/null && echo "  removeattachmentrequest-basic → remove-attachment-request-basic" || echo "  SKIP"
mv "$BASE/attachments/mimetypes.js" "$BASE/attachments/mime-types.js" 2>/dev/null && echo "  mimetypes → mime-types" || echo "  SKIP"
mv "$BASE/attachments/message-send-wattach.js" "$BASE/attachments/message-send-w-attach.js" 2>/dev/null && echo "  message-send-wattach → message-send-w-attach" || echo "  SKIP"
mv "$BASE/attachments/message-send-wattach-wscanenabled.js" "$BASE/attachments/message-send-w-attach-w-scan-enabled.js" 2>/dev/null && echo "  message-send-wattach-wscanenabled → message-send-w-attach-w-scan-enabled" || echo "  SKIP"

echo ""
echo "=== Phase 4: Conversation File Renames ==="
mv "$BASE/conversation/itemaction-conversation.js" "$BASE/conversation/item-action-conversation.js" 2>/dev/null && echo "  itemaction-conversation → item-action-conversation" || echo "  SKIP"
mv "$BASE/conversation/conversation-threading01.js" "$BASE/conversation/conversation-threading-01.js" 2>/dev/null && echo "  conversation-threading01 → conversation-threading-01" || echo "  SKIP"
mv "$BASE/conversation/conversation-threading02.js" "$BASE/conversation/conversation-threading-02.js" 2>/dev/null && echo "  conversation-threading02 → conversation-threading-02" || echo "  SKIP"
mv "$BASE/conversation/conversation-threading03.js" "$BASE/conversation/conversation-threading-03.js" 2>/dev/null && echo "  conversation-threading03 → conversation-threading-03" || echo "  SKIP"
mv "$BASE/conversation/conversation-loop2.js" "$BASE/conversation/conversation-loop-2.js" 2>/dev/null && echo "  conversation-loop2 → conversation-loop-2" || echo "  SKIP"
mv "$BASE/conversation/mailing-lists/subjectnormalization.js" "$BASE/conversation/mailing-lists/subject-normalization.js" 2>/dev/null && echo "  subjectnormalization → subject-normalization" || echo "  SKIP"
mv "$BASE/conversation/tcon/convactionrequest-tcon.js" "$BASE/conversation/tcon/conv-action-request-tcon.js" 2>/dev/null && echo "  convactionrequest-tcon → conv-action-request-tcon" || echo "  SKIP"
mv "$BASE/conversation/tcon/convactionrequest-tcon-j.js" "$BASE/conversation/tcon/conv-action-request-tcon-j.js" 2>/dev/null && echo "  convactionrequest-tcon-j → conv-action-request-tcon-j" || echo "  SKIP"
mv "$BASE/conversation/tcon/convactionrequest-tcon-s.js" "$BASE/conversation/tcon/conv-action-request-tcon-s.js" 2>/dev/null && echo "  convactionrequest-tcon-s → conv-action-request-tcon-s" || echo "  SKIP"
mv "$BASE/conversation/tcon/convactionrequest-tcon-t.js" "$BASE/conversation/tcon/conv-action-request-tcon-t.js" 2>/dev/null && echo "  convactionrequest-tcon-t → conv-action-request-tcon-t" || echo "  SKIP"

echo ""
echo "=== Phase 5: Drafts File Renames ==="
mv "$BASE/drafts/message-savedraft.js" "$BASE/drafts/message-save-draft.js" 2>/dev/null && echo "  message-savedraft → message-save-draft" || echo "  SKIP"
mv "$BASE/drafts/savedraft-shared-folder.js" "$BASE/drafts/save-draft-shared-folder.js" 2>/dev/null && echo "  savedraft-shared-folder → save-draft-shared-folder" || echo "  SKIP"

echo ""
echo "=== Phase 6: On-Behalf-Of File Renames ==="
mv "$BASE/on-behalf-of/sendmsgrequest-on-behalf-of.js" "$BASE/on-behalf-of/send-msg-request-on-behalf-of.js" 2>/dev/null && echo "  sendmsgrequest-on-behalf-of → send-msg-request-on-behalf-of" || echo "  SKIP"
mv "$BASE/on-behalf-of/sendmsgrequest-on-behalf-of-basic.js" "$BASE/on-behalf-of/send-msg-request-on-behalf-of-basic.js" 2>/dev/null && echo "  sendmsgrequest-on-behalf-of-basic → send-msg-request-on-behalf-of-basic" || echo "  SKIP"
mv "$BASE/on-behalf-of/mountpoint/savedraftrequest-mountpoint.js" "$BASE/on-behalf-of/mountpoint/save-draft-request-mountpoint.js" 2>/dev/null && echo "  savedraftrequest-mountpoint → save-draft-request-mountpoint" || echo "  SKIP"

echo ""
echo "=== Phase 7: Read-Receipt File Renames ==="
mv "$BASE/read-receipt/getmsgrequest.js" "$BASE/read-receipt/get-msg-request.js" 2>/dev/null && echo "  getmsgrequest → get-msg-request" || echo "  SKIP"
mv "$BASE/read-receipt/mountpoint/getmsgrequest.js" "$BASE/read-receipt/mountpoint/get-msg-request.js" 2>/dev/null && echo "  mountpoint/getmsgrequest → mountpoint/get-msg-request" || echo "  SKIP"

echo ""
echo "=== Phase 8: SMTP File Renames ==="
mv "$BASE/smtp/message-id/messageid-basic.js" "$BASE/smtp/message-id/message-id-basic.js" 2>/dev/null && echo "  messageid-basic → message-id-basic" || echo "  SKIP"
mv "$BASE/smtp/message-id/messageid-dl.js" "$BASE/smtp/message-id/message-id-dl.js" 2>/dev/null && echo "  messageid-dl → message-id-dl" || echo "  SKIP"
# utf8 folder already renamed, now rename file
mv "$BASE/smtp/utf-8/smtp-utf8.js" "$BASE/smtp/utf-8/smtp-utf-8.js" 2>/dev/null && echo "  smtp-utf8 → smtp-utf-8" || echo "  SKIP"

echo ""
echo "=== Phase 9: LMTP File Renames (beyond folder moves) ==="
mv "$BASE/lmtp/apple-mail/applemail-mime-basic.js" "$BASE/lmtp/apple-mail/apple-mail-mime-basic.js" 2>/dev/null && echo "  applemail-mime-basic → apple-mail-mime-basic" || echo "  SKIP"
mv "$BASE/lmtp/large-mime/largemime.js" "$BASE/lmtp/large-mime/large-mime.js" 2>/dev/null && echo "  largemime → large-mime" || echo "  SKIP"
mv "$BASE/lmtp/missing-attribute/lmtp-missingattribute-mime.js" "$BASE/lmtp/missing-attribute/lmtp-missing-attribute-mime.js" 2>/dev/null && echo "  lmtp-missingattribute-mime → lmtp-missing-attribute-mime" || echo "  SKIP"
mv "$BASE/lmtp/charsets/utf-8/lmtp-utf8-1.js" "$BASE/lmtp/charsets/utf-8/lmtp-utf-8-1.js" 2>/dev/null && echo "  lmtp-utf8-1 → lmtp-utf-8-1" || echo "  SKIP"

echo ""
echo "=== Phase 10: Bug File Renames (add hyphen) ==="
# mail/bugs/
for f in "$BASE"/bugs/bug[0-9]*.js; do
  if [ -f "$f" ]; then
    dir=$(dirname "$f")
    base=$(basename "$f")
    newbase=$(echo "$base" | sed 's/^bug\([0-9]\)/bug-\1/')
    if [ "$base" != "$newbase" ]; then
      mv "$f" "$dir/$newbase"
      echo "  $base → $newbase"
    fi
  fi
done

# conversation/bugs/
for f in "$BASE"/conversation/bugs/bug[0-9]*.js; do
  if [ -f "$f" ]; then
    dir=$(dirname "$f")
    base=$(basename "$f")
    newbase=$(echo "$base" | sed 's/^bug\([0-9]\)/bug-\1/')
    if [ "$base" != "$newbase" ]; then
      mv "$f" "$dir/$newbase"
      echo "  conversation/bugs/$base → $newbase"
    fi
  fi
done

# drafts/bugs/
for f in "$BASE"/drafts/bugs/bug[0-9]*.js; do
  if [ -f "$f" ]; then
    dir=$(dirname "$f")
    base=$(basename "$f")
    newbase=$(echo "$base" | sed 's/^bug\([0-9]\)/bug-\1/')
    if [ "$base" != "$newbase" ]; then
      mv "$f" "$dir/$newbase"
      echo "  drafts/bugs/$base → $newbase"
    fi
  fi
done

echo ""
echo "=== Phase 11: Verity File Renames ==="
V="$BASE/lmtp/verity"

mv "$V/lmtp-verity-adobepdf.js" "$V/lmtp-verity-adobe-pdf.js" 2>/dev/null && echo "  adobepdf → adobe-pdf" || echo "  SKIP adobepdf"
mv "$V/lmtp-verity-applixwords.js" "$V/lmtp-verity-applix-words.js" 2>/dev/null && echo "  applixwords → applix-words" || echo "  SKIP"
mv "$V/lmtp-verity-autocaddrawing.js" "$V/lmtp-verity-auto-cad-drawing.js" 2>/dev/null && echo "  autocaddrawing → auto-cad-drawing" || echo "  SKIP"
mv "$V/lmtp-verity-autocaddrawingexchange.js" "$V/lmtp-verity-auto-cad-drawing-exchange.js" 2>/dev/null && echo "  autocaddrawingexchange → auto-cad-drawing-exchange" || echo "  SKIP"
mv "$V/lmtp-verity-commaseparatedvalues.js" "$V/lmtp-verity-comma-separated-values.js" 2>/dev/null && echo "  commaseparatedvalues → comma-separated-values" || echo "  SKIP"
mv "$V/lmtp-verity-computergraphicsmetafile.js" "$V/lmtp-verity-computer-graphics-metafile.js" 2>/dev/null && echo "  computergraphicsmetafile → computer-graphics-metafile" || echo "  SKIP"
mv "$V/lmtp-verity-coreldraw.js" "$V/lmtp-verity-corel-draw.js" 2>/dev/null && echo "  coreldraw → corel-draw" || echo "  SKIP"
mv "$V/lmtp-verity-corelpresentations.js" "$V/lmtp-verity-corel-presentations.js" 2>/dev/null && echo "  corelpresentations → corel-presentations" || echo "  SKIP"
mv "$V/lmtp-verity-corelquattropro.js" "$V/lmtp-verity-corel-quattro-pro.js" 2>/dev/null && echo "  corelquattropro → corel-quattro-pro" || echo "  SKIP"
mv "$V/lmtp-verity-corelwordperfectwindows.js" "$V/lmtp-verity-corel-word-perfect-windows.js" 2>/dev/null && echo "  corelwordperfectwindows → corel-word-perfect-windows" || echo "  SKIP"
mv "$V/lmtp-verity-dcxfaxsystem.js" "$V/lmtp-verity-dcx-fax-system.js" 2>/dev/null && echo "  dcxfaxsystem → dcx-fax-system" || echo "  SKIP"
mv "$V/lmtp-verity-encapsulatedpostscript.js" "$V/lmtp-verity-encapsulated-post-script.js" 2>/dev/null && echo "  encapsulatedpostscript → encapsulated-post-script" || echo "  SKIP"
mv "$V/lmtp-verity-enhancedmetafile.js" "$V/lmtp-verity-enhanced-metafile.js" 2>/dev/null && echo "  enhancedmetafile → enhanced-metafile" || echo "  SKIP"
mv "$V/lmtp-verity-javaarchive.js" "$V/lmtp-verity-java-archive.js" 2>/dev/null && echo "  javaarchive → java-archive" || echo "  SKIP"
mv "$V/lmtp-verity-lotus123123.js" "$V/lmtp-verity-lotus-123-123.js" 2>/dev/null && echo "  lotus123123 → lotus-123-123" || echo "  SKIP"
mv "$V/lmtp-verity-lotus123wk4.js" "$V/lmtp-verity-lotus-123-wk4.js" 2>/dev/null && echo "  lotus123wk4 → lotus-123-wk4" || echo "  SKIP"
mv "$V/lmtp-verity-lotusamidrawgraphics.js" "$V/lmtp-verity-lotus-ami-draw-graphics.js" 2>/dev/null && echo "  lotusamidrawgraphics → lotus-ami-draw-graphics" || echo "  SKIP"
mv "$V/lmtp-verity-lotusamipro.js" "$V/lmtp-verity-lotus-ami-pro.js" 2>/dev/null && echo "  lotusamipro → lotus-ami-pro" || echo "  SKIP"
mv "$V/lmtp-verity-macintoshrasterpct.js" "$V/lmtp-verity-macintosh-raster-pct.js" 2>/dev/null && echo "  macintoshrasterpct → macintosh-raster-pct" || echo "  SKIP"
mv "$V/lmtp-verity-macintoshrasterpic.js" "$V/lmtp-verity-macintosh-raster-pic.js" 2>/dev/null && echo "  macintoshrasterpic → macintosh-raster-pic" || echo "  SKIP"
mv "$V/lmtp-verity-macpoint.js" "$V/lmtp-verity-mac-point.js" 2>/dev/null && echo "  macpoint → mac-point" || echo "  SKIP"
mv "$V/lmtp-verity-macromediaflash.js" "$V/lmtp-verity-macromedia-flash.js" 2>/dev/null && echo "  macromediaflash → macromedia-flash" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftaccess.js" "$V/lmtp-verity-microsoft-access.js" 2>/dev/null && echo "  microsoftaccess → microsoft-access" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftexcelwindows.js" "$V/lmtp-verity-microsoft-excel-windows.js" 2>/dev/null && echo "  microsoftexcelwindows → microsoft-excel-windows" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftexcelwindowsxml.js" "$V/lmtp-verity-microsoft-excel-windows-xml.js" 2>/dev/null && echo "  microsoftexcelwindowsxml → microsoft-excel-windows-xml" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftexcelxml.js" "$V/lmtp-verity-microsoft-excel-xml.js" 2>/dev/null && echo "  microsoftexcelxml → microsoft-excel-xml" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftoutlook.js" "$V/lmtp-verity-microsoft-outlook.js" 2>/dev/null && echo "  microsoftoutlook → microsoft-outlook" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftpowerpointwindows.js" "$V/lmtp-verity-microsoft-power-point-windows.js" 2>/dev/null && echo "  microsoftpowerpointwindows → microsoft-power-point-windows" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftpowerpointwindowsxml.js" "$V/lmtp-verity-microsoft-power-point-windows-xml.js" 2>/dev/null && echo "  microsoftpowerpointwindowsxml → microsoft-power-point-windows-xml" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftproject.js" "$V/lmtp-verity-microsoft-project.js" 2>/dev/null && echo "  microsoftproject → microsoft-project" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftvisio.js" "$V/lmtp-verity-microsoft-visio.js" 2>/dev/null && echo "  microsoftvisio → microsoft-visio" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftvisioxml.js" "$V/lmtp-verity-microsoft-visio-xml.js" 2>/dev/null && echo "  microsoftvisioxml → microsoft-visio-xml" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftwordwindows.js" "$V/lmtp-verity-microsoft-word-windows.js" 2>/dev/null && echo "  microsoftwordwindows → microsoft-word-windows" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftwordwindowsdocx.js" "$V/lmtp-verity-microsoft-word-windows-docx.js" 2>/dev/null && echo "  microsoftwordwindowsdocx → microsoft-word-windows-docx" || echo "  SKIP"
mv "$V/lmtp-verity-microsoftwordxml.js" "$V/lmtp-verity-microsoft-word-xml.js" 2>/dev/null && echo "  microsoftwordxml → microsoft-word-xml" || echo "  SKIP"
mv "$V/lmtp-verity-microstation.js" "$V/lmtp-verity-micro-station.js" 2>/dev/null && echo "  microstation → micro-station" || echo "  SKIP"
mv "$V/lmtp-verity-oasisopendocument.js" "$V/lmtp-verity-oasis-open-document.js" 2>/dev/null && echo "  oasisopendocument → oasis-open-document" || echo "  SKIP"
mv "$V/lmtp-verity-openofficecalcods.js" "$V/lmtp-verity-open-office-calc-ods.js" 2>/dev/null && echo "  openofficecalcods → open-office-calc-ods" || echo "  SKIP"
mv "$V/lmtp-verity-openofficecalcsxc.js" "$V/lmtp-verity-open-office-calc-sxc.js" 2>/dev/null && echo "  openofficecalcsxc → open-office-calc-sxc" || echo "  SKIP"
mv "$V/lmtp-verity-openofficeimpressodp.js" "$V/lmtp-verity-open-office-impress-odp.js" 2>/dev/null && echo "  openofficeimpressodp → open-office-impress-odp" || echo "  SKIP"
mv "$V/lmtp-verity-openofficeimpresssxi.js" "$V/lmtp-verity-open-office-impress-sxi.js" 2>/dev/null && echo "  openofficeimpresssxi → open-office-impress-sxi" || echo "  SKIP"
mv "$V/lmtp-verity-pcpaintbrush.js" "$V/lmtp-verity-pc-paintbrush.js" 2>/dev/null && echo "  pcpaintbrush → pc-paintbrush" || echo "  SKIP"
mv "$V/lmtp-verity-portablenetworkgraphics.js" "$V/lmtp-verity-portable-network-graphics.js" 2>/dev/null && echo "  portablenetworkgraphics → portable-network-graphics" || echo "  SKIP"
mv "$V/lmtp-verity-richtextformat.js" "$V/lmtp-verity-rich-text-format.js" 2>/dev/null && echo "  richtextformat → rich-text-format" || echo "  SKIP"
mv "$V/lmtp-verity-sgirgbimage.js" "$V/lmtp-verity-sgi-rgb-image.js" 2>/dev/null && echo "  sgirgbimage → sgi-rgb-image" || echo "  SKIP"
mv "$V/lmtp-verity-taggedimagefile.js" "$V/lmtp-verity-tagged-image-file.js" 2>/dev/null && echo "  taggedimagefile → tagged-image-file" || echo "  SKIP"
mv "$V/lmtp-verity-textmail.js" "$V/lmtp-verity-text-mail.js" 2>/dev/null && echo "  textmail → text-mail" || echo "  SKIP"
mv "$V/lmtp-verity-truevisiontarga.js" "$V/lmtp-verity-true-vision-targa.js" 2>/dev/null && echo "  truevisiontarga → true-vision-targa" || echo "  SKIP"
mv "$V/lmtp-verity-unicodetext.js" "$V/lmtp-verity-unicode-text.js" 2>/dev/null && echo "  unicodetext → unicode-text" || echo "  SKIP"
mv "$V/lmtp-verity-windowsanimatedcursor.js" "$V/lmtp-verity-windows-animated-cursor.js" 2>/dev/null && echo "  windowsanimatedcursor → windows-animated-cursor" || echo "  SKIP"
mv "$V/lmtp-verity-windowsbitmap.js" "$V/lmtp-verity-windows-bitmap.js" 2>/dev/null && echo "  windowsbitmap → windows-bitmap" || echo "  SKIP"
mv "$V/lmtp-verity-windowsiconcursor.js" "$V/lmtp-verity-windows-icon-cursor.js" 2>/dev/null && echo "  windowsiconcursor → windows-icon-cursor" || echo "  SKIP"
mv "$V/lmtp-verity-windowsmetafile.js" "$V/lmtp-verity-windows-metafile.js" 2>/dev/null && echo "  windowsmetafile → windows-metafile" || echo "  SKIP"
mv "$V/lmtp-verity-winzip.js" "$V/lmtp-verity-win-zip.js" 2>/dev/null && echo "  winzip → win-zip" || echo "  SKIP"
mv "$V/lmtp-verity-wordperfectgraphics.js" "$V/lmtp-verity-word-perfect-graphics.js" 2>/dev/null && echo "  wordperfectgraphics → word-perfect-graphics" || echo "  SKIP"

echo ""
echo "=== DONE ==="
echo "Total files after rename:"
find "$BASE" -type f -name "*.js" | wc -l
