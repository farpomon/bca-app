# Incident Management & Notification Procedures

**Building Condition Assessment System**  
**City of [Municipality] - Vendor Agreement**  
**Version 1.0**  
**Date: December 2024**

---

## Executive Summary

This Incident Management and Notification Procedures document establishes the framework for identifying, responding to, and communicating security incidents and service degradations affecting the Building Condition Assessment (BCA) System. The document defines vendor obligations for timely notification, incident response procedures, communication protocols, and liability frameworks to protect City data and ensure service continuity.

The vendor commits to transparent and rapid incident communication with defined notification timelines based on incident severity. Security breaches involving City data trigger immediate notification within specified timeframes, with detailed incident reports and remediation plans provided to the City. Service degradations are communicated proactively with impact assessments and estimated resolution times.

Liability and financial penalty frameworks establish accountability for data breaches, wrongful disclosure, and service level agreement violations. These frameworks balance vendor responsibility with reasonable limitations while ensuring the City has recourse for significant incidents impacting municipal operations or data security.

---

## 1. Incident Classification

### 1.1 Incident Types

Incidents affecting the BCA system are classified into distinct categories requiring different response and notification procedures:

**Security Incidents**: Events that compromise or potentially compromise the confidentiality, integrity, or availability of City data or system resources. Security incidents include unauthorized access, data breaches, malware infections, denial-of-service attacks, and security control failures.

**Service Degradation**: Reduction in system performance, availability, or functionality that impacts user ability to conduct normal operations. Service degradations include slow response times, intermittent errors, partial feature unavailability, and capacity limitations.

**Data Incidents**: Events affecting City data including unauthorized disclosure, accidental deletion, data corruption, or data loss. Data incidents may overlap with security incidents when caused by malicious activity.

**Compliance Incidents**: Events that result in non-compliance with regulatory requirements, contractual obligations, or security standards. Compliance incidents include audit failures, policy violations, and regulatory reporting failures.

### 1.2 Severity Classification

All incidents are assigned a severity level determining response urgency and notification timelines:

| Severity | Definition | Examples | Notification Timeline |
|----------|------------|----------|----------------------|
| **Critical** | Complete system outage or confirmed data breach affecting sensitive City data | Database breach with data exfiltration, ransomware attack, complete system unavailability | **Immediate** (within 1 hour of detection) |
| **High** | Significant security compromise or major service degradation affecting multiple users | Unauthorized access attempt, partial data exposure, major feature unavailable | **4 hours** of detection |
| **Medium** | Limited security impact or moderate service degradation affecting subset of users | Vulnerability discovery, intermittent errors, performance degradation | **24 hours** of detection |
| **Low** | Minimal security or service impact with no immediate user effect | Minor configuration issue, cosmetic bugs, informational security alerts | **72 hours** or next business day |

**Severity Escalation**: Incidents may be escalated to higher severity if impact increases or additional information reveals greater scope. Severity escalation triggers updated notifications to the City.

**Severity Downgrade**: Incidents may be downgraded if investigation reveals lower impact than initially assessed. Downgrades are communicated with justification.

---

## 2. Security Breach Notification

### 2.1 Notification Triggers

Security breach notifications are triggered when any of the following conditions are confirmed or reasonably suspected:

**Unauthorized Access**: Any unauthorized access to City data, system infrastructure, or administrative functions. This includes both successful breaches and credible attempted breaches that demonstrate vulnerability.

**Data Exfiltration**: Any confirmed or suspected unauthorized copying, transmission, or removal of City data from system storage or during transmission.

**Malware or Ransomware**: Detection of malicious software on systems processing or storing City data, regardless of whether data was compromised.

**Credential Compromise**: Compromise of authentication credentials (passwords, API keys, certificates) that could enable unauthorized access to City data or systems.

**Insider Threat**: Malicious or negligent actions by vendor personnel resulting in unauthorized data access, modification, or disclosure.

**Third-Party Breach**: Security breach at third-party vendor or service provider that processes or stores City data on behalf of the BCA system.

**Vulnerability Exploitation**: Confirmed exploitation of security vulnerability resulting in unauthorized access or data exposure, even if no data loss is detected.

