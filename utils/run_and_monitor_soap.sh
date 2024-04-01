#!/bin/bash
# 
# This Script can trigger the soap run and monitor it until completion.
# This script also takes care for editing the conf/global.properties file 
# to set properties according to the current installation of zimbra
# ######################################################################################
function print_options {
    cat << HELP_EOF
	"$0" 
        options:
            --help			        Help
            -u, --admin-user        Admin user name (Default: Admin)
            -p, --admin-pass        Admin user passward (Required)
            -h, --hostname          Hostname (optional)
            -tp, --test-path        Tests path for tests to execute (optional)
            -ts, --test-suite       Tests suite (optional)
            -e, --notify-email      Email for sending test results. (Email will not be sent if no arg provided.)
HELP_EOF
}

function main {
    dir_bin="$(cd "$(dirname "$0")" && pwd)"
    dir_qa="/opt/qa"
    dir_staf="/usr/local/staf"
    dir_soaprun="/opt/soaprun/"
    NOTIFY_EMAIL="ganesh.anarse@syancor.com"
    HOSTNAME="$(hostname -f)"
    TEST_PATH="$dir_qa/soapvalidator/data/soapvalidator/Admin/Auth/AdminAuth-Basic.xml"
    TEST_SUITE="BHR"
    ZCS_VERSION="$(sudo su - zimbra -c 'zmcontrol -v')"
    ADMIN_USER="admin"
    TODAY="$(date +"%F")"
    source $HOME/.bashrc

    while [ $# -gt 0 ]; do
	key="$1"
		case $key in
			--help)
			print_options
			exit 0;
			;;
			-p|--admin-pass)
			ADMIN_PASS=$2
			shift
			shift
			;;
			-u|--admin-user)
			ADMIN_USER=$2
			shift
			shift
			;;
			-h|--hostname)
			HOSTNAME=$2
			shift
			shift
			;;
			-tp|--test-path)
			TEST_PATH=$2
			shift
			shift
			;;
			-ts|--test-suite)
			TEST_SUITE=$2
			shift
			shift
			;;
			-e|--notify-email)
			NOTIFY_EMAIL=$2
			shift
			shift
			;;
            *)
			echo "Invalid argument(s): $2"
			echo -e "\n\n\n"
			print_options && exit 1
			;;
		esac
	done

    if [[ -z "$ADMIN_PASS" ]]; then
        echo "--admin-pass is required" && exit 1;
    fi
    if [[ -z "$NOTIFY_EMAIL" ]]; then
        echo "Warning: --notify-email is not set, No one will be notified upon completion.";
    fi
    
    echo $ENV_MAIL_FROM
    check_staf
    set_staf
    run_tests
    echo "Installed ZCS version: $ZCS_VERSION"
    echo "SOAP tests execution process PID: $SOAP_RUN_PID"
    monitor_soap_run &
    echo "Started Monitoring the SOAP run..." && exit 0;
}

function check_staf {
    echo "Checking if the STAF command is installed."
    if [[ -d "$dir_staf" ]]; then
        echo "Directory \"$dir_staf\" exists"
        echo -e "Starting STAF on the server..." && start_staf
        # un-register old STAF services
        staf local service remove service SOAP;
        staf local service remove service LOG;
        staf local service remove service INJECT;
    else 
        echo -e "STAF not installed.\nInstalling & starting STAF on the server..."
        update_dependencies && start_staf 
    fi
}

function start_staf {
    cd $dir_staf
    STAF local shutdown shutdown || true
    old_staf_pid=$(pidof STAFProc)
    sudo kill -9 $old_staf_pid
    export PATH=$PATH:$dir_staf/bin && \
    export LD_LIBRARY_PATH=$dir_staf/lib
    sudo chmod +wx ./STAFEnv.sh
    ./STAFEnv.sh
    ./startSTAFProc.sh
    if [[ $? -eq 0 ]]; then
        echo "STAF started! Testing ping..."
        STAF local ping ping
        if [[ $? -ne 0 ]]; then
            echo -e "ERROR: STAF is not able to run local ping.\nPlease install STAF correctly on server.";
            exit 1;
        fi
    fi
}

