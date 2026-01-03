# Security Architecture & Threat Protection

**Building Condition Assessment System**  
**Security Documentation for City IT Review**  
**Version 1.0**  
**Date: December 2024**

---

## Executive Summary

This document provides a comprehensive overview of the security architecture, threat protection mechanisms, multi-tenancy isolation, and vulnerability management processes implemented in the Building Condition Assessment (BCA) System. The system is designed to meet municipal cybersecurity requirements while maintaining high availability and data integrity.

The BCA system employs a defense-in-depth security strategy combining platform-level infrastructure security provided by the Manus hosting environment with application-level security controls. This layered approach ensures protection against cyber attacks, unauthorized access, and data breaches while maintaining compliance with government security standards.

---

## 1. Infrastructure Security & Threat Protection

### 1.1 Network Security Architecture

The BCA system is hosted on the Manus cloud platform, which provides enterprise-grade network security infrastructure. The platform implements multiple layers of network protection to defend against cyber attacks and unauthorized access.

**Network Segmentation**: The hosting infrastructure utilizes network segmentation to isolate different security zones. Application servers, database servers, and storage systems operate in separate network segments with controlled communication paths. This segmentation limits the blast radius of potential security incidents and prevents lateral movement by attackers.

**Firewall Protection**: Stateful firewalls protect all network boundaries, implementing strict ingress and egress filtering rules. Only necessary ports and protocols are permitted, following the principle of least privilege. Web traffic is restricted to HTTPS (port 443), and administrative access is limited to authorized IP ranges.

**DDoS Protection**: The platform employs distributed denial-of-service (DDoS) mitigation at the network edge. Traffic is analyzed in real-time to detect and block volumetric attacks, protocol attacks, and application-layer attacks. Rate limiting and traffic shaping ensure service availability during attack scenarios.

### 1.2 Intrusion Detection & Prevention

**Network Intrusion Detection System (NIDS)**: The hosting platform operates continuous network traffic monitoring to detect suspicious patterns and known attack signatures. The NIDS analyzes packet headers and payloads to identify reconnaissance activities, exploit attempts, and command-and-control communications.

**Web Application Firewall (WAF)**: All HTTP/HTTPS traffic passes through a web application firewall that inspects requests for common attack patterns including SQL injection, cross-site scripting (XSS), remote code execution, and path traversal attempts. The WAF operates in blocking mode, rejecting malicious requests before they reach the application.

**Intrusion Prevention System (IPS)**: When threats are detected, the IPS automatically blocks malicious traffic at the network perimeter. IP addresses exhibiting attack behavior are temporarily or permanently blacklisted based on threat severity. The system maintains threat intelligence feeds to stay current with emerging attack vectors.

### 1.3 Malware & Virus Protection

**Endpoint Protection**: All server infrastructure runs enterprise antivirus and anti-malware software with real-time scanning and automatic signature updates. File system activity is continuously monitored for malicious behavior patterns.

**File Upload Scanning**: User-uploaded files (photos, documents) are scanned for malware before storage. Files are quarantined during scanning and only released to storage after passing security checks. Supported file types are restricted through whitelist validation.

**Container Security**: The application runs in containerized environments with image scanning for known vulnerabilities. Only signed and verified container images are deployed to production. Container runtime security monitors for abnormal process behavior and unauthorized system calls.

---

## 2. Multi-Tenancy & Data Isolation

### 2.1 Logical Data Separation

The BCA system implements a multi-tenant architecture where multiple organizations (City departments, external contractors) share the same application infrastructure while maintaining complete data isolation. This approach provides cost efficiency while ensuring data privacy and security.

**Company-Based Isolation**: Every data record in the system is associated with a company identifier. All database queries automatically filter results by the authenticated user's company, preventing cross-tenant data access. This logical separation is enforced at the application layer through middleware that validates company ownership on every request.

**Database-Level Isolation**: The system uses row-level security policies in the database to enforce tenant isolation. Even if application-layer controls were bypassed, database queries cannot retrieve data belonging to other tenants. Each query includes mandatory company predicates that the database engine validates.

**Storage Isolation**: File storage (photos, documents) uses tenant-specific prefixes in object storage keys. The storage access control system prevents one tenant from accessing another tenant's files even if they discover the storage key. Presigned URLs include tenant validation to ensure authorized access.

### 2.2 Network Traffic Isolation

