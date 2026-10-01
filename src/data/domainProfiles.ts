// Domain profiles: field-level commitment schemas for each vertical.
// Status is honest: every profile is PROPOSED until an independent
// implementer publishes conformance results against it.
export type ProfileStatus = "PROPOSED" | "REFERENCE" | "PRODUCTION";

export interface DomainProfile {
  id: string;
  vertical: string;
  summary: string;
  fields: { name: string; note: string }[];
  alignsWith: string[];
  status: ProfileStatus;
  sample: Record<string, string>;
}

export const DOMAIN_PROFILES: DomainProfile[] = [
  { id: "AGENT-EXEC-V1", vertical: "Autonomous AI agents", summary: "Commits each consequential agent action: what it was told, what it called, what came back.",
    fields: [{ name: "system_prompt_digest", note: "SHA-256 of instructions" }, { name: "model_id", note: "model + version string" }, { name: "tool_call_digest", note: "canonical tool parameters" }, { name: "result_digest", note: "returned payload" }],
    alignsWith: ["EU AI Act Art. 12", "NIST AI RMF", "ISO/IEC 42001"], status: "REFERENCE",
    sample: { profile: "AGENT-EXEC-V1", model_id: "example-model-2026-01", tool: "send_payment", amount: "120.00" } },
  { id: "FIN-SETTLE-V1", vertical: "Trading & settlement", summary: "Order and settlement events with ordered timestamps and counterparty commitments.",
    fields: [{ name: "order_nonce", note: "unique per order" }, { name: "event_time_utc", note: "RFC 3339, µs" }, { name: "instrument", note: "ISIN or symbol" }, { name: "counterparty_digest", note: "hashed identifier" }],
    alignsWith: ["SEC Rule 613 (CAT)", "MiFID II RTS 25"], status: "PROPOSED",
    sample: { profile: "FIN-SETTLE-V1", order_nonce: "ord-000001", instrument: "XS0000000000", side: "BUY" } },
  { id: "CLINICAL-TRIAL-V1", vertical: "Healthcare & clinical trials", summary: "Protocol versions and cohort data commitments without patient data leaving the site.",
    fields: [{ name: "protocol_version_digest", note: "trial protocol" }, { name: "cohort_digest", note: "salted, no PII" }, { name: "amendment_ref", note: "change record" }],
    alignsWith: ["FDA 21 CFR Part 11", "ICH E6(R3)"], status: "PROPOSED",
    sample: { profile: "CLINICAL-TRIAL-V1", trial: "TRIAL-EXAMPLE-01", protocol_version: "3.2" } },
  { id: "SOFTWARE-PROVENANCE-V1", vertical: "Software supply chain", summary: "Source, build and artefact digests linked into one receipt.",
    fields: [{ name: "git_commit", note: "40-hex SHA" }, { name: "build_digest", note: "build log / recipe" }, { name: "artifact_digest", note: "container or binary SHA-256" }],
    alignsWith: ["SLSA", "IETF SCITT (RFC 9943)", "in-toto"], status: "REFERENCE",
    sample: { profile: "SOFTWARE-PROVENANCE-V1", repo: "example/repo", git_commit: "0000000000000000000000000000000000000000" } },
  { id: "SUPPLY-CHAIN-V1", vertical: "Physical supply chain", summary: "Custody hand-offs, sensor readings and customs documents as ordered commitments.",
    fields: [{ name: "shipment_ref", note: "bill of lading" }, { name: "custody_event", note: "hand-off step" }, { name: "sensor_digest", note: "telemetry batch" }],
    alignsWith: ["GS1 EPCIS 2.0", "EU DPP"], status: "PROPOSED",
    sample: { profile: "SUPPLY-CHAIN-V1", shipment_ref: "BL-EXAMPLE-01", custody_event: "PORT_ARRIVAL" } },
  { id: "LEGAL-CUSTODY-V1", vertical: "Legal discovery & chain of custody", summary: "Document production sets committed at collection, so later alteration is detectable.",
    fields: [{ name: "collection_digest", note: "production set" }, { name: "bates_range", note: "document range" }, { name: "custodian_digest", note: "hashed custodian" }],
    alignsWith: ["US FRE 902(13)/(14) — supports, does not determine", "ISO/IEC 27037"], status: "PROPOSED",
    sample: { profile: "LEGAL-CUSTODY-V1", matter: "MATTER-EXAMPLE", bates_range: "EX000001-EX000250" } },
  { id: "ENERGY-CARBON-V1", vertical: "Energy & carbon markets", summary: "Meter readings and certificate issuance committed once, to make double counting detectable.",
    fields: [{ name: "meter_id_digest", note: "hashed meter" }, { name: "interval_kwh", note: "reading" }, { name: "certificate_ref", note: "REC / offset id" }],
    alignsWith: ["ISO 14064", "I-REC"], status: "PROPOSED",
    sample: { profile: "ENERGY-CARBON-V1", certificate_ref: "REC-EXAMPLE-01", interval_kwh: "412.5" } },
  { id: "INFRA-SCADA-V1", vertical: "Industrial control systems", summary: "Controller state and alarm events committed for post-incident review.",
    fields: [{ name: "controller_digest", note: "PLC config" }, { name: "alarm_event", note: "code + time" }, { name: "operator_action", note: "override record" }],
    alignsWith: ["IEC 62443", "NERC CIP"], status: "PROPOSED",
    sample: { profile: "INFRA-SCADA-V1", site: "SITE-EXAMPLE", alarm_event: "HIGH_PRESSURE" } },
  { id: "ROBOTICS-NAV-V1", vertical: "Autonomous vehicles & robotics", summary: "Sensor-window and decision commitments for event-data recording.",
    fields: [{ name: "sensor_window_digest", note: "camera/lidar window" }, { name: "planner_decision", note: "chosen manoeuvre" }, { name: "override_flag", note: "human takeover" }],
    alignsWith: ["UN R157", "ISO 21448 (SOTIF)"], status: "PROPOSED",
    sample: { profile: "ROBOTICS-NAV-V1", unit: "UNIT-EXAMPLE", planner_decision: "BRAKE" } },
  { id: "TELECOM-ROUTING-V1", vertical: "Telecom & network routing", summary: "Route announcements and configuration changes as ordered, signed commitments.",
    fields: [{ name: "prefix", note: "announced prefix" }, { name: "origin_as", note: "AS number" }, { name: "config_digest", note: "router config" }],
    alignsWith: ["RPKI (RFC 6480)", "MANRS"], status: "PROPOSED",
    sample: { profile: "TELECOM-ROUTING-V1", prefix: "192.0.2.0/24", origin_as: "64500" } },
  { id: "MEDIA-PROVENANCE-V1", vertical: "Media & content provenance", summary: "Capture and edit-history commitments that sit alongside content credentials.",
    fields: [{ name: "asset_digest", note: "original bytes" }, { name: "edit_chain", note: "ordered edit digests" }, { name: "c2pa_manifest_digest", note: "if present" }],
    alignsWith: ["C2PA", "EU AI Act Art. 50"], status: "REFERENCE",
    sample: { profile: "MEDIA-PROVENANCE-V1", asset: "photo-example.jpg", edit: "crop" } },
  { id: "AERO-TELEMETRY-V1", vertical: "Aerospace & satellite", summary: "Telemetry frames and uplink commands committed with sequence numbers.",
    fields: [{ name: "frame_digest", note: "telemetry frame" }, { name: "command_nonce", note: "uplink id" }, { name: "pass_window", note: "ground-station pass" }],
    alignsWith: ["CCSDS", "DO-178C (supporting records)"], status: "PROPOSED",
    sample: { profile: "AERO-TELEMETRY-V1", vehicle: "SAT-EXAMPLE", command_nonce: "cmd-0001" } },
  { id: "PUBLIC-RECORD-V1", vertical: "Public sector records", summary: "Published decisions, datasets and notices committed at release, so silent revision is detectable.",
    fields: [{ name: "document_digest", note: "published bytes" }, { name: "release_time_utc", note: "RFC 3339" }, { name: "supersedes", note: "prior digest" }],
    alignsWith: ["ISO 15489", "Open Data Charter"], status: "PROPOSED",
    sample: { profile: "PUBLIC-RECORD-V1", notice: "NOTICE-EXAMPLE-01", version: "1" } },
];

export const EPISTEMIC_STATES = [
  { state: "VERIFIED", meaning: "Bytes recompute to the committed digest and the signature checks." },
  { state: "CONTRADICTED", meaning: "Two valid observations of the same event disagree. Both are kept." },
  { state: "UNVERIFIABLE", meaning: "Not enough material is available to run the check." },
  { state: "REVOKED", meaning: "The signing key was revoked before this receipt's time." },
  { state: "EXPIRED", meaning: "The profile or key validity window has passed." },
  { state: "QUARANTINED", meaning: "Held pending review of a suspected fault. Not promoted silently." },
  { state: "ABSENT", meaning: "No record exists. Absence is also a record." },
] as const;
