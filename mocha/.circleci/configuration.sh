#!/bin/bash -e
# This bash utility used by CircleCI which installs required OS packages and communicates with Zimbra server for getting required information.
# Usage: utils/configuration.sh CONFIG_TYPE=PRE_CONFIG SERVER_HOST=automation.zimbradev.com REPORT_PATH=test-reports

# Script configuration
set -e
PROJECT_NAME="zm-api-automation"
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SCRIPT_PATH=${SCRIPT_DIR}/$(basename "${BASH_SOURCE[0]}")
SCRIPT_NAME=`basename $0 | cut -d "." -f 1`

# Server logs
ZIMBRA_LOG_PATH="/opt/zimbra/log"
MAILBOX_LOG_FILE="${ZIMBRA_LOG_PATH}/mailbox.log"
ZMMAILBOXD_OUT_FILE="${ZIMBRA_LOG_PATH}/zmmailboxd.out"
EWS_LOG_FILE="${ZIMBRA_LOG_PATH}/ews.log"
SYNC_LOG_FILE="${ZIMBRA_LOG_PATH}/sync.log"

main() {
	# Command line arguments
	if [ $# -lt 2 ]; then
		echo -e "+++++ Error: Valid arguments not passed in ${SCRIPT_NAME} script, it should in form of: \
			bash ${SCRIPT_PATH} CONFIG_TYPE=value SERVER_ENVIRONMENT=value REPORT_PATH=value +++++\n"
		exit 1
	fi

	for argument in "$@"; do
		key=$(echo ${argument} | cut -f1 -d=)
		value=$(echo ${argument} | cut -f2 -d=)
		case "${key}" in
			CONFIG_TYPE) CONFIG_TYPE=`echo "${value}" | tr '[:lower:]' '[:upper:]' | sed -e 's/^[ \t]*//'`;;
			SERVER_ENVIRONMENT) SERVER_ENVIRONMENT=`echo "${value}" | tr '[:lower:]' '[:upper:]' | sed -e 's/^[ \t]*//'`;;
			REPORT_PATH) REPORT_PATH=`echo "${value}" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[ \t]*//'`;;
		esac
	done

	# Get config
	echo -e "+++++ bash -x ${SCRIPT_PATH} $@ +++++\n"

	if [ "${CONFIG_TYPE}" = "PRE_CONFIG" ]; then
		PRE_CONFIG
	elif [ "${CONFIG_TYPE}" = "POST_CONFIG" ]; then
		POST_CONFIG
	else
		echo -e "+++++ Error: Script does not match with valid argument +++++\n"
		exit 1
	fi
}

# Pre configuration
function PRE_CONFIG() {
	# Get server environment
	if [[ "${SERVER_ENVIRONMENT}" = "ZIMBRA101"* ]] || [[ "${SERVER_ENVIRONMENT}" = "ZIMBRAX"* ]]; then
		SERVER_ENVIRONMENT="${SERVER_ENVIRONMENT}"
		[[ "${CIRCLE_BRANCH}" = "master" ]] && SERVER_ENVIRONMENT="${SERVER_ENVIRONMENT}_MASTER"
		[[ "${CIRCLE_BRANCH}" = "release/"* ]] && SERVER_ENVIRONMENT="${SERVER_ENVIRONMENT}_RELEASE"

		echo -e "++++++++++++++++++++++++++++++++++++++++"
		echo -e "SERVER_ENVIRONMENT: ${SERVER_ENVIRONMENT}"
		echo "export SERVER_ENVIRONMENT=${SERVER_ENVIRONMENT}" >> $BASH_ENV
	fi

	# Config
	SERVER_CONFIG="$HOME/${PROJECT_NAME}/conf/environment.json"
	SERVER_HOST=$(cat ${SERVER_CONFIG} | jq -r ".${SERVER_ENVIRONMENT}.serverHost")
	SERVER_USER=$(cat ${SERVER_CONFIG} | jq -r ".${SERVER_ENVIRONMENT}.serverUser")
	echo -e "SERVER_HOST: ${SERVER_HOST}"
	echo -e "SERVER_USER: ${SERVER_USER}"
	echo "export SERVER_USER=${SERVER_USER}" >> $BASH_ENV
	echo "export SERVER_HOST=${SERVER_HOST}" >> $BASH_ENV

	if [[ "${SERVER_ENVIRONMENT}" = "ZIMBRAX"* ]]; then
		# Get SMTP port
		echo -e "\n++++++++++++++++++++++++++++++++++++++++"
		SMTP_PORT=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
			"kubectl get svc" | grep -i mta0-pod | awk -v FS="(25:|/)" '{print $3}')
		echo "export SMTP_PORT=${SMTP_PORT}" >> $BASH_ENV
		echo -e "SMTP_PORT: ${SMTP_PORT}"

		# Get POP/IMAP ports
		POP_PORT=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
			"kubectl get svc" | grep -i zmc-proxy | awk -v FS="(995:|/pop)" '{print $2}' | cut -d / -f 1)
		echo "export POP_PORT=${POP_PORT}" >> $BASH_ENV
		echo -e "POP_PORT: ${POP_PORT}"

		IMAP_PORT=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
			"kubectl get svc" | grep -i zmc-proxy | awk -v FS="(993:|/imap)" '{print $2}' | cut -d / -f 1)
		echo "export IMAP_PORT=${IMAP_PORT}" >> $BASH_ENV
		echo -e "IMAP_PORT: ${IMAP_PORT}"

		# Get mailbox pods
		TOTAL_MAILBOX_PODS=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} "kubectl get po" | grep -i zmc-mailbox | wc -l)
		echo -e "Total mailbox pods: ${TOTAL_MAILBOX_PODS}"
		echo "export TOTAL_MAILBOX_PODS=${TOTAL_MAILBOX_PODS}" >> $BASH_ENV

		# Total log lines from each multiple pods
		echo -e "\n++++++++++++++++++++++++++++++++++++++++"
		for (( MAILBOX_POD=0; MAILBOX_POD<${TOTAL_MAILBOX_PODS}; MAILBOX_POD++ )); do
			echo -e "ssh -qo 'StrictHostKeyChecking no' ${SERVER_USER}@${SERVER_HOST} \
				'kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"wc -l ${MAILBOX_LOG_FILE} | cut -d ' ' -f 1\"'"
			MAILBOX_LOG_LINE_NO=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
				"kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"wc -l ${MAILBOX_LOG_FILE} | cut -d ' ' -f 1\"")
			echo -e "Start mailbox pod${MAILBOX_POD} line no: ${MAILBOX_LOG_LINE_NO}"
			echo "export START_MAILBOX${MAILBOX_POD}_LOG_LINE_NO=${MAILBOX_LOG_LINE_NO}" >> $BASH_ENV
		done
	fi
}

