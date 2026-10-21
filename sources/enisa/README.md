# ENISA Secure by Design and Default Playbooks

A practical collection of 22 Secure by Design and Secure by Default playbooks for SMEs, based on the *[ENISA Secure by Design and Default Playbook: A Practical Guide to Secure by Design and Default Principles for SMEs](https://www.enisa.europa.eu/sites/default/files/2026-07/ENISA_Secure_By_Design_and_Default_Playbook_v1.pdf)*.


## About

Secure by Design represents a fundamental shift in product security, embedding protective measures from conception rather than retrofitting them post-development. Secure by Default ensures products ship with the most secure configuration reasonably possible, reducing reliance on user expertise and limiting the potential for misconfiguration.

This repository provides a list of playbooks that aims to bridge the gap between aspirational security principles and practical implementation within SME constraints. It provides structured, easy-to-follow checklists that development teams can apply during design, build, deployment, maintenance, and decommissioning.

The guidance is intended as a practical starting point rather than an exhaustive or prescriptive implementation framework. Its application should be adapted to the product’s intended use, context and associated risks, as well as applicable requirements. It does not provide legal guidance.

## Playbook structure

Each playbook contains:

- Principle
- Objective
- Checklist
- Minimum evidence
- Release gate

## Playbooks


### Secure by Design
Secure by Design embeds protective measures into products during development, rather than adding them retrospectively. 
- **Architectural Foundations** — structural design choices that make a product inherently difficult to compromise or exploit.
- **Operational Integrity** — human and procedural practices that maintain product security throughout development, deployment, operation, and retirement.

| Architectural Foundations | Operational Integrity |
|---|---|
| • [Trust boundaries and threat modelling](playbooks/01-trust-boundaries-and-threat-modelling.md)<br>• [Least privilege](playbooks/02-least-privilege.md)<br>• [Strong identity and authentication architecture](playbooks/03-strong-identity-and-authentication-architecture.md)<br>• [Attack surface minimisation](playbooks/04-attack-surface-minimisation.md)<br>• [Defence in depth](playbooks/05-defence-in-depth.md)<br>• [Open design](playbooks/06-open-design.md) | • [Life-cycle management](playbooks/07-life-cycle-management.md)<br>• [User-centric design](playbooks/08-user-centric-design.md)<br>• [Secure coding and verification practices](playbooks/09-secure-coding-and-verification-practices.md)<br>• [Logging, monitoring and alerting](playbooks/10-logging-monitoring-and-alerting.md)<br>• [Configuration and change management](playbooks/11-configuration-and-change-management.md)<br>• [Incident response and recovery](playbooks/12-incident-response-and-recovery.md)<br>• [Vulnerability and patch management](playbooks/13-vulnerability-and-patch-management.md)<br>• [Supply-chain controls](playbooks/14-supply-chain-controls.md) |

### Secure by Default

Secure by Default ensures that products ship with the most secure configuration reasonably possible. 

- **Default Hardening** — the factory-shipped state of the software, ensuring that the initial configuration is as restrictive as possible. 
- **Guided Protection** — mandatory setup steps, automation, and clear feedback that help users maintain a secure state.

| Default Hardening | Guided Protection |
|---|---|
| • [Minimisation of default services](playbooks/15-minimisation-of-default-services.md)<br>• [Restrictive initial access](playbooks/16-restrictive-initial-access.md)<br>• [Secure communication by default](playbooks/17-secure-communication-by-default.md)<br>• [Unique device identity and secrets by default](playbooks/18-unique-device-identity-and-secrets-by-default.md) | • [Mandatory security onboarding](playbooks/19-mandatory-security-onboarding.md)<br>• [Automated maintenance and updates](playbooks/20-automated-maintenance-and-updates.md)<br>• [Transparent security posture](playbooks/21-transparent-security-posture.md)<br>• [Secure recovery and ownership life cycle](playbooks/22-secure-recovery-and-ownership-life-cycle.md) |


### How the playbooks fit together

Figure 1 shows the relationships between the product life cycle, Secure by Design and Secure by Default principles, and risk management activities.

Risk management activities establish the security context by clarifying important considerations, including what needs to be protected, the threats of concern and the acceptable level of residual risk given the product’s intended purpose and security impact. Secure by Design and Secure by Default principles translate this context into practical security decisions that are applied throughout the processes of the product life cycle, from requirements through to end of life.

![Secure by design and default across a product’s life cycle](assets/images/figure-1.png)

*Figure 1: Secure by design and default across a product’s life cycle.*

## Progressive adoption

The playbooks can be adopted progressively, beginning with context and prioritisation, followed by an appropriate engineering baseline and then broader implementation. Progressive adoption here refers to how organisations build and strengthen their security practices over time. It does not suggest delaying applicable requirements or controls, particularly those arising from legal obligations, including under the CRA. This guidance is without prejudice to such obligations, which take precedence.

| Stage | Example playbooks | Focus |
|---|---|---|
| **1. Establish context and priorities** | • [Trust boundaries and threat modelling](playbooks/01-trust-boundaries-and-threat-modelling.md) | Use product context, risk management and threat modelling to identify the most relevant threats, trust boundaries and security objectives. This guides the prioritisation and scope of the remaining playbooks. |
| **2. Establish a foundational engineering baseline** | • [Secure coding and verification practices](playbooks/09-secure-coding-and-verification-practices.md)<br>• [Logging, monitoring and alerting](playbooks/10-logging-monitoring-and-alerting.md)<br>• [Vulnerability and patch management](playbooks/13-vulnerability-and-patch-management.md)<br>• [Supply-chain controls](playbooks/14-supply-chain-controls.md)<br>• [Restrictive initial access](playbooks/16-restrictive-initial-access.md)<br>• [Secure communication by default](playbooks/17-secure-communication-by-default.md)<br>• [Unique device identity and secrets by default](playbooks/18-unique-device-identity-and-secrets-by-default.md)<br>• [Automated maintenance and updates](playbooks/20-automated-maintenance-and-updates.md) | Establish a baseline based on the product context, security objectives, and identified risks and threats. Supplement the core engineering controls with the Secure by Default playbooks relevant to the product. Other playbooks should also be prioritised where necessary to address the product context or identified risks and threats. |
| **3. Broaden and strengthen implementation** | • The remaining applicable playbooks | Implement and prioritise the remaining applicable playbooks according to the product context, intended use, deployment context and identified risks and threats. Increase coverage, consistency and automation over time, and assess progress using relevant measures. |

Depending on the product, other playbooks may need to be implemented during the foundational stage. For example, availability-sensitive products may require early implementation of [Incident response and recovery](playbooks/12-incident-response-and-recovery.md), while products supporting reset, ownership transfer or decommissioning may require [Secure recovery and ownership life cycle](playbooks/22-secure-recovery-and-ownership-life-cycle.md).

Progressive adoption may also apply within an individual playbook. Organisations can begin with checklist items addressing priority risks and applicable requirements, and strengthen coverage, evidence and automation over time.

The sequence is illustrative. Playbooks addressed later are not inherently less important, and applicable security or regulatory requirements may not be deferred.

## Intended audience

This guidance is intended for:

- Software developers and engineers
- Technical product managers
- SME security leads
- System architects

It is particularly relevant to SME manufacturers developing products with digital elements.

## Intended outcomes

Applying these playbooks is intended to contribute to:

- fewer recurring and preventable vulnerabilities;
- products delivered with safer default configurations and reduced unnecessary exposure;
- earlier identification and treatment of security risks;
- stronger visibility and protection of dependencies, build processes, releases and updates;
- faster detection, remediation and communication of vulnerabilities; and
- reduced likelihood and impact of cybersecurity incidents throughout the product lifecycle.

These outcomes benefit users and operators through safer and more resilient products. Manufacturers benefit through more consistent security decisions, while customers and integrators benefit through clearer and more traceable security evidence.
