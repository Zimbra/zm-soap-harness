#!/bin/bash
# This script modifies config if environment variables set otherwise uses default values of config.

# Configuration
configFile="/home/docker/zm-api-automation/conf/config.js"

# Configuration parameters
configParameters=(
	serverEnvironment serverHost serverUser serverDomain adminPort clientPort smtpPort popPort imapPort
	adminEmailAddress adminPassword accountPassword showConsoleLog
	userEmailAddress1 userEmailAddress2 userEmailAddress3 userEmailAddress4 userEmailAddress5
)

# Use environment variable if set or default value
for configParameter in "${configParameters[@]}"; do
	environmentValue=$(printenv | grep "${configParameter}" | cut -d '=' -f 2)
	if [ -n "${environmentValue}" ]; then
		configValue="${environmentValue}"
	else
		configValue=$(grep -i "${configParameter}" "${configFile}" | awk '{print $7}' | sed "s/[, ]//g")
	fi
	sed -i -e "s/process.env.${configParameter}/'${configValue}'/g" ${configFile}
done

# Clean up
sed -i -e "s/''/'/g" "${configFile}"
sed -i -e "s/'true'/true/g" "${configFile}"
sed -i -e "s/'false'/false/g" "${configFile}"
sed -i -E "s/ \?(.*)/,/g" "${configFile}"