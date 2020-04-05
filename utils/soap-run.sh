#!/bin/bash -e
# This bash utility executes soap automation tests for Zimbra.
# It accepts command line arguments like HOSTNAME, TESTS_PATH, TEST_SUITE(SMOKE/SANITY/FUNCTIONAL), BRANCH(DEVELOP/FEATURE), SOAP_HARNESS_BRANCH, SOAP_REPORT_PATH
# For sending an email, script needs MAIL_FROM_ACCOUNT & EXTERNAL_PASSWORD environment variables and sendemail package installed.

#HOSTNAME - zimbra server hostname
#TESTS_PATH - /opt/qa/soapvalidator/data/soapvalidator
#TEST_SUITE - Smoke / BHR / Sanity / Functional
#BRANCH - develop / feature / bug
#SOAP_HARNESS_BRANCH - master / develop / feature / bug
#SOAP_REPORT_PATH - /var/www/html/soap-reports/datatimefield

# Configuration
GIT_DIR=${HOME}/git
ZM_MAILBOX_DIR=${GIT_DIR}/zm-mailbox
ZM_SOAP_HARNESS_DIR=${GIT_DIR}/zm-soap-harness
ZIMBRAQAROOT="/opt/qa/soapvalidator"
TESTS_ROOT_DIR="/opt/qa/soapvalidator/data/soapvalidator"
SOAP_REPORT_DIR_NAME=`echo $(date +%Y)$(date +%m)$(date +%d)-$(date +%T) | sed "s/\://g"`

# Optional config
STAF_SOAP_SETUP="false"
COMPILE_REPOS="false"

# Command line arguments
if [ $# -lt 1 ]; then
	echo -e "+++++ Error: Valid arguments not passed in soap run configuration script, it should be in form of: +++++\n"
	echo -e "+++++ bash [full-script-path] HOSTNAME=value TESTS_PATH=value TEST_SUITE=value BRANCH=value SOAP_HARNESS_BRANCH=value SOAP_REPORT_PATH=value +++++\n"
	exit 1
fi

for argument in "$@"; do
	key=$(echo ${argument} | cut -f1 -d=)
	value=$(echo ${argument} | cut -f2 -d=)
	case "${key}" in
		HOSTNAME) HOSTNAME=${value};;
		TESTS_PATH) TESTS_PATH=${value};;
		TEST_SUITE) TEST_SUITE=${value};;
		BRANCH) BRANCH=${value};;
		SOAP_HARNESS_BRANCH) SOAP_HARNESS_BRANCH=${value};;
		SOAP_REPORT_PATH) SOAP_REPORT_PATH=${value};;
	esac
done

# Default values
[ -z "${HOSTNAME}" ] && HOSTNAME="localhost" || HOSTNAME=$(echo ${HOSTNAME})
[ -z "${TESTS_PATH}" ] && TESTS_PATH="${TESTS_ROOT_DIR}/Auth/Auth-Basic.xml" || TESTS_PATH=$(echo ${TESTS_PATH})
[ -z "${TEST_SUITE}" ] && TEST_SUITE="Smoke" || TEST_SUITE=$(echo ${TEST_SUITE})
[ -z "${BRANCH}" ] && BRANCH="master" || BRANCH=$(echo ${BRANCH})
[ -z "${SOAP_HARNESS_BRANCH}" ] && SOAP_HARNESS_BRANCH="localhost" || SOAP_HARNESS_BRANCH=$(echo ${SOAP_HARNESS_BRANCH})
[ -z "${SOAP_REPORT_PATH}" ] && SOAP_REPORT_PATH="/var/www/html/soap-reports/${SOAP_REPORT_DIR_NAME}" || SOAP_REPORT_PATH=$(echo ${SOAP_REPORT_PATH})

echo -e "HOSTNAME: ${HOSTNAME}"
echo -e "TESTS_PATH: ${TESTS_PATH}"
echo -e "TEST_SUITE: ${TEST_SUITE}"
echo -e "BRANCH: ${BRANCH}"
echo -e "SOAP_HARNESS_BRANCH: ${SOAP_HARNESS_BRANCH}"
echo -e "SOAP_REPORT_PATH: ${SOAP_REPORT_PATH}"

SOAP_COMMAND="STAF LOCAL soap EXECUTE ${HOSTNAME} ZIMBRAQAROOT ${ZIMBRAQAROOT} DIRECTORY ${TESTS_PATH} LOG ${SOAP_REPORT_PATH} SUITE ${TEST_SUITE}"
echo $SOAP_COMMAND;
mkdir -p /opt/qa/
mkdir -p $SOAP_REPORT_PATH