**Virtual Private Cloud (VPC)**: The hosting platform operates within isolated virtual private clouds with dedicated IP address spaces. Network traffic between tenants is logically separated through software-defined networking.

**TLS Encryption**: All network traffic is encrypted using Transport Layer Security (TLS) 1.3. This includes client-to-server communication (HTTPS), server-to-database connections, and server-to-storage connections. Encryption prevents network eavesdropping and man-in-the-middle attacks.

**Session Isolation**: User sessions are cryptographically isolated using secure session tokens. Session data is stored server-side with unique identifiers that cannot be guessed or forged. Session cookies include security flags (HttpOnly, Secure, SameSite) to prevent theft and cross-site attacks.

### 2.3 Administrative Isolation

**Tenant Administrators**: Each organization has designated administrators who can manage users and settings within their tenant. Administrators cannot view or modify data belonging to other tenants. The system enforces strict role-based access control to prevent privilege escalation.

**Platform Administrators**: System-level administrators (Manus platform operators) have access to infrastructure for maintenance and support purposes. Platform administrators operate under strict access controls with all activities logged for audit purposes. Administrative access requires multi-factor authentication and is granted on a time-limited basis.

---

## 3. Application Security Controls

### 3.1 Authentication & Access Control

**Multi-Factor Authentication Support**: The system supports integration with enterprise identity providers through SAML 2.0, enabling single sign-on (SSO) with the City's Active Directory. This allows the City to enforce its own authentication policies including multi-factor authentication requirements.

**Role-Based Access Control (RBAC)**: Users are assigned roles (Viewer, Editor, Project Manager, Admin) that determine their permissions. Roles define granular access rights including read-only access, read-write access, project management capabilities, and administrative functions. Permission checks occur on every API request to ensure authorization.

**Session Management**: User sessions expire after periods of inactivity to limit exposure from unattended workstations. Session tokens are rotated periodically to prevent session fixation attacks. Users can explicitly log out to invalidate their session immediately.

### 3.2 Input Validation & Sanitization

**SQL Injection Prevention**: The application uses parameterized queries through the Drizzle ORM framework, which prevents SQL injection attacks by separating SQL code from user input. User-provided data is never concatenated directly into SQL statements.

**Cross-Site Scripting (XSS) Prevention**: All user input is sanitized before storage and escaped before rendering in web pages. The application implements Content Security Policy (CSP) headers to restrict execution of inline scripts and limit resource loading to trusted domains.

**Command Injection Prevention**: The application avoids executing system commands with user-provided input. When external processes are necessary, input is strictly validated against whitelists and passed through secure APIs that prevent shell interpretation.

**File Upload Validation**: File uploads are restricted by type (whitelist of allowed MIME types), size (10MB maximum), and content validation. File names are sanitized to prevent path traversal attacks. Uploaded files are stored with randomized names to prevent predictable URLs.

### 3.3 Security Headers

The application implements security headers on all HTTP responses to provide defense-in-depth protection:

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Forces HTTPS connections for one year |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline' | Restricts resource loading to same origin |
| X-Frame-Options | DENY | Prevents clickjacking attacks |
| X-Content-Type-Options | nosniff | Prevents MIME type sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Limits referrer information leakage |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | Restricts browser feature access |

### 3.4 Rate Limiting & Abuse Prevention

**API Rate Limiting**: All API endpoints implement rate limiting to prevent abuse and denial-of-service attacks. Limits are enforced per user and per IP address. Excessive requests result in temporary blocking with exponential backoff.

**Login Attempt Limiting**: Failed authentication attempts are tracked and limited to prevent brute-force attacks. After multiple failed attempts, accounts are temporarily locked and administrators are notified. IP addresses exhibiting attack patterns are blocked.

**Resource Quotas**: Each tenant has resource quotas for storage, API requests, and concurrent users. Quotas prevent resource exhaustion attacks and ensure fair resource allocation among tenants.

---

## 4. Data Protection & Encryption

### 4.1 Encryption in Transit

All data transmitted over networks is encrypted using industry-standard protocols:

**TLS 1.3 Encryption**: Client connections use TLS 1.3 with strong cipher suites (AES-256-GCM, ChaCha20-Poly1305). Weak ciphers and deprecated protocols (SSL, TLS 1.0, TLS 1.1) are disabled. Perfect forward secrecy ensures that past communications remain secure even if encryption keys are compromised in the future.