function update_dependencies {
    # Get dependencies required for STAF
    redhat_release="yes"
    if cat /etc/os-release | grep 'ubuntu' >> /dev/null; then
        redhat_release="no";
    fi

    if [[ "$redhat_release" == "no" ]]; then
        # Download STAF tar for ubuntu systems
        cd "$HOME"
        sudo apt-get update
        sudo apt-get install -y openjdk-8-jdk
        sudo wget http://prdownloads.sourceforge.net/staf/STAF3426-linux-amd64.tar.gz && \
        tar -xvf STAF3426-linux-amd64.tar.gz
    else
        # Download STAF tar for RHEL systems
        sudo yum update
        sudo yum install -y openjdk-8-jdk
        sudo wget http://prdownloads.sourceforge.net/staf/STAF3426-linux.tar.gz && \
        tar -xvf STAF3426-linux.tar.gz
    fi
    
    update-alternatives --list java
    update-java-alternatives -s $(update-java-alternatives -l | grep '1\.8' | cut -d " " -f1) || echo '.'
    java -version

    # Install STAF
    cd "$HOME/staf" || exit 1;
    echo -e "\n\n\n\n\n\n\n" | sudo ./STAFInst
    if [[ "$?" -eq 0 ]]; then
        echo "STAF installation successful!"
    else
        echo "ERROR: Cannot install STAF." && exit 1;
    fi
}

function set_staf {
    sudo rm -rf "$dir_qa"; sudo mkdir "$dir_qa"
    sudo tar -xvf "$dir_bin/soapdata.tar" -C "$dir_qa" 1> /dev/null || exit 1;
    # Edit /opt/qa/soapvalidator/conf/global.properties file, change domain/server values.
    set_properties
    # Register new staf services
    echo "Adding services to SOAP" && cd $dir_staf && ./STAFEnv.sh
    staf local service add service SOAP LIBRARY JSTAF EXECUTE $dir_qa/soapvalidator/bin/zimbrastaf.jar; \
    staf local service add service LOG LIBRARY STAFLog; \
    staf local service add service INJECT LIBRARY JSTAF EXECUTE $dir_qa/soapvalidator/bin/zimbrainject.jar;
    ret_code="$?"
    if [[ "$ret_code" -eq 49 ]]; then
        echo "Services already present in STAF, ready to execute test cases!" && \
        staf local service list
    elif [[ "$ret_code" -eq 0 ]]; then
        echo "Services added to STAF, ready to execute test cases!" && \
        staf local service list
    else
        echo "WARNING: Error while adding the services to STAF, test cases might not get executed!"
    fi

    echo "Setting up zimbra services. Adding services to the STAF"
    sudo su - zimbra -c 'zmlocalconfig -e allow_unauthed_ping=true'
    echo "Restarting Mailbox..." 
    sudo su - zimbra -c 'zmmailboxdctl restart' || exit 1;
}

function set_properties {
    # Edit /opt/qa/soapvalidator/conf/global.properties file, change domain/server values.
    echo "Setting global properties."
    domain_name="$HOSTNAME"
    # edit with sed
    sudo sed -i "s|localhost|$HOSTNAME|g" $dir_qa/soapvalidator/conf/global.properties
    sudo sed -i "s|@zimbra\.com|@$domain_name|g" $dir_qa/soapvalidator/conf/global.properties
    sudo sed -i "s|defaultdomain\.name=.*|defaultdomain.name=$domain_name|g" $dir_qa/soapvalidator/conf/global.properties
    sudo sed -i "s|admin\.password=.*|admin.password=$ADMIN_PASS|g" $dir_qa/soapvalidator/conf/global.properties
    sudo sed -i "s|admin\.user=.*|admin.user=$ADMIN_USER|g" $dir_qa/soapvalidator/conf/global.properties
}

function run_tests {
    # Execute SOAP tests on the server
    started_at="$(date +'At %r on %F')"
    (STAF LOCAL soap \
            EXECUTE localhost \
            ZIMBRAQAROOT $dir_qa/soapvalidator/ \
            DIRECTORY $TEST_PATH \
            LOG $dir_soaprun \
            SUITE $TEST_SUITE ) > "$HOME/$TODAY-staf_cmd_logs.txt" &
    SOAP_RUN_PID="$!"
}