### 2.2 Notification Timeline

Security breach notifications follow strict timelines based on severity and regulatory requirements:

**Critical Breaches** (Confirmed data exfiltration, active ransomware, complete system compromise):
- **Initial Notification**: Within **1 hour** of breach detection
- **Detailed Report**: Within **24 hours** of breach detection
- **Remediation Plan**: Within **48 hours** of breach detection
- **Final Report**: Within **30 days** of breach resolution

**High Severity Breaches** (Unauthorized access, suspected data exposure, credential compromise):
- **Initial Notification**: Within **4 hours** of breach detection
- **Detailed Report**: Within **48 hours** of breach detection
- **Remediation Plan**: Within **72 hours** of breach detection
- **Final Report**: Within **30 days** of breach resolution

**Medium Severity Incidents** (Vulnerability discovery, attempted breach, minor exposure):
- **Initial Notification**: Within **24 hours** of incident detection
- **Detailed Report**: Within **5 business days** of incident detection
- **Remediation Plan**: Within **10 business days** of incident detection
- **Final Report**: Within **30 days** of incident resolution

**Timeline Calculation**: Notification timelines are calculated from the time of breach **detection**, not the time of breach occurrence. The vendor commits to detection capabilities that identify breaches within 24 hours of occurrence.

### 2.3 Notification Content

Security breach notifications include comprehensive information to enable City assessment and response:

**Initial Notification** (Immediate, within timeline):
- Date and time of breach detection
- Preliminary assessment of breach scope and impact
- Types of data potentially affected
- Number of records or users potentially impacted
- Immediate containment actions taken
- Ongoing investigation status
- Vendor contact information for questions
- Estimated timeline for detailed report

**Detailed Report** (Within 24-48 hours):
- Complete timeline of breach events
- Root cause analysis (preliminary if investigation ongoing)
- Confirmed scope of data accessed or exfiltrated
- Detailed list of affected data fields and records
- Assessment of data sensitivity and regulatory implications
- Containment and eradication actions completed
- Evidence preservation for potential legal proceedings
- Recommendations for City actions (e.g., user notifications, password resets)

**Remediation Plan** (Within 48-72 hours):
- Detailed remediation actions to prevent recurrence
- Timeline for implementing each remediation action
- Responsible parties for each action
- Validation and testing procedures
- Monitoring enhancements to detect similar breaches
- Third-party security assessment if applicable

**Final Report** (Within 30 days of resolution):
- Complete incident timeline from initial compromise to resolution
- Definitive root cause analysis
- Final confirmed scope of data compromise
- All remediation actions completed
- Validation of remediation effectiveness
- Lessons learned and process improvements
- Regulatory reporting compliance (if applicable)

### 2.4 Communication Channels

Security breach notifications use multiple communication channels to ensure receipt:

**Primary Channel - Email**:
- **City IT Security Manager**: [To be provided by City]
- **City IT Director**: [To be provided by City]
- **City Data Protection Officer**: [To be provided by City]
- **Vendor Security Contact**: security@manus.im

**Secondary Channel - Phone**:
- **24/7 Incident Hotline**: [To be established]
- **City IT Director Mobile**: [To be provided by City]
- **Vendor Incident Commander**: [To be provided]

**Tertiary Channel - Secure Portal**:
- Incident details posted to secure vendor-City portal
- Access restricted to authorized City personnel
- Encrypted document sharing for sensitive incident information

**Acknowledgment Requirement**: City must acknowledge receipt of critical and high severity notifications within 2 hours. If acknowledgment is not received, vendor escalates through secondary and tertiary channels.

---

## 3. Service Degradation Notification

### 3.1 Service Level Agreements

The BCA system operates under defined service level agreements establishing expected availability and performance:

**Availability SLA**: 99.5% monthly uptime
- Maximum allowable downtime: 3.6 hours per month
- Planned maintenance excluded from downtime calculation
- Partial outages weighted by percentage of users affected

**Performance SLA**: 95th percentile response time < 2 seconds
- Measured across all API endpoints
- Excludes large file uploads/downloads
- Measured from geographically diverse locations