**Certificate Management**: TLS certificates are issued by trusted certificate authorities and automatically renewed before expiration. Certificate pinning prevents man-in-the-middle attacks using fraudulent certificates.

### 4.2 Encryption at Rest

Data stored in databases and file systems is encrypted at rest to protect against physical theft and unauthorized access:

**Database Encryption**: The MySQL/TiDB database uses transparent data encryption (TDE) with AES-256 encryption. Encryption keys are managed by the platform's key management service and rotated periodically. Database backups are also encrypted.

**Object Storage Encryption**: Files stored in S3-compatible object storage are encrypted using server-side encryption with AES-256. Each object is encrypted with a unique data key, and data keys are encrypted with master keys managed by the key management service.

**Encryption Key Management**: Encryption keys are stored in a hardware security module (HSM) or cloud key management service. Keys are never stored alongside encrypted data. Access to keys requires authentication and is logged for audit purposes.

### 4.3 Data Ownership & Sovereignty

**City Data Ownership**: All data entered into the BCA system by City employees remains the property of the City. The vendor (Manus) does not claim ownership of customer data and uses it only for providing the contracted services.

**Data Location**: Data is stored in Canadian data centers to comply with data residency requirements. The City can request confirmation of data location at any time. Data is not transferred outside Canada without explicit City approval.

**Data Portability**: The City can export all its data in standard formats (JSON, CSV) at any time. Data export functions are available to administrators and do not require vendor assistance.

---

## 5. Audit Logging & Security Monitoring

### 5.1 Comprehensive Audit Trails

The system maintains detailed audit logs of all security-relevant events to support forensic investigation and compliance auditing:

**Authentication Events**: All login attempts (successful and unsuccessful) are logged with username, timestamp, IP address, user agent, and authentication method (SAML, OAuth). Failed login attempts include the reason for failure. Session timeout and logout events are also logged.

**Authorization Events**: All access control decisions are logged, including permission checks, role changes, and privilege escalation attempts. Logs record which user attempted which action on which resource and whether access was granted or denied.

**Data Modification Events**: All create, update, and delete operations are logged with before/after values. Logs include the user who made the change, timestamp, IP address, and affected records. This provides a complete audit trail of data changes for compliance and forensic purposes.

**Configuration Changes**: All system configuration changes are logged, including user role changes, permission modifications, SAML configuration updates, and data retention policy changes. Configuration audit logs are immutable and cannot be modified or deleted.

**Security Events**: Suspicious activities are logged and flagged for administrator review. This includes multiple failed login attempts, rate limit violations, SQL injection attempts, XSS attempts, and unusual access patterns.

### 5.2 Log Retention & Protection

**Retention Period**: Audit logs are retained for seven years to meet municipal compliance requirements. Logs older than seven years are securely deleted unless legal hold requirements mandate longer retention.

**Log Integrity**: Audit logs are append-only and cannot be modified or deleted by users or administrators. Log integrity is protected through cryptographic hashing and digital signatures. Any tampering with logs is immediately detectable.

**Log Storage**: Logs are stored separately from application data in dedicated log storage systems. Log storage is replicated across multiple availability zones for durability. Logs are encrypted at rest and in transit.

### 5.3 Security Monitoring & Alerting

**Real-Time Monitoring**: Security events are monitored in real-time by automated systems that detect anomalies and attack patterns. Alerts are generated for high-severity events such as multiple failed logins, privilege escalation attempts, and data exfiltration indicators.

**Administrator Notifications**: Security alerts are sent to designated administrators via email and in-app notifications. Alerts include event details, severity level, and recommended actions. Administrators can acknowledge alerts and document their response.

**Security Dashboards**: Administrators have access to security dashboards showing authentication statistics, failed login attempts, rate limit violations, and other security metrics. Dashboards provide visibility into the security posture of the system.

---

## 6. Vulnerability Management

### 6.1 Vulnerability Scanning

**Regular Scanning**: The hosting platform conducts automated vulnerability scans on a weekly basis. Scans cover network infrastructure, operating systems, application dependencies, and web application security. Scan results are reviewed by security personnel and prioritized for remediation.

**Dependency Scanning**: Application dependencies (npm packages, system libraries) are continuously monitored for known vulnerabilities using automated tools. Security advisories are reviewed daily, and critical vulnerabilities are patched within 24 hours of disclosure.

