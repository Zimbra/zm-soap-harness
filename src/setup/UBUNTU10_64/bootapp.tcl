#!/usr/bin/env expect --
# Copyright 2012 VMware, Inc.  All rights reserved. -- VMware Confidential
#
# $File$
# $DateTime$
#
# $Revision$
# $Author$
#
# setup environment for qa
#
# Usage: bookapp.tcl <hostname> <password> <scriptname>
#    where
#    <hostname> is the name of the host which this expect script needs to connect to.  
#               This hostname needs to be accessible via ssh.
#    <password> is ssh password for user root.  The default is 'test123' if <password>
#               is not supplied.
#    <scriptname>   is the name of perl script on remote system.  This default is 'bootapp.pl'
#
# These variables might need to be updated when this script is updated:
set url "http://zqa-tms.eng.vmware.com/setup"
set branch "main"
set version "UBUNTU10_64"
# Default login and password to system
set user "root"
# Set password
if {$argc > 1} {
   set password [lindex $argv 1]
} else {
   set password "test123"
}

if {$argc > 2} {
   set scriptname [lindex $argv 2]
} else {
   set scriptname "bootapp.pl"
}


# Set root password to
set newrootpass "zimbra"

# Various filenames which are retrieved and installed or run on the target:
# Install files for STAF
set stafpath "$url/common/staf-64.tar.gz"
# STAF configuration file
set stafcfg "$url/common/STAF.cfg"
# This file is copied to /etc/profile
set profiletxt "$url/common/profile.txt"
# This file is copied to rc.local
set rclocal "$url/$branch/$version/bootapp.sh"
# This perl script is executed on the remote system
set perlscript "$url/$branch/$version/$scriptname"
# Hostname
set hostname [lindex $argv 0]
set timeout 60000
set prompt "(%|#|\\$).$"

# Check to see if remote host is up
spawn ping -c 1 $hostname
set ping_test  0
while {$ping_test == 0} {
    expect {
	-re " 0%" {incr ping_test;}
	-re "100%" {sleep 10; spawn ping -c 1 $hostname; exp_continue;}
	-re $prompt
    }
}

# Remove remote system from known_hosts file
spawn bash -c "sed -e \"/$hostname/d\" /root/.ssh/known_hosts > /tmp/keyfiles;mv /tmp/keyfiles /root/.ssh/known_hosts"
expect {
    -re $prompt
}

# Connect to remote system via ssh
set ssh_link 0
while {$ssh_link == 0} {
    spawn ssh -o StrictHostKeyChecking=no $user@$hostname
    set ssh_link 1
    expect {
	refused {set ssh_link 0}
	-re vmware {set ssh_link 1}
    }
    sleep 1
}

# Initial ssh login and sudo su -
expect {
    assword:        {puts -nonewline "$password"; send "$password\r"; exp_continue}
    -re $prompt           {send "sudo su -\r";}
}

# Set root passwd
expect {
    vmware: {puts -nonewline "$password"; send "$password\r"; exp_continue}
    -re $prompt   {send "passwd\r"; exp_continue}
    Enter {puts -nonewline "$newrootpass"; send "$newrootpass\r"; exp_continue}
    Retype {puts -nonewline "$newrootpass"; send "$newrootpass\r";}
}

# Enable ssh for root user
expect {
    -ex # {send "sed 's/Login no/Login yes/' /etc/ssh/sshd_config > /tmp/config;cp -f /tmp/config /etc/ssh/sshd_config\r";}
}

expect {
    -ex # {send "/etc/init.d/ssh reload\r";}
}

# Copy and install staf tarball
expect {
    -ex # {send "wget --no-proxy -O /var/tmp/staf.tgz $stafpath;rm -r -f /usr/local/staf;tar -C /usr/local -xvf /var/tmp/staf.tgz\r";}
}

expect {
    -ex # {send "ln -s /usr/local/staf/bin/STAF /usr/local/staf/bin/staf\r";}
}

expect {
    -ex # {send "wget --no-proxy -O /usr/local/staf/bin/STAF.cfg $stafcfg\r"}
}

expect {
    -ex # {send "wget --no-proxy -O /var/tmp/profile.txt $profiletxt; cat /var/tmp/profile.txt >> /etc/profile; source /var/tmp/profile.txt\r";}
}

#setup staf rc.local file
expect {
    -ex # {send "wget --no-proxy -O /etc/rc.local $rclocal\r"}
}

expect {
    -ex # {send "chmod ugo+x /etc/rc.local;/etc/rc.local\r";}
}

expect {
    -ex # {send "wget --no-proxy -O /var/tmp/runme.pl $perlscript;chmod ugo+x /var/tmp/runme.pl;/var/tmp/runme.pl $hostname\r"}
}

expect {
    "Completed" {exit;}
}

