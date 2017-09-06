#!/usr/bin/env perl
# $File$
# $DateTime$
#
# $Revision$
# $Author$
#
# Script for Zimbra appliance multi-node install
# Usage: bootappzca_multi.pl --type|t --ldap|l [--mailstore|store|s] [--mta|m] [--proxy|p][--help|h|?|]
# Example: bootappzca_multi.pl --type ldap --ldap zqa-134.eng.vmware.com --mailstore zqa-135.eng.vmware.com --mta zqa-136.eng.vmware.com
#

use strict;
use Getopt::Long;
use File::Basename;
use IPC::Open2;
use Socket;


sub apt_get {
  my @command_list = @_;
  printf "Calling apt-get ".join(' ', @command_list)."\n";
  open (PIPE, "-|", 'DEBIAN_FRONTEND=noninteractive apt-get '.join(' ', @command_list)) || die $!;
  while(<PIPE>) {
    print;
  }
  close PIPE;
}

sub update_apt {
  printf "Updating sources.list\n";
  open FILE, '>> /etc/apt/sources.list' || die $!;
  printf FILE join("", <DATA>);
  close FILE;
}

# install lab commerical cert.. need it for certain tests
sub install_cert {
  my $hostname = shift;

  my $com_crt = 'commercial.crt';
  my $com_ca_crt = 'commercial_ca.crt';
  my $com_csr = 'commercial.csr';
  my $com_key = 'commercial.key';
  my @files = ($com_crt, $com_ca_crt, $com_csr, $com_key);
  
  print `mkdir -p /opt/zimbra/ssl/zimbra/commercial`;
  foreach my $item (@files) {
    print `wget --no-proxy -O /var/tmp/${item} http://zqa-tms.eng.vmware.com/setup/common/${item}`;
  }

  my $key_content = `cat /var/tmp/${com_key}`;
  foreach my $item ($com_csr, $com_key) {
    print `cp /var/tmp/${item} /opt/zimbra/ssl/zimbra/commercial/${item}`;
  }
  print `su - zimbra -c '/opt/zimbra/bin/zmprov ms ${hostname} zimbraSSLPrivateKey "$key_content"'`;
  print `/opt/zimbra/bin/zmcertmgr deploycrt comm /var/tmp/${com_crt} /opt/zimbra/ssl/zimbra/commercial/${com_ca_crt}`;
  print `/opt/zimbra/bin/zmcertmgr addcacert /var/tmp/${com_ca_crt}`;
  print `su - zimbra -c 'zmcontrol restart'`;
}

sub install_packages {
  &apt_get('update');
  my @package_list = ('nfs-common', 'ruby', 'libopenssl-ruby', 'libjson-ruby', 'libldap-ruby1.8'
		      , 'libhttp-access2-ruby', 'liblog4r-ruby', 'soap4r', 'binutils');
  my $item = '';
  foreach my $item (@package_list) {
    &apt_get('-y', 'install', $item);
  }
}

sub install_test_license {
  printf "Get a copy of old license\n";
  `su - zimbra -c '/opt/zimbra/bin/zmlicense -p > /var/tmp/old_license.xml'`;
  printf "Fetching license\n";
  my $fetch_command = 'wget --no-proxy -O /opt/zimbra/conf/regular.xml --no-check-certificate https://zimbra-stage-license-vip.vmware.com/zimbraLicensePortal/QA/LKManager'.
  ' --post-data="AccountsLimit=-1&ArchivingAccountsLimit=-1&AttachmentIndexingAccountsLimit=-1&ISyncAccountsLimit=-1&MAPIConnectorAccountsLimit=-1&MobileSyncAccountsLimit=-1&SMIMEAccountsLimit=-1&InstallType=regular"';
  open(PIPE, "-|", $fetch_command) || die $!;
  while(<PIPE>) {
    print;
  }
  close PIPE;
  `chmod ugo+r /opt/zimbra/conf/regular.xml`;
  print "Installing license\n";
  `su - zimbra -c '/opt/zimbra/bin/zmlicense -i /opt/zimbra/conf/regular.xml'`;
  `su - zimbra -c '/opt/zimbra/bin/zmlicense -a'`;
  print `su - zimbra -c '/opt/zimbra/bin/zmlicense -p'`;
  # need to copy this for genesis installshcheck.rb
  `su - zimbra -c 'cp /opt/zimbra/conf/{regular,ZCSLicense}.xml'`;
  `chown zimbra:zimbra /opt/zimbra/conf/ZCSLicense.xml`;
  print `su - zimbra -c '/opt/zimbra/bin/zmprov fc license'`;
}