**Container Image Scanning**: Container images are scanned for vulnerabilities before deployment. Images with high-severity vulnerabilities are blocked from production deployment. Base images are regularly updated to incorporate security patches.

### 6.2 Penetration Testing

**Annual Penetration Testing**: The vendor conducts annual penetration testing by qualified third-party security firms. Testing covers network security, application security, and social engineering. Penetration test reports are provided to the City upon request.

**Scope of Testing**: Penetration testing includes external network penetration testing, web application penetration testing, API security testing, and authentication/authorization testing. Testing follows industry-standard methodologies (OWASP, PTES).

**Remediation**: Vulnerabilities discovered during penetration testing are prioritized by severity and remediated according to the following timeline:
- **Critical vulnerabilities**: 7 days
- **High vulnerabilities**: 30 days
- **Medium vulnerabilities**: 90 days
- **Low vulnerabilities**: Next release cycle

### 6.3 City Vulnerability Assessment Rights

**City-Conducted Assessments**: The City reserves the right to conduct its own vulnerability assessments and penetration testing of the BCA system. The vendor will cooperate with City security personnel and provide necessary access and documentation.

**Assessment Coordination**: City-conducted assessments must be coordinated with the vendor to avoid disruption to production services. The City will provide advance notice (minimum 2 weeks) before conducting assessments. Testing should be conducted in non-production environments when possible.

**Vulnerability Disclosure**: The City should report any vulnerabilities discovered during assessments to the vendor's security team. The vendor commits to acknowledging vulnerability reports within 24 hours and providing remediation timelines within 72 hours.

### 6.4 Patch Management

**Security Patch Process**: Security patches are applied according to severity and risk assessment. Critical security patches are applied within 24-48 hours of availability. Non-critical patches are applied during scheduled maintenance windows.

**Change Management**: All security patches undergo change management review before deployment to production. Patches are tested in staging environments to verify functionality and compatibility. Rollback procedures are prepared before applying patches.

**Patch Notifications**: The City is notified of security patches that may affect system availability or functionality. Notifications include patch description, expected impact, and maintenance window schedule. Emergency patches may be applied with shorter notice periods.

---

## 7. Incident Response & Business Continuity

### 7.1 Security Incident Response Plan

**Incident Detection**: Security incidents are detected through automated monitoring, security alerts, user reports, and vulnerability disclosures. The security team maintains 24/7 on-call coverage for critical incident response.

**Incident Classification**: Security incidents are classified by severity (Critical, High, Medium, Low) based on impact to confidentiality, integrity, and availability. Classification determines response timelines and escalation procedures.

**Response Procedures**: The incident response plan follows industry-standard procedures:
1. **Detection & Analysis**: Identify and analyze the security incident
2. **Containment**: Isolate affected systems to prevent spread
3. **Eradication**: Remove the threat and close attack vectors
4. **Recovery**: Restore systems to normal operation
5. **Post-Incident Review**: Document lessons learned and improve defenses

**City Notification**: The City is notified of security incidents that affect City data or system availability. Notification occurs within 24 hours of incident detection for high-severity incidents and within 72 hours for lower-severity incidents. Notifications include incident description, impact assessment, and remediation status.

### 7.2 Backup & Disaster Recovery

**Backup Strategy**: The system implements automated daily backups of all data (database, file storage, configuration). Backups are encrypted and stored in geographically separate locations from production systems. Backup retention follows the 3-2-1 rule (3 copies, 2 media types, 1 offsite).

**Recovery Time Objective (RTO)**: The system is designed to recover from failures within 4 hours for most scenarios. Critical system components have failover capabilities for near-instantaneous recovery.

**Recovery Point Objective (RPO)**: The maximum acceptable data loss is 24 hours (one day of data). Database replication and transaction logging minimize actual data loss to minutes in most failure scenarios.

**Disaster Recovery Testing**: Disaster recovery procedures are tested quarterly to verify effectiveness. Tests include backup restoration, failover procedures, and communication protocols. Test results are documented and used to improve recovery procedures.

---

## 8. Compliance & Security Standards

### 8.1 Security Frameworks

The BCA system security architecture aligns with recognized security frameworks and standards:

**NIST Cybersecurity Framework**: The system implements controls aligned with the NIST CSF categories: Identify, Protect, Detect, Respond, and Recover. This framework provides a comprehensive approach to managing cybersecurity risk.

