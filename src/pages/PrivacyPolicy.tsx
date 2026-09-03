import LegalLayout from "@/components/LegalLayout";

const PrivacyPolicy = () => (
  <LegalLayout title="Privacy Policy" lastUpdated="28 February 2026">
    <section>
      <h2>1. Introduction</h2>
      <p>
        APEX INTELLIGENCE EMPIRE, trading as
        <strong> APEX PSI</strong>
        ("we", "us", "our"), is committed to protecting your personal information. We are
        headquartered in Melbourne, Victoria, Australia and operate globally.
      </p>
      <p>
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information
        when you visit our website or use our compliance verification platform. It applies to all
        visitors and users worldwide.
      </p>
    </section>

    <section>
      <h2>2. Governing Laws</h2>
      <p>We comply with:</p>
      <ul>
        <li>The <strong>Australian Privacy Act 1988</strong> (Cth) and the Australian Privacy Principles (APPs)</li>
        <li>The <strong>EU General Data Protection Regulation</strong> (GDPR) — Regulation (EU) 2016/679</li>
        <li>The <strong>UK GDPR</strong> and Data Protection Act 2018</li>
        <li>The <strong>California Consumer Privacy Act</strong> (CCPA) / CPRA</li>
        <li>Other applicable local data protection legislation</li>
      </ul>
    </section>

    <section>
      <h2>3. Information We Collect</h2>
      <h3>3.1 Information You Provide</h3>
      <ul>
        <li>Name, email, phone number (via contact/demo request forms)</li>
        <li>Company name, role, and jurisdiction</li>
        <li>No payment or billing information is collected — nothing is sold and no payment processor exists</li>
      </ul>
      <h3>3.2 Automatically Collected Information</h3>
      <ul>
        <li>IP address and approximate geolocation (city-level)</li>
        <li>Browser type, operating system, device information</li>
        <li>Pages visited, time spent, referring URLs</li>
        <li>Cookies and similar tracking technologies (see our <a href="/cookies">Cookie Policy</a>)</li>
      </ul>
      <h3>3.3 Compliance Platform Data</h3>
      <p>
        Our platform uses Multi-Party Computation (MPC) and Zero-Knowledge Proof (ZK) technology.
        <strong> We never access, store, or transmit your AI model weights.</strong> Compliance
        verification occurs without disclosure of proprietary model internals.
      </p>
    </section>

    <section>
      <h2>4. How We Use Your Information</h2>
      <ul>
        <li>To provide, operate, and maintain our services</li>
        <li>To respond to inquiries and demo requests</li>
        <li>To process transactions and send billing information</li>
        <li>To personalise your experience (e.g., displaying local time and city)</li>
        <li>To send relevant compliance updates, with your consent</li>
        <li>To comply with legal obligations under Australian and international law</li>
        <li>To detect and prevent fraud or security incidents</li>
      </ul>
    </section>

    <section>
      <h2>5. International Data Transfers</h2>
      <p>
        As a global service based in Australia, your data may be transferred to and processed in
        countries outside your jurisdiction. We ensure appropriate safeguards including:
      </p>
      <ul>
        <li>EU Standard Contractual Clauses (SCCs) for transfers from the EEA/UK</li>
        <li>Data processing agreements with all third-party providers</li>
        <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
      </ul>
    </section>

    <section>
      <h2>6. Your Rights</h2>
      <h3>6.1 Under GDPR (EEA/UK Residents)</h3>
      <p>You have the right to: access, rectify, erase, restrict processing, data portability,
        object to processing, and withdraw consent at any time.</p>
      <h3>6.2 Under Australian Privacy Act</h3>
      <p>You have the right to: access your personal information, request correction, and complain
        to the Office of the Australian Information Commissioner (OAIC).</p>
      <h3>6.3 Under CCPA (California Residents)</h3>
      <p>You have the right to: know what personal information is collected, request deletion,
        opt out of the sale of personal information, and non-discrimination.</p>
    </section>

    <section>
      <h2>7. Data Retention</h2>
      <p>
        We retain personal information only as long as necessary for the purposes outlined in this
        policy or as required by law. Contact and demo request data is retained for up to 24 months
        unless you request earlier deletion.
      </p>
    </section>

    <section>
      <h2>8. Security</h2>
      <p>
        We implement industry-standard security measures including encryption, access controls,
        regular security audits, and privacy-by-design principles aligned with our core MPC/ZK
        technology stack.
      </p>
    </section>

    <section>
      <h2>9. Third-Party Services</h2>
      <p>
        We may use third-party services for analytics, payment processing, and communication.
        These providers have their own privacy policies and are contractually obligated to protect
        your data.
      </p>
    </section>

    <section>
      <h2>10. Children's Privacy</h2>
      <p>
        Our services are not intended for individuals under 18. We do not knowingly collect
        personal information from children.
      </p>
    </section>

    <section>
      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be notified
        via email or a prominent notice on our website. Continued use of our services after
        changes constitutes acceptance.
      </p>
    </section>

    <section>
      <h2>12. Contact Us</h2>
      <p>
        For privacy inquiries, data requests, or complaints:
      </p>
      <ul>
        <li><strong>Privacy Officer</strong> — APEX INTELLIGENCE EMPIRE</li>
        <li>Melbourne, Victoria, Australia</li>
        <li>Email: privacy@ai-governance-standard.com</li>
      </ul>
      <p>
        If you are unsatisfied with our response, you may lodge a complaint with the
        <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer"> Office of the Australian Information Commissioner (OAIC)</a> or
        your local data protection authority.
      </p>
    </section>
  </LegalLayout>
);

export default PrivacyPolicy;