**Support Response SLA**:
- Critical issues: Response within 15 minutes, resolution target 4 hours
- High issues: Response within 1 hour, resolution target 24 hours
- Medium issues: Response within 4 hours, resolution target 72 hours
- Low issues: Response within 24 hours, resolution target 10 business days

### 3.2 Degradation Thresholds

Service degradations triggering notification are defined by specific thresholds:

**Complete Outage**: System completely unavailable to all users
- **Notification**: Immediate (within 15 minutes)
- **Update Frequency**: Every 30 minutes until resolved

**Major Degradation**: System availability < 90% or response time > 5 seconds for > 50% of users
- **Notification**: Within 30 minutes
- **Update Frequency**: Every hour until resolved

**Moderate Degradation**: System availability 90-99% or response time 2-5 seconds for > 25% of users
- **Notification**: Within 2 hours
- **Update Frequency**: Every 4 hours until resolved

**Minor Degradation**: System availability 99-99.5% or response time 2-3 seconds for < 25% of users
- **Notification**: Within 4 hours
- **Update Frequency**: Daily until resolved

**Planned Maintenance**: Scheduled maintenance requiring system downtime
- **Notification**: Minimum 7 days advance notice
- **Approval**: City approval required for maintenance exceeding 2 hours

### 3.3 Degradation Notification Content

Service degradation notifications provide actionable information for City planning:

**Initial Notification**:
- Description of degradation (symptoms, affected functionality)
- Percentage of users affected
- Geographic scope (if applicable)
- Estimated impact on business operations
- Preliminary root cause (if known)
- Estimated time to resolution
- Workarounds available to users
- Vendor contact for questions

**Progress Updates**:
- Current status of degradation
- Diagnostic progress and findings
- Actions taken toward resolution
- Revised estimated time to resolution
- Any changes in scope or impact

**Resolution Notification**:
- Confirmation of service restoration
- Root cause summary
- Permanent fix implemented or temporary workaround
- Monitoring in place to detect recurrence
- Post-incident review timeline

### 3.4 Proactive Communication

The vendor commits to proactive communication beyond reactive incident notification:

**Monthly Service Reports**: Delivered by 5th business day of each month including:
- Uptime percentage and SLA compliance
- Performance metrics (response times, error rates)
- Incident summary (count by severity, resolution times)
- Capacity utilization and growth trends
- Upcoming maintenance and changes

**Quarterly Business Reviews**: In-person or virtual meetings including:
- Service performance review
- Major incidents and lessons learned
- Roadmap and upcoming features
- Capacity planning and scaling
- Security posture and improvements

**Advance Notice of Changes**: Minimum notice periods for system changes:
- Major features or architecture changes: 30 days
- Minor features or updates: 14 days
- Security patches: 48 hours (or immediate for critical vulnerabilities)
- Planned maintenance: 7 days

---

## 4. Incident Response Procedures

### 4.1 Security Breach Response

When a security breach is detected, the vendor executes a structured response process:

**Detection and Verification** (0-1 hour):
- Security monitoring systems detect potential breach
- On-call security engineer investigates alert
- Breach confirmed or dismissed as false positive
- Initial severity assessment
- Incident commander notified

**Containment** (1-4 hours):
- Isolate affected systems to prevent spread
- Revoke compromised credentials
- Block malicious IP addresses or accounts
- Preserve evidence for investigation
- Document all containment actions

**Notification** (Per timelines in Section 2.2):
- City notified via established channels
- Internal stakeholders notified
- Regulatory authorities notified if required
- Affected users notified if required by law

**Investigation** (4-48 hours):
- Forensic analysis of logs and system artifacts
- Determine breach timeline and entry point
- Identify data accessed or exfiltrated
- Assess attacker capabilities and objectives
- Engage third-party forensics if needed

**Eradication** (24-72 hours):
- Remove attacker access and persistence mechanisms
- Patch vulnerabilities exploited in breach
- Rebuild compromised systems from clean backups
- Implement additional security controls
- Verify attacker has been completely removed

