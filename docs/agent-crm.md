# PSR agent CRM

The CRM is available as **Client CRM** inside `/agent` and is backed by the existing authenticated agent API. Every endpoint requires a valid `psr_agent_session` cookie and a completed password change. Responses are private and use `Cache-Control: private, no-store`.

The workspace includes a relationship dashboard, searchable client directory, stage-based opportunity pipeline, follow-up desk, client-level opportunity/task forms, and a dated activity timeline. Administrators can switch between their own records and the team CRM.

## Access model

- Advisors can only read and mutate records assigned to their own company email.
- Administrators can access any record, assign contacts to active advisors, and request aggregated team lists with `?scope=team`.
- Contact, opportunity and task removal is soft: contacts and opportunities are archived, while tasks are cancelled. Activity and audit history remains available.
- Website enquiries can only be assigned by an administrator when the stored consent flag is present. A website lead can be imported exactly once.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/agent/crm/overview` | Contact, pipeline and task summary plus recent activity |
| `GET` / `POST` | `/api/agent/crm/contacts` | Search/list contacts or create a contact |
| `GET` / `PATCH` / `DELETE` | `/api/agent/crm/contacts/:id` | Full client record, amendment or soft archive |
| `POST` | `/api/agent/crm/import-lead` | Import one consented `haus_grace_leads` record |
| `GET` / `POST` | `/api/agent/crm/opportunities` | Search/list pipeline opportunities or create one |
| `GET` / `PATCH` / `DELETE` | `/api/agent/crm/opportunities/:id` | Read, advance or archive an opportunity |
| `GET` / `POST` | `/api/agent/crm/tasks` | List or create follow-up tasks |
| `PATCH` / `DELETE` | `/api/agent/crm/tasks/:id` | Complete, amend or cancel a task |
| `GET` / `POST` | `/api/agent/crm/activities` | Read the timeline or record a note/call/email/meeting/viewing |
| `GET` | `/api/agent/crm/team` | Active advisor assignment options |

List endpoints accept `page`, `pageSize`, and relevant filters such as `q`, `status`, `stage`, `clientType`, `contactId`, `type`, and `due`. The maximum page size is 100.

## Example: create a client and opportunity

```http
POST /api/agent/crm/contacts
Content-Type: application/json

{
  "fullName": "Client name",
  "email": "client@example.com",
  "phone": "+971 50 000 0000",
  "clientType": "investor",
  "consentStatus": "granted",
  "tags": ["Dubai", "Off-plan"]
}
```

```http
POST /api/agent/crm/opportunities
Content-Type: application/json

{
  "contactId": "contact-uuid",
  "title": "Dubai investment search",
  "kind": "investment",
  "stage": "qualified",
  "estimatedValueAed": 2500000,
  "probability": 40,
  "communities": ["Dubai Creek Harbour", "Downtown Dubai"],
  "budgetMinAed": 1800000,
  "budgetMaxAed": 2800000,
  "nextStep": "Prepare a three-project shortlist"
}
```

## Storage

Migration `0017_agent_crm.sql` creates six D1 tables:

- `hg_crm_contacts`
- `hg_crm_opportunities`
- `hg_crm_tasks`
- `hg_crm_activities`
- `hg_crm_lead_links`
- `hg_crm_audit_log`

The audit table stores workflow changes but masks free-text and contact fields so it does not become an unnecessary duplicate store of client information.

Migration `0018_crm_contact_identity.sql` adds active-contact identity guards so the same advisor cannot receive duplicate active records for the same normalized email address or phone number.
