"""Seed realistic KSA government tenders for the discovery feed."""

from datetime import datetime, timedelta, timezone
import uuid

from sqlmodel import Session, create_engine, select

from app.models import DiscoveredTender


SEEDS = [
    {
        "external_id": "ET-2026-MOH-4421",
        "title": "Hospital Information System Modernization — Phase 2",
        "title_ar": "تحديث نظام معلومات المستشفيات — المرحلة الثانية",
        "buyer": "Ministry of Health",
        "buyer_ar": "وزارة الصحة",
        "industry": "Healthcare, Software development",
        "description": "Replacement and integration of legacy HIS across 14 tertiary hospitals. Includes EHR migration, HL7/FHIR interoperability, and 24/7 SLA.",
        "value": 47_500_000,
        "days": 32,
        "lcgpa": 40,
        "saudi_min": 30,
    },
    {
        "external_id": "ET-2026-GASTAT-118",
        "title": "Population Census Data Pipeline & Analytics Platform",
        "title_ar": "منصة تحليلات وبيانات التعداد السكاني",
        "buyer": "General Authority for Statistics",
        "buyer_ar": "الهيئة العامة للإحصاء",
        "industry": "Data engineering, Government, Analytics",
        "description": "End-to-end data pipeline for 2030 census processing. Petabyte-scale, real-time dashboards, secure data exchange with 12 ministries.",
        "value": 89_000_000,
        "days": 45,
        "lcgpa": 55,
        "saudi_min": 50,
    },
    {
        "external_id": "ET-2026-NEOM-882",
        "title": "Smart City Citizen Services App",
        "title_ar": "تطبيق الخدمات الذكية للمواطنين",
        "buyer": "NEOM",
        "buyer_ar": "نيوم",
        "industry": "Mobile development, Government, Software development",
        "description": "Native iOS/Android app for NEOM residents — services portal, payments, identity, AR wayfinding. Bilingual, accessibility-compliant.",
        "value": 22_500_000,
        "days": 28,
        "lcgpa": 60,
        "saudi_min": 70,
    },
    {
        "external_id": "ET-2026-MoE-7732",
        "title": "K-12 Schools Network & WiFi Upgrade",
        "title_ar": "تحديث شبكات وواي فاي مدارس التعليم العام",
        "buyer": "Ministry of Education",
        "buyer_ar": "وزارة التعليم",
        "industry": "Networking, Telecommunications, Hardware",
        "description": "Procurement, installation, and 3-year maintenance of WiFi 6E across 2,400 public schools in 13 regions.",
        "value": 158_000_000,
        "days": 60,
        "lcgpa": 65,
        "saudi_min": 60,
    },
    {
        "external_id": "ET-2026-CITC-441",
        "title": "Cybersecurity Operations Center Build-Out",
        "title_ar": "إنشاء مركز عمليات الأمن السيبراني",
        "buyer": "Communications, Space and Technology Commission",
        "buyer_ar": "هيئة الاتصالات والفضاء والتقنية",
        "industry": "Cybersecurity, IT consulting, Government",
        "description": "Design, build, and 5-year operate a Tier-3 SOC. SIEM, SOAR, threat intel feeds, 24/7 SOC analyst staffing.",
        "value": 73_200_000,
        "days": 40,
        "lcgpa": 50,
        "saudi_min": 65,
    },
    {
        "external_id": "ET-2026-MOJ-228",
        "title": "Digital Court Document Management",
        "title_ar": "إدارة المستندات الرقمية للمحاكم",
        "buyer": "Ministry of Justice",
        "buyer_ar": "وزارة العدل",
        "industry": "Legal, Software development, Government",
        "description": "DMS for case files across 290 court branches. OCR Arabic, judicial workflow, e-signatures, NID integration.",
        "value": 31_000_000,
        "days": 21,
        "lcgpa": 45,
        "saudi_min": 50,
    },
    {
        "external_id": "ET-2026-SDAIA-066",
        "title": "National AI Compute Cluster Expansion",
        "title_ar": "توسعة منصة الحوسبة الوطنية للذكاء الاصطناعي",
        "buyer": "Saudi Data and AI Authority",
        "buyer_ar": "الهيئة السعودية للبيانات والذكاء الاصطناعي",
        "industry": "AI, Hardware, Data center, Software development",
        "description": "GPU cluster expansion — 800 H100s, water cooling, software stack (Kubernetes + Slurm), 99.99% uptime SLA.",
        "value": 412_000_000,
        "days": 75,
        "lcgpa": 35,
        "saudi_min": 25,
    },
    {
        "external_id": "ET-2026-MOMRAH-3301",
        "title": "Municipal Permits Portal Re-platform",
        "title_ar": "إعادة هيكلة بوابة التراخيص البلدية",
        "buyer": "Ministry of Municipal, Rural Affairs and Housing",
        "buyer_ar": "وزارة الشؤون البلدية والقروية والإسكان",
        "industry": "Government, Software development, Citizen services",
        "description": "Rebuild permits portal serving 250+ municipalities. Web + mobile, identity integration, payment gateway, real-time SLA dashboards.",
        "value": 18_500_000,
        "days": 18,
        "lcgpa": 55,
        "saudi_min": 60,
    },
    {
        "external_id": "ET-2026-PIF-9911",
        "title": "ESG Reporting Platform for Portfolio Companies",
        "title_ar": "منصة تقارير الاستدامة لشركات المحفظة",
        "buyer": "Public Investment Fund (PIF)",
        "buyer_ar": "صندوق الاستثمارات العامة",
        "industry": "ESG, Finance, Software development, Analytics",
        "description": "Consolidated ESG metrics platform for 80+ PIF portfolio companies. ISSB/GRI compliance, automated data ingestion, board-grade reporting.",
        "value": 26_400_000,
        "days": 50,
        "lcgpa": 30,
        "saudi_min": 25,
    },
    {
        "external_id": "ET-2026-MEWA-552",
        "title": "Water Utility SCADA Modernization",
        "title_ar": "تحديث أنظمة SCADA لمرافق المياه",
        "buyer": "Ministry of Environment, Water and Agriculture",
        "buyer_ar": "وزارة البيئة والمياه والزراعة",
        "industry": "Industrial automation, Energy, Hardware",
        "description": "SCADA replacement across 18 desalination plants. Cybersecurity hardening, predictive maintenance ML, dashboard build.",
        "value": 95_500_000,
        "days": 38,
        "lcgpa": 60,
        "saudi_min": 55,
    },
    {
        "external_id": "ET-2026-STC-1100",
        "title": "5G Private Network for King Salman Airport",
        "title_ar": "شبكة 5G الخاصة لمطار الملك سلمان",
        "buyer": "STC Group",
        "buyer_ar": "مجموعة الاتصالات السعودية",
        "industry": "Telecommunications, Networking, Hardware",
        "description": "Design and deploy private 5G across 57 km² airport campus. 800+ APs, edge compute, IoT integration for ground ops.",
        "value": 51_200_000,
        "days": 35,
        "lcgpa": 40,
        "saudi_min": 35,
    },
    {
        "external_id": "ET-2026-RCJY-7090",
        "title": "Jubail Industrial City Smart Logistics",
        "title_ar": "اللوجستيات الذكية لمدينة الجبيل الصناعية",
        "buyer": "Royal Commission for Jubail and Yanbu",
        "buyer_ar": "الهيئة الملكية للجبيل وينبع",
        "industry": "Logistics, Software development, IoT",
        "description": "Smart logistics platform: gate management, container tracking, truck routing, predictive ETA, integration with customs.",
        "value": 14_800_000,
        "days": 25,
        "lcgpa": 50,
        "saudi_min": 45,
    },
    {
        "external_id": "ET-2026-MISA-203",
        "title": "Investor Relations CRM and Pipeline Platform",
        "title_ar": "منصة علاقات المستثمرين وإدارة فرص الاستثمار",
        "buyer": "Ministry of Investment",
        "buyer_ar": "وزارة الاستثمار",
        "industry": "Finance, CRM, Software development",
        "description": "Bespoke CRM for investor engagement. Pipeline tracking, sector dashboards, multilingual contact records, due-diligence vault.",
        "value": 9_700_000,
        "days": 22,
        "lcgpa": 40,
        "saudi_min": 45,
    },
    {
        "external_id": "ET-2026-MoH-4498",
        "title": "Telemedicine Platform for Remote Provinces",
        "title_ar": "منصة الطب عن بعد للمناطق النائية",
        "buyer": "Ministry of Health",
        "buyer_ar": "وزارة الصحة",
        "industry": "Healthcare, Software development, Mobile development",
        "description": "Video consultations + remote diagnostics integrated with national health record. Arabic-first, low-bandwidth resilient.",
        "value": 17_500_000,
        "days": 30,
        "lcgpa": 50,
        "saudi_min": 50,
    },
    {
        "external_id": "ET-2026-SAGIA-7711",
        "title": "Trade Licensing Document Workflow",
        "title_ar": "إدارة سير عمل وثائق التراخيص التجارية",
        "buyer": "Saudi Ports Authority",
        "buyer_ar": "هيئة الموانئ السعودية",
        "industry": "Logistics, Government, Document management",
        "description": "Workflow engine for customs and trade licenses. Multi-party approval, document validation, SLA timers.",
        "value": 12_100_000,
        "days": 14,
        "lcgpa": 45,
        "saudi_min": 50,
    },
]


