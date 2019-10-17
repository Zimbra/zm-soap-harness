#!/bin/bash -e
# This bash utility executes soap automation suite for Zimbra. 
# It optionally accepts these arguments in order - HOSTNAME, TESTROOT_DIR, TESTS_SUITE(SMOKE/SANITY/FUNCTIONAL), BRANCH(DEVELOP/FEATURE), SOAP_HARNESS_BRANCH, SOAP_REPORT_PATH  
# 
# The script assumes zimbra setup is completed and running. 
# The script needs MAIL_FROM_ACCOUNT & EXTERNAL_PASSWORD set as environment variables and sendemail package installed. 
#

#HOSTNAME - zimbra server hostname
#TESTROOT_DIR - /opt/qa/soapvalidator/data/soapvalidator/
#TESTS_SUITE - SMOKE/FUNCTIONAL/SANITY
#BRANCH - develop / feature / bugfix
#SOAP_HARNESS_BRANCH - develop / feature / bugfix
#SOAP_REPORT_PATH - /var/www/html/soap-reports/datatimefield

# PART 1

BRANCH=develop
SOAP_HARNESS_BRANCH=develop
gitDir=/root/repos
mailbox_repo=${gitDir}/zm-mailbox
soap_harness_repo=${gitDir}/zm-soap-harness
apache_dir="/var/www/html"

ZCS_VERSION="ZIMBRA8"
TESTS_SUITE="SMOKE"
SOAP_REPORT_DIR_NAME=`echo $(date +%Y)$(date +%m)$(date +%d)-$(date +%T) | sed "s/\://g"`
HOSTNAME="zdev-aj.local"
APACHE_HOSTNAME=""
APACHE_PORT="81"
ZIMBRAQAROOT="/opt/qa/soapvalidator/"
SOAP_DATA_DIR="/opt/qa/soapvalidator/data/soapvalidator/"

STAF_SOAP_SETUP=false
COMPILE_REPOS=false
TESTCASE_PATH="MailClient/Auth/auth_basic.xml"
TESTROOT_DIR="${SOAP_DATA_DIR}${TESTCASE_PATH}"


staf_func() {
        staf local service remove service soap && staf local service remove service log &&  staf local service remove service inject
        pid=`ps -aux | grep -i staf  |  grep -v grep | awk '{print $2}'`
        if [[ $pid != "" ]]; then kill $pid; fi;
        /usr/local/staf/startSTAFProc.sh > /opt/zimbra/log/staf.log 2> /dev/null
	sleep 15
        staf local service add service SOAP LIBRARY JSTAF EXECUTE /opt/qa/soapvalidator/bin/zimbrastaf.jar && sleep 15 && staf local service add service LOG LIBRARY STAFLog && staf local service add service INJECT LIBRARY JSTAF EXECUTE /opt/qa/soapvalidator/bin/zimbrainject.jar 
        sleep 15
}

SOAP_REPORT_PATH="${apache_dir}/soap-reports/${SOAP_REPORT_DIR_NAME}"

echo "SOAP REPORT PATH ${SOAP_REPORT_PATH}"

SOAP_XML_PATH="/opt/qa/soapvalidator/data/soapvalidator/"

# Command line arguments
for argument in "$@"; do
	key=$(echo ${argument} | cut -f1 -d=)
	value=$(echo ${argument} | cut -f2 -d=)
	case "${key}" in
		HOSTNAME) HOSTNAME=${value};;
	    TESTROOT_DIR) TESTROOT_DIR=${value};;
		TESTS_SUITE) TESTS_SUITE=${value};;
		BRANCH) BRANCH=${value};;
		SOAP_HARNESS_BRANCH) SOAP_HARNESS_BRANCH=${value};;
		SOAP_REPORT_PATH) SOAP_REPORT_PATH=${value};;
	esac
done

SOAP_COMMAND="STAF LOCAL soap EXECUTE ${HOSTNAME} ZIMBRAQAROOT ${ZIMBRAQAROOT} DIRECTORY ${TESTROOT_DIR} LOG ${SOAP_REPORT_PATH} SUITE ${TESTS_SUITE}"
echo $SOAP_COMMAND;
mkdir -p /opt/qa/
mkdir -p $SOAP_REPORT_PATH

