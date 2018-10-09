if [ "$(whoami)" != "root" ]; then
        echo "Script must be run as user: root"
        exit -1
fi
echo "NOTE : Commercial certificate is only applicable for domain '*.eng.zimbra.com'"
echo "Copying commercial cert for installation"
mkdir /tmp/commercial
cp /opt/qa/soapvalidator/conf/commercial/* /opt/zimbra/ssl/zimbra/commercial/
cp /opt/qa/soapvalidator/conf/commercial/* /tmp/commercial/
echo "Enabling unauth pings"
su - zimbra -c "zmlocalconfig -e allow_unauthed_ping=true"
echo "Installing and activating license"
wget --no-check-certificate --no-proxy -O /tmp/regular.xml "http://zimbra-stage-license.eng.zimbra.com/zimbraLicensePortal/QA/LKManager?InstallType=regular&AccountsLimit=-1&ver=2.5"
su - zimbra -c "zmlicense -i /tmp/regular.xml && zmlicense -a"
if  [ $? != 0 ]; then
        echo "Error occured while installing/activating license. Kindly install/activate the license manually. "
        exit -1
fi
echo "Verifying commercial cert"
su - zimbra -c "/opt/zimbra/bin/zmcertmgr verifycrt comm /opt/zimbra/ssl/zimbra/commercial/commercial.key /tmp/commercial/commercial.crt /tmp/commercial/commercial_ca.crt"
if  [ $? != 0 ]; then
        echo "Commercial certificate verification failed. Kindly check your certificates "
        exit -1
fi
echo "Deploying commercial cert"
su - zimbra -c "/opt/zimbra/bin/zmcertmgr deploycrt comm /tmp/commercial/commercial.crt /tmp/commercial/commercial_ca.crt"
echo "Restarting mailbox"
su - zimbra -c "zmmailboxdctl restart"