# Post-configurations
function POST_CONFIG() {
	echo -e "SERVER_ENVIRONMENT: ${SERVER_ENVIRONMENT}"

	if [[ "${SERVER_ENVIRONMENT}" = "ZIMBRAX"* ]]; then
		for (( MAILBOX_POD=0; MAILBOX_POD<${TOTAL_MAILBOX_PODS}; MAILBOX_POD++ )); do
			echo -e "++++++++++++++++++++++++++++++++++++++++"
			if [ "${MAILBOX_POD}" = "0" ]; then
				START_MAILBOX0_LOG_LINE_NO=${START_MAILBOX0_LOG_LINE_NO}
				echo -e "Start mailbox pod${MAILBOX_POD} line no: ${START_MAILBOX0_LOG_LINE_NO}"
			elif [ "${MAILBOX_POD}" = "1" ]; then
				START_MAILBOX1_LOG_LINE_NO=${START_MAILBOX1_LOG_LINE_NO}
				echo -e "Start mailbox pod${MAILBOX_POD} line no: ${START_MAILBOX1_LOG_LINE_NO}"
			fi

			MAILBOX_LOG_LINE_NO=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
				"kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"wc -l ${MAILBOX_LOG_FILE} | cut -d ' ' -f 1\"")
			echo -e "End mailbox pod${MAILBOX_POD} line no: ${MAILBOX_LOG_LINE_NO}"

			TOTAL_MAILBOX_LOG_LINES=$((${MAILBOX_LOG_LINE_NO}-START_MAILBOX${MAILBOX_POD}_LOG_LINE_NO))
			echo -e "Total mailbox${MAILBOX_POD} log lines: ${TOTAL_MAILBOX_LOG_LINES}"

			# Mailbox log
			echo -e "ssh -qo 'StrictHostKeyChecking no' ${SERVER_USER}@${SERVER_HOST} \
				'kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"tail -n ${TOTAL_MAILBOX_LOG_LINES} ${MAILBOX_LOG_FILE}\"' \
				>> $HOME/${PROJECT_NAME}/${REPORT_PATH}/mailbox${MAILBOX_POD}.log"
			ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
				"kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"tail -n ${TOTAL_MAILBOX_LOG_LINES} ${MAILBOX_LOG_FILE}\"" \
				>> $HOME/${PROJECT_NAME}/${REPORT_PATH}/mailbox${MAILBOX_POD}.log

			# Log files
			ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
				"kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"tail -n 5000 ${ZMMAILBOXD_OUT_FILE}\"" \
				>> $HOME/${PROJECT_NAME}/${REPORT_PATH}/zmmailboxd${MAILBOX_POD}.out
			ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
				"kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"tail -n 5000 ${EWS_LOG_FILE}\"" \
				>> $HOME/${PROJECT_NAME}/${REPORT_PATH}/ews${MAILBOX_POD}.log
			ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} \
				"kubectl exec -i zmc-mailbox-${MAILBOX_POD} -- /bin/bash -c \"tail -n 5000 ${SYNC_LOG_FILE}\"" \
				>> $HOME/${PROJECT_NAME}/${REPORT_PATH}/sync${MAILBOX_POD}.log
		done
	fi
}

# ---------- main function ----------
main "$@"