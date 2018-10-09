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
else
  echo "NG"
fi
rm $tmpfile2
