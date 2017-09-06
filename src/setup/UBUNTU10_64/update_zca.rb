#!/bin/env ruby
#
# $File$
# $DateTime$
#
# $Revision$
# $Author$
# 
# 2013 VMWARE
#
# Script for ZCA appliance update
# Ex, $ ruby update_zca.rb http://build-download.eng.vmware.com/build/storage17/release/bora-939532/publish/exports/Update_Repo/
#

require 'yaml'

VAMICLI = "/opt/vmware/bin/vamicli"
ZCA_CI = "/opt/vmware-zca-installer/bin/zca-ci"
VAMI_XML = "/opt/vmware/var/lib/vami/update/provider/provider-runtime.xml"
  
def get_update_url(data)
  if data.length() == 1
    update_url = data[0]
  else
    puts "Please provide update url (Ex, ruby update_zca.rb http://build-download.eng.vmware.com/build/storage17/release/bora-939532/publish/exports/Update_Repo/)"
  end  	 
end

def vami_update_file(update_url)
  property = <<-"EOS"

    <properties>
        <property name="localRepositoryAddress" value="#{update_url}" />
        <property name="localRepositoryPasswordFormat" value="base64" />
    </properties>
  EOS

  line = File.read(VAMI_XML) 
  line_replace = line.gsub(/\s+\<properties \/\>/, property)
  File.open(VAMI_XML, "w") { |file| file << line_replace }  
end

def os_update     
  output = `#{VAMICLI} update --check`
  result=$?.success?
  puts output
  puts result 
  
  output = `time #{VAMICLI} update --install latest`
  result=$?.success?
  puts output
  puts result   
end

def zimbra_update
  output = `time #{ZCA_CI} -U`
  result=$?.success?
  puts output
  puts result     
end


begin  
  update_url = get_update_url(ARGV)
 
  vami_update_file(update_url)
  
  os_update
  
  zimbra_update    	 
end