**Recovery** (48-96 hours):
- Restore systems to normal operation
- Verify data integrity
- Monitor for signs of attacker return
- Gradually restore user access
- Validate security controls functioning

**Post-Incident Activities** (Ongoing):
- Detailed root cause analysis
- Lessons learned documentation
- Security improvements implementation
- User training on lessons learned
- Update incident response procedures

### 4.2 Service Degradation Response

Service degradations follow a parallel response process focused on rapid restoration:

**Detection** (0-15 minutes):
- Monitoring alerts detect performance degradation
- On-call engineer investigates and confirms
- Severity assessed based on user impact
- Incident commander notified for major degradations

**Diagnosis** (15-60 minutes):
- Review system metrics and logs
- Identify affected components
- Determine root cause or contributing factors
- Assess scope of impact

**Notification** (Per timelines in Section 3.2):
- City notified of degradation
- Status page updated
- Affected users notified if appropriate

**Mitigation** (30 minutes - 4 hours):
- Implement immediate workarounds
- Scale resources if capacity-related
- Rollback recent changes if applicable
- Route traffic around failed components
- Engage vendor support if third-party issue

**Resolution** (Variable):
- Implement permanent fix
- Verify service restored to normal levels
- Monitor for recurrence
- Document resolution steps

**Post-Incident Review** (Within 1 week):
- Root cause analysis
- Timeline documentation
- Preventive measures identified
- Action items assigned and tracked

### 4.3 Escalation Procedures

Incidents are escalated when initial response is insufficient or impact increases:

**Technical Escalation**:
- Level 1: On-call engineer (initial response)
- Level 2: Senior engineer or architect (complex issues)
- Level 3: Engineering leadership (critical incidents)
- Level 4: External specialists or vendors (third-party issues)

**Management Escalation**:
- Operations Manager: Incidents exceeding 2 hours
- IT Director: Critical incidents or data breaches
- Executive Leadership: Incidents with legal, regulatory, or reputational impact

**City Escalation**:
- City IT Manager: All critical and high severity incidents
- City IT Director: Data breaches or extended outages
- City Leadership: Incidents requiring public communication or legal action

**Escalation Triggers**:
- Incident duration exceeds expected resolution time by 50%
- Incident severity increases
- Multiple failed resolution attempts
- Additional systems or data affected
- Potential legal or regulatory implications identified

---

## 5. Liability and Financial Penalties

### 5.1 Vendor Liability Framework

The vendor accepts liability for damages resulting from security breaches, data loss, and service failures subject to the limitations defined in this section:

**Data Breach Liability**: The vendor is liable for damages resulting from unauthorized disclosure of City data caused by vendor negligence, failure to implement required security controls, or breach of contractual security obligations. Liability includes costs of breach notification, credit monitoring for affected individuals, regulatory fines, and reasonable legal expenses.

**Data Loss Liability**: The vendor is liable for damages resulting from permanent loss of City data that cannot be recovered from backups, provided the loss results from vendor negligence or failure to maintain required backup procedures. Liability includes costs of data reconstruction, business interruption, and regulatory penalties.

**Service Unavailability Liability**: The vendor is liable for financial penalties when system availability falls below contractual SLA thresholds, as detailed in Section 5.2. Penalties are calculated based on severity and duration of outages.

**Wrongful Disclosure Liability**: The vendor is liable for damages resulting from disclosure of City data to unauthorized parties, whether through malicious action, negligence, or failure to follow data handling procedures. This includes disclosure to other vendor clients, third parties, or public exposure.

### 5.2 Service Level Agreement Penalties

Financial penalties apply when the vendor fails to meet defined service level agreements:

**Availability SLA Penalties**:

| Monthly Uptime | SLA Compliance | Financial Penalty |
|----------------|----------------|-------------------|
| ≥ 99.5% | Met | No penalty |
| 99.0% - 99.5% | Minor violation | 5% of monthly service fee |
| 98.0% - 99.0% | Moderate violation | 10% of monthly service fee |
| 95.0% - 98.0% | Major violation | 25% of monthly service fee |
| < 95.0% | Critical violation | 50% of monthly service fee + termination right |