sub setup_mount {
  my @command_list = ('mkdir -p /opt/qa/testlogs', 'mkdir -p /opt/qa/testware', "echo '10.137.245.250:/Zqa1/testlogs /opt/qa/testlogs nfs nfsvers=3,proto=tcp,rw,hard,intr 0 0' >> /etc/fstab", "echo '10.137.245.250:/Zqa1/testware /opt/qa/testware nfs nfsvers=3,proto=tcp,ro,hard,intr 0 0' >> /etc/fstab","mount -a");
  foreach my $item (@command_list) {
    print "Running: ", $item, "\n";
    print `$item`;
  }
}

sub setup_profile {
 print "Update profile\n";
 print `wget --no-proxy -O /var/tmp/profile.txt http://zqa-tms.eng.vmware.com/files/profile.txt`;
 print `cat /var/tmp/profile.txt >> /etc/profile`;
}

sub accept_java_eula {
  my @pack_list = ('sun-java5-jdk', 'sun-java5-jre', 'sun-java6-jdk', 'sun-java6-jre');
  open(PIPE, "|-", "/usr/bin/debconf-set-selections") || die $!;
  foreach my $item (@pack_list) {
    printf PIPE "$item shared/accepted-sun-dlj-v1-1 select true\n";
  }
  close PIPE;
}

sub set_sym_links {
  my @link_list = ('/usr/local/bin/ruby', '/bin/env');
  foreach my $item (@link_list) {
    my $filename = basename($item);
    my $command = "ln -s `which $filename` $item";
    print `$command`;
  }
}

sub remove_mesg {
  # remove input is not tty error in some test run
  print `sed -e "s/mesg n/#mesg n/" -i /root/.profile`;
}

sub wait_for_install {
  printf "Waiting for install to complete.\n";
  # check for complete
  local (*Reader, *Writer);
  my $filename = '/tmp/zmsetup.log';
  my $pid = open2(\*Reader, \*Writer, "tail -n 20 -f ".$filename);
  eval {
    local $SIG{ALRM} = sub {die "timeout\n" };
    alarm 1800; #30 mins
    while(<Reader>) {
      last if /Updating keys for/;
    }
    alarm 0;
  };
  kill $pid;
  close Reader;
  close Writer;
  printf "Install completed.\n";
}

sub chmod_staf {
  `chmod -R go-w /usr/local/staf`;
}

sub chmod_staf_cmd {
  print `wget --no-proxy -O /usr/local/STAF330-linux-amd64.tar.gz http://zqa-tms.eng.vmware.com/files/STAF330-linux-amd64.tar.gz`;
  print `cd /usr/local; tar -zxvf ./STAF330-linux-amd64.tar.gz`;
  `chmod -R go-w /usr/local/staf`;
  print `ln -s /usr/local/staf/bin/STAF /usr/local/staf/bin/staf`; # export PATH=/usr/local/staf/bin:$PATH #need?
}

sub create_admin {
   my $account_name = 'globaladmin@'.`su - zimbra -c zmhostname`;
   chomp $account_name;
   my $command_string = "/opt/zimbra/bin/zmprov ca $account_name test123 zimbraIsAdminAccount TRUE";
   print `su - zimbra -c '$command_string'`;
}

sub setup_rc_local_cmd {
  print "Update rc.local\n";
  print `sed -e "s/exit 0//" -i /etc/rc.local`;
  print `wget --no-proxy -O /var/tmp/rc_local.txt http://zqa-tms.eng.vmware.com/files/boot.txt`;
  print `cat /var/tmp/rc_local.txt >> /etc/rc.local`;
  print `echo 'exit 0' >> /etc/rc.local`;
  system(". /etc/rc.local");  # run this if use bootapp.pl on cmd

}

sub setup_proxy_env_cmd {
  print "Update /etc/environment \n";
  my $env_file = "/etc/environment";
  my @proxy_list = ('export http_proxy=http://proxy.vmware.com:3128', 'export HTTP_PROXY=http://proxy.vmware.com:3128', 'export no_proxy=.eng.vmware.com,.vmware.com');

  open ENVFILE, ">>$env_file" or die "cannot open environment file $env_file for append: $!";

  foreach my $item (@proxy_list) {

    printf ENVFILE "$item \n";
  }

  close ENVFILE;

  print `echo 'Acquire::http::Proxy "http://proxy.vmware.com:3128";' >> /etc/apt/apt.conf`;

}

