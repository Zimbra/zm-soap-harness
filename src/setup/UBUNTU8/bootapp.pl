#!/usr/bin/env perl
# $File$ 
# $DateTime$
#
# $Revision$
# $Author$
#
use File::Basename;
use IPC::Open2;


sub apt_get {
  my @command_list = @_;
  open (PIPE, "-|", 'DEBIAN_FRONTEND=noninteractive apt-get '.join(' ', @command_list)) || die $!;
  while(<PIPE>) {
    print;
  }
  close PIPE;
}
  
  
sub update_apt {
  open FILE, '>> /etc/apt/sources.list' || die $!;
  printf FILE join("", <DATA>);
  close FILE;
  printf "Funning apt-get\n";
 
}

sub install_packages {
  &apt_get('update');
  my @package_list = ('nfs-common', 'sun-java5-jdk', 'ruby', 'libopenssl-ruby', 'libjson-ruby', 'libldap-ruby1.8'
		      , 'libhttp-access2-ruby', 'liblog4r-ruby', 'soap4r', 'binutils');
  my $item = '';
  foreach $item (@package_list) {
    &apt_get('-y', 'install', $item);
  }
}

sub install_test_license {
  printf "Get a copy of old license\n";
  `su - zimbra -c '/opt/zimbra/bin/zmlicense -p > /var/tmp/old_license.xml'`;
  printf "Fetching license\n";
  my $fetch_command = 'wget --no-check-certificate -O /opt/zimbra/conf/regular.xml "https://build.lab.zimbra.com:9081/zimbraLicensePortal/QA/LKManager"'.
    ' --post-data="AccountsLimit=10000&InstallType=regular"';
  open(PIPE, "-|", $fetch_command) || die $!;
  while(<PIPE>) {
    print;
  }
  close PIPE;
  `chmod ugo+r /opt/zimbra/conf/regular.xml`;
  print "Installing license\n";
  `su - zimbra -c '/opt/zimbra/bin/zmlicense -i /opt/zimbra/conf/regular.xml'`;
  print `su - zimbra -c '/opt/zimbra/bin/zmlicense -p'`;
  print `su - zimbra -c '/opt/zimbra/bin/zmprov fc license'`;
}

sub setup_mount {
  my @command_list = ('mkdir -p /opt/qa/testlogs', "echo 'qa23.lab.zimbra.com:/data/testlogs /opt/qa/testlogs nfs nfsvers=3,proto=tcp,rw,hard,intr 0 0' >> /etc/fstab", "mount /opt/qa/testlogs");
  foreach my $item (@command_list) {
    print "Running: ", $item, "\n";
    print `$item`;
  }
}

sub setup_profile {
 print "Update profile\n";
 print `wget -O /var/tmp/profile.txt http://tms.lab.zimbra.com/files/profile.txt`;
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
  print `grep -v 'mesg n' .profile > .profile`;
}

sub wait_for_install {
  # check for complete
  local (*Reader, *Writer);
  my $filename = '/opt/zimbra/log/appliance_config.log';
  $filename = '/opt/zcs-installer/log/appliance_config.log' unless(-e $filename); 
  my $pid = open2(\*Reader, \*Writer, "tail -f ".$filename);
  eval {
    local $SIG{ALRM} = sub {die "timeout\n" };
    alarm 1800; #30 mins
    while(<Reader>) {
      last if /COMPLETE/;
    }
    alarm 0;
  };
  kill $pid;
  close Reader;
  close Writer;
}

sub chmod_staf {
  `chmod -R go-w /usr/local/staf`;
}

sub create_admin {
   my $account_name = 'admin@'.`su - zimbra -c zmhostname`;
   chomp $account_name;
   my $command_string = "/opt/zimbra/bin/zmprov ca $account_name test123 zimbraIsAdminAccount TRUE";
   print `su - zimbra -c '$command_string'`;
}



$ENV{'http_proxy'} = 'http://proxy.vmware.com:3128';
$| = 1;
&update_apt;
&accept_java_eula;
&wait_for_install;
sleep 300; #force sleep five minutes basically the system needs to wait for all the service to come up
           # this involves zmcontrol status scan, not implemented
&install_packages;
&install_packages; #apt-get is flaky, sometimes java fails to install
&install_test_license;
&setup_mount;
&setup_profile;
&set_sym_links;
&remove_mesg;
&chmod_staf;
&create_admin;

printf "Completed\n"; #This has to be here to signal expect script
__END__
deb http://us.archive.ubuntu.com/ubuntu/ hardy universe
deb-src http://us.archive.ubuntu.com/ubuntu/ hardy universe
deb http://us.archive.ubuntu.com/ubuntu/ hardy-updates universe
deb-src http://us.archive.ubuntu.com/ubuntu/ hardy-updates universe
deb http://us.archive.ubuntu.com/ubuntu/ hardy multiverse
deb-src http://us.archive.ubuntu.com/ubuntu/ hardy multiverse
deb http://us.archive.ubuntu.com/ubuntu/ hardy-updates multiverse
deb-src http://us.archive.ubuntu.com/ubuntu/ hardy-updates multiverse
