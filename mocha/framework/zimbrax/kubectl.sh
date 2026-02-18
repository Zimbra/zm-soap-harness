#!/bin/bash -e
# This script returns pod for respective server and account email address.
# Usage: framework/zimbrax/kubectl.sh SERVER_USER=ubuntu SERVER_HOST=ci.zimbradev.com POD_TYPE=zmc-proxy ACCOUNT_EMAIL_ADDRESS=admin@zmc.com

# Script configuration
set -e
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SCRIPT_PATH=${SCRIPT_DIR}/$(basename "${BASH_SOURCE[0]}")
SCRIPT_NAME=`basename $0 | cut -d "." -f 1`

# Main function
main() {
	if [ $# -lt 3 ]; then
		echo -e "+++++ Error: Valid arguments not passed in ${SCRIPT_NAME} script, it should in form of: bash ${SCRIPT_PATH} SERVER_USER=value SERVER_HOST=value POD_TYPE=value ACCOUNT_EMAIL_ADDRESS=value +++++\n"
		exit 1
	fi

	for argument in "$@"; do
		key=$(echo ${argument} | cut -f1 -d=)
		value=$(echo ${argument} | cut -f2 -d=)

		case "${key}" in
			SERVER_USER) SERVER_USER=`echo "${value}" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[ \t]*//'`;;
			SERVER_HOST) SERVER_HOST=`echo "${value}" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[ \t]*//'`;;
			POD_TYPE) POD_TYPE=`echo "${value}" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[ \t]*//'`;;
			ACCOUNT_EMAIL_ADDRESS) ACCOUNT_EMAIL_ADDRESS=`echo "${value}" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[ \t]*//'`;;
		esac
	done

	# Print command
	[ -z "${POD_TYPE}" ] && POD_TYPE="zmc-proxy" || POD_TYPE="${POD_TYPE}"
	#echo -e "bash -x ${SCRIPT_PATH} SERVER_USER=${SERVER_USER} SERVER_HOST=${SERVER_HOST} ACCOUNT_EMAIL_ADDRESS=${ACCOUNT_EMAIL_ADDRESS} POD_TYPE=${POD_TYPE}"

	# Get pod type
	if [ "${POD_TYPE}" = "zmc-mailbox" ]; then
		#echo -e "ssh -qo 'StrictHostKeyChecking no' ${SERVER_USER}@${SERVER_HOST} 'kubectl get service | grep mls' | awk '{print $3}'"
		MLS_POD_IP=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} "kubectl get service | grep mls" | awk '{print $3}')

		#echo -e "ssh -qo 'StrictHostKeyChecking no' ${SERVER_USER}@${SERVER_HOST} 'curl --silent -k https://${MLS_POD_IP}:7072/search?email=${ACCOUNT_EMAIL_ADDRESS}'"
		MAILBOX_POD_IP=$(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} "curl --silent -k https://${MLS_POD_IP}:7072/search?email=${ACCOUNT_EMAIL_ADDRESS}")

		#echo -e "ssh -qo 'StrictHostKeyChecking no' ${SERVER_USER}@${SERVER_HOST} 'kubectl get pods | grep ${POD_TYPE}' | awk '{print $1}'"
		for MAILBOX_POD in $(ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} "kubectl get pods | grep ${POD_TYPE}" | awk '{print $1}'); do
			#echo -e "ssh -qo 'StrictHostKeyChecking no' ${SERVER_USER}@${SERVER_HOST} 'kubectl describe pod ${MAILBOX_POD}' | grep -q ${MAILBOX_POD_IP}"
			if ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} "kubectl describe pod ${MAILBOX_POD} | grep -q ${MAILBOX_POD_IP}"; then
				break
			fi
		done
		echo -e "${MAILBOX_POD}"

	else
		#echo -e "ssh -qo 'StrictHostKeyChecking no' ${SERVER_USER}@${SERVER_HOST} 'kubectl get pods | grep ${POD_TYPE} | awk '{print $1}' | head -n 1"
		ssh -qo "StrictHostKeyChecking no" ${SERVER_USER}@${SERVER_HOST} "kubectl get pods | grep ${POD_TYPE}" | awk '{print $1}' | head -n 1
		echo -e "${PROXY_POD}"
	fi
}

# Call to main function
main "$@"
