if [ "$(whoami)" != "root" ]; then
        echo "Script must be run as user: root"
        exit -1
fi
echo "Enabling unauth pings"
su - zimbra -c "zmlocalconfig -e allow_unauthed_ping=true"
echo "Installing and activating license"
wget --no-check-certificate --no-proxy -O /tmp/regular.xml "http://zimbra-stage-license.eng.zimbra.com/zimbraLicensePortal/QA/LKManager?InstallType=regular&AccountsLimit=-1&ver=2.5"
su - zimbra -c "zmlicense -i /tmp/regular.xml && zmlicense -a"
if  [ $? != 0 ]; then
        echo "Error occured while installing/activating license. Kindly install/activate the license manually. "
        exit -1
fi
su - zimbra -c "zmldappasswd -a test123; zmldappasswd -b test123; zmldappasswd -l test123; zmldappasswd -n test123; zmldappasswd -p test123; zmldappasswd -r test123; zmldappasswd zimbra"
echo "Restarting mailbox"
su - zimbra -c "zmmailboxdctl restart"