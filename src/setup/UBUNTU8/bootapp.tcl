#!/usr/bin/env expect --
#
# $File: //depot/main/ZimbraQA/TMS/lib/action/gettestware.rb $ 
# $DateTime: 2010/03/30 11:42:31 $
#
# $Revision: #6 $
# $Author: bhwang $
# 
# 2010 Vmware
#
# setup environment for qa
#

set timeout 60000
set prompt "(%|#|\\$).$"

spawn ping -c 1 $argv

set ping_test  0
while {$ping_test == 0} {
    expect {
	-re " 0%" {incr ping_test;}
	-re "100%" {sleep 10; spawn ping -c 1 $argv; exp_continue;}
	-re $prompt
    }
}

spawn bash -c "sed -e \"/$argv/d\" /root/.ssh/known_hosts > /tmp/keyfiles;mv /tmp/keyfiles /root/.ssh/known_hosts"
expect {
    -re $prompt
}

set ssh_link 0
while {$ssh_link == 0} {
    spawn ssh -o StrictHostKeyChecking=no vmware@$argv
    set ssh_link 1
    expect {
	refused {set ssh_link 0}
	-re vmware {set ssh_link 1}
    }
    sleep 1
}

#initial login
expect {
    assword:        {send "zimbra!\r"; exp_continue}
    -re $prompt           {send "sudo su -\r";}
}

# set root password
expect {
    vmware: {send "zimbra!\r"; exp_continue}
    -re $prompt   {send "passwd\r"; exp_continue} 
    Enter {send "zimbra\r"; exp_continue}
    Retype {send "zimbra\r";}
}

# open root for ssh
expect {
    -ex # {send "sed 's/Login no/Login yes/' /etc/ssh/sshd_config > /tmp/config;cp -f /tmp/config /etc/ssh/sshd_config\r";}
}

expect {
    -ex # {send "/etc/init.d/ssh reload\r";}
}

#set up staf tarball
expect {
    -ex # {send "wget -O /var/tmp/staf.tgz http://tms.lab.zimbra.com/setup/common/staf-32.tar.gz;rm -r -f /usr/local/staf;tar -C /usr/local -xvf /var/tmp/staf.tgz\r";}
}

expect {
    -ex # {send "ln -s /usr/local/staf/bin/STAF /usr/local/staf/bin/staf\r";}
}

expect {
    -ex # {send "wget -O /usr/local/staf/bin/STAF.cfg http://tms.lab.zimbra.com/setup/common/STAF.cfg\r"}
}

expect {
    -ex # {send "wget -O /var/tmp/profile.txt http://tms.lab.zimbra.com/setup/common/profile.txt; cat /var/tmp/profile.txt >> /etc/profile; source /var/tmp/profile.txt\r";}
}

#setup staf rc.local file
expect {
    -ex # {send "wget -O /etc/rc.local http://tms.lab.zimbra.com/setup/main/UBUNTU8/bootapp.sh\r"}
}

expect {
    -ex # {send "chmod ugo+x /etc/rc.local;/etc/rc.local\r";}   
}

expect {
    -ex # {send "wget -O /var/tmp/runme.pl http://tms.lab.zimbra.com/setup/main/UBUNTU8/bootapp.pl;chmod ugo+x /var/tmp/runme.pl;/var/tmp/runme.pl\r"}
}

expect {
    Completed {exit;}
}

     
