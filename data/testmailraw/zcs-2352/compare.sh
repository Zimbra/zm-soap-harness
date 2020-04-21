#!/bin/bash
downloaded=$1
path=$2
expected1=${path}/zcs-2352/filename_expected1.dat
expected2=${path}/zcs-2352/filename_expected2.dat
tmpfile1=$(mktemp '/tmp/zcs-2352.1.XXXX')
tmpfile2=$(mktemp '/tmp/zcs-2352.2.XXXX')
dd if=$downloaded bs=1 skip=30  count=85 of=$tmpfile1
dd if=$downloaded bs=1 skip=185 count=85 of=$tmpfile2
cmp $tmpfile1 $expected1
if [ $? = 1 ]; then
  echo "NG"
  rm $tmpfile1
  exit
fi
rm $tmpfile1
cmp $tmpfile2 $expected2
if [ $? = 0 ]; then
  echo "OK"
SGkgYWxsLA0KQXR0YWNoZWQgcGxzLiBmaW5kIHRoZSBUZXN0IFJuRCBQdWJsaWMgSG9saWRheSBhcnJhbmdlbWVudCArIGZvcmNlIGxlYXZlIGRheXMgb2ZmLiBXZWxsIGhhdmUgdG90YWwgNiBkYXlzIGZvcmNlIGxlYXZlIHdoaWNoIGhhcyBiZWVuIGhpZ2hsaWdodCBpbiB5ZWxsb3cgaW4gdGhlIGF0dGFjaGVkIGZpbGUsIGFsbCBkYXlzIGluIGNvbG9yIGdyZWVuIHNoYWxsIGJlIGNvdW50ZWQgYXMgd29ya2luZyBkYXkuDQoNClRoYW5rIHlvdSBmb3IgeW91ciBhdHRlbnRpb24hDQoNClRlc3QgTWFuYWdlcg0KU2VuaW9yIE1hbmFnZXIsIEh1bWFuIFJlc291cmNlcw0KDQpNOiArMTEgMTExIDExMTEgMTExMSB8IFc6ICsyMiAyMiAyMiAyMjIyDQp0ZXN0IGxvY2F0aW9ufCA4RiBTb3V0aCBXaW5nLCBUZXN0IGJ1aWxkaW5nDQoyLCBUZXN0IHJvYWQsIHRlc3QgRGlzdHJpY3QuIFRlc3QgMTExMTExDQoNCltjaWQ6aW1hZ2UwMDEuZ2lmQDAxQ0I5QzY3LjUwNDMzRjIwXQ==
  echo "NG"
fi
rm $tmpfile2
