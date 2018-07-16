echo "Copying commercial cert for installation"
mkdir /tmp/commercial
cp /opt/qa/soapvalidator/conf/commercial/* /opt/zimbra/ssl/zimbra/commercial/
cp /opt/qa/soapvalidator/conf/commercial/* /tmp/commercial/
echo "Enabling unauth pings"
su - zimbra -c "zmlocalconfig -e allow_unauthed_ping=true"
echo "Installing and activating license"
su - zimbra -c "zmlicense -i /tmp/regular.xml|zmlicense -a"
echo "Setting LDAP passwords"
su - zimbra -c "zmldappasswd -a test123; zmldappasswd -b test123; zmldappasswd -l test123; zmldappasswd -n test123; zmldappasswd -p test123; zmldappasswd -r test123; zmldappasswd zimbra"
echo "Restarting mailbox"
su - zimbra -c "zmmailboxdctl restart"