#compile repos
if [ "$COMPILE_REPOS" = true ]; then
	cd ${mailbox_repo} && git checkout develop --force && git reset --hard && git pull --all && git checkout ${BRANCH} && git pull --all && ant clean publish-local-all -Dzimbra.buildinfo.version=8.8.0_GA
	cd ${soap_harness_repo} && git checkout develop --force && git reset --hard && git pull --all && git checkout ${SOAP_HARNESS_BRANCH} && git pull --all && ant clean build-soap-data-file
	cp build/soapdata.tar /opt/qa/ && cd /opt/qa && tar -xvf soapdata.tar;
fi;

if [ "$STAF_SOAP_SETUP" = true ]; then
	staf_func # invoke staf commands
	cd ${ZIMBRAQAROOT}/conf && ./setup.sh # invoke setup commands
fi;

cd $SOAP_REPORT_PATH;
echo "STARTING SOAP RUN - ";
nohup $SOAP_COMMAND; # Start Soap Test Execution

# Code to send email.

# PART 2 -- Once soap run is completed, parse nohup.out for soap results - executed, passed, failed and send an email to all stakeholders for same.
#staf local soap query
#Response
#--------
#Not Running.

#staf local soap query
#Response
#--------
#In Progress:

while true
do
	STAF_STATUS=`staf local soap query`;
	if [[ $STAF_STATUS == *"Not Running"* ]]; then echo "TESTS COMPLETED SUCCESSFULLY"; break; fi;
done

echo "SOAP RUN COMPLETED!";

output_file_path="${SOAP_REPORT_PATH}/nohup.out";

# Change permissions of nohup file so it is accessible via apache server
chmod 766 ${output_file_path}

failures_list=`sed -n '/These tests had failures:/,/These tests had exceptions:/{/These tests had failures:/!{/These tests had exceptions:/!p;};}' ${output_file_path}`


i=1;
for failure in $failures_list
do
    echo "Failure $i == $failure";
	failure_result_1=${failure//$soap_xml_path/$output_dir}
	failure_result_2=`echo $failure_result_1 | sed -e "s/\.xml/\.txt/g"`
	echo "Result  $i == $failure_result_2";
	i=$((i + 1));
	break;
done

failed=`sed -n 's/^Fail://p' ${output_file_path}`; 
for f in $failed 
do 
    failed_count="Fail: $f"; 
	break; 
done;
		
executed=`sed -n 's/^Executed://p' ${output_file_path}`; 
for f in $executed 
do 
    executed_count="Executed: $f"; 
	break; 
done;

passed=`sed -n 's/^Pass://p' ${output_file_path}`; 
for f in $passed 
do 
    passed_count="Pass: $f"; 
	break; 
done;

script_errors=`sed -n 's/^Script Errors://p' ${output_file_path}`; 
for f in $script_errors
do 	
    script_errors_count="Script Errors: $f"; 
	break; 
done;

failure_br=`echo ${failures_list} | sed 's/\n/\<br\>/g'`;

SOAP_REPORT_URL="http://${APACHE_HOSTNAME_IP}:${APACHE_PORT}/soap-reports/${SOAP_REPORT_DIR_NAME}"
# Script expects pre-defined environment variables like EXTERNAL_PASSWORD and Gmail SMTP related settings for sending the job and automation result email.
# result notificatiosn

MAIL_TO_ACCOUNT=""
MAIL_SUBJECT="SOAP: Smoke tests execution started | Total Tests: 5186"
MAIL_BODY="$(echo ${MAIL_SUBJECT}) \n\n
Soap Auotmation Report:\n ${SOAP_REPORT_URL} \n\n\n
$(echo ${executed_count}) \n
$(echo ${passed_count}) \n
$(echo ${failed_count}) \n
$(echo ${script_errors_count}) \n\n\n
List of Failures - \n
$(echo ${failure_br}) \n\n\n\n
*** This is an automatically generated email, please contact administrator if you see any problem reading this message. ***"

# Send email
sendemail -f "${MAIL_FROM_ACCOUNT}" \
	-u "${MAIL_SUBJECT}" \
	-t "${MAIL_TO_ACCOUNT}" \
	-s "smtp.gmail.com:587" \
	-o tls=auto \
	-xu "${MAIL_FROM_ACCOUNT}" \
	-xp "${EXTERNAL_PASSWORD}" \
	-m  "${MAIL_BODY}"