**OWASP Top 10**: The application is designed to mitigate the OWASP Top 10 web application security risks, including injection attacks, broken authentication, sensitive data exposure, and security misconfigurations.

**CIS Controls**: The infrastructure implements Critical Security Controls (CIS Controls) for cyber defense, including inventory management, secure configuration, access control, and continuous vulnerability management.

### 8.2 Privacy & Data Protection

**Privacy by Design**: The system implements privacy-protective features including data minimization (collecting only necessary data), purpose limitation (using data only for stated purposes), and user consent management.

**Freedom of Information and Protection of Privacy (FOIP)**: The system supports FOIP compliance through comprehensive audit logging, data access controls, and data export capabilities. Users can request copies of their data and request data deletion.

**Data Retention Policies**: The system implements configurable data retention policies allowing the City to define how long different types of data are retained. Expired data is automatically deleted or archived according to policy.

### 8.3 Third-Party Security

**Vendor Security Assessment**: Third-party service providers (hosting, authentication, storage) undergo security assessment before integration. Vendors must demonstrate appropriate security controls and provide security documentation.

**Dependency Management**: Application dependencies are tracked and monitored for security vulnerabilities. Dependencies with known vulnerabilities are updated or replaced. Unused dependencies are removed to reduce attack surface.

**Supply Chain Security**: The software development process includes security checks to prevent supply chain attacks. Code is reviewed for malicious content, and build processes are secured against tampering.

---

## 9. Security Governance

### 9.1 Security Policies

**Acceptable Use Policy**: Users must agree to acceptable use policies that prohibit malicious activities, unauthorized access attempts, and data misuse. Policy violations result in account suspension and investigation.

**Password Policy**: When local authentication is used (non-SSO), passwords must meet complexity requirements (minimum length, character diversity). Passwords expire periodically and cannot be reused.

**Access Review**: User access rights are reviewed quarterly to ensure users have appropriate permissions. Inactive accounts are disabled automatically after 90 days of inactivity.

### 9.2 Security Training

**Developer Security Training**: Development team members receive regular security training covering secure coding practices, common vulnerabilities, and security testing techniques.

**User Security Awareness**: End users receive security awareness training covering password security, phishing recognition, and data handling best practices. Training is provided during onboarding and annually thereafter.

### 9.3 Security Contacts

**Security Team Contact**: Security issues, vulnerability reports, and security questions should be directed to:
- **Email**: security@manus.im
- **Response Time**: 24 hours for critical issues, 72 hours for non-critical issues

**City Security Liaison**: The vendor will designate a security liaison to work with the City's IT security team. The liaison coordinates security assessments, incident response, and compliance activities.

---

## 10. Summary & Recommendations

The Building Condition Assessment System implements comprehensive security controls at infrastructure, network, application, and data layers. The multi-tenant architecture ensures complete data isolation between organizations while providing cost-effective shared infrastructure. Threat protection mechanisms including firewalls, intrusion detection, and DDoS mitigation defend against cyber attacks. Vulnerability management processes ensure timely identification and remediation of security weaknesses.

**Key Security Strengths**:
- Defense-in-depth architecture with multiple security layers
- Enterprise-grade infrastructure security provided by hosting platform
- Application-level security controls (authentication, authorization, input validation)
- Comprehensive audit logging for compliance and forensic investigation
- Regular vulnerability scanning and penetration testing
- Encrypted data in transit and at rest
- Multi-tenant data isolation with company-based access control

**Recommendations for City Deployment**:
1. **Enable SAML SSO**: Integrate with City Active Directory for centralized authentication and to enforce City security policies
2. **Conduct Security Assessment**: Perform City-led vulnerability assessment and penetration testing before production deployment
3. **Define Security Policies**: Establish City-specific security policies including password requirements, session timeouts, and data retention periods
4. **Designate Security Contacts**: Identify City security personnel to coordinate with vendor security team
5. **Review Audit Logs**: Establish procedures for regular review of audit logs and security alerts
6. **Test Incident Response**: Conduct tabletop exercises to test incident response procedures and communication protocols

This security architecture provides a strong foundation for protecting City data while maintaining system availability and usability. The vendor is committed to continuous security improvement and collaboration with City IT security personnel.

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Manus AI | Initial security architecture documentation |

**Distribution**: City IT Security Team, City Procurement, Vendor Security Team

**Classification**: Confidential - For City Internal Use

**Next Review Date**: June 2025