def run():
    engine = create_engine("sqlite:///./etimad.db", echo=False)

    with Session(engine) as session:
        existing = session.exec(select(DiscoveredTender)).all()
        if existing:
            print(f"Already have {len(existing)} discovered tenders. Clearing and reseeding...")
            for t in existing:
                session.delete(t)
            session.commit()

        now = datetime.now(timezone.utc)
        for i, d in enumerate(SEEDS):
            t = DiscoveredTender(
                id=f"dt_{uuid.uuid4().hex[:10]}",
                source="etimad",
                external_id=d["external_id"],
                title=d["title"],
                title_ar=d["title_ar"],
                buyer=d["buyer"],
                buyer_ar=d["buyer_ar"],
                industry=d["industry"],
                description=d["description"],
                estimated_value_sar=d["value"],
                submission_deadline=now + timedelta(days=d["days"]),
                published_date=now - timedelta(days=max(1, i // 2)),
                source_url=f"https://tenders.etimad.sa/Tender/Details/{d['external_id']}",
                lcgpa_min_score=d["lcgpa"],
                saudization_min=d["saudi_min"],
                discovered_at=now - timedelta(hours=i * 4),
            )
            session.add(t)
        session.commit()
        print(f"Seeded {len(SEEDS)} discovered tenders.")


if __name__ == "__main__":
    run()