**Calculation Method**: Uptime is calculated as (Total Minutes in Month - Downtime Minutes) / Total Minutes in Month. Planned maintenance with 7+ days notice is excluded from downtime calculation.

**Performance SLA Penalties**:

| 95th Percentile Response Time | SLA Compliance | Financial Penalty |
|-------------------------------|----------------|-------------------|
| < 2 seconds | Met | No penalty |
| 2-3 seconds | Minor violation | 3% of monthly service fee |
| 3-5 seconds | Moderate violation | 7% of monthly service fee |
| > 5 seconds | Major violation | 15% of monthly service fee |

**Support Response SLA Penalties**:

| Severity | Target Response Time | Penalty for Missed Response |
|----------|---------------------|----------------------------|
| Critical | 15 minutes | $500 per incident |
| High | 1 hour | $250 per incident |
| Medium | 4 hours | $100 per incident |
| Low | 24 hours | $50 per incident |

**Penalty Caps**: Total SLA penalties in any calendar month are capped at 100% of that month's service fee. Penalties exceeding the cap may trigger contract termination rights for the City.

**Penalty Application**: Penalties are automatically applied as credits to the following month's invoice. The City is not required to request penalty application - the vendor proactively calculates and applies penalties based on service metrics.

### 5.3 Data Breach Penalties

Financial penalties and liability for data breaches are tiered based on breach severity and data sensitivity:

**Minor Data Breach** (< 100 records, non-sensitive data, no regulatory reporting required):
- **Financial Penalty**: $5,000 - $25,000
- **Vendor Liability**: Direct costs of breach notification and investigation
- **Liability Cap**: $100,000

**Moderate Data Breach** (100-1,000 records, moderately sensitive data, regulatory reporting required):
- **Financial Penalty**: $25,000 - $100,000
- **Vendor Liability**: Breach notification, credit monitoring, regulatory fines, legal expenses
- **Liability Cap**: $500,000

**Major Data Breach** (1,000-10,000 records, sensitive data, significant regulatory implications):
- **Financial Penalty**: $100,000 - $500,000
- **Vendor Liability**: All breach-related costs including notification, monitoring, fines, legal fees, business interruption
- **Liability Cap**: $2,000,000

**Critical Data Breach** (> 10,000 records, highly sensitive data, major regulatory and reputational impact):
- **Financial Penalty**: $500,000 - $2,000,000
- **Vendor Liability**: All breach-related costs without limitation
- **Liability Cap**: No cap for gross negligence or willful misconduct

**Aggravating Factors**: Penalties are increased by 50-100% if breach involves:
- Failure to implement required security controls
- Delayed notification beyond contractual timelines
- Repeated breaches of similar nature
- Gross negligence or willful misconduct
- False or misleading breach notifications

**Mitigating Factors**: Penalties may be reduced by 25-50% if:
- Breach detected and contained within 4 hours
- No evidence of data exfiltration
- Exemplary incident response and communication
- Proactive security improvements implemented

### 5.4 Liability Limitations

While the vendor accepts significant liability for breaches and failures, certain limitations apply:

**Force Majeure**: The vendor is not liable for failures caused by events beyond reasonable control including natural disasters, war, terrorism, pandemics, government actions, or infrastructure failures affecting multiple vendors (e.g., regional internet outage, cloud provider failure).

**Third-Party Actions**: Vendor liability for breaches caused by third-party actions (e.g., sophisticated nation-state attacks, zero-day exploits) is limited to demonstrating reasonable security practices were in place. The vendor is not liable for damages if security controls met industry standards at the time of breach.

**City Actions**: The vendor is not liable for breaches or data loss resulting from City actions including unauthorized system modifications, failure to apply security patches to City-controlled systems, or disclosure of credentials to unauthorized parties.

**Consequential Damages**: Vendor liability for indirect, consequential, or punitive damages (e.g., lost profits, reputational harm, business opportunity loss) is limited to 3x annual contract value, except in cases of gross negligence or willful misconduct.