function is_running {
	local pid=$1
	if ps -p $pid >> /dev/null; then
		echo "Yes"
	else
		echo "No"
	fi
}

function monitor_soap_run {
	while [ true ];
	do
		p="$(is_running $SOAP_RUN_PID)"
		if [[ "$p" == "Yes" ]]; then
			sleep 5;
		else
            if [[ -z "$NOTIFY_EMAIL" ]]; then
                exit 0;
            else
                finished_at="$(date +'At %r on %F')"
			    send_email;
            fi
			exit 0;
		fi
	done
}

function send_email {
    # NOTE: Env variables -> ENV_MAIL_FROM, ENV_MAIL_PASSWORD and ENV_SMTP_SERVER Must be set for 
    # Email to be sent out.
    email_file="$dir_bin/email.txt"
    attach_logs="$HOME/$TODAY-staf_cmd_logs.txt"
    mail_from="$ENV_MAIL_FROM"
    mail_to="$NOTIFY_EMAIL"
    mail_subject="Jenkins SOAP Tests execution: $HOSTNAME - $TODAY"
    attach_logs_encoded=$(cat $attach_logs | base64)
    # Parse logs to get the count
    executed=$(grep "Executed:" "$attach_logs" | head -n 1 | awk -F ':' '{print $2}')
    passed=$(grep "Pass:" "$attach_logs" | head -n 1 | awk -F ':' '{print $2}')
    failed=$(grep "Fail:" "$attach_logs" | head -n 1 | awk -F ':' '{print $2}')
    script_errors=$(grep "Script Errors:" "$attach_logs" | head -n 1 | awk -F ':' '{print $2}')
    fail_percentage=$(awk "BEGIN {printf \"%.2f\", ($failed/$executed) * 100}")

    sudo rm -rf "$email_file"
    cat <<EOF >$email_file
MIME-Version: 1.0
From: $mail_from
To: $mail_to
Subject: $mail_subject
Content-Type: multipart/mixed; boundary=BOUNDARY

--BOUNDARY
Content-Type: text/html
Content-Disposition: inline

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
        }
        h2 {
            color: #333;
        }
        table {
            border-collapse: collapse;
            width: 50%;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .passed {
            color: green;
            font-weight: bold;
        }
        .failed {
            color: red;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h2>SOAP Tests Execution Report</h2>
    <table>
        <tr>
            <th>Metrics</th>
            <th>Value</th>
        </tr>
        <tr>
            <td>Executed</td>
            <td>$executed</td>
        </tr>
        <tr>
            <td>Pass</td>
            <td class="passed">$passed</td>
        </tr>
        <tr>
            <td>Fail</td>
            <td class="failed">$failed</td>
        </tr>
        <tr>
            <td>Script Errors</td>
            <td>$script_errors</td>
        </tr>
    </table>
    <p>Percentage of failed tests: <span class="failed">$fail_percentage%</span></p>
    <p>ZCS version installed: <span>$ZCS_VERSION</span></p>
    <p>Tests path: <span>$TEST_PATH</span></p>
    <p>Tests suite: <span>$TEST_SUITE</span></p>
    <p>Execution started: <span>$started_at</span></p>
    <p>Execution finished: <span>$finished_at</span></p>
    <p>Please check the attachment for detailed logs.</p>
</body>
</html>

--BOUNDARY
Content-Type: text/plain; name="$(basename "$attach_logs")"
Content-Disposition: attachment; filename="$(basename "$attach_logs")"
Content-Transfer-Encoding: base64

$attach_logs_encoded

--BOUNDARY--
EOF

    curl --url "smtps://$ENV_SMTP_SERVER" --ssl-reqd \
            --mail-from "$ENV_MAIL_FROM" \
            --mail-rcpt "$NOTIFY_EMAIL" \
            --user "$ENV_MAIL_FROM:$ENV_MAIL_PASSWORD" \
            -T "$email_file" \
            -k --anyauth \
            --silent -o /dev/null
    if [[ "$?" -eq "0" ]]; then
        return 0;
    else
        return 1;
    fi
}

# #########################
	main "$@"
# #########################