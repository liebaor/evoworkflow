# Greenfield solution discovery — 2026-09-13

输入是 [`examples/greenfield-team-tracker/requirements.md`](../../examples/greenfield-team-tracker/requirements.md)。初始化扫描确认该目录只有需求，没有实现、框架或运行时证据，因此没有选择框架，也没有开始自定义 bootstrap。

## Shortlist

| Candidate | Why it is viable | Main cost or unresolved point |
|---|---|---|
| [Plane Community Edition](https://developers.plane.so/self-hosting/editions-and-versions) | Self-hosted team work items, comments, attachments, roles, REST API and webhooks | AGPL obligations, multi-service deployment, CSV importer field coverage and Chinese translation coverage need a bake-off |
| [Odoo Community](https://www.odoo.com/documentation/19.0/applications/services/project.html) | Project/tasks, users and groups, access controls, record rules, import/export, and Python module extension | More ERP-oriented UX; module upgrades and filestore/database recovery need explicit operating evidence |
| [Frappe/ERPNext Projects](https://docs.frappe.io/erpnext/projects/introduction/getting-started) | Users, roles, permissions, comments, attachments, configurable records, and CSV/Excel import/export | Heavier service footprint, framework/application license split, and version/localization choice |

The comparison used official product, deployment, API, security, import/export, license, and version documentation. It is a candidate comparison, not a human foundation Decision. No repository was cloned, installed, or modified during discovery.

## Human decisions still required

- Whether CSV means tasks only or lossless project/task/assignment/comment/attachment round-trip.
- Whether mostly-Chinese UI is sufficient or every user-visible string must be Chinese.
- Whether AGPL is acceptable for the deployment and customization model.
- Whether a multi-service deployment and the required backup/recovery objective fit the host.
- Whether customization stays in configuration/API integration or requires product-fork changes.

## Smallest useful next experiment

Run an unmodified Plane-versus-Odoo bake-off in disposable environments. Use the same Chinese requirements, three roles, private project, task/comment/attachment lifecycle, representative UTF-8 CSV import/export, restart persistence, backup/restore, and measured memory, disk, and service count. Keep Frappe/ERPNext as a conditional third candidate until the requirements show a need for configurable business records.