# Compile repos
if [ "$COMPILE_REPOS" = true ]; then
	cd ${ZM_MAILBOX_DIR} && git checkout develop --force && git reset --hard && git pull --all && git checkout ${BRANCH} && git pull --all && ant clean publish-local-all -Dzimbra.buildinfo.version=9.0.0_GA
	cd ${ZM_SOAP_HARNESS_DIR} && git checkout develop --force && git reset --hard && git pull --all && git checkout ${SOAP_HARNESS_BRANCH} && git pull --all && ant clean build-soap-data-file
	cp build/soapdata.tar /opt/qa/ && cd /opt/qa && tar -xvf soapdata.tar;
fi

if [ "${STAF_SOAP_SETUP}" = "true" ]; then
	# Run through staf
	staf local service remove service soap && staf local service remove service log &&  staf local service remove service inject
	pid=`ps -aux | grep -i staf  |  grep -v grep | awk '{print $2}'`
	if [[ $pid != "" ]]; then kill $pid; fi;
	/usr/local/staf/startSTAFProc.sh > /opt/zimbra/log/staf.log 2> /dev/null
	sleep 15
	staf local service add service SOAP LIBRARY JSTAF EXECUTE /opt/qa/soapvalidator/bin/zimbrastaf.jar && sleep 15 && staf local service add service LOG LIBRARY STAFLog && staf local service add service INJECT LIBRARY JSTAF EXECUTE /opt/qa/soapvalidator/bin/zimbrainject.jar
	sleep 15

	cd ${ZIMBRAQAROOT}/conf && ./setup.sh # invoke setup commands
fi

echo -e "+++++ SOAP tests execution started... +++++";
cd ${SOAP_REPORT_PATH} && nohup $SOAP_COMMAND;

echo -e "Parse nohup.out and send soap automation result"
while true; do
	STAF_STATUS=`staf local soap query`;
	if [[ $STAF_STATUS == *"Not Running"* ]]; then
		echo "TESTS COMPLETED SUCCESSFULLY";
		break;
	fi
done

# Change permissions of nohup file so it is accessible via apache server
SOAP_REPORT_FILE="${SOAP_REPORT_PATH}/nohup.out";
sudo chmod 766 ${SOAP_REPORT_FILE}

# Parse failures
failuresList=`sed -n '/These tests had failures:/,/These tests had exceptions:/{/These tests had failures:/!{/These tests had exceptions:/!p;};}' ${SOAP_REPORT_FILE}`

i=1
for failure in ${failuresList}; do
    echo -e "Failure $i == ${failure}"
	failureResult1=${failure//${TESTS_ROOT_DIR}/$output_dir}
	failureResult2=`echo ${failureResult1} | sed -e "s/\.xml/\.txt/g"`
	echo -e "Result $i == ${failureResult2}"
	i=$((i + 1))
	break;
done
failuresBr=`echo ${failuresList} | sed 's/\n/\<br\>/g'`

# Failed
failed=`sed -n 's/^Fail://p' ${SOAP_REPORT_FILE}`;
for f in ${failed}; do
    failedCount="Fail: $f"
	break;
done;

# Executed
executed=`sed -n 's/^Executed://p' ${SOAP_REPORT_FILE}`;
for f in ${executed}; do
    executedCount="Executed: $f"
	break;
done;

# Passed
passed=`sed -n 's/^Pass://p' ${SOAP_REPORT_FILE}`;
for f in ${passed}; do
    passedCount="Pass: $f"
	break;
done;

# Script errors
scriptErrors=`sed -n 's/^Script Errors://p' ${SOAP_REPORT_FILE}`;
for f in ${scriptErrors}; do
    scriptErrorsCount="Script Errors: $f"
	break;
done;

# Report URL
SOAP_REPORT_URL="http://${APACHE_HOSTNAME_IP}:81/soap-reports/${SOAP_REPORT_DIR_NAME}"

# Email notifcation
MAIL_TO_ACCOUNT=""
MAIL_SUBJECT="SOAP: ${BRANCH} tests execution started | Total Tests: ??"
MAIL_BODY="$(echo ${MAIL_SUBJECT}) \n\n
Soap Auotmation Report:\n ${SOAP_REPORT_URL} \n\n\n
$(echo ${executedCount}) \n
$(echo ${passedCount}) \n
$(echo ${failedCount}) \n
$(echo ${scriptErrorsCount}) \n\n\n
List of Failures - \n
$(echo ${failuresBr}) \n\n\n\n
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