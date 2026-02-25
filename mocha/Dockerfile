FROM node:latest

# Args
ARG BUILD_DATE
ARG SSH_PRIVATE_KEY

# Environments
ENV DEBIAN_FRONTEND=noninteractive
ENV DOCKER_USERNAME=docker
ENV DOCKER_USER_HOME=/home/${DOCKER_USERNAME}/zm-api-automation
ENV REPO_NAME="zm-api-automation"

# Install required packages
RUN apt-get update && \
	apt-get install -y --no-install-recommends apt-utils sudo vim

# Create docker user
RUN mkdir -p ${DOCKER_USER_HOME} && \
	groupadd -r ${DOCKER_USERNAME} && \
	useradd -r -g ${DOCKER_USERNAME} -d /home/${DOCKER_USERNAME} -s /sbin/nologin -c "${DOCKER_USERNAME} image user" ${DOCKER_USERNAME} && \
	chown -R ${DOCKER_USERNAME}:${DOCKER_USERNAME} /home/${DOCKER_USERNAME} && \
	chpasswd && adduser ${DOCKER_USERNAME} sudo && \
	echo "%sudo ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set working directory
USER ${DOCKER_USERNAME}
WORKDIR ${DOCKER_USER_HOME}

# Configuration
RUN echo "alias ll='ls -lah'" >> ~/.bashrc && \
	mkdir -p ${DOCKER_USER_HOME}/test-reports && \
	mkdir -p ${DOCKER_USER_HOME}/../.ssh && \
	echo "${SSH_PRIVATE_KEY}" > ${DOCKER_USER_HOME}/../.ssh/id_rsa && \
	chmod 600 ${DOCKER_USER_HOME}/../.ssh/id_rsa

# Copy code
COPY --chown=docker:docker . ${DOCKER_USER_HOME}

# Install npm
RUN npm install --no-audit && \
	sudo npm install -g mocha mochawesome

# Label image
LABEL org.label-schema.version="1.0.0" \
	org.label-schema.build-date="${BUILD_DATE}" \
	org.label-schema.name="${REPO_NAME}" \
	org.label-schema.description="Zimbra X API Automation Docker Image" \
	org.label-schema.url="https://zimbra.org" \
	org.label-schema.vcs-url="https://github.com/Zimbra/${REPO_NAME}" \
	org.label-schema.vendor="Synacor Inc."

# Run target
#ENTRYPOINT ["npm", "run", "test:smoke"]