**Total Liability Cap**: Total vendor liability for all claims in any 12-month period is capped at $5,000,000, except for:
- Gross negligence or willful misconduct (no cap)
- Breach of confidentiality obligations (cap of $10,000,000)
- Violations of applicable law (no cap)

### 5.5 Insurance Requirements

The vendor maintains insurance coverage to support liability obligations:

**Cyber Liability Insurance**: Minimum $5,000,000 coverage including:
- Data breach response costs
- Regulatory fines and penalties
- Third-party liability claims
- Business interruption
- Cyber extortion

**Professional Liability Insurance** (Errors & Omissions): Minimum $2,000,000 coverage for professional services and technology failures.

**General Liability Insurance**: Minimum $2,000,000 coverage for bodily injury and property damage.

**Insurance Verification**: The vendor provides certificates of insurance to the City annually and upon request. The City is named as additional insured on all policies.

### 5.6 Indemnification

**Vendor Indemnification of City**: The vendor indemnifies and holds harmless the City from claims arising from:
- Vendor negligence or willful misconduct
- Breach of security obligations
- Unauthorized disclosure of City data
- Infringement of third-party intellectual property rights
- Violation of applicable laws or regulations

**City Indemnification of Vendor**: The City indemnifies the vendor from claims arising from:
- City's use of the system in violation of terms of service
- City-provided content or data
- City's failure to follow vendor security recommendations
- Claims by City employees or third parties related to City's business operations

**Indemnification Process**: The indemnified party must promptly notify the indemnifying party of claims, cooperate in defense, and allow the indemnifying party to control defense and settlement (subject to approval for settlements affecting indemnified party).

---

## 6. Regulatory and Legal Compliance

### 6.1 Breach Notification Laws

The vendor complies with applicable data breach notification laws including:

**Canadian Privacy Laws**: Personal Information Protection and Electronic Documents Act (PIPEDA) requires notification of privacy breaches involving significant harm. The vendor notifies the Privacy Commissioner of Canada and affected individuals as required.

**Provincial Privacy Laws**: Compliance with applicable provincial privacy legislation in the jurisdiction where the City operates.

**Municipal Requirements**: Compliance with City-specific data protection and breach notification policies.

**Notification Coordination**: The vendor coordinates with City legal counsel to ensure breach notifications meet all applicable legal requirements and protect City legal interests.

### 6.2 Regulatory Reporting

The vendor assists the City with regulatory reporting obligations:

**Incident Reports**: Providing detailed incident information for City regulatory filings including timeline, scope, root cause, and remediation.

**Compliance Audits**: Cooperating with regulatory audits and providing documentation of security controls, incident response, and compliance measures.

**Legal Discovery**: Preserving evidence and providing documentation for legal proceedings related to incidents, subject to appropriate legal process.

### 6.3 Data Protection Obligations

The vendor's data protection obligations include:

**Data Minimization**: Collecting and retaining only City data necessary for system operation and contractual obligations.

**Purpose Limitation**: Using City data only for purposes specified in the contract and not for vendor's own purposes or third-party purposes without City consent.

**Data Retention**: Retaining City data only for required retention periods and securely deleting data upon contract termination or City request.

**Data Portability**: Providing City data in standard formats upon request to facilitate migration to alternate systems.

**Data Sovereignty**: Storing and processing City data within Canada unless City explicitly approves cross-border data transfers.

---

## 7. Dispute Resolution

### 7.1 Escalation Process

Disputes regarding incidents, liability, or penalties follow a structured escalation process:

**Level 1 - Operational Discussion** (Days 1-5):
- Vendor account manager and City IT manager discuss dispute
- Review incident facts and contractual obligations
- Attempt to reach mutual agreement

**Level 2 - Management Review** (Days 6-15):
- Vendor IT director and City IT director review dispute
- Consider precedents and industry standards
- Propose compromise solutions

**Level 3 - Executive Negotiation** (Days 16-30):
- Vendor executive leadership and City senior management negotiate
- Engage legal counsel if needed
- Final attempt at negotiated resolution

**Level 4 - Mediation** (Days 31-60):
- Engage neutral third-party mediator
- Non-binding mediation process
- Mediator facilitates compromise