sub genesis_testware {
  printf "Genesis testware\n";
  `cd /opt/qa; scp ./testware/TestToolsMain/genesis.tgz ./; tar -xvf genesis.tgz`;
}

sub email_relay {
  printf "Email relay\n";
  my $command_smtp = "zmprov ms `zmhostname` zimbraMtaRelayHost zqa-smtp.eng.vmware.com";
  my $modify_config = "zmprov mcf zimbraMtaRelayHost zqa-smtp.eng.vmware.com";
  my $command_restart = "zmmtactl restart";
  print `su - zimbra -c '$command_smtp'`;
  print `su - zimbra -c '$modify_config'`;
  print `su - zimbra -c '$command_restart'`;
}
#
# this will kick off zca installation
#
sub install_zca_multi {
  my ($help, $node_type, $ldap_host, $mta_auth_host, $smtp_host);
  my $proxy_host = '';

  # Print usage if no command line parameters or an unknown parameter or help option is passed
  usage() if ( @ARGV < 1 or
               ! GetOptions('help|h|?' => \$help, 'type|t=s' => \$node_type, 
               'ldap|l=s' => \$ldap_host, 'mailstore|store|s=s' => \$mta_auth_host, 
               'mta|m=s' => \$smtp_host, 'proxy|p=s' => \$proxy_host)
               or defined $help );

  if ($node_type =~ /^ldap/i) { 
     
    usage() if ((!$node_type) || (!$ldap_host));
    &fetch_license;
    &config_ldap($node_type, $ldap_host);
  } elsif ($node_type =~ /^mailstore/i) {
  
    usage() if ((!$node_type) || (!$mta_auth_host) || (!$ldap_host) || (!$smtp_host));
    &fetch_license;
    &config_mailstore($node_type, $mta_auth_host, $ldap_host, $smtp_host);
    &setup_qa_env($mta_auth_host);
  } elsif ($node_type =~ /^mta/i) {

    usage() if ((!$node_type) || (!$smtp_host) || (!$ldap_host) || (!$mta_auth_host));
    &fetch_license;
    &config_mta($node_type, $smtp_host, $ldap_host, $mta_auth_host);    
  } elsif ($node_type =~ /^proxy/i) {

    usage() if ((!$node_type) || (!$ldap_host) || (!$proxy_host));
    &fetch_license;
    &config_proxy($node_type, $proxy_host, $ldap_host);
  } else {

    usage();  
  }
}

# getting standalone java to run is too tedious...test ware will piggy back off zimbra
sub link_java {
  unlink '/usr/bin/jara';
  `ln -s /opt/zimbra/java/bin/java /usr/bin/java`;
}

