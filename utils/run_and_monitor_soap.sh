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
    notify_email="ganesh.anarse@syancor.com"
    HOSTNAME="$(hostname -f)"
    TEST_PATH="$dir_qa/soapvalidator/data/soapvalidator/Admin/Auth/AdminAuth-Basic.xml"
    TEST_SUITE="BHR"
    ADMIN_USER="admin"

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
    
    check_staf
    set_staf
    run_tests
    echo "SOAP Run PID: $SOAP_RUN_PID"
    monitor_soap_run &
    echo "Started Monitoring the SOAP run..."
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
    sudo sed -i "s|admin\.user=.*|admin.password=$ADMIN_USER|g" $dir_qa/soapvalidator/conf/global.properties
}

function run_tests {
    # Execute SOAP tests on the server
    (STAF LOCAL soap \
            EXECUTE localhost \
            ZIMBRAQAROOT $dir_qa/soapvalidator/ \
            DIRECTORY $TEST_PATH \
            LOG $dir_soaprun \
            SUITE $TEST_SUITE ) > "$HOME/staf_cmd_logs.txt" &
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
			send_email_notification
			exit 0;
		fi
	done
}

function send_email_notification {
    rm -rf "$dir_bin/email.txt"
    cat <<EOF > "$dir_bin/email.txt"
    To: $NOTIFY_EMAIL
    Subject: "SOAP: Tests execution started at $(date)"

    Status of the SOAP execution on $HOSTNAME
    ------------------------------------------------------------
    Host: $HOSTNAME
    Test Path: $TEST_PATH
    Test Suite: $TEST_SUITE
    SOAP test results are now available at: $dir_soaprun
EOF

    if [ "$(command -v sendmail)" ]; then
        echo "pass" >> /dev/null;
    else
        if [ "$(command -v apt)" ]; then
            sudo apt-get install sendmail -y
        else
            sudo yum install sendmail -y
        fi
    fi

    ## WARNING: Following command might not work on Ubuntu systems.
    ## This should be addressed later.
    sendmail -t $NOTIFY_EMAIL < "$dir_bin/email.txt"
}


# #########################
	main "$@"
# #########################