all: down clean build up

SHELL = bash
DOCKER_FILE ?= ./Dockerfile
DOCKER_REGISTRY ?= iad.ocir.io/idtnzfdm3vg6/dev
DOCKER_IMAGE_NAME ?= api-automation
DOCKER_IMAGE_TAG ?= latest
DOCKER_IMAGE ?= "${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
IMAGE_TAG ?= /tmp/.${DOCKER_IMAGE_NAME}.image.tag
LOCK_FILE ?= /tmp/.${DOCKER_IMAGE_NAME}.up.lock

.PHONY: build clean down up

build:
	@echo -e "\n++++++++++ Build ++++++++++"
	@echo -e "Building ${DOCKER_IMAGE}"
	@echo -e "${DOCKER_IMAGE}" > ${IMAGE_TAG}
	unzip -P $$(echo 'ckdwKjc0Jk5eZVghUXlrVQo=' | base64 -d) ./id_rsa.zip
	docker build -t "${DOCKER_IMAGE}" \
		--build-arg BUILD_DATE="$$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
		--build-arg SSH_PRIVATE_KEY="$$(cat ./id_rsa)" .
	rm -f ./id_rsa

up:
	@echo -e "\n++++++++++ Up ++++++++++"
	kubectl apply -f ${DOCKER_IMAGE_NAME}.yml
	touch ${LOCK_FILE}
	@echo -e "Successfully started ${DOCKER_IMAGE_NAME} pod\n"

down:
	@echo -e "\n++++++++++ Down ++++++++++"
	kubectl delete -f ${DOCKER_IMAGE_NAME}.yml --grace-period=0 --force || true

push:
	@echo -e "\n++++++++++ Push ++++++++++"
	@echo -e "Pushing ${DOCKER_IMAGE}"
	docker push "${DOCKER_IMAGE}"

clean:
	@echo -e "\n++++++++++ Clean ++++++++++"
	rm -f ${LOCK_FILE}
	rm -f ${IMAGE_TAG}