**Level 5 - Arbitration or Litigation** (Days 61+):
- Binding arbitration or court proceedings
- Formal legal process
- Final resolution

### 7.2 Penalty Disputes

Disputes regarding SLA penalties or breach penalties follow specific procedures:

**Penalty Calculation Transparency**: The vendor provides detailed calculations of penalties including:
- Metrics used (uptime percentage, response times, etc.)
- Measurement methodology
- Raw data supporting calculations
- Penalty formula application

**Dispute Period**: The City has 30 days from penalty notification to dispute calculations. Disputes must specify the basis for disagreement and provide supporting evidence.

**Independent Verification**: For disputes exceeding $10,000, either party may request independent third-party verification of metrics and calculations. Verification costs are split equally unless verification finds significant error (> 10%), in which case the party in error pays full costs.

**Interim Payment**: Undisputed portions of penalties are paid while disputes are resolved. Disputed amounts are held in escrow or paid subject to refund if dispute is resolved in vendor's favor.

---

## 8. Continuous Improvement

### 8.1 Incident Trend Analysis

The vendor conducts quarterly analysis of incident trends to identify systemic issues:

**Metrics Analyzed**:
- Incident count by type and severity
- Mean time to detect (MTTD) incidents
- Mean time to respond (MTTR) to incidents
- Root cause distribution
- Repeat incidents

**Improvement Actions**: Trends indicating systemic issues trigger:
- Root cause analysis of incident patterns
- Security control enhancements
- Process improvements
- Additional training
- Architecture changes

**Reporting**: Trend analysis is included in quarterly business reviews with the City.

### 8.2 Lessons Learned

Each significant incident generates lessons learned documentation:

**What Went Well**: Effective aspects of incident response to reinforce and replicate.

**What Could Be Improved**: Gaps, delays, or inefficiencies in incident response requiring improvement.

**Action Items**: Specific improvements with owners and deadlines.

**Knowledge Sharing**: Lessons learned are shared with operations team, incorporated into training, and used to update procedures.

### 8.3 Procedure Updates

Incident management procedures are updated based on:
- Lessons learned from incidents
- Changes in regulatory requirements
- Industry best practices evolution
- City feedback and requirements
- Technology and architecture changes

**Update Frequency**: Procedures are reviewed quarterly and updated as needed. Major updates are communicated to the City with 30 days notice.

---

## 9. Contact Information

### 9.1 Incident Notification Contacts

**Vendor Incident Notification**:
- **24/7 Incident Hotline**: [To be established]
- **Email**: incidents@manus.im
- **Secure Portal**: [URL to be provided]
- **Incident Commander**: [Contact to be provided]

**City Incident Notification**:
- **City IT Security Manager**: [To be provided by City]
- **City IT Director**: [To be provided by City]
- **City Data Protection Officer**: [To be provided by City]
- **City Legal Counsel**: [To be provided by City]

### 9.2 Escalation Contacts

**Vendor Escalation**:
- **Operations Manager**: [To be provided]
- **IT Director**: [To be provided]
- **Chief Technology Officer**: [To be provided]
- **Legal Counsel**: [To be provided]

**City Escalation**:
- **IT Director**: [To be provided by City]
- **Chief Information Officer**: [To be provided by City]
- **City Manager**: [To be provided by City]
- **Legal Department**: [To be provided by City]

---

## 10. Appendices

### Appendix A: Incident Notification Template

```
INCIDENT NOTIFICATION

Incident ID: [Unique identifier]
Severity: [Critical/High/Medium/Low]
Type: [Security Breach/Service Degradation/Data Incident/Compliance]
Detection Time: [Date/Time]
Notification Time: [Date/Time]

SUMMARY:
[Brief description of incident]

IMPACT:
- Users Affected: [Number or percentage]
- Data Affected: [Type and volume]
- Services Affected: [List of affected functionality]
- Business Impact: [Description of operational impact]

CURRENT STATUS:
[Description of current situation]

ACTIONS TAKEN:
[Summary of containment and response actions]

NEXT STEPS:
[Planned actions and timeline]

ESTIMATED RESOLUTION:
[Expected resolution time or "Under investigation"]

VENDOR CONTACT:
[Name, phone, email of incident commander]

NEXT UPDATE:
[Scheduled time for next update]
```

