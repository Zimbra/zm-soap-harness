#!/bin/bash
#
# $File$ 
# $DateTime$
#
# $Revision$
# $Author$
# 
# 2010 Vmware
#
# rc.local
#
# This script is executed at the end of each multiuser runlevel.
# Make sure that the script will "exit 0" on success or any other
# value on error.
#
# In order to enable or disable this script just change the execution
# bits.
#
# By default this script does nothing.
echo 'start STAFProc'
PATH=/usr/local/staf/bin:$PATH
export PATH
LD_LIBRARY_PATH=/usr/local/lib:/usr/lib:/lib:/usr/local/staf/lib:$LD_LIBRARY_PATH
export LD_LIBRARY_PATH
CLASSPATH=/usr/local/staf/lib/JSTAF.jar:/usr/local/staf/samples/demo/STAFDemo.jar
export CLASSPATH
STAFCONVDIR=/usr/local/staf/codepage
export STAFCONVDIR
STAFCODEPAGE=LATIN_1
export STAFCODEPAGE
start-stop-daemon --stop --exec /usr/local/staf/bin/STAFProc
rm -r -f /tmp/*STAF*
sleep 5
#wait till sockets are cleared
while (netstat | grep -i :6500) do echo 'waiting staf socket to be freed';sleep 10; done
start-stop-daemon --verbose --start --oknodo --pidfile /var/run/staf.pid -b --exec /usr/local/staf/bin/STAFProc
#/usr/local/staf/bin/STAFProc > /usr/local/staf/stfproc.out 2>&1&
#
# Sync system time
#
ntpdate ntp1.eng.vmware.com
echo 'staf start completed'

exit 0
