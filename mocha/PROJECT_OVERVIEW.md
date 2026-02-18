# Zimbra SOAP Harness — Project Overview

> **Generated:** 2026-02-15  
> **Repository:** `Zimbra/zm-soap-harness`

---

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Project Structure](#2-project-structure)
- [3. Technology Stack](#3-technology-stack)
- [4. Source Code Architecture](#4-source-code-architecture)
- [5. Test Data Organization](#5-test-data-organization)
- [6. Configuration](#6-configuration)
- [7. Build System](#7-build-system)
- [8. Dependencies](#8-dependencies)
- [9. CI/CD Pipeline](#9-cicd-pipeline)
- [10. Test Execution](#10-test-execution)
- [11. Key Files Reference](#11-key-files-reference)

---

## 1. Introduction

The **Zimbra SOAP Harness** is a comprehensive test automation framework designed to execute SOAP-based functional and regression tests against the Zimbra Collaboration Suite (ZCS). It leverages the **STAF (Software Testing Automation Framework)** to orchestrate test execution and provides multiple STAF services for different testing needs such as SOAP validation, email injection, result reporting, and more.

### Key Capabilities

- **SOAP API Testing** — Validates Zimbra SOAP API endpoints across Admin, Mail, Calendar, Contacts, and other modules.
- **STAF Integration** — Fully integrated with STAF services for distributed test execution.
- **Non-STAF Execution** — Supports direct test execution via Apache Ant without requiring STAF setup.
- **Multi-Suite Support** — Supports `smoke`, `sanity`, `functional`, and `regression` test suites.
- **CI/CD Ready** — Includes CircleCI pipeline configuration for automated testing.

---

## 2. Project Structure

```
zm-soap-harness/
├── .circleci/                  # CircleCI CI/CD pipeline configuration
│   ├── config.yml              # Pipeline workflow definitions
│   └── global.properties       # CI-specific global properties
├── .github/
│   └── CODEOWNERS              # GitHub code ownership rules
├── build.xml                   # Apache Ant build file (primary build system)
├── ivy.xml                     # Apache Ivy dependency declarations
├── conf/                       # Configuration files
│   ├── global.properties       # Main test configuration (servers, accounts, etc.)
│   ├── global.properties.zimbrax  # ZimbraX-specific configuration
│   ├── STAF.cfg                # STAF framework configuration
│   ├── log4j.properties        # Log4j logging config (production)
│   ├── log4j-dev.properties    # Log4j logging config (development)
│   ├── log4jSTAF.properties    # Log4j config for STAF services
│   ├── setup.sh                # Server setup script
│   ├── skipped-tests.txt       # List of skipped tests (FOSS)
│   ├── skipped-tests-zimbrax.txt  # List of skipped tests (ZimbraX)
│   └── ZimbraExtensions/       # Extension manifests
│       ├── CustomAuthQA/       # Custom authentication extension
│       ├── ScalityHttpStore/   # Scality HTTP store extension
│       └── StoreManager/       # Store manager extension
├── data/                       # Test data and test cases
│   ├── soapvalidator/          # SOAP test XML files (~2157 items)
│   │   ├── Admin/              # Admin API tests (722 items)
│   │   ├── Auth/               # Authentication tests
│   │   ├── Briefcase/          # Briefcase/Document tests
│   │   ├── Calendar/           # Calendar/Appointment tests
│   │   ├── Contacts/           # Contact management tests
│   │   ├── Folders/            # Folder management tests
│   │   ├── General/            # General functionality tests
│   │   ├── Mail/               # Mail/Messaging tests (397 items)
│   │   ├── Prefs/              # User preferences tests (265 items)
│   │   ├── REST/               # REST API tests
│   │   ├── Search/             # Search functionality tests
│   │   ├── Sharing/            # Sharing feature tests
│   │   ├── Sync/               # Sync feature tests
│   │   ├── Tags/               # Tag management tests
│   │   ├── Tasks/              # Task management tests
│   │   └── iCal/               # iCalendar integration tests
│   └── testmailraw/            # Raw test mail data (1502 items)
├── docs/                       # Documentation
│   ├── Automation/             # Automation-related docs
│   ├── BuildTests/             # Build & test docs
│   ├── inject.service.txt      # Inject STAF service docs
│   ├── staf-harness.txt        # STAF harness usage docs
│   └── staf.perf.service       # Performance service docs
├── jars/                       # Pre-bundled JAR dependencies
│   ├── JSTAF.jar               # STAF Java library
│   ├── testng-6.8.jar          # TestNG framework
│   ├── postgresql-*.jar        # PostgreSQL JDBC driver
│   └── metro-wsdl/             # Metro WSDL libraries
├── src/                        # Source code
│   ├── bin/                    # Shell scripts & utilities
│   │   ├── runsoap.sh          # Main SOAP test runner script
│   │   ├── runreports.sh       # Test report generator
│   │   ├── createUsers.sh      # User creation utility
│   │   ├── injectTestMail.sh   # Mail injection utility
│   │   └── ... (20 scripts)
│   ├── java/com/zimbra/qa/     # Java source packages
│   │   ├── soap/               # Core SOAP test engine (36 files)
│   │   ├── bugreports/         # Bug report STAF service
│   │   ├── chat/               # Chat testing module
│   │   ├── extensions/         # Zimbra extension tests
│   │   ├── importer/           # Data importer STAF service
│   │   ├── inject/             # Email inject STAF service
│   │   ├── nunit/              # NUnit integration service
│   │   ├── results/            # Results STAF service
│   │   ├── sample/             # Sample STAF service template
│   │   ├── testrail/           # TestRail integration
│   │   └── trust/              # Trust/security testing
│   └── STAF/                   # STAF-specific resources
├── utils/                      # Utility tools
└── README.md                   # Getting started guide
```

---

## 3. Technology Stack

| Component              | Technology                          | Version         |
|------------------------|-------------------------------------|-----------------|
| **Language**           | Java                                | JDK 1.8+        |
| **Build System**       | Apache Ant                          | 1.9+            |
| **Dependency Manager** | Apache Ivy                          | 2.0              |
| **Test Orchestration** | STAF (Software Testing Automation Framework) | 3.4.4    |
| **Logging**            | Log4j                               | 1.2.16          |
| **XML Processing**     | dom4j                               | 1.5.2           |
| **HTTP Client**        | Apache HttpComponents               | 4.5.x           |
| **JSON Processing**    | org.json                            | 20160810        |
| **Testing Framework**  | TestNG                              | 6.4 / 6.8       |
| **LDAP**               | UnboundID LDAP SDK                  | 2.3.5           |
| **Calendar**           | iCal4j                              | 0.9.16-patched  |
| **CI/CD**              | CircleCI                            | 2.1              |

---

## 4. Source Code Architecture

The Java source code resides under `src/java/com/zimbra/qa/` and is organized into the following modules:

### Core Modules

| Package                    | Purpose                                                        |
|----------------------------|----------------------------------------------------------------|
| `com.zimbra.qa.soap`       | **Core SOAP test engine** — parses XML test definitions, executes SOAP requests, validates responses. Entry points: `SoapTestMain` (CLI), `StafIntegration` (STAF). |
| `com.zimbra.qa.inject`     | **Email Injection Service** — injects test emails into Zimbra via SMTP/LMTP for message-based test scenarios. |
| `com.zimbra.qa.importer`   | **Data Importer Service** — imports test data and configurations into Zimbra environments. |
| `com.zimbra.qa.results`    | **Results Service** — collects and stores test execution results (PostgreSQL-backed). |
| `com.zimbra.qa.bugreports` | **Bug Reports Service** — generates and manages test failure reports. |
| `com.zimbra.qa.nunit`      | **NUnit Service** — bridges NUnit (.NET) test execution through STAF. |
| `com.zimbra.qa.testrail`   | **TestRail Integration** — syncs test results with TestRail test management system. |
| `com.zimbra.qa.sample`     | **Sample Service** — template/reference implementation for new STAF services. |
| `com.zimbra.qa.extensions` | **Zimbra Extensions** — custom auth, store manager, and Scality HTTP store extensions for testing. |
| `com.zimbra.qa.chat`       | **Chat Testing** — test support for Zimbra Chat functionality. |
| `com.zimbra.qa.trust`      | **Trust/Security** — certificate and trust-related testing utilities. |

### Generated STAF JAR Files

The build produces the following service JARs under `build/dist/lib/`:

| JAR File                  | Main Class / Service Class                              |
|---------------------------|---------------------------------------------------------|
| `zimbrastaf.jar`          | `SoapTestMain` / `StafIntegration` — Main SOAP harness |
| `zimbrainject.jar`        | `inject.Driver` / `inject.INJECTStaf`                  |
| `zimbraimporter.jar`      | `importer.Driver` / `importer.StafIntegration`          |
| `zimbraresults.jar`       | `results.ResultsCore` / `results.ResultsStaf`           |
| `zimbratestngresults.jar` | `staf.Driver` / `bugreports.ResultsStaf`                |
| `zimbranunit.jar`         | `nunit.Driver` / `nunit.StafService`                    |
| `zimbrasmtp.jar`          | `smtp.StafTestSMTP`                                     |
| `zimbrasample.jar`        | `sample.StafCore` / `sample.StafMain`                   |
| `zimbraemail.jar`         | `email.INJECTCore` / `email.INJECTStaf`                 |

---

## 5. Test Data Organization

Tests are defined as **XML files** under `data/soapvalidator/`. Each XML file contains one or more SOAP request/response test cases.

### Test Modules & Approximate Coverage

| Module         | Items | Description                                            |
|----------------|-------|--------------------------------------------------------|
| **Admin**      | 722   | Server administration, COS, domain, account management |
| **Mail**       | 397   | Send/receive, folders, conversations, filters           |
| **Prefs**      | 265   | User preferences and settings                           |
| **Calendar**   | 186   | Appointments, invitations, recurrence, free/busy        |
| **Search**     | 125   | Search queries, filters, indexing                       |
| **iCal**       | 93    | iCalendar import/export, feed subscriptions             |
| **REST**       | 87    | REST API endpoint testing                               |
| **Contacts**   | 71    | Contact CRUD, GAL, distribution lists                   |
| **General**    | 62    | Cross-cutting functionality                             |
| **Folders**    | 47    | Folder hierarchy, special folders                       |
| **Auth**       | 34    | Authentication, authorization, LDAP/AD auth             |
| **Briefcase**  | 34    | Document storage and management                         |
| **Tasks**      | 13    | Task management                                         |
| **Sync**       | 8     | Sync protocol tests                                     |
| **Tags**       | 7     | Tag management                                          |
| **Sharing**    | 6     | Share and grant management                              |

### Test Suites

Tests are categorized into suites specified within the XML files:

- **`smoke`** — Critical path, minimal validation
- **`sanity`** — Basic functionality verification
- **`functional`** — Feature-level testing
- **`regression`** — Full regression coverage

---

## 6. Configuration

### `conf/global.properties` — Main Configuration

This is the primary configuration file controlling test execution. Key sections include:

| Section                  | Properties                                              |
|--------------------------|---------------------------------------------------------|
| **Server Connection**    | `zimbraServer.name`, `admin.uri`, `mailclient.uri`      |
| **Credentials**          | `admin.user`, `admin.password`, `defaultpassword.value` |
| **Domain**               | `defaultdomain.name`                                    |
| **Service Paths**        | `soapservice.path`, `restservlet.path`, SOAP/REST URIs  |
| **External Auth (AD)**   | `AD.url`, `AD.port`, `AD.domain`, AD accounts           |
| **External Auth (LDAP)** | `LDAP.url`, `LDAP.port`, LDAP accounts                  |
| **Data Paths**           | `soapxml.root`, `testMailRaw.root`                      |
| **Delays & Timeouts**    | `postfixdelay.msec`, `reindexdelay.msec`, STAF timeouts |
| **External Services**    | POP3/IMAP (Gmail, Yahoo, AOL), Exchange, feeds           |

### Configuration for Different Environments

- **`conf/global.properties`** — Default (FOSS local development)
- **`conf/global.properties.zimbrax`** — ZimbraX-specific overrides
- **`.circleci/global.properties`** — CI/CD environment overrides
- **`conf/skipped-tests.txt`** — Tests to skip in FOSS builds
- **`conf/skipped-tests-zimbrax.txt`** — Tests to skip in ZimbraX builds

---

## 7. Build System

The project uses **Apache Ant** with **Ivy** for dependency resolution. The build file is `build.xml`.

### Key Ant Targets

| Target                     | Description                                             |
|----------------------------|---------------------------------------------------------|
| `jar`                      | Compiles source and creates the main project JAR        |
| `staf-jar`                 | Builds all STAF service JARs (main target for deployment) |
| `build-soap-data-file`     | Packages test data into `soapdata.tar`                  |
| `build-testware`           | Full build: soap data + SMTP service + tools + compress |
| `Run-SoapTestCore`         | Execute SOAP tests without STAF (Ant-driven)            |
| `Run-SoapTestSanity`       | Execute sanity suite via Ant                            |
| `Execute_Tests`            | Generic test execution target (CI/CD entry point)       |
| `AuthExtension jar`        | Build custom auth extension JAR                         |
| `storemanager jar`         | Build store manager extension JAR                       |
| `ScalityHttpStore jar`     | Build Scality HTTP store extension JAR                  |
| `staf-inject`              | Build email injection STAF service JAR                  |
| `staf-importer`            | Build data importer STAF service JAR                    |
| `staf-results`             | Build results STAF service JAR                          |
| `staf-bugreports`          | Build bug reports STAF service JAR                      |
| `staf-nunit`               | Build NUnit STAF service JAR                            |
| `build-smtp-service-file`  | Package SMTP service files                              |
| `build-tools-setup`        | Package utility tools                                   |

### Build Commands

```bash
# Compile and create main JAR
ant jar

# Build all STAF service JARs
ant staf-jar

# Build test data package (soapdata.tar)
ant build-soap-data-file

# Full testware build
ant build-testware

# Run SOAP tests directly (non-STAF)
ant Run-SoapTestCore -DtestRoot=data/soapvalidator/ -DtestSuite=smoke

# Run specific test file
ant Run-SoapTestCore -DtestRoot=data/soapvalidator/Admin/Auth/AdminAuth_basic.xml -DtestSuite=smoke -DtestRootOption=f
```

---

## 8. Dependencies

### Zimbra Internal Dependencies (via Ivy)

| Module          | Description                           |
|-----------------|---------------------------------------|
| `zm-common`     | Zimbra common libraries               |
| `zm-native`     | Native platform libraries             |
| `zm-soap`       | Zimbra SOAP protocol library          |
| `zm-client`     | Zimbra client library                 |
| `zm-store`      | Zimbra store/mailbox library          |
| `zm-ews-stub`   | Exchange Web Services stub            |

### Required Sibling Repositories

The build expects these repositories cloned as siblings:

```
parent-directory/
├── zm-soap-harness/        # This repository
├── zm-zcs/                 # Zimbra build system (ant-global.xml)
├── zm-mailbox/             # Zimbra mailbox (generates dependencies)
└── zimbra-package-stub/    # Zimbra package stubs
```

### Notable Third-Party Dependencies

| Library                     | Purpose                       |
|-----------------------------|-------------------------------|
| Apache HttpComponents 4.5.x | HTTP client for SOAP calls    |
| dom4j 1.5.2                 | XML parsing and manipulation  |
| Log4j 1.2.16                | Logging framework             |
| TestNG 6.x                  | Test framework                |
| JSTAF 3.4.4                 | STAF Java bindings            |
| UnboundID LDAP SDK 2.3.5    | LDAP authentication testing   |
| iCal4j 0.9.16               | Calendar data processing      |
| Guava 23.0                  | Google core libraries         |
| Jackson 1.9.2 / 2.8.6       | JSON processing               |
| Jetty 9.3.5                 | Embedded web server           |
| Bouncy Castle 1.46           | Cryptography                  |
| PostgreSQL JDBC 9.1          | Results storage               |

---

## 9. CI/CD Pipeline

The project uses **CircleCI 2.1** for continuous integration, defined in `.circleci/config.yml`.

### Pipeline Architecture

```
┌─────────────────────┐
│ setup_prerequisites  │  Clone repos, build dependencies, package test data
└──────────┬──────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────┐
│ Approval │  │ Approval │   Manual approval gates
│ (Sanity) │  │ (Smoke)  │
└────┬─────┘  └────┬─────┘
     ▼             ▼
┌─────────┐  ┌──────────┐
│ Sanity  │  │  Smoke   │   Test execution
│ Tests   │  │  Tests   │
└─────────┘  └──────────┘
```

### Workflows

1. **`commit_branch_workflow`** — Triggered on branch commits; includes both sanity and smoke test suites behind manual approval gates.
2. **`develop_workflow`** — Triggered on develop branch; includes smoke tests behind manual approval.

### Environment

- **Docker Image:** `circleci/openjdk:8u171-jdk`
- **Default Test Host:** `ec2-35-154-223-151.ap-south-1.compute.amazonaws.com`
- **Default Branch:** `develop`

---

## 10. Test Execution

### Method 1: Via STAF (Windows — Full Setup)

1. Start STAF service and configure trust levels
2. Register STAF services (SOAP, LOG, INJECT)
3. Configure `conf/global.properties` with target server
4. Execute via STAF command:

```bash
# Single test
STAF LOCAL soap EXECUTE <server> ZIMBRAQAROOT <harness-path> DIRECTORY <test-xml> LOG C:\ SUITE SMOKE

# All smoke tests
STAF LOCAL soap EXECUTE <server> ZIMBRAQAROOT <harness-path> DIRECTORY <harness-path>/data/soapvalidator/ LOG C:\ SUITE SMOKE
```

### Method 2: Via Ant (Non-STAF — Simpler)

```bash
# Run smoke tests
ant Run-SoapTestCore -DtestRoot=data/soapvalidator/ -DtestSuite=smoke

# Run sanity tests
ant Run-SoapTestSanity

# Run specific test with custom suite
ant Execute_Tests -DtestRoot=data/soapvalidator/Admin/ -Dsuite=smoke
```

### Method 3: On Zimbra Server (Direct Deployment)

1. Copy `soapdata.tar` to server
2. Extract to `/opt/qa/`
3. Configure `/opt/qa/soapvalidator/conf/global.properties`
4. Register STAF services and execute

---

## 11. Key Files Reference

| File                              | Purpose                                                |
|-----------------------------------|--------------------------------------------------------|
| `build.xml`                       | Primary Ant build script (547 lines)                   |
| `ivy.xml`                         | Ivy dependency declarations (113 lines)                |
| `conf/global.properties`          | Main test configuration (251 lines)                    |
| `conf/STAF.cfg`                   | STAF service configuration                             |
| `conf/setup.sh`                   | Server environment setup                               |
| `.circleci/config.yml`            | CircleCI pipeline (125 lines)                          |
| `.github/CODEOWNERS`              | GitHub code ownership rules                            |
| `src/bin/runsoap.sh`              | Main SOAP test execution script (15KB)                 |
| `src/bin/runreports.sh`           | Test result report generation                          |
| `conf/skipped-tests.txt`          | Tests excluded from execution                          |
| `conf/skipped-tests-zimbrax.txt`  | ZimbraX-specific excluded tests                        |

---

*This document provides a high-level overview of the zm-soap-harness project. For detailed setup and execution instructions, see the [README.md](README.md).*