### Appendix B: Post-Incident Report Template

```
POST-INCIDENT REPORT

Incident ID: [Unique identifier]
Severity: [Critical/High/Medium/Low]
Type: [Security Breach/Service Degradation/Data Incident/Compliance]
Date Range: [Start date/time - End date/time]
Duration: [Total duration]

EXECUTIVE SUMMARY:
[High-level overview for non-technical stakeholders]

INCIDENT TIMELINE:
[Chronological sequence of events from initial compromise/failure through resolution]

ROOT CAUSE:
[Detailed technical explanation of underlying cause]

IMPACT ASSESSMENT:
- Users Affected: [Final count]
- Data Affected: [Confirmed scope]
- Financial Impact: [Estimated costs]
- Regulatory Impact: [Reporting requirements, fines]

RESPONSE ACTIONS:
[Detailed description of containment, eradication, recovery actions]

DATA BREACH SPECIFICS (if applicable):
- Data Types Compromised: [List]
- Records Affected: [Count]
- Exfiltration Confirmed: [Yes/No]
- Regulatory Notification Required: [Yes/No]
- User Notification Required: [Yes/No]

REMEDIATION COMPLETED:
[List of permanent fixes implemented]

PREVENTIVE MEASURES:
[Actions taken to prevent recurrence]

LESSONS LEARNED:
- What Went Well: [Positive aspects]
- What Could Be Improved: [Gaps identified]
- Action Items: [Improvements with owners and deadlines]

FINANCIAL IMPACT:
- SLA Penalties: [$Amount]
- Breach Penalties: [$Amount]
- Response Costs: [$Amount]
- Total: [$Amount]

PREPARED BY: [Name, Title]
DATE: [Date]
APPROVED BY: [Name, Title]
```

### Appendix C: Severity Assessment Matrix

| Factor | Critical | High | Medium | Low |
|--------|----------|------|--------|-----|
| **Data Exposure** | Confirmed exfiltration of sensitive data | Unauthorized access to sensitive data | Access to non-sensitive data | No data access |
| **User Impact** | All users unable to access system | > 50% users affected | 10-50% users affected | < 10% users affected |
| **Duration** | > 4 hours | 1-4 hours | 15 min - 1 hour | < 15 minutes |
| **Regulatory** | Mandatory reporting required | Potential reporting required | No reporting required | No reporting required |
| **Reputational** | Major public/media attention | Moderate stakeholder concern | Minor concern | No external impact |

**Assessment Method**: Incident severity is the highest severity level for which any factor applies. For example, if data exposure is High but user impact is Low, overall severity is High.

### Appendix D: Financial Penalty Calculation Examples

**Example 1 - Availability SLA Violation**:
- Monthly service fee: $10,000
- Uptime achieved: 98.5%
- SLA requirement: 99.5%
- Violation level: Moderate (98.0-99.0%)
- Penalty: 10% of monthly fee = $1,000

**Example 2 - Multiple SLA Violations**:
- Monthly service fee: $10,000
- Uptime: 98.8% → 10% penalty = $1,000
- Response time: 3.2 seconds → 7% penalty = $700
- Critical support response missed: $500
- Total penalties: $2,200 (22% of monthly fee)

**Example 3 - Data Breach Penalty**:
- Breach severity: Moderate (500 records, personal information)
- Base penalty: $50,000
- Aggravating factor: Delayed notification (2x multiplier)
- Total penalty: $100,000
- Plus: Actual costs of breach notification and credit monitoring

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Manus AI | Initial Incident Management and Notification Procedures |

**Distribution**: City IT Department, City Legal Department, Vendor Operations Team

**Classification**: Confidential - Contractual Document

**Next Review Date**: June 2025 (Semi-Annual Review)

**Approval**:
- Vendor Legal Counsel: _________________ Date: _______
- Vendor IT Director: _________________ Date: _______
- City IT Director: _________________ Date: _______
- City Legal Counsel: _________________ Date: _______