sub usage
{
    print "Unknown option: @_\n" if ( @_ );
    print("
    usage:
    bootappzca_multi.pl --type|t --ldap|l [--mailstore|store|s] [--mta|m] [--proxy|p] [--help|h|?]
    
      --type      --> type of install, one of the values from ldap, mailstore, mta and proxy
      --ldap      --> ldap hostname
      --mailstore --> mailstore hostname 
      --mta       --> mta hostname
      --proxy     --> proxy hostname (optional) \n");
      
    exit 0;
}

sub config_ldap {
  my ($node_type, $hostname) = @_;

  my @addresses = gethostbyname($hostname) or die "Can't resolve $hostname: $!\n";
  @addresses = map { inet_ntoa($_) } @addresses[4 .. $#addresses];

  printf "=== Start to config $hostname (${addresses[0]}) as $node_type node ===\n";
  my $command_line = "perl /opt/vmware-zca-installer/bin/zca-ci -i -t 1 -D HOSTNAME=${hostname} -D IPADDRESS=${addresses[0]} -D PASSWD=test123 -D DOMAIN=${hostname} -D LDAPHOST=${hostname} -D LDAPADMINPASS=test123 -D PROXY_SERVER=proxy.vmware.com -D PROXY_PORT=3128".
  " -D TIME_ZONE_STRING=America/Los_Angeles";
  print `$command_line`;  
}

sub config_mailstore {
  my ($node_type, $hostname, $ldap_host, $smtp_host) = @_;

  my @addresses = gethostbyname($hostname) or die "Can't resolve $hostname: $!\n";
  @addresses = map { inet_ntoa($_) } @addresses[4 .. $#addresses];

  printf "=== Start to config $hostname (${addresses[0]}) as $node_type node ===\n";
  my $command_line = "perl /opt/vmware-zca-installer/bin/zca-ci -i -t 2 -D HOSTNAME=${hostname} -D IPADDRESS=${addresses[0]} -D PASSWD=test123 -D DOMAIN=${hostname} -D LDAPHOST=${ldap_host} -D LDAPADMINPASS=test123 -D SMTPHOST=${smtp_host} -D PROXY_SERVER=proxy.vmware.com -D PROXY_PORT=3128".
  " -D TIME_ZONE_STRING=America/Los_Angeles";
  print `$command_line`;  
}

sub config_mta {
  my ($node_type, $hostname, $ldap_host, $mta_auth_host) = @_;

  my @addresses = gethostbyname($hostname) or die "Can't resolve $hostname: $!\n";
  @addresses = map { inet_ntoa($_) } @addresses[4 .. $#addresses];

  printf "=== Start to config $hostname (${addresses[0]}) as $node_type node ===\n";
  my $command_line = "perl /opt/vmware-zca-installer/bin/zca-ci -i -t 3 -D HOSTNAME=${hostname} -D IPADDRESS=${addresses[0]} -D PASSWD=test123 -D DOMAIN=${hostname} -D LDAPHOST=${ldap_host} -D LDAPADMINPASS=test123 -D MTAAUTHHOST=${mta_auth_host} -D PROXY_SERVER=proxy.vmware.com -D PROXY_PORT=3128".
  " -D TIME_ZONE_STRING=America/Los_Angeles";
  print `$command_line`;  
}

sub config_proxy {
  my ($node_type, $hostname, $ldap_host) = @_;

  my @addresses = gethostbyname($hostname) or die "Can't resolve $hostname: $!\n";
  @addresses = map { inet_ntoa($_) } @addresses[4 .. $#addresses];

  printf "=== Start to config $hostname (${addresses[0]}) as $node_type node ===\n";
  my $command_line = "perl /opt/vmware-zca-installer/bin/zca-ci -i -t 4 -D HOSTNAME=${hostname} -D IPADDRESS=${addresses[0]} -D PASSWD=test123 -D DOMAIN=${hostname} -D LDAPHOST=${ldap_host} -D LDAPADMINPASS=test123 -D PROXY_SERVER=proxy.vmware.com -D PROXY_PORT=3128".
  " -D TIME_ZONE_STRING=America/Los_Angeles";
  print `$command_line`;  
}

sub setup_qa_env($) {
  my $hostname = shift;

  printf "=== Set up QA environment ===\n";
  sleep 60;  #adjustment for timing issue..vami not ready
  &wait_for_install;
  sleep 180; #force wait three minutes basically the system needs to wait for all the service to come up
             # this involves zmcontrol status scan, not implemented.
  &install_packages;
  &install_packages; #apt-get is flaky, sometimes java fails to install
  &install_test_license;
  &install_cert($hostname);
  &setup_mount;
  &setup_profile;
  &set_sym_links;
  &remove_mesg;
#  &chmod_staf;           #
  &chmod_staf_cmd;       # When invoke bootappzca_multi.pl from cmd
  &setup_rc_local_cmd;   # When invoke bootapp.pl from cmd -> logout -> login -> "staf localhost ping ping"
  &genesis_testware;     # When invoke bootappzca_multi.pl from cmd
#  &create_admin;
#  &email_relay;          # remove after fix bug#71638
  &link_java;
}

sub fetch_license {      # Work around for Bug 78588, update when bug fixed
  printf "Fetching ZCA license\n";   
  my $fetch_command = 'wget --no-proxy -O /opt/vmware-zca-installer/conf/ZCSLicense.xml --no-check-certificate https://zimbra-stage-license-vip.vmware.com/zimbraLicensePortal/QA/LKManager --post-data="AccountsLimit=50&ArchivingAccountsLimit=50&AttachmentIndexingAccountsLimit=50&ISyncAccountsLimit=50&MAPIConnectorAccountsLimit=50&MobileSyncAccountsLimit=50&SMIMEAccountsLimit=50&InstallType=trial"';
  open(PIPE, "-|", $fetch_command) || die $!;
  while(<PIPE>) {
    print;
  }
  close PIPE;
}

  
$| = 1;
&setup_proxy_env_cmd; # When invoke bootappzca_multi.pl from cmd
&update_apt;
&install_zca_multi;
printf "Completed\n";  #This has to be here to signal expect script
__END__
# Add Hardy repo for sun-java5-jre not used
deb http://us.archive.ubuntu.com/ubuntu/ hardy-updates universe multiverse
