---
name: Bug Report
about: Use this template to report bugs in the RefactorTrack application
title: "[Component] "
labels: ""
assignees: ""
---

## Bug Description
### Title
<!-- Provide a clear and concise title following the format: [Component] Brief description -->

### Description
<!-- Provide a detailed description of the bug -->

### Expected Behavior
<!-- Describe what should happen -->

### Actual Behavior
<!-- Describe what actually happens -->

### Steps to Reproduce
1. <!-- First step -->
2. <!-- Second step -->
3. <!-- Additional steps -->

### First Occurrence
<!-- When did you first notice this issue? (Date/Time) -->

### Frequency
- [ ] One-time occurrence
- [ ] Intermittent
- [ ] Consistent/Reproducible
- [ ] Under specific conditions

## Environment Details
### Service/Component Affected
<!-- Select all that apply -->
- [ ] Analytics Service
- [ ] Candidate Service
- [ ] CRM Service
- [ ] Requisition Service
- [ ] Gateway Service
- [ ] Web Application
- [ ] Infrastructure
- [ ] Security Components
- [ ] Monitoring Systems

### Environment Information
- Environment: <!-- Dev/Staging/Prod -->
- Browser/Client Version: <!-- If applicable -->
- API Version: <!-- If applicable -->
- Database Version: <!-- If applicable -->
- Infrastructure Region: <!-- e.g., AWS US-East-1 -->
- Deployment Version: <!-- Current version/commit hash -->

## Impact Assessment
### Severity Level
- [ ] Critical - System unavailable or data corruption
- [ ] High - Major functionality impacted
- [ ] Medium - Limited functionality impacted
- [ ] Low - Minor inconvenience

### Impact Details
- User Impact Description: <!-- How are users affected? -->
- Business Impact Metrics: <!-- Any measurable business impact -->
- Number of Users Affected: <!-- Approximate number -->
- Performance Degradation: <!-- If applicable -->
- Data Integrity Impact: <!-- Any data concerns -->
- Security Implications: <!-- Any security concerns -->

## Technical Details
### Error Information
```
<!-- Paste error messages here -->
```

### Stack Trace
```
<!-- Paste stack trace here -->
```

### Log Snippets
```
<!-- Paste relevant log entries -->
```

### Monitoring Data
- DataDog Alert ID: <!-- If applicable -->
- ELK Stack Query: <!-- If applicable -->
- Splunk Query: <!-- If applicable -->

### Security Scan Results
- Snyk Scan: <!-- If security-related -->
- SonarQube Results: <!-- If code-related -->
- GuardDuty Findings: <!-- If AWS security-related -->

### Screenshots/Videos
<!-- Attach or link to relevant visual evidence -->

## Additional Context
### Related Issues
<!-- Link to related GitHub issues -->

### Temporary Workarounds
<!-- Document any temporary solutions -->

### Historical Context
<!-- Any relevant history or previous occurrences -->

### Additional Notes
<!-- Any other relevant information -->

---
<!-- Auto-generated section -->
**SLA Tracking**
- Time Reported: {{ date }}
- Target Resolution: {{ date + SLA based on severity }}

**Auto-Labels**
/label {{ component-based-label }}
/label {{ severity-based-label }}
/assign {{ team-based-assignment }}