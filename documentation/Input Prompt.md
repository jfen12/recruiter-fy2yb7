# **Product Requirements Document (PRD)**

### Product Name: RefactorTrack (Placeholder)

**Version**: 1.0  
**Owner**: \[CEO, Refactor Talent\]  
**Date**: \[Insert Date\]

----------

## **1. Purpose**

### **1.1 Overview**

RefactorTrack is an Applicant Tracking System (ATS) purpose-built for **technology recruiting and staffing agencies**. It addresses the specific workflows and needs of **recruiters** and **salespeople**, enabling efficient candidate management, job requisition tracking, client engagement, and performance monitoring.

### **1.2 Goals**

- **Streamline recruiter workflows**: Faster sourcing, screening, and placement of candidates.

- **Enable sales efficiency**: Manage client relationships, requisitions, and pipeline effectively.

- **Improve collaboration**: Bridge the gap between sales and recruiting teams.

- **Provide actionable insights**: Track key metrics to drive decisions (e.g., placement success, time-to-hire).

----------

## **2. Users and Personas**

### **2.1 Recruiters**

**Primary Goals**:

- Efficiently source, manage, and place candidates.

- Maintain candidate pipelines for multiple job requisitions.

- Communicate with candidates (e.g., outreach, interview scheduling).

- Collaborate with sales to understand client needs.

**Pain Points Solved**:

- Managing large volumes of candidates without duplication.

- Poor visibility into pipeline progress and candidate status.

- Lack of tools to track and optimize communication.

----------

### **2.2 Salespeople**

**Primary Goals**:

- Manage client relationships and job requisitions.

- Track client engagement, pipeline progress, and contracts.

- Collaborate with recruiters to align on priorities.

**Pain Points Solved**:

- Inefficient tracking of client requisitions.

- Limited visibility into recruiter progress and candidate status.

- Disjointed reporting on sales KPIs.

----------

## **3. Features**

The system will include **core features** that cater to the needs of both recruiters and salespeople.

### **3.1 Candidate Management** *(For Recruiters)*

- **Centralized Candidate Database**: Unified repository to store, tag, and search candidates.

- **Advanced Search Filters**: Search by skills, experience, location, rate, availability, and keywords.

- **Automated Parsing**: Extract data (name, email, skills, etc.) from resumes.

- **Status Tracking**: Customizable stages (e.g., sourced → interviewed → submitted → placed).

- **Duplicate Prevention**: Auto-detection and flagging of duplicate records.

- **Communication History**: Integrated email, text, and call logs tied to candidate profiles.

- **Interview Scheduling**: Integration with calendars for easy interview setup.

- **Task Management**: To-do lists and reminders for candidate follow-ups.

----------

### **3.2 Job Requisition Management** *(For Salespeople & Recruiters)*

- **Job Board**: Unified view of all active, pending, and closed requisitions.

- **Pipeline Status**: Real-time progress of recruiters against open roles.

- **Requisition Details**: Role specifics (title, skills, budget, client contact, submission deadline).

- **Prioritization Tags**: Ability to mark requisitions as urgent or priority.

----------

### **3.3 Client Relationship Management (CRM)** *(For Salespeople)*

- **Client Profiles**: Store client contact info, job requisitions, contract details, and communication logs.

- **Pipeline Tracking**: Track deals (open, pending, closed).

- **Engagement Logs**: Record outreach (emails, calls) and upcoming follow-ups.

- **Contract Management**: Upload and store client contracts with expiration reminders.

- **Revenue Tracking**: Associate job placements with revenue outcomes.

----------

### **3.4 Reporting and Analytics**

- **Recruiter Metrics**:

  - Time-to-source, time-to-submit, time-to-place.

  - Number of placements per recruiter.

  - Candidate pipeline conversion rates.

- **Sales Metrics**:

  - Requisitions won vs. lost.

  - Client engagement (calls, emails, meetings).

  - Revenue vs. target goals.

- **Candidate Source Insights**:

  - Identify top-performing sourcing channels (LinkedIn, job boards, referrals).

- **Custom Dashboards**: Tailor dashboards for recruiters, salespeople, and managers.

----------

### **3.5 Integration Capabilities**

- **Job Boards and Platforms**: LinkedIn, Indeed, Dice, Monster, and others.

- **Email**: Integration with Outlook, Gmail for communication tracking.

- **Calendars**: Sync with Google Calendar and Outlook.

- **Applicant Parsing Tools**: Tools like HireEZ or Textkernel.

- **CRM Systems**: Integration with existing CRMs (optional).

----------

### **3.6 Collaboration Tools**

- **Notes and Feedback**: Ability for recruiters and sales to leave comments on candidate profiles.

- **Shared Pipelines**: Real-time visibility into role progress for both teams.

- **Alerts and Notifications**: Updates on candidate activity, job changes, or upcoming deadlines.

----------

## **4. Design Requirements**

- **User-Friendly Interface**:

  - Minimal clicks to access candidate or job data.

  - Separate views for recruiters and salespeople.

- **Mobile-Friendly**: Fully responsive web app for on-the-go usage.

- **Accessibility**: WCAG-compliant for usability across all team members.

----------

## **5. Technical Requirements**

- **Scalable Architecture**: Handle large candidate databases with no performance lag.

- **Cloud-Based**: Hosted on AWS, Azure, or GCP for accessibility and reliability.

- **Security**:

  - Role-based access control (RBAC).

  - GDPR compliance for candidate data.

  - Data encryption in transit and at rest.

- **APIs**: Open API for future integrations (e.g., billing tools, payroll systems).

----------

## **6. Assumptions and Dependencies**

- Integration with job boards and communication tools will require vendor APIs.

- Recruiters and salespeople will require onboarding to maximize tool adoption.

- Initial data migration from any legacy system must be planned and tested.

----------

## **7. Success Metrics**

- **Recruiter Efficiency**: Reduction in time-to-hire by 20%.

- **Sales Enablement**: Improved client requisition fulfillment rate by 15%.

- **Adoption Rate**: 90% active usage within 3 months post-launch.

- **Performance**: System uptime of 99.9%.

----------

## **8. Timeline and Phases**

### **Phase 1**: MVP Development *(3-4 months)*

- Candidate and job requisition management.

- Basic reporting features.

### **Phase 2**: Full Launch *(6-8 months)*

- CRM features.

- Advanced analytics and dashboards.

### **Phase 3**: Enhancements *(Post-Launch)*

- Custom integrations.

- AI-based candidate matching and ranking